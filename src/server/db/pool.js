/**
 * pool.js — MySQL connection pool
 *
 * Every route module imports `query()` from here instead of touching
 * mysql2 directly. Config comes entirely from environment variables
 * (loaded via dotenv in server.js) so the exact same code targets a
 * local MySQL instance during development and Hostinger's MySQL in
 * production — only the .env values change.
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME || 'longevity_blueprint',
  waitForConnections: true,
  connectionLimit:    10,
  // Return DATE columns (target_date, week_start_date, period_start/end) as
  // plain 'YYYY-MM-DD' strings instead of JS Date objects — the API contract
  // and all date-arithmetic helpers (weekBuilder.js, autobuild.js) expect
  // that exact format, and a Date object would serialize with a UTC
  // timestamp attached, silently shifting the date in some timezones.
  dateStrings: ['DATE']
});

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { pool, query };
