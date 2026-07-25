/**
 * routes/tracker.js — Daily Exercise Tracker (Strava link + screenshots)
 *
 * API surface (new):
 *   GET    /api/profiles/:id/tracker/:date                      — { stravaUrl, notes, screenshots: [...] } | null
 *   PUT    /api/profiles/:id/tracker/:date                       — upsert stravaUrl/notes
 *   POST   /api/profiles/:id/tracker/:date/screenshots           — multipart/form-data, field: screenshots (multiple)
 *   DELETE /api/profiles/:id/tracker/:date/screenshots/:shotId
 *
 * Screenshots feed the OpenAI vision analyzer in routes/ai.js — this
 * router only handles storage/CRUD, not analysis.
 */

const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const { query }       = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const UPLOADS_ROOT = path.join(__dirname, '..', '..', '..', 'uploads', 'tracker');
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(UPLOADS_ROOT, req.params.id, req.params.date);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
});

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows.length > 0;
}

async function loadTracker(profileId, date) {
  const rows = await query('SELECT * FROM daily_trackers WHERE profile_id = ? AND date = ?', [profileId, date]);
  if (!rows[0]) return null;
  const shots = await query(
    'SELECT id, file_path, uploaded_at FROM tracker_screenshots WHERE tracker_id = ? ORDER BY uploaded_at ASC',
    [rows[0].id]
  );
  return {
    id: rows[0].id, date: rows[0].date, stravaUrl: rows[0].strava_url, notes: rows[0].notes,
    screenshots: shots.map(s => ({ id: s.id, url: s.file_path, uploadedAt: s.uploaded_at }))
  };
}

router.get('/:date', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.put('/:date', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { stravaUrl, notes } = req.body || {};
  const existing = await query('SELECT id FROM daily_trackers WHERE profile_id = ? AND date = ?', [req.params.id, req.params.date]);

  if (existing[0]) {
    await query('UPDATE daily_trackers SET strava_url = ?, notes = ? WHERE id = ?', [stravaUrl || null, notes || null, existing[0].id]);
  } else {
    await query(
      'INSERT INTO daily_trackers (id, profile_id, date, strava_url, notes) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), req.params.id, req.params.date, stravaUrl || null, notes || null]
    );
  }
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.post('/:date/screenshots', upload.array('screenshots', 10), async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });

  let trackerRows = await query('SELECT id FROM daily_trackers WHERE profile_id = ? AND date = ?', [req.params.id, req.params.date]);
  let trackerId;
  if (trackerRows[0]) {
    trackerId = trackerRows[0].id;
  } else {
    trackerId = crypto.randomUUID();
    await query('INSERT INTO daily_trackers (id, profile_id, date) VALUES (?, ?, ?)', [trackerId, req.params.id, req.params.date]);
  }

  for (const file of req.files) {
    const publicPath = `/uploads/tracker/${req.params.id}/${req.params.date}/${file.filename}`;
    await query(
      'INSERT INTO tracker_screenshots (id, tracker_id, file_path) VALUES (?, ?, ?)',
      [crypto.randomUUID(), trackerId, publicPath]
    );
  }

  res.status(201).json(await loadTracker(req.params.id, req.params.date));
});

router.delete('/:date/screenshots/:shotId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query(
    `SELECT ts.id, ts.file_path FROM tracker_screenshots ts
     JOIN daily_trackers dt ON dt.id = ts.tracker_id
     WHERE ts.id = ? AND dt.profile_id = ? AND dt.date = ?`,
    [req.params.shotId, req.params.id, req.params.date]
  );
  if (rows[0]) {
    const filePath = path.join(__dirname, '..', '..', '..', rows[0].file_path);
    if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ } }
    await query('DELETE FROM tracker_screenshots WHERE id = ?', [req.params.shotId]);
  }
  res.json(await loadTracker(req.params.id, req.params.date));
});

// Multer/file error handler for this router
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || (err && err.message && err.message.includes('Only'))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
