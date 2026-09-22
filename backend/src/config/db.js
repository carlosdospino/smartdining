const { Pool } = require('pg');
require('dotenv').config();

// Pool de conexiones a PostgreSQL. Los nombres de tabla/campo coinciden
// con database/schema.sql (9 tablas, DDL de Jarrison).
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
