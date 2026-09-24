# SmartDining — Backend + KDS

Responsable: Carlos Ospino (Desarrollador 2 / Integrante 3).
Ramas: `feature/backend` y `feature/frontend-kds` (el frontend del KDS se arma después, en `/frontend-kds`).

## Modelo de datos

La fuente única de verdad es **[docs/modelo-er.md](docs/modelo-er.md)**, el modelo
entidad-relación definido por Jarrison (dueño de la base de datos). Todas las queries
usan esos nombres: `id_<tabla>` para las PK, `url_imagen`, `token_qr`,
`orden_visualizacion`, `subtotal`, `estado_item`, `estado_anterior`/`estado_nuevo`,
`fecha_cambio`, `metodo_pago`, `estado_transaccion`, `referencia_externa`.

## Requisitos previos

- Node.js 18+
- PostgreSQL corriendo localmente, con `database/schema.sql` y `database/seed.sql` de Jarrison ya ejecutados
- Redis (o Memurai en Windows) corriendo localmente

## Instalación

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales locales de PostgreSQL/Redis y un JWT_SECRET propio
```

## Ejecución

```bash
npm run dev     # con nodemon, recarga automática
npm start       # modo normal
```

```bash
curl http://localhost:4000/api/health
# { "status": "ok" }
```

## Roles y sesiones

| Rol | De dónde sale | Payload del JWT |
|---|---|---|
| `admin`, `mesero`, `cajero`, `cocina` | Tabla `usuarios`, vía `POST /api/auth/login` | `{ id_usuario, rol }` |
| `comensal` | **No existe en la tabla usuarios.** Se emite al escanear el QR, vía `POST /api/mesas/qr/:token/sesion` (3 h) | `{ id_mesa, rol: "comensal" }` |

- El rol `cliente` ya no existe.
- Solo un `admin` puede registrar usuarios (`POST /api/auth/register`). El primer admin
  sale del `seed.sql` de Jarrison.
- El pedido pertenece a **la mesa**, no a un usuario: el modelo ER no relaciona
  `pedidos` con `usuarios`. Cuando un comensal crea o cambia algo, `historial_estados`
  queda con `id_usuario = null`.
- En el carrito colaborativo, a cada comensal lo identifica su **apodo**, que se guarda
  por ítem en `detalles_pedido.notas_especiales`.

## Flujo del comensal

```
escanea el QR
  → POST /api/mesas/qr/:token/sesion      (valida token_qr, devuelve el JWT de la mesa, 3 h)
  → GET  /api/categorias  +  GET /api/platos?id_categoria=
  → POST /api/pedidos                     (id_mesa del token; apodo por ítem)
  → GET  /api/pedidos/mesa                (los pedidos de su mesa)
```

## Pruebas

```bash
npm test
```

22 pruebas con `node --test` + `supertest`. No hacen falta PostgreSQL ni Redis:
`tests/helpers/fake-db.js` reemplaza `pool.query`/`pool.connect` por dobles en memoria
y registra las queries ejecutadas, así que las pruebas también verifican con qué
valores llega cada `INSERT`.

## Estructura

```
/backend
  server.js                    → punto de entrada
  /src
    /config                    → conexión a PostgreSQL y Redis
    /middleware                → JWT y control de roles (RBAC)
    /controllers               → lógica HTTP de cada endpoint
    /services                  → consultas SQL y lógica de negocio
    /routes                    → definición de endpoints
  /docs
    modelo-er.md               → modelo ER oficial de Jarrison (fuente de verdad)
    api-spec.md                → contrato formal de la API (compartir con Juan y Jarrison)
  /tests                       → pruebas con supertest y doble de base de datos
```

## Estado actual

- [x] Esqueleto en capas (routes → controllers → services) según el plan de trabajo
- [x] Roles alineados con el modelo ER: `admin`, `mesero`, `cajero`, `cocina` en la tabla, `comensal` solo en el JWT
- [x] Registro de usuarios restringido a `admin`, sin `telefono`
- [x] Sesión de comensal por QR: `POST /api/mesas/qr/:token/sesion` (JWT de mesa, 3 h)
- [x] CRUD de categorías, platos y mesas
- [x] Pedidos: crear (comensal/mesero/admin, transaccional, precio congelado, `codigo_pedido` único, apodo en `notas_especiales`), activos, pedidos de la mesa, cambiar estado, cancelar
- [x] KDS: comandas activas clasificadas por categoría, restringido a rol `cocina` (o `admin`)
- [x] Transacciones: registrar pago con liberación atómica de la mesa
- [x] Todas las queries alineadas con `docs/modelo-er.md`
- [ ] Probar contra el `schema.sql` real de Jarrison (falta confirmar los valores de `mesas.estado` y `detalles_pedido.estado_item`)
- [ ] Cache de sesiones con Redis (conexión lista, falta integrarla en el middleware de auth)
- [ ] Validar el TTL del token QR contra Redis, o confirmar que Roberto ya lo validó
- [ ] Disparar los eventos de WebSocket hacia socket-server en los puntos ya marcados con `NOTA` en el código (coordinar con Roberto)
- [ ] Endpoints de `suscripciones_push` (la tabla está en el modelo, el módulo es de Roberto)
- [ ] Frontend del KDS (`/frontend-kds`)
