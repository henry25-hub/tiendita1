// db.js
require('dotenv').config();
const { Pool } = require('pg');

// Configurar conexión con PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false } // Render u otro hosting seguro
      : false 
});

// Función genérica para consultas
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error("❌ Error en la consulta SQL:", err.message);
    throw err;
  }
};

// Probar conexión al iniciar
(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a PostgreSQL:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Error de conexión:', err);
  }
})();

module.exports = { pool, query };
