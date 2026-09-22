# Contrato de la API REST — SmartDining Backend

Responsable: Carlos Ospino (Integrante 3 / Desarrollador 2)
Base URL local: `http://localhost:4000/api`
Formato de errores estándar: `{ "error": "mensaje" }`
Auth: `Authorization: Bearer <token>` (JWT obtenido en `/auth/login` o `/auth/register`)

**Roles del sistema:** `cliente`, `mesero`, `cajero`, `admin`.

**Estados de un pedido (flujo estricto):**
`recibido → en_preparacion → listo → entregado → pagado` (con `cancelado` como salida en cualquier punto antes de `pagado`).

---

## Autenticación

### POST /auth/register
Body: `{ "nombre": "Ana Ríos", "email": "ana@mail.com", "password": "123456", "rol": "cliente" }`
201: `{ "usuario": { "id": 1, "nombre": "Ana Ríos", "email": "ana@mail.com", "rol": "cliente" }, "token": "..." }`
400: `{ "error": "Ese email ya está registrado" }`

### POST /auth/login
Body: `{ "email": "ana@mail.com", "password": "123456" }`
200: igual forma que register. 401: `{ "error": "Credenciales inválidas" }`

---

## Categorías

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /categorias | No | Lista todas |
| GET | /categorias/:id | No | Obtiene una |
| POST | /categorias | admin | Crea |
| PUT | /categorias/:id | admin | Actualiza |
| DELETE | /categorias/:id | admin | Elimina |

```json
{ "id": 1, "nombre": "Entradas", "descripcion": "...", "orden": 1 }
```

---

## Platos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /platos?categoria_id= | No | Lista (filtro opcional) |
| GET | /platos/:id | No | Obtiene uno |
| POST | /platos | admin | Crea |
| PUT | /platos/:id | admin | Actualiza |
| DELETE | /platos/:id | admin | Elimina |

```json
{
  "id": 12, "nombre": "Bandeja paisa", "descripcion": "...", "precio": 28000,
  "imagen_url": "https://...", "categoria_id": 3, "disponible": true,
  "personalizaciones": [{ "tipo": "termino_carne", "opciones": ["Término medio", "Bien cocido"] }]
}
```

---

## Mesas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /mesas | admin, cajero, mesero | Lista todas |
| GET | /mesas/qr/:token | No | Busca la mesa por su token QR (la usa la PWA al escanear) |
| GET | /mesas/:id | No | Obtiene una |
| POST | /mesas | admin | Crea |
| PATCH | /mesas/:id/estado | admin, cajero, mesero | Cambia estado (libre/ocupada/reservada) |
| DELETE | /mesas/:id | admin | Elimina |

```json
{ "id": 5, "numero": 5, "qr_token": "...", "estado": "ocupada" }
```
> El `qr_token` lo genera y firma Roberto (socket-server); este backend solo lo expone/lee. La vigencia (TTL) vive en Redis — **pendiente acordar con Roberto** si ese chequeo se hace aquí o ya viene validado.

---

## Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | /pedidos | cliente | Crea un pedido con sus ítems |
| GET | /pedidos/activos | admin, cajero, mesero | Pedidos en `recibido`/`en_preparacion` |
| GET | /pedidos/historial | cliente | Historial del cliente autenticado |
| GET | /pedidos/:id | autenticado | Detalle de un pedido con sus ítems |
| PATCH | /pedidos/:id/estado | admin, cajero, mesero | Cambia el estado (cualquiera de los 6 válidos) |
| POST | /pedidos/:id/cancelar | admin, cajero, mesero | Atajo que fija `estado = cancelado` |

### POST /pedidos
Body:
```json
{ "mesa_id": 5, "items": [{ "plato_id": 12, "cantidad": 2, "personalizacion": { "termino_carne": "Bien cocido" } }] }
```
201: `{ "pedido_id": 87, "estado": "recibido", "total": 56000 }`

> Cada cambio de estado queda en `historial_estados`. Punto de integración con Roberto: aquí (marcado con un comentario `NOTA` en el código) es donde se debe emitir `order:created` / `order:status` hacia el socket-server.

---

## KDS — Kitchen Display System *(nuevo)*

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /kds/comandas | admin* | Comandas activas, con ítems ya enriquecidos con nombre de plato y categoría, mesa, y minutos transcurridos |
| PATCH | /kds/comandas/:id/estado | admin* | Cambia a `en_preparacion` o `listo` (únicos estados permitidos desde cocina) |

\* Pendiente acordar con el equipo si el rol de la pantalla de cocina debe ser uno propio (ej. `cocina`) en vez de reusar `admin`.

Respuesta de `GET /kds/comandas`:
```json
{
  "comandas": [
    {
      "id": 87, "mesa_numero": 5, "estado": "recibido", "minutos_transcurridos": 3.2,
      "items": [
        { "id": 201, "cantidad": 2, "plato_nombre": "Bandeja paisa", "categoria_nombre": "Platos fuertes",
          "personalizacion": { "termino_carne": "Bien cocido" } }
      ]
    }
  ]
}
```
> El semáforo (verde/amarillo/rojo a los 15 min) se calcula en el frontend-kds a partir de `minutos_transcurridos` — el backend solo entrega el dato crudo.

---

## Transacciones *(nuevo)*

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | /transacciones | admin, cajero | Registra un pago: crea la transacción, marca el pedido `pagado` y **libera la mesa automáticamente** |
| GET | /transacciones/pedido/:pedido_id | admin, cajero | Lista las transacciones de un pedido |

### POST /transacciones
Body:
```json
{ "pedido_id": 87, "monto": 56000, "id_transaccion_proveedor": "ch_123", "estado": "aprobada" }
```
201: fila insertada en `transacciones`.
> `id_transaccion_proveedor` es la referencia de la pasarela de pago que integra Roberto — este endpoint solo la guarda.

---

## Pendiente por acordar con el equipo
- Rol específico para la pantalla del KDS (¿comparte `admin` o se crea un rol `cocina`?).
- Validación de vigencia del token QR: ¿la hace este backend contra Redis, o confía en que Roberto ya la hizo?
- Formato exacto del campo `personalizacion` en `detalles_pedido`.
- Método de pago exacto que Roberto va a mandar en `id_transaccion_proveedor` una vez integre la pasarela real.
