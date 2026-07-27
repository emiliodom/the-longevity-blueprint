/**
 * Longevity Blueprint — Express Server v3
 *
 * Bootstrap only: middleware + router mounting. All domain logic lives in
 * src/server/{routes,lib,db}/ — see docs/ARCHITECTURE.md for the full map
 * and API surface before making changes here.
 *
 * Persistence: MySQL (src/server/db) — run `npm run db:setup` once against
 * your configured .env before starting the server for the first time.
 */

require('dotenv').config({ quiet: true });

const express   = require('express');
require('express-async-errors'); // patches Express 4 to forward rejected promises to the error handler below
const session   = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet    = require('helmet');
const fs        = require('fs');
const path      = require('path');

const { pool } = require('./src/server/db/pool');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Hostinger (and most PaaS hosts) terminate TLS at a reverse proxy in front of
// this process — trusting it is what lets express-session's `secure` cookie
// flag and express-rate-limit's IP detection see the real client/protocol.
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  // This app renders its own inline <script> config blocks (MathJax, Google
  // Translate) and loads a fixed set of third-party CDNs — a strict default
  // CSP would break those without a lot of narrowly-scoped directives that
  // are easy to get subtly wrong. Leaving CSP off keeps the rest of Helmet's
  // hardening (X-Content-Type-Options, X-Frame-Options, HSTS, etc.) intact
  // without a false sense of security from a half-configured policy.
  contentSecurityPolicy: false
}));

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());

// Serve only the specific folders the frontend needs — NOT the whole project
// root. `express.static(__dirname)` would also serve server.js, package.json,
// src/server/** (backend source), and docs/ to anyone who requests them.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/uploads', express.static(UPLOADS_DIR));

// MySQL-backed, not the express-session default in-memory MemoryStore —
// MemoryStore silently drops every logged-in session on any process
// restart (a redeploy, a crash, nodemon picking up a file change), which
// surfaces to users as random "Unauthorized" errors on actions taken after
// a restart despite the page still showing them as logged in. Reuses the
// app's existing MySQL pool rather than opening a second connection pool.
const sessionStore = new MySQLStore({}, pool);
sessionStore.on('error', err => console.error('Session store error:', err.message));

app.use(session({
  store:             sessionStore,
  secret:            process.env.SESSION_SECRET || 'bp-longevity-secret-2024',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',        // blocks cookies on cross-site POSTs (basic CSRF mitigation) without full CSRF tokens
    secure:   IS_PRODUCTION, // requires HTTPS in production; local http:// dev still works
    maxAge:   7 * 24 * 60 * 60 * 1000
  }
}));

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Routers ──────────────────────────────────────────────────────────────
app.use('/api/auth',                      require('./src/server/routes/auth'));
app.use('/api/account',                   require('./src/server/routes/account'));
app.use('/api/images',                    require('./src/server/routes/images'));
app.use('/api/profiles',                  require('./src/server/routes/profiles'));
app.use('/api/profiles/:id/dashboard',    require('./src/server/routes/dashboard'));
app.use('/api/profiles/:id/log',          require('./src/server/routes/log'));
app.use('/api/profiles/:id/goals',        require('./src/server/routes/goals'));
app.use('/api/profiles/:id/training',     require('./src/server/routes/training'));
app.use('/api/profiles/:id/nutrition',    require('./src/server/routes/nutrition'));
app.use('/api/profiles/:id/supplements',  require('./src/server/routes/supplements'));
app.use('/api/profiles/:id/tracker',      require('./src/server/routes/tracker'));
app.use('/api/profiles/:id/ai',           require('./src/server/routes/ai'));

// ── Fallback error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n  Longevity Blueprint v3  →  http://localhost:${PORT}`);
  console.log(`  Uploads dir: ${UPLOADS_DIR}`);
  console.log(`  MySQL:       ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'longevity_blueprint'}`);
  console.log(`  (Run "npm run db:setup" first if you haven't created the schema yet.)\n`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
// Railway (and most PaaS hosts) sends SIGTERM on every redeploy/restart —
// completely routine, not a crash. But node server.js never handled it, so
// the process was just killed mid-flight; npm's `npm start` wrapper then
// logs that abrupt kill as "npm error signal SIGTERM", which reads as a
// failed deploy even though nothing actually broke. Catching the signal and
// exiting cleanly (code 0) once the server and DB connections are actually
// closed avoids that false alarm.
function shutdown(signal) {
  console.log(`\n  ${signal} received — shutting down gracefully...`);
  server.close(() => {
    sessionStore.close();
    pool.end().catch(() => {}).finally(() => process.exit(0));
  });
  // Don't hang forever if something above never resolves.
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
