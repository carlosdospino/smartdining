const pool = require('../config/db');

// Tabla mesas (docs/modelo-er.md): id_mesa, numero, capacidad, ubicacion,
// estado, token_qr, actualizado_en.
//
// El token_qr lo genera y firma Roberto (socket-server); este servicio solo
// lee/expone lo que ya quedó guardado en la columna token_qr de la mesa. La
// vigencia (TTL) del token vive en Redis, del lado de Roberto — este servicio
// solo confirma que el token corresponde a una mesa existente.

// PENDIENTE DE CONFIRMAR CON JARRISON: el modelo ER declara estado como varchar
// sin enumerar valores. Se usan los de database/README.md ('disponible',
// 'ocupada', 'reservada'); antes el backend usaba 'libre' para la mesa vacía.
const ESTADOS_MESA = ['disponible', 'ocupada', 'reservada'];
const ESTADO_MESA_LIBRE = 'disponible';

async function listar() {
  const result = await pool.query('SELECT * FROM mesas ORDER BY numero ASC');
  return result.rows;
}

async function obtenerPorId(id) {
  const result = await pool.query('SELECT * FROM mesas WHERE id_mesa = $1', [id]);
  return result.rows[0] || null;
}

async function obtenerPorToken(token) {
  const result = await pool.query('SELECT * FROM mesas WHERE token_qr = $1', [token]);
  return result.rows[0] || null;
}

async function crear({ numero, capacidad, ubicacion, estado, token_qr }) {
  const result = await pool.query(
    `INSERT INTO mesas (numero, capacidad, ubicacion, estado, token_qr, actualizado_en)
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [numero, capacidad ?? null, ubicacion || null, estado || ESTADO_MESA_LIBRE, token_qr || null]
  );
  return result.rows[0];
}

async function actualizarEstado(id, estado) {
  const result = await pool.query(
    `UPDATE mesas SET estado = COALESCE($1, estado), actualizado_en = NOW()
     WHERE id_mesa = $2 RETURNING *`,
    [estado, id]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query(
    'DELETE FROM mesas WHERE id_mesa = $1 RETURNING id_mesa',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  ESTADOS_MESA,
  ESTADO_MESA_LIBRE,
  listar,
  obtenerPorId,
  obtenerPorToken,
  crear,
  actualizarEstado,
  eliminar,
};
