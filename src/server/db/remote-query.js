/**
 * remote-query.js — run SQL against the production database from your
 * own machine, over the connection Hostinger's Remote MySQL feature opens
 * (see .env.remote.example). For inspecting or seeding real data without
 * going through the deployed app.
 *
 * Requires your current public IP to be whitelisted first in hPanel →
 * Databases → Remote MySQL, and .env.remote filled in with the external
 * host/port from that same panel.
 *
 * Usage:
 *   node src/server/db/remote-query.js path/to/file.sql        (dry run)
 *   node src/server/db/remote-query.js path/to/file.sql --yes  (executes)
 *   node src/server/db/remote-query.js --sql "SELECT ..." --yes
 *   echo "SELECT 1" | node src/server/db/remote-query.js --yes
 *
 * Without --yes, prints the target and the SQL it *would* run, then exits
 * without opening a connection — this is production data, so nothing
 * executes by accident.
 */

require('dotenv').config({ path: '.env.remote', quiet: true });
const fs    = require('fs');
const mysql = require('mysql2/promise');

const {
  DB_HOST, DB_PORT = '3306', DB_USER, DB_PASSWORD, DB_NAME
} = process.env;

function readSql(args) {
  const sqlFlagIndex = args.indexOf('--sql');
  if (sqlFlagIndex !== -1) return args[sqlFlagIndex + 1];

  const filePath = args.find(a => !a.startsWith('--'));
  if (filePath) return fs.readFileSync(filePath, 'utf8');

  if (!process.stdin.isTTY) return fs.readFileSync(0, 'utf8');

  throw new Error('No SQL given — pass a file path, --sql "...", or pipe SQL via stdin');
}

async function main() {
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('.env.remote is missing or incomplete — copy .env.remote.example and fill in the hPanel Remote MySQL values');
  }
  if (!/^\d+$/.test(DB_PORT)) {
    throw new Error(`DB_PORT in .env.remote is not a plain number: "${DB_PORT}" — fix that line before connecting`);
  }

  const args    = process.argv.slice(2);
  const execute = args.includes('--yes');
  const sql     = readSql(args.filter(a => a !== '--yes'));

  console.log(`\n  Target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  console.log(`  ${execute ? 'Executing' : 'Dry run (add --yes to execute)'}:\n`);
  console.log('  ' + sql.trim().replace(/\n/g, '\n  ') + '\n');

  if (!execute) return;

  const conn = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, multipleStatements: true
  });

  try {
    const [result] = await conn.query(sql);
    // A single SELECT/SHOW returns one array of row objects. Multiple
    // semicolon-separated statements return an array of per-statement
    // results instead — tell them apart by whether the first element is
    // itself a nested result (an array of rows, or an OkPacket).
    const isPerStatementResults = Array.isArray(result) && result.length > 0 &&
      (Array.isArray(result[0]) || Object.prototype.hasOwnProperty.call(result[0], 'affectedRows'));
    const statements = isPerStatementResults ? result : [result];
    for (const r of statements) {
      if (Array.isArray(r)) console.table(r);
      else console.log(`  ✓ affectedRows: ${r.affectedRows ?? 0}, insertId: ${r.insertId ?? '-'}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('\n  ✗ Remote query failed:', err.message, '\n');
  process.exit(1);
});
