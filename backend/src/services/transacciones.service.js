const pool = require('../config/db');

/**
 * Registra el pago de un pedido y, en la misma transacción de base de datos,
 * marca el pedido como 'pagado' y libera la mesa (regla de negocio:
 * "Liberación atómica de mesa").
 */
async function registrarPago({ pedido_id, monto, id_transaccion_proveedor, estado }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query('SELECT * FROM pedidos WHERE id = $1', [pedido_id]);
    if (pedidoResult.rows.length === 0) {
      throw { status: 404, message: 'Pedido no encontrado' };
    }
    const pedido = pedidoResult.rows[0];

    const transaccionResult = await client.query(
      `INSERT INTO transacciones (pedido_id, monto, estado, id_transaccion_proveedor)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [pedido_id, monto, estado || 'aprobada', id_transaccion_proveedor || null]
    );

    await client.query(`UPDATE pedidos SET estado = 'pagado' WHERE id = $1`, [pedido_id]);
    await client.query(
      `INSERT INTO historial_estados (pedido_id, estado, observacion, creado_en)
       VALUES ($1, 'pagado', 'Pago registrado', NOW())`,
      [pedido_id]
    );
    await client.query(`UPDATE mesas SET estado = 'libre' WHERE id = $1`, [pedido.mesa_id]);

    await client.query('COMMIT');
    return transaccionResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function obtenerPorPedido(pedidoId) {
  const result = await pool.query('SELECT * FROM transacciones WHERE pedido_id = $1', [pedidoId]);
  return result.rows;
}

module.exports = { registrarPago, obtenerPorPedido };
