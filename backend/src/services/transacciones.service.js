const pool = require('../config/db');
const mesasService = require('./mesas.service');

// Tabla transacciones (docs/modelo-er.md): id_transaccion, id_pedido,
// metodo_pago, monto, estado_transaccion, referencia_externa, creado_en.

/**
 * Registra el pago de un pedido y, en la misma transacción de base de datos,
 * marca el pedido como 'pagado' y libera la mesa (regla de negocio:
 * "Liberación atómica de mesa").
 *
 * id_usuario es el cajero/admin que cobra, y queda en historial_estados.
 */
async function registrarPago({
  id_pedido,
  monto,
  metodo_pago,
  referencia_externa,
  estado_transaccion,
  id_usuario = null,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query('SELECT * FROM pedidos WHERE id_pedido = $1', [id_pedido]);
    if (pedidoResult.rows.length === 0) {
      throw { status: 404, message: 'Pedido no encontrado' };
    }
    const pedido = pedidoResult.rows[0];

    const transaccionResult = await client.query(
      `INSERT INTO transacciones
        (id_pedido, metodo_pago, monto, estado_transaccion, referencia_externa, creado_en)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [id_pedido, metodo_pago, monto, estado_transaccion || 'aprobada', referencia_externa || null]
    );

    await client.query(
      `UPDATE pedidos SET estado = 'pagado', actualizado_en = NOW() WHERE id_pedido = $1`,
      [id_pedido]
    );
    await client.query(
      `INSERT INTO historial_estados
        (id_pedido, id_usuario, estado_anterior, estado_nuevo, observaciones, fecha_cambio)
       VALUES ($1, $2, $3, 'pagado', 'Pago registrado', NOW())`,
      [id_pedido, id_usuario, pedido.estado]
    );
    await client.query(
      `UPDATE mesas SET estado = $1, actualizado_en = NOW() WHERE id_mesa = $2`,
      [mesasService.ESTADO_MESA_LIBRE, pedido.id_mesa]
    );

    await client.query('COMMIT');
    return transaccionResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function obtenerPorPedido(idPedido) {
  const result = await pool.query(
    'SELECT * FROM transacciones WHERE id_pedido = $1 ORDER BY creado_en ASC',
    [idPedido]
  );
  return result.rows;
}

module.exports = { registrarPago, obtenerPorPedido };
