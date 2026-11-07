/**
 * Database Initializer & Seed Script
 * Reads and executes all database scripts in proper sequence.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

/**
 * Cleanly remove SQL line comments and block comments without breaking code.
 */
function cleanSqlComments(sql) {
  // Remove multi-line comments /* ... */
  let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single line comments -- ...
  cleaned = cleaned.replace(/--.*$/gm, '');
  return cleaned;
}

async function executeSqlFile(connection, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  console.log(`Executing ${fileName}...`);

  if (!content.includes('DELIMITER')) {
    // Standard SQL file with multiple statements (schema, views, sample_data)
    await connection.query(content);
    return;
  }

  // Handle files with DELIMITER //
  // Step 1: Clean comments first so semicolons in comments aren't mistaken for statement separators
  const cleaned = cleanSqlComments(content);

  // Step 2: Extract blocks between DELIMITER // and DELIMITER ;
  // In typical scripts:
  // DROP ... ;
  // DELIMITER //
  // CREATE ... //
  // DELIMITER ;
  const delimiterRegex = /DELIMITER\s+([^\r\n]+)/gi;
  let lastIndex = 0;
  let match;
  let currentDelimiter = ';';
  const chunks = [];

  while ((match = delimiterRegex.exec(cleaned)) !== null) {
    const chunkBefore = cleaned.slice(lastIndex, match.index);
    if (chunkBefore.trim()) {
      chunks.push({ delimiter: currentDelimiter, sql: chunkBefore });
    }
    currentDelimiter = match[1].trim();
    lastIndex = delimiterRegex.lastIndex;
  }
  const remaining = cleaned.slice(lastIndex);
  if (remaining.trim()) {
    chunks.push({ delimiter: currentDelimiter, sql: remaining });
  }

  for (const chunk of chunks) {
    const stmts = chunk.sql.split(chunk.delimiter);
    for (let stmt of stmts) {
      stmt = stmt.trim();
      if (!stmt) continue;
      // Strip any trailing delimiter characters
      if (stmt.endsWith('//')) stmt = stmt.slice(0, -2).trim();
      if (stmt.endsWith(';')) stmt = stmt.slice(0, -1).trim();
      if (!stmt) continue;

      try {
        await connection.query(stmt);
      } catch (err) {
        console.error(`Error executing in ${fileName}:`);
        console.error(`Statement:\n${stmt.slice(0, 150)}...`);
        console.error(`Message: ${err.message}`);
        throw err;
      }
    }
  }
}

async function initializeDatabase() {
  console.log('--- Initializing Smart Employee Management System Database ---');
  console.log(`Connecting to MySQL host: ${config.DB_HOST}:${config.DB_PORT} as user '${config.DB_USER}'...`);

  // Step 1: Connect to server without database to create DB if needed
  let adminConn;
  try {
    adminConn = await mysql.createConnection({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      multipleStatements: true
    });
    console.log('Connected to MySQL server.');

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${config.DB_NAME}' ensured.`);
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  } finally {
    if (adminConn) await adminConn.end();
  }

  // Step 2: Connect to the specific database with multipleStatements enabled
  const conn = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true
  });

  try {
    const sqlFiles = [
      'schema.sql',
      'views.sql',
      'functions.sql',
      'procedures.sql',
      'triggers.sql',
      'sample_data.sql'
    ];

    for (const file of sqlFiles) {
      const fullPath = path.join(__dirname, 'database', file);
      if (fs.existsSync(fullPath)) {
        await executeSqlFile(conn, fullPath);
        console.log(`✓ ${file} executed successfully.`);
      } else {
        console.warn(`File ${file} not found at ${fullPath}`);
      }
    }

    console.log('\n======================================================');
    console.log('✓ Database initialization completed successfully!');
    console.log('======================================================');
    console.log('Login credentials:');
    console.log('  Admin:    admin   / Admin@123');
    console.log('  Employee: emp101  / Emp@123');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
