const pool = require('../config/db');

// Nota: el qr_token lo genera y firma Roberto (socket-server). Este servicio
// solo lee/expone lo que ya quedó guardado en la columna qr_token de la mesa.
// La vigencia (TTL) del token vive en Redis, del lado de Roberto — este
// servicio no la valida, solo confirma que el token corresponde a una mesa.

async function listar() {
  const result = await pool.query('SELECT * FROM mesas ORDER BY numero ASC');
  return result.rows;
}

async function obtenerPorId(id) {
  const result = await pool.query('SELECT * FROM mesas WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function obtenerPorToken(token) {
  const result = await pool.query('SELECT * FROM mesas WHERE qr_token = $1', [token]);
  return result.rows[0] || null;
}

async function crear({ numero, estado }) {
  const result = await pool.query(
    `INSERT INTO mesas (numero, estado) VALUES ($1, $2) RETURNING *`,
    [numero, estado || 'libre']
  );
  return result.rows[0];
}

async function actualizarEstado(id, estado) {
  const result = await pool.query(
    `UPDATE mesas SET estado = COALESCE($1, estado) WHERE id = $2 RETURNING *`,
    [estado, id]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query('DELETE FROM mesas WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = { listar, obtenerPorId, obtenerPorToken, crear, actualizarEstado, eliminar };
