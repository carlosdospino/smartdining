# ⚡ Módulo Socket Server (WebSockets & Tiempo Real)

**Responsable:** Roberto Buelvas (Integrante 4)

## Descripción
Servidor de comunicación bidireccional en tiempo real con **Socket.io** para sincronizar las mesas, comandas de cocina y notificaciones de pedidos.

## Tareas Iniciales
1. **Definición de eventos:** Documentar los eventos de WebSocket (nombres de eventos, payloads y salas/rooms por mesa).
   - `join:table`: Unirse a la sala de una mesa mediante token.
   - `cart:update`: Sincronizar el carrito de compras colaborativo entre comensales de la misma mesa.
   - `order:created`: Notificar nueva comanda a la cocina (KDS).
   - `order:status`: Notificar al cliente y al restaurante el cambio de estado del pedido.
2. **Generación de Token QR:** Definir formato de token y validación para el acceso a las mesas.
3. **Módulo de Notificaciones Push & Pagos:** Integración de suscripciones Web Push y lógica de webhook/confirmación de pagos.
