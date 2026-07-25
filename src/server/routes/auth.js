/**
 * routes/auth.js — register / login / logout / me / avatar upload
 *
 * API surface (unchanged from v2 — see docs/ARCHITECTURE.md):
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   POST /api/auth/avatar   (multipart/form-data, field: avatar)
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const { query }              = require('../db/pool');
const { requireAuth }        = require('../middleware/auth');
const { authLimiter }        = require('../middleware/rateLimit');
const { passwordPolicyError } = require('../lib/validation');

const router = express.Router();

const UPLOADS_DIR   = path.join(__dirname, '..', '..', '..', 'uploads', 'avatars');
const ALLOWED_MIME   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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

function toPublicUser(row) {
  return { id: row.id, email: row.email, avatar: row.avatar || null, preferredLanguage: row.preferred_language || 'en' };
}

// ── Register ─────────────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower))
    return res.status(400).json({ error: 'Invalid email address' });

  const pwError = passwordPolicyError(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const existing = await query('SELECT id FROM users WHERE email = ?', [emailLower]);
  if (existing.length)
    return res.status(409).json({ error: 'An account with that email already exists' });

  const hash = await bcrypt.hash(password, 12);
  const id   = crypto.randomUUID();
  await query(
    'INSERT INTO users (id, email, password_hash, avatar) VALUES (?, ?, ?, NULL)',
    [id, emailLower, hash]
  );

  req.session.userId = id;
  res.status(201).json({ id, email: emailLower, avatar: null, preferredLanguage: 'en' });
});

// ── Login ────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const rows = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  res.json(toPublicUser(user));
});

// ── Logout ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Me ───────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!rows[0]) return res.status(401).json({ error: 'User not found' });
  res.json(toPublicUser(rows[0]));
});

// ── Avatar upload ────────────────────────────────────────────────────────
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const rows = await query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.avatar) {
    const old = path.join(__dirname, '..', '..', '..', user.avatar);
    if (fs.existsSync(old)) { try { fs.unlinkSync(old); } catch { /* best-effort cleanup */ } }
  }

  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, user.id]);
  res.json({ avatar: avatarPath });
});

// Multer/file error handler for this router
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || (err && err.message && err.message.includes('Only'))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
