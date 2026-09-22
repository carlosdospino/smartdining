const pool = require('../config/db');
const pedidosService = require('./pedidos.service');

/**
 * Devuelve las comandas activas (recibido, en_preparacion) con sus ítems ya
 * enriquecidos con nombre del plato y categoría, más el número de mesa y los
 * minutos transcurridos desde que se creó el pedido — lo que el frontend-kds
 * necesita para el tablero Kanban y el semáforo de tiempos (>15 min = rojo).
 */
async function comandasActivas() {
  const pedidosResult = await pool.query(
    `SELECT p.id, p.mesa_id, p.estado, p.creado_en, m.numero AS mesa_numero,
            EXTRACT(EPOCH FROM (NOW() - p.creado_en)) / 60 AS minutos_transcurridos
     FROM pedidos p
     JOIN mesas m ON m.id = p.mesa_id
     WHERE p.estado IN ('recibido', 'en_preparacion')
     ORDER BY p.creado_en ASC`
  );

  const comandas = [];
  for (const pedido of pedidosResult.rows) {
    const itemsResult = await pool.query(
      `SELECT dp.id, dp.cantidad, dp.personalizacion, pl.nombre AS plato_nombre,
              c.nombre AS categoria_nombre
       FROM detalles_pedido dp
       JOIN platos pl ON pl.id = dp.plato_id
       JOIN categorias c ON c.id = pl.categoria_id
       WHERE dp.pedido_id = $1`,
      [pedido.id]
    );
    comandas.push({ ...pedido, items: itemsResult.rows });
  }
  return comandas;
}

/**
 * Cambia el estado de una comanda. La validación de qué transiciones son
 * válidas desde el KDS (solo en_preparacion / listo) vive en el controller.
 */
async function cambiarEstado(pedidoId, estado, observacion) {
  return pedidosService.actualizarEstado(pedidoId, estado, observacion);
}

module.exports = { comandasActivas, cambiarEstado };
