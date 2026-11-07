/**
 * Database Helper Module (mysql2/promise)
 * Plain parameterized SQL execution with zero ORM overhead.
 */

const mysql = require('mysql2/promise');
const config = require('./config');

// Create connection pool for high concurrency and connection reuse
const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true, // Return DECIMAL as numbers/floats or formatted strings
  multipleStatements: true
});

/**
 * Execute a parameterized SQL query with automatic error handling.
 * @param {string} sql - The parameterized SQL query string (using ?)
 * @param {Array} params - The parameter values to bind
 * @returns {Promise<any>} [rows, fields]
 */
async function query(sql, params = []) {
  try {
    const [rows, fields] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('SQL Execution Error:', {
      message: error.message,
      sqlState: error.sqlState,
      code: error.code,
      sql: sql.replace(/\s+/g, ' ').trim()
    });
    throw error;
  }
}

/**
 * Helper to run a callback inside a managed ACID transaction
 * @param {Function} callback - Async function receiving the active connection
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction
};

