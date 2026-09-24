# Contrato de la API REST — SmartDining Backend

Responsable: Carlos Ospino (Integrante 3 / Desarrollador 2)
Base URL local: `http://localhost:4000/api`
Formato de errores estándar: `{ "error": "mensaje" }`
Auth: `Authorization: Bearer <token>`

Los nombres de tablas y columnas de este contrato siguen **[modelo-er.md](./modelo-er.md)**,
el modelo entidad-relación oficial de Jarrison (dueño de la base de datos).

---

## Roles y sesiones

| Rol | Origen | Payload del JWT | Vigencia |
|---|---|---|---|
| `admin`, `mesero`, `cajero`, `cocina` | Tabla `usuarios` (`usuarios.rol`), vía `POST /auth/login` | `{ id_usuario, rol }` | `JWT_EXPIRES_IN` (8 h) |
| `comensal` | **No existe en la tabla usuarios.** Se emite al escanear el QR de la mesa, vía `POST /mesas/qr/:token/sesion` | `{ id_mesa, rol: "comensal" }` | 3 h (`JWT_COMENSAL_EXPIRES_IN`) |

Notas del flujo del comensal (definido por Jarrison):

- El rol `cliente` ya no existe.
- La sesión del comensal pertenece a **la mesa**, no a una persona: el modelo ER no
  relaciona `pedidos` con `usuarios`, el pedido es de la mesa.
- Varios comensales comparten la misma mesa y, por tanto, el mismo pedido. A cada uno
  lo identifica su **apodo**, que viaja por ítem y se guarda en
  `detalles_pedido.notas_especiales`.
- En `historial_estados`, `id_usuario` va `null` cuando el cambio lo hizo un comensal.

**Estados de un pedido (flujo estricto):**
`recibido → en_preparacion → listo → entregado → pagado` (con `cancelado` como salida
en cualquier punto antes de `pagado`).

---

## Autenticación

### POST /auth/register — solo `admin`

Da de alta personal del restaurante. El comensal no se registra.
El primer `admin` sale del `seed.sql` de Jarrison, no de este endpoint.

Body: `{ "nombre": "Ana Ríos", "email": "ana@mail.com", "password": "123456", "rol": "mesero" }`

`rol` es obligatorio y solo acepta `admin`, `mesero`, `cajero`, `cocina`.

201: `{ "usuario": { "id_usuario": 1, "nombre": "Ana Ríos", "email": "ana@mail.com", "rol": "mesero", "activo": true } }`

400: `{ "error": "Ese email ya está registrado" }` · 401 sin token · 403 si el token no es de un admin

### POST /auth/login

Body: `{ "email": "ana@mail.com", "password": "123456" }`

200: `{ "usuario": { "id_usuario": 1, "nombre": "...", "email": "...", "rol": "mesero" }, "token": "..." }`

401: `{ "error": "Credenciales inválidas" }` · 403: `{ "error": "Usuario inactivo" }`

---

## Categorías

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /categorias | No | Lista todas, ordenadas por `orden_visualizacion` |
| GET | /categorias/:id | No | Obtiene una |
| POST | /categorias | admin | Crea |
| PUT | /categorias/:id | admin | Actualiza |
| DELETE | /categorias/:id | admin | Elimina |

```json
{ "id_categoria": 1, "nombre": "Entradas", "descripcion": "...", "orden_visualizacion": 1, "activo": true }
```

---

## Platos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /platos?id_categoria= | No | Lista (filtro opcional) |
| GET | /platos/:id | No | Obtiene uno |
| POST | /platos | admin | Crea |
| PUT | /platos/:id | admin | Actualiza |
| DELETE | /platos/:id | admin | Elimina |

```json
{
  "id_plato": 12, "id_categoria": 3, "nombre": "Bandeja paisa", "descripcion": "...",
  "precio": 28000, "url_imagen": "https://...", "disponible": true,
  "tiempo_preparacion_estimado": 20
}
```

> El modelo ER no tiene `personalizaciones` ni `alergenos` en `platos`: ese campo se
> eliminó del backend. Las preferencias del comensal van por ítem del pedido, en
> `detalles_pedido.notas_especiales`.

---

## Mesas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /mesas | admin, cajero, mesero | Lista todas |
| GET | /mesas/qr/:token | No | Busca la mesa por su `token_qr` (no emite sesión) |
| **POST** | **/mesas/qr/:token/sesion** | **No** | **Abre la sesión del comensal y devuelve su JWT** |
| GET | /mesas/:id | No | Obtiene una |
| POST | /mesas | admin | Crea |
| PATCH | /mesas/:id/estado | admin, cajero, mesero | Cambia estado |
| DELETE | /mesas/:id | admin | Elimina |

```json
{ "id_mesa": 5, "numero": 5, "capacidad": 4, "ubicacion": "Terraza", "estado": "ocupada", "token_qr": "..." }
```

### POST /mesas/qr/:token/sesion *(nuevo — punto de entrada del comensal)*

Valida que el `token_qr` exista en la tabla `mesas` y emite el JWT de la sesión de mesa.

201:

```json
{
  "token": "<jwt con id_mesa y rol comensal>",
  "expira_en": "3h",
  "mesa": { "id_mesa": 5, "numero": 5, "capacidad": 4, "ubicacion": "Terraza", "estado": "ocupada" }
}
```

404: `{ "error": "Token de mesa inválido" }` — si el token no corresponde a ninguna
mesa, no se emite ningún JWT.

> El `token_qr` lo genera y firma Roberto (socket-server); este backend solo lo lee.
> La vigencia (TTL) del token QR vive en Redis — **pendiente acordar con Roberto** si
> ese chequeo se hace aquí o ya viene validado. Las 3 h de este endpoint son la
> vigencia de la *sesión* del comensal, no la del token QR.

---

## Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | /pedidos | **comensal, mesero, admin** | Crea un pedido con sus ítems |
| GET | /pedidos/activos | admin, cajero, mesero | Pedidos en `recibido`/`en_preparacion` |
| **GET** | **/pedidos/mesa** | **comensal** | **Pedidos de la mesa de la sesión** *(reemplaza a `/pedidos/historial`)* |
| GET | /pedidos/:id | autenticado | Detalle con sus ítems; un comensal solo ve los de su mesa (403 si no) |
| PATCH | /pedidos/:id/estado | admin, cajero, mesero | Cambia el estado (cualquiera de los 6 válidos) |
| POST | /pedidos/:id/cancelar | admin, cajero, mesero | Atajo que fija `estado = cancelado` |

### POST /pedidos

Body:

```json
{
  "id_mesa": 5,
  "notas_generales": "Somos alergicos al mani",
  "items": [
    { "id_plato": 12, "cantidad": 2, "apodo": "Ana", "notas": "sin cebolla" },
    { "id_plato": 31, "cantidad": 1, "apodo": "Pipe" }
  ]
}
```

- **Si el token es de un comensal:** `id_mesa` se toma del JWT y **se ignora el del
  body**. Así una mesa no puede ordenar a nombre de otra.
- **Si el token es de staff (mesero/admin):** `id_mesa` es obligatorio en el body
  (400 si falta).
- `apodo` + `notas` se guardan juntos en `detalles_pedido.notas_especiales`
  (`"Ana: sin cebolla"`).
- `precio_unitario` se congela desde `platos.precio` en el momento del pedido (regla
  de negocio "Inmutabilidad de Precios"), nunca se toma del body; `subtotal` se
  calcula en el backend.
- `codigo_pedido` lo genera el backend (formato `PED-AAMMDD-XXXXXX`) y es único.
- Cada ítem nace con `estado_item = 'pendiente'`.

201:

```json
{ "id_pedido": 87, "codigo_pedido": "PED-260922-K3F9AQ", "id_mesa": 5, "estado": "recibido", "total": 56000 }
```

400: plato inexistente o no disponible, `id_mesa` faltante para staff · 403: rol no permitido

### GET /pedidos/mesa

200: `{ "id_mesa": 5, "pedidos": [ ... ] }` — todos los pedidos de la mesa del token,
más recientes primero.

### PATCH /pedidos/:id/estado

Body: `{ "estado": "listo", "observaciones": "Sale de cocina" }`

Cada cambio queda en `historial_estados` con `estado_anterior`, `estado_nuevo`,
`observaciones`, `fecha_cambio` y el `id_usuario` que lo hizo (`null` si fue un comensal).

> Punto de integración con Roberto: en el código (marcado con un comentario `NOTA`)
> es donde se debe emitir `order:created` / `order:status` hacia el socket-server.

---

## KDS — Kitchen Display System

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /kds/comandas | **cocina, admin** | Comandas activas, con ítems enriquecidos con plato y categoría, mesa y minutos transcurridos |
| PATCH | /kds/comandas/:id/estado | **cocina, admin** | Cambia a `en_preparacion` o `listo` (únicos estados permitidos desde cocina) |

Respuesta de `GET /kds/comandas`:

```json
{
  "comandas": [
    {
      "id_pedido": 87, "codigo_pedido": "PED-260922-K3F9AQ", "id_mesa": 5, "mesa_numero": 5,
      "estado": "recibido", "notas_generales": null, "minutos_transcurridos": 3.2,
      "items": [
        {
          "id_detalle": 201, "cantidad": 2, "plato_nombre": "Bandeja paisa",
          "categoria_nombre": "Platos fuertes", "tiempo_preparacion_estimado": 20,
          "notas_especiales": "Ana: sin cebolla", "estado_item": "pendiente"
        }
      ]
    }
  ]
}
```

> El semáforo (verde/amarillo/rojo a los 15 min) se calcula en el frontend-kds a
> partir de `minutos_transcurridos` — el backend solo entrega el dato crudo.

---

## Transacciones

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | /transacciones | admin, cajero | Registra un pago: crea la transacción, marca el pedido `pagado` y **libera la mesa automáticamente** |
| GET | /transacciones/pedido/:id_pedido | admin, cajero | Lista las transacciones de un pedido |

### POST /transacciones

Body:

```json
{ "id_pedido": 87, "monto": 56000, "metodo_pago": "tarjeta", "referencia_externa": "ch_123", "estado_transaccion": "aprobada" }
```

- `metodo_pago` es obligatorio: `efectivo`, `tarjeta` o `transferencia`.
- `estado_transaccion`: `aprobada` (por defecto), `rechazada` o `pendiente`.
- `referencia_externa` es la referencia de la pasarela de pago que integra Roberto —
  este endpoint solo la guarda.

201: fila insertada en `transacciones`.

---

## Pendiente por acordar con el equipo

- **Valores de `mesas.estado`:** el modelo ER lo declara `varchar` sin enumerarlos. El
  backend usa `disponible` / `ocupada` / `reservada`, según `database/README.md` de
  Jarrison (antes usaba `libre`). **Confirmar con Jarrison** si el `CHECK` del
  `schema.sql` coincide.
- **Valores de `detalles_pedido.estado_item`:** tampoco están enumerados en el modelo.
  El backend los crea en `pendiente`. **Confirmar con Jarrison.**
- Validación de vigencia del token QR contra Redis: ¿la hace este backend o confía en
  que Roberto ya la hizo?
- `suscripciones_push` está en el modelo ER pero todavía no la consume ningún endpoint
  de este backend (las notificaciones Web Push son módulo de Roberto).
- ¿Debe el comensal poder cancelar su propio pedido? Hoy cancelar es solo de staff.
