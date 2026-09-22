const pool = require('../config/db');

async function listar() {
  const result = await pool.query('SELECT * FROM categorias ORDER BY orden ASC, id ASC');
  return result.rows;
}

async function obtenerPorId(id) {
  const result = await pool.query('SELECT * FROM categorias WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function crear({ nombre, descripcion, orden }) {
  const result = await pool.query(
    `INSERT INTO categorias (nombre, descripcion, orden) VALUES ($1, $2, $3) RETURNING *`,
    [nombre, descripcion || null, orden ?? 0]
  );
  return result.rows[0];
}

async function actualizar(id, datos) {
  const result = await pool.query(
    `UPDATE categorias SET nombre = $1, descripcion = $2, orden = $3 WHERE id = $4 RETURNING *`,
    [datos.nombre, datos.descripcion, datos.orden, id]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
