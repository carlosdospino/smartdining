# SmartDining — Backend + KDS

Responsable: Carlos Ospino (Desarrollador 2 / Integrante 3).
Ramas: `feature/backend` y `feature/frontend-kds` (el frontend del KDS se arma después, en `/frontend-kds`).

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

## Pruebas

```bash
npm test
```
5 pruebas de ejemplo con `supertest`, todas sobre rutas que no requieren base de datos conectada (health check, validaciones 400/401).

## Estructura

```
/backend
  server.js                    → punto de entrada
  /src
    /config                    → conexión a PostgreSQL y Redis
    /middleware                → JWT y control de roles (RBAC)
    /controllers                → lógica HTTP de cada endpoint
    /services                   → consultas SQL y lógica de negocio
    /routes                     → definición de endpoints
  /docs/api-spec.md             → contrato formal de la API (compartir con Juan y Jarrison)
  /tests                        → pruebas de ejemplo con supertest
```

## Estado actual
- [x] Esqueleto en capas (routes → controllers → services) según el plan de trabajo
- [x] Autenticación JWT con 4 roles: cliente, mesero, cajero, admin
- [x] CRUD de categorías, platos y mesas + búsqueda de mesa por token QR
- [x] Pedidos: crear (transaccional, precio congelado), activos, historial, cambiar estado, cancelar
- [x] KDS: comandas activas clasificadas por categoría, cambio de estado restringido
- [x] Transacciones: registrar pago con liberación atómica de la mesa
- [x] `docs/api-spec.md` con el contrato completo, incluidos los puntos pendientes de coordinar
- [ ] Conectar contra el esquema real de Jarrison (los nombres ya deberían coincidir, falta probar)
- [ ] Cache de sesiones con Redis (conexión lista, falta integrarla en el middleware de auth)
- [ ] Disparar los eventos de WebSocket hacia socket-server en los puntos ya marcados con `NOTA` en el código (coordinar con Roberto)
- [ ] Frontend del KDS (`/frontend-kds`)
