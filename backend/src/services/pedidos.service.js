const pool = require('../config/db');

const ESTADOS_VALIDOS = ['recibido', 'en_preparacion', 'listo', 'entregado', 'pagado', 'cancelado'];

/**
 * Crea un pedido y sus detalles en una sola transacción.
 * El precio_unitario se congela desde el plato en el momento del pedido
 * (regla de negocio: "Inmutabilidad de Precios"), nunca se toma del body.
 */
async function crearConDetalles({ mesa_id, cliente_id, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const detalles = [];

    for (const item of items) {
      const platoResult = await client.query(
        'SELECT precio, disponible FROM platos WHERE id = $1',
        [item.plato_id]
      );
      if (platoResult.rows.length === 0) {
        throw { status: 400, message: `Plato ${item.plato_id} no existe` };
      }
      const plato = platoResult.rows[0];
      if (!plato.disponible) {
        throw { status: 400, message: `Plato ${item.plato_id} no está disponible` };
      }
      const subtotal = Number(plato.precio) * item.cantidad;
      total += subtotal;
      detalles.push({ ...item, precio_unitario: plato.precio });
    }

    const pedidoResult = await client.query(
      `INSERT INTO pedidos (mesa_id, cliente_id, total, estado, creado_en)
       VALUES ($1, $2, $3, 'recibido', NOW()) RETURNING *`,
      [mesa_id, cliente_id, total]
    );
    const pedido = pedidoResult.rows[0];

    for (const d of detalles) {
      await client.query(
        `INSERT INTO detalles_pedido (pedido_id, plato_id, cantidad, precio_unitario, personalizacion)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, d.plato_id, d.cantidad, d.precio_unitario, JSON.stringify(d.personalizacion || {})]
      );
    }

    await client.query(
      `INSERT INTO historial_estados (pedido_id, estado, observacion, creado_en)
       VALUES ($1, 'recibido', 'Pedido creado', NOW())`,
      [pedido.id]
    );

    await client.query('COMMIT');
    return pedido;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listarActivos() {
  const result = await pool.query(
    `SELECT * FROM pedidos WHERE estado IN ('recibido', 'en_preparacion') ORDER BY creado_en ASC`
  );
  return result.rows;
}

async function obtenerConDetalles(id) {
  const pedido = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
  if (pedido.rows.length === 0) return null;
  const detalles = await pool.query('SELECT * FROM detalles_pedido WHERE pedido_id = $1', [id]);
  return { ...pedido.rows[0], detalles: detalles.rows };
}

async function actualizarEstado(id, estado, observacion) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `INSERT INTO historial_estados (pedido_id, estado, observacion, creado_en) VALUES ($1, $2, $3, NOW())`,
      [id, estado, observacion || null]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function historialPorCliente(clienteId) {
  const result = await pool.query(
    'SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY creado_en DESC',
    [clienteId]
  );
  return result.rows;
}

module.exports = {
  ESTADOS_VALIDOS,
  crearConDetalles,
  listarActivos,
  obtenerConDetalles,
  actualizarEstado,
  historialPorCliente,
};
