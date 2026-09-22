const pool = require('../config/db');

async function listar(categoriaId) {
  const result = categoriaId
    ? await pool.query('SELECT * FROM platos WHERE categoria_id = $1 ORDER BY id', [categoriaId])
    : await pool.query('SELECT * FROM platos ORDER BY id');
  return result.rows;
}

async function obtenerPorId(id) {
  const result = await pool.query('SELECT * FROM platos WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function crear(p) {
  const result = await pool.query(
    `INSERT INTO platos
      (nombre, descripcion, precio, imagen_url, categoria_id, disponible, personalizaciones)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      p.nombre,
      p.descripcion || null,
      p.precio,
      p.imagen_url || null,
      p.categoria_id,
      p.disponible ?? true,
      JSON.stringify(p.personalizaciones || []),
    ]
  );
  return result.rows[0];
}

async function actualizar(id, datos) {
  const result = await pool.query(
    `UPDATE platos SET nombre = $1, descripcion = $2, precio = $3, imagen_url = $4,
      categoria_id = $5, disponible = $6, personalizaciones = $7
     WHERE id = $8 RETURNING *`,
    [
      datos.nombre,
      datos.descripcion,
      datos.precio,
      datos.imagen_url,
      datos.categoria_id,
      datos.disponible,
      JSON.stringify(datos.personalizaciones || []),
      id,
    ]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query('DELETE FROM platos WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
