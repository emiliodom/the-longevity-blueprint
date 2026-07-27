/**
 * setup.js — creates the database (if missing) and applies schema.sql.
 *
 * Usage: npm run db:setup
 *
 * Safe to re-run any time — schema.sql is entirely CREATE TABLE IF NOT
 * EXISTS, so this never drops or overwrites existing data. Run it once
 * against a fresh MySQL instance locally, and again (unchanged) against
 * Hostinger's MySQL after swapping the .env credentials for deployment.
 */

require('dotenv').config({ quiet: true });
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

const {
  DB_HOST     = 'localhost',
  DB_PORT     = '3306',
  DB_USER     = 'root',
  DB_PASSWORD = '',
  DB_NAME     = 'longevity_blueprint'
} = process.env;

async function main() {
  // 1. Connect with no database selected, create it if it doesn't exist yet.
  //    DB_NAME is an operator-controlled deployment setting (from .env), not
  //    end-user input, so interpolating it into the identifier here is safe.
  const bootstrap = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD
  });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  // 2. Connect to that database and apply every CREATE TABLE in schema.sql.
  const conn = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, multipleStatements: true
  });
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  // ALTER TABLE ... ADD COLUMN statements run separately from the CREATE
  // TABLE batch: on a fresh database the column already exists (it's also
  // in the CREATE TABLE definition), and unlike CREATE TABLE IF NOT EXISTS,
  // ADD COLUMN IF NOT EXISTS isn't supported on every MySQL/MariaDB version —
  // so this tolerates the duplicate-column error instead, without risking
  // one failed statement aborting every CREATE TABLE after it in the batch.
  const alterStatements = schema.match(/^ALTER TABLE.*;$/gm) || [];
  const createOnly = schema.replace(/^ALTER TABLE.*;$/gm, '');

  await conn.query(createOnly);
  for (const statement of alterStatements) {
    try {
      await conn.query(statement);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }

  await conn.end();

  console.log(`\n  ✓ Database "${DB_NAME}" is ready at ${DB_HOST}:${DB_PORT}\n`);
}

main().catch(err => {
  console.error('\n  ✗ Database setup failed:', err.message, '\n');
  process.exit(1);
});
