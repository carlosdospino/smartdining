const pool = require('../config/db');

async function buscarPorEmail(email) {
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function crear({ nombre, email, password_hash, rol, telefono }) {
  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, email, rol`,
    [nombre, email, password_hash, rol, telefono || null]
  );
  return result.rows[0];
}

module.exports = { buscarPorEmail, crear };
