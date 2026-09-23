const crypto = require('crypto');
const pool = require('../config/db');

const ESTADOS_VALIDOS = ['recibido', 'en_preparacion', 'listo', 'entregado', 'pagado', 'cancelado'];

// PENDIENTE DE CONFIRMAR CON JARRISON: el modelo ER declara estado_item como
// varchar sin enumerar valores; se arranca en 'pendiente'.
const ESTADO_ITEM_INICIAL = 'pendiente';

const MAX_INTENTOS_CODIGO = 5;

/**
 * codigo_pedido es UK en la tabla pedidos: es el código corto que ve el
 * comensal ("PED-260922-K3F9AQ") y con el que la mesa referencia su orden.
 */
function generarCodigoPedido(fecha = new Date()) {
  const dia = fecha.toISOString().slice(2, 10).replace(/-/g, '');
  const aleatorio = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `PED-${dia}-${aleatorio}`;
}

/**
 * detalles_pedido solo tiene notas_especiales para el texto libre del ítem, así
 * que ahí va el apodo del comensal que lo agregó al carrito colaborativo, junto
 * con su nota si la escribió: "Ana: sin cebolla".
 */
function componerNotasEspeciales(apodo, notas) {
  const partes = [apodo, notas].map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
  if (partes.length === 0) return null;
  return partes.join(': ');
}

/**
 * Crea un pedido y sus detalles en una sola transacción.
 *
 * El pedido pertenece a la mesa, no a un usuario: el modelo ER no relaciona
 * pedidos con usuarios. `id_usuario` es solo quien hizo el cambio para la
 * auditoría en historial_estados, y va null cuando el pedido lo crea un
 * comensal desde su sesión de QR.
 *
 * El precio_unitario se congela desde el plato en el momento del pedido
 * (regla de negocio: "Inmutabilidad de Precios"), nunca se toma del body.
 */
async function crearConDetalles({ id_mesa, id_usuario = null, items, notas_generales = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const detalles = [];

    for (const item of items) {
      const platoResult = await client.query(
        'SELECT precio, disponible FROM platos WHERE id_plato = $1',
        [item.id_plato]
      );
      if (platoResult.rows.length === 0) {
        throw { status: 400, message: `Plato ${item.id_plato} no existe` };
      }
      const plato = platoResult.rows[0];
      if (!plato.disponible) {
        throw { status: 400, message: `Plato ${item.id_plato} no está disponible` };
      }
      const subtotal = Number(plato.precio) * item.cantidad;
      total += subtotal;
      detalles.push({
        id_plato: item.id_plato,
        cantidad: item.cantidad,
        precio_unitario: plato.precio,
        subtotal,
        notas_especiales: componerNotasEspeciales(item.apodo, item.notas),
      });
    }

    // codigo_pedido es único: si choca con uno existente se reintenta con otro
    // sin abortar la transacción completa.
    let pedido = null;
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO && !pedido; intento++) {
      await client.query('SAVEPOINT intento_codigo');
      try {
        const pedidoResult = await client.query(
          `INSERT INTO pedidos
            (id_mesa, codigo_pedido, estado, total, notas_generales, creado_en, actualizado_en)
           VALUES ($1, $2, 'recibido', $3, $4, NOW(), NOW()) RETURNING *`,
          [id_mesa, generarCodigoPedido(), total, notas_generales]
        );
        pedido = pedidoResult.rows[0];
      } catch (err) {
        if (err.code !== '23505') throw err;
        await client.query('ROLLBACK TO SAVEPOINT intento_codigo');
      }
    }
    if (!pedido) {
      throw { status: 500, message: 'No se pudo generar un codigo_pedido único' };
    }

    for (const d of detalles) {
      await client.query(
        `INSERT INTO detalles_pedido
          (id_pedido, id_plato, cantidad, precio_unitario, subtotal, notas_especiales,
           estado_item, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          pedido.id_pedido,
          d.id_plato,
          d.cantidad,
          d.precio_unitario,
          d.subtotal,
          d.notas_especiales,
          ESTADO_ITEM_INICIAL,
        ]
      );
    }

    await client.query(
      `INSERT INTO historial_estados
        (id_pedido, id_usuario, estado_anterior, estado_nuevo, observaciones, fecha_cambio)
       VALUES ($1, $2, NULL, 'recibido', 'Pedido creado', NOW())`,
      [pedido.id_pedido, id_usuario]
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
  const pedido = await pool.query('SELECT * FROM pedidos WHERE id_pedido = $1', [id]);
  if (pedido.rows.length === 0) return null;
  const detalles = await pool.query(
    `SELECT dp.*, pl.nombre AS plato_nombre
     FROM detalles_pedido dp
     JOIN platos pl ON pl.id_plato = dp.id_plato
     WHERE dp.id_pedido = $1
     ORDER BY dp.id_detalle ASC`,
    [id]
  );
  return { ...pedido.rows[0], detalles: detalles.rows };
}

/**
 * Cambia el estado del pedido y lo registra en historial_estados con el estado
 * anterior y el nuevo. id_usuario va null si el cambio lo hizo un comensal.
 */
async function actualizarEstado(id, estado, observaciones, id_usuario = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query('SELECT estado FROM pedidos WHERE id_pedido = $1', [id]);
    if (actual.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const estadoAnterior = actual.rows[0].estado;

    const result = await client.query(
      'UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id_pedido = $2 RETURNING *',
      [estado, id]
    );

    await client.query(
      `INSERT INTO historial_estados
        (id_pedido, id_usuario, estado_anterior, estado_nuevo, observaciones, fecha_cambio)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, id_usuario, estadoAnterior, estado, observaciones || null]
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

/** Pedidos de una mesa — reemplaza el viejo historial por cliente. */
async function listarPorMesa(idMesa) {
  const result = await pool.query(
    'SELECT * FROM pedidos WHERE id_mesa = $1 ORDER BY creado_en DESC',
    [idMesa]
  );
  return result.rows;
}

module.exports = {
  ESTADOS_VALIDOS,
  ESTADO_ITEM_INICIAL,
  generarCodigoPedido,
  componerNotasEspeciales,
  crearConDetalles,
  listarActivos,
  obtenerConDetalles,
  actualizarEstado,
  listarPorMesa,
};
