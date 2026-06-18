/**
 * Longevity Blueprint — Express Server v2
 *
 * Auth:    express-session + bcryptjs (12 rounds)
 * Storage: split JSON files under data/
 * Avatars: multer → uploads/avatars/ (2 MB, JPEG/PNG/WebP/GIF only)
 *
 * API surface:
 *   GET  /api/health
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   POST /api/auth/avatar          (multipart/form-data, field: avatar)
 *   GET    /api/profiles
 *   POST   /api/profiles
 *   GET    /api/profiles/:id
 *   PUT    /api/profiles/:id
 *   DELETE /api/profiles/:id
 *   GET    /api/profiles/:id/dashboard
 *   PUT    /api/profiles/:id/dashboard
 *   GET    /api/profiles/:id/log
 *   POST   /api/profiles/:id/log
 *   DELETE /api/profiles/:id/log/:entryId
 */

const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Directories ────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'avatars');

[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Split-file DB helpers ──────────────────────────────────────────────────
const FILE = {
  users:      path.join(DATA_DIR, 'users.json'),
  profiles:   path.join(DATA_DIR, 'profiles.json'),
  dashboards: path.join(DATA_DIR, 'dashboards.json'),
  logs:       path.join(DATA_DIR, 'logs.json'),
};
const EMPTY_FOR = { users: [], profiles: [], dashboards: {}, logs: {} };

function readFile(key) {
  const empty = EMPTY_FOR[key];
  if (!fs.existsSync(FILE[key])) {
    fs.writeFileSync(FILE[key], JSON.stringify(empty, null, 2));
    return Array.isArray(empty) ? [] : {};
  }
  try {
    return JSON.parse(fs.readFileSync(FILE[key], 'utf8'));
  } catch {
    console.warn(`[db] ${key}.json corrupted — resetting`);
    fs.writeFileSync(FILE[key], JSON.stringify(empty, null, 2));
    return Array.isArray(empty) ? [] : {};
  }
}

function writeFile(key, data) {
  fs.writeFileSync(FILE[key], JSON.stringify(data, null, 2));
}

// ── Multer avatar upload ───────────────────────────────────────────────────
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.session.userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: avatarStorage,
  limits:  { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'bp-longevity-secret-2024',
  resave:            false,
  saveUninitialized: false,
  cookie:            { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── Auth guard ─────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Auth: register ─────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower))
    return res.status(400).json({ error: 'Invalid email address' });

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
    return res.status(400).json({
      error: 'Password must be at least 8 characters with 1 uppercase letter and 1 number'
    });

  const users = readFile('users');
  if (users.find(u => u.email === emailLower))
    return res.status(409).json({ error: 'An account with that email already exists' });

  const hash = await bcrypt.hash(password, 12);
  const user = {
    id:           Date.now().toString(),
    email:        emailLower,
    passwordHash: hash,
    avatar:       null,
    createdAt:    new Date().toISOString()
  };
  users.push(user);
  writeFile('users', users);

  req.session.userId = user.id;
  res.status(201).json({ id: user.id, email: user.email, avatar: user.avatar });
});

// ── Auth: login ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const users = readFile('users');
  const user  = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok)  return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, avatar: user.avatar || null });
});

// ── Auth: logout ───────────────────────────────────────────────────────────
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Auth: me ───────────────────────────────────────────────────────────────
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = readFile('users').find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, avatar: user.avatar || null });
});

// ── Auth: avatar upload ────────────────────────────────────────────────────
app.post('/api/auth/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const users = readFile('users');
  const idx   = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  // Remove old avatar file if present
  if (users[idx].avatar) {
    const old = path.join(__dirname, users[idx].avatar);
    if (fs.existsSync(old)) { try { fs.unlinkSync(old); } catch {} }
  }

  users[idx].avatar = `/uploads/avatars/${req.file.filename}`;
  writeFile('users', users);
  res.json({ avatar: users[idx].avatar });
});

// Multer/file error handler
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Only')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ── Profiles (auth-scoped) ─────────────────────────────────────────────────
app.get('/api/profiles', requireAuth, (req, res) => {
  res.json(readFile('profiles').filter(p => p.userId === req.session.userId));
});

app.post('/api/profiles', requireAuth, (req, res) => {
  const profiles = readFile('profiles');
  const profile  = {
    id:        Date.now().toString(),
    userId:    req.session.userId,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  profiles.push(profile);
  writeFile('profiles', profiles);
  res.status(201).json(profile);
});

app.get('/api/profiles/:id', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  res.json(p);
});

app.put('/api/profiles/:id', requireAuth, (req, res) => {
  const profiles = readFile('profiles');
  const idx      = profiles.findIndex(p => p.id === req.params.id && p.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
  profiles[idx] = { ...profiles[idx], ...req.body };
  writeFile('profiles', profiles);
  res.json(profiles[idx]);
});

app.delete('/api/profiles/:id', requireAuth, (req, res) => {
  const profiles = readFile('profiles');
  const exists   = profiles.find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!exists) return res.status(404).json({ error: 'Profile not found' });

  writeFile('profiles', profiles.filter(p => p.id !== req.params.id));

  const dashboards = readFile('dashboards');
  delete dashboards[req.params.id];
  writeFile('dashboards', dashboards);

  const logs = readFile('logs');
  delete logs[req.params.id];
  writeFile('logs', logs);

  res.json({ ok: true });
});

// ── Dashboard state ───────────────────────────────────────────────────────
app.get('/api/profiles/:id/dashboard', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  res.json(readFile('dashboards')[req.params.id] || null);
});

app.put('/api/profiles/:id/dashboard', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  const dashboards = readFile('dashboards');
  dashboards[req.params.id] = req.body;
  writeFile('dashboards', dashboards);
  res.json(dashboards[req.params.id]);
});

// ── Workout log ───────────────────────────────────────────────────────────
app.get('/api/profiles/:id/log', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  res.json(readFile('logs')[req.params.id] || []);
});

app.post('/api/profiles/:id/log', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  const logs = readFile('logs');
  if (!logs[req.params.id]) logs[req.params.id] = [];
  const entry = { id: Date.now().toString(), ...req.body };
  logs[req.params.id].unshift(entry);
  writeFile('logs', logs);
  res.status(201).json(logs[req.params.id]);
});

app.delete('/api/profiles/:id/log/:entryId', requireAuth, (req, res) => {
  const p = readFile('profiles').find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  const logs = readFile('logs');
  if (logs[req.params.id]) {
    logs[req.params.id] = logs[req.params.id].filter(e => e.id !== req.params.entryId);
    writeFile('logs', logs);
  }
  res.json(logs[req.params.id] || []);
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Longevity Blueprint v2  →  http://localhost:${PORT}`);
  console.log(`  Data dir:    ${DATA_DIR}`);
  console.log(`  Uploads dir: ${UPLOADS_DIR}\n`);
});
