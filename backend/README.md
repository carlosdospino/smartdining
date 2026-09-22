# ⚙️ Módulo Backend - API REST

**Responsable:** Carlos Ospino (Integrante 3)

## Descripción
Servidor backend construido con **Node.js + Express** para gestionar la lógica de negocio y exponer el API REST que consumirán las aplicaciones cliente y de restaurante.

## Tareas Iniciales
1. **Contrato de API:** Documentar endpoints en `api-spec.md` o exportar colección de Postman/Swagger antes de codificar la lógica.
2. **Estructura base:** Inicializar `package.json`, configurar Express, conexión a PostgreSQL (mediante `pg` o un ORM/query builder), y middleware de CORS/manejo de errores.
3. **Endpoints principales:**
   - Autenticación y usuarios (`/api/auth`, `/api/usuarios`)
   - Mesas y QR (`/api/mesas`)
   - Menú y categorías (`/api/categorias`, `/api/platos`)
   - Pedidos y comandas (`/api/pedidos`, `/api/detalles-pedido`)
   - Pagos (`/api/transacciones`)
