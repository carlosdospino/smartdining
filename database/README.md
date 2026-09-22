# 🗄️ Módulo de Base de Datos - PostgreSQL

**Responsable:** Jarrison Pulgarin (Integrante 2)

## Contenido
Este directorio contendrá:
1. `schema.sql`: Script de creación de tablas, llaves primarias, foráneas, constraints e índices en PostgreSQL.
2. `seed.sql`: Datos iniciales de prueba (categorías, platos muestra, mesas, usuarios demo).
3. `diagrama-er.md` / `diagrama.png`: Diagrama entidad-relación y diccionario de datos.

## Tablas del Modelo (9 Tablas)
1. `usuarios`: Roles de administrador, mesero, cajero, cocina.
2. `mesas`: Número de mesa, capacidad, estado (disponible, ocupada, reservada), token/identificador QR.
3. `categorias`: Clasificación de productos del menú (entradas, platos fuertes, bebidas, postres, etc.).
4. `platos`: Catálogo de menú (nombre, descripción, precio, categoría, disponibilidad, imagen).
5. `pedidos`: Sesión de orden por mesa (mesa_id, estado, total, fecha/hora).
6. `detalles_pedido`: Ítems solicitados en cada pedido (plato_id, cantidad, precio_unitario, notas especiales, estado de preparación).
7. `transacciones`: Registro de pagos y métodos de pago (efectivo, tarjeta, transferencia, estado del pago).
8. `historial_estados`: Trazabilidad y auditoría de cambios de estado del pedido (recibido -> en preparación -> listo -> entregado -> pagado).
9. `suscripciones_push`: Almacenamiento de endpoints y claves para notificaciones Web Push.
