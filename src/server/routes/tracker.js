/**
 * routes/tracker.js — Daily Exercise Tracker (multiple activities/day, each
 * with its own name + Strava link + notes + screenshots)
 *
 * API surface:
 *   GET    /api/profiles/:id/tracker/:date                                — { id, date, activities: [{ id, name, stravaUrl, notes, sortOrder, screenshots: [...] }] }
 *   POST   /api/profiles/:id/tracker/:date/activities                     — add an activity, body { name, stravaUrl, notes }
 *   PUT    /api/profiles/:id/tracker/:date/activities/:activityId         — edit an activity
 *   DELETE /api/profiles/:id/tracker/:date/activities/:activityId         — remove an activity + its screenshots
 *   POST   /api/profiles/:id/tracker/:date/activities/:activityId/screenshots — multipart/form-data, field: screenshots (multiple)
 *   DELETE /api/profiles/:id/tracker/:date/screenshots/:shotId
 *
 *   PUT    /api/profiles/:id/tracker/:date/wellness                          — upsert the day's single Wellness Track entry, body { name, description, link, score }
 *   POST   /api/profiles/:id/tracker/:date/wellness/screenshots              — multipart/form-data, field: screenshots (multiple); creates the wellness row first if none exists yet
 *   DELETE /api/profiles/:id/tracker/:date/wellness/screenshots/:shotId
 *
 * Wellness Track (tracker_wellness) is a separate, single-row-per-day
 * concept from tracker_activities — for wearable-summary data (e.g. Samsung
 * Galaxy Watch daily score) that isn't a logged activity. It never gets the
 * legacy-pseudo-activity treatment: it didn't exist before this table did,
 * so there's no old data to synthesize.
 *
 * Screenshots feed the OpenAI vision analyzer in routes/ai.js — this
 * router only handles storage/CRUD, not analysis.
 *
 * Legacy data: before tracker_activities existed, a day held one
 * strava_url/notes pair directly on daily_trackers, with screenshots
 * attached to the day rather than an activity. loadTracker() synthesizes
 * that old data as a pseudo-activity (id: 'legacy') so it keeps displaying
 * — nothing was migrated or dropped. Editing or deleting that pseudo-
 * activity "promotes" it into a real tracker_activities row on first touch
 * (see the :activityId === 'legacy' branches below), after which it behaves
 * like any other activity and the old daily_trackers columns are cleared.
 */

const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const { query }                     = require('../db/pool');
const { requireAuth }               = require('../middleware/auth');
const { getQuotaStatus, recordUsage } = require('../lib/quota');

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

async function findOwnedTracker(profileId, date) {
  const rows = await query('SELECT * FROM daily_trackers WHERE profile_id = ? AND date = ?', [profileId, date]);
  return rows[0] || null;
}

// INSERT ... ON DUPLICATE KEY UPDATE (rather than SELECT-then-INSERT) so two
// requests racing for the same (profile_id, date) — e.g. a double-clicked
// "+ Add activity" button — don't both see "no row yet" and collide on the
// uniq_profile_date key, which surfaced to users as "Failed to add activity".
async function ensureTracker(profileId, date) {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO daily_trackers (id, profile_id, date) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
    [id, profileId, date]
  );
  const existing = await findOwnedTracker(profileId, date);
  return existing.id;
}

async function loadTracker(profileId, date) {
  const tracker = await findOwnedTracker(profileId, date);
  if (!tracker) return { id: null, date, activities: [], wellness: null };

  const [activityRows, shotRows, wellnessRows] = await Promise.all([
    query('SELECT * FROM tracker_activities WHERE tracker_id = ? ORDER BY sort_order ASC, created_at ASC', [tracker.id]),
    query('SELECT id, activity_id, file_path, uploaded_at FROM tracker_screenshots WHERE tracker_id = ? ORDER BY uploaded_at ASC', [tracker.id]),
    query('SELECT * FROM tracker_wellness WHERE tracker_id = ?', [tracker.id])
  ]);

  const shotsFor = activityId => shotRows
    .filter(s => s.activity_id === activityId)
    .map(s => ({ id: s.id, url: s.file_path, uploadedAt: s.uploaded_at }));

  const activities = activityRows.map(a => ({
    id: a.id, name: a.name, stravaUrl: a.strava_url, notes: a.notes, sortOrder: a.sort_order,
    screenshots: shotsFor(a.id)
  }));

  // Legacy pseudo-activity: only synthesized when no real tracker_activities
  // row exists yet AND there's actually legacy data to show (old
  // strava_url/notes, or orphan screenshots with activity_id NULL).
  const orphanShots = shotsFor(null);
  if (!activityRows.length && (tracker.strava_url || tracker.notes || orphanShots.length)) {
    activities.unshift({
      id: 'legacy', name: null, stravaUrl: tracker.strava_url, notes: tracker.notes, sortOrder: -1,
      screenshots: orphanShots
    });
  }

  const wellnessRow = wellnessRows[0] || null;
  let wellness = null;
  if (wellnessRow) {
    const wellnessShots = await query(
      'SELECT id, file_path, uploaded_at FROM wellness_screenshots WHERE wellness_id = ? ORDER BY uploaded_at ASC',
      [wellnessRow.id]
    );
    wellness = {
      id: wellnessRow.id, name: wellnessRow.name, description: wellnessRow.description,
      link: wellnessRow.link, score: wellnessRow.score,
      screenshots: wellnessShots.map(s => ({ id: s.id, url: s.file_path, uploadedAt: s.uploaded_at }))
    };
  }

  return { id: tracker.id, date: tracker.date, activities, wellness };
}

// Same SELECT-then-INSERT race ensureTracker() above already fixed for
// daily_trackers — two overlapping requests (e.g. Save Wellness plus an
// immediate screenshot upload) could both see no row yet and collide on
// tracker_wellness's uniq_wellness_tracker key. Same atomic-upsert fix.
async function ensureWellness(trackerId) {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO tracker_wellness (id, tracker_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
    [id, trackerId]
  );
  const existing = await query('SELECT id FROM tracker_wellness WHERE tracker_id = ?', [trackerId]);
  return existing[0].id;
}

async function findOwnedActivity(profileId, date, activityId) {
  const tracker = await findOwnedTracker(profileId, date);
  if (!tracker) return null;
  if (activityId === 'legacy') return { tracker, activity: null }; // promoted on first write, see below
  const rows = await query('SELECT * FROM tracker_activities WHERE id = ? AND tracker_id = ?', [activityId, tracker.id]);
  return rows[0] ? { tracker, activity: rows[0] } : null;
}

router.get('/:date', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.post('/:date/activities', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { name, stravaUrl, notes } = req.body || {};
  const trackerId = await ensureTracker(req.params.id, req.params.date);
  const maxOrder = await query('SELECT COALESCE(MAX(sort_order), -1) AS m FROM tracker_activities WHERE tracker_id = ?', [trackerId]);

  await query(
    'INSERT INTO tracker_activities (id, tracker_id, name, strava_url, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), trackerId, name || null, stravaUrl || null, notes || null, maxOrder[0].m + 1]
  );
  res.status(201).json(await loadTracker(req.params.id, req.params.date));
});

router.put('/:date/activities/:activityId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const found = await findOwnedActivity(req.params.id, req.params.date, req.params.activityId);
  if (!found) return res.status(404).json({ error: 'Activity not found' });

  const { name, stravaUrl, notes } = req.body || {};

  if (req.params.activityId === 'legacy') {
    // First edit of the synthesized legacy pseudo-activity: promote it into
    // a real row, reassign any orphan screenshots to it, and clear the old
    // day-level columns so it isn't synthesized again alongside this one.
    const newId = crypto.randomUUID();
    await query(
      'INSERT INTO tracker_activities (id, tracker_id, name, strava_url, notes, sort_order) VALUES (?, ?, ?, ?, ?, 0)',
      [newId, found.tracker.id, name || null, stravaUrl || null, notes || null]
    );
    await query('UPDATE tracker_screenshots SET activity_id = ? WHERE tracker_id = ? AND activity_id IS NULL', [newId, found.tracker.id]);
    await query('UPDATE daily_trackers SET strava_url = NULL, notes = NULL WHERE id = ?', [found.tracker.id]);
  } else {
    await query(
      'UPDATE tracker_activities SET name = ?, strava_url = ?, notes = ? WHERE id = ?',
      [name || null, stravaUrl || null, notes || null, found.activity.id]
    );
  }
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.delete('/:date/activities/:activityId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const found = await findOwnedActivity(req.params.id, req.params.date, req.params.activityId);
  if (!found) return res.status(404).json({ error: 'Activity not found' });

  const activityId = req.params.activityId === 'legacy' ? null : found.activity.id;
  const shots = await query(
    activityId === null
      ? 'SELECT id, file_path FROM tracker_screenshots WHERE tracker_id = ? AND activity_id IS NULL'
      : 'SELECT id, file_path FROM tracker_screenshots WHERE activity_id = ?',
    activityId === null ? [found.tracker.id] : [activityId]
  );
  shots.forEach(s => {
    const filePath = path.join(__dirname, '..', '..', '..', s.file_path);
    if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ } }
  });
  if (shots.length) await query(`DELETE FROM tracker_screenshots WHERE id IN (${shots.map(() => '?').join(',')})`, shots.map(s => s.id));

  if (req.params.activityId === 'legacy') {
    await query('UPDATE daily_trackers SET strava_url = NULL, notes = NULL WHERE id = ?', [found.tracker.id]);
  } else {
    await query('DELETE FROM tracker_activities WHERE id = ?', [found.activity.id]);
  }
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.post('/:date/activities/:activityId/screenshots', upload.array('screenshots', 10), async (req, res) => {
  const cleanup = () => (req.files || []).forEach(f => { try { fs.unlinkSync(f.path); } catch { /* best-effort cleanup */ } });

  if (!(await assertOwnsProfile(req.params.id, req.session.userId))) { cleanup(); return res.status(404).json({ error: 'Profile not found' }); }
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });

  const found = await findOwnedActivity(req.params.id, req.params.date, req.params.activityId);
  if (!found) { cleanup(); return res.status(404).json({ error: 'Activity not found' }); }

  // Quota check happens after multer has already written the files to disk
  // (we don't know the file count until the multipart body is parsed) — if
  // this batch would exceed the daily cap, delete them and reject instead
  // of silently keeping orphaned uploads.
  const quota = await getQuotaStatus(req.session.userId, 'screenshot_upload', req.files.length);
  if (!quota.allowed) {
    cleanup();
    return res.status(429).json({
      error: `Daily screenshot upload limit reached (${quota.used}/${quota.limit} in the last ${quota.windowHours}h). Try again later.`,
      ...quota
    });
  }

  // Uploading to the legacy pseudo-activity attaches as an orphan
  // (activity_id NULL) — consistent with how existing legacy screenshots
  // are already stored — rather than silently promoting it here too.
  const activityId = req.params.activityId === 'legacy' ? null : found.activity.id;
  for (const file of req.files) {
    const publicPath = `/uploads/tracker/${req.params.id}/${req.params.date}/${file.filename}`;
    await query(
      'INSERT INTO tracker_screenshots (id, tracker_id, activity_id, file_path) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), found.tracker.id, activityId, publicPath]
    );
  }
  await recordUsage(req.session.userId, 'screenshot_upload', req.files.length);

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

router.put('/:date/wellness', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { name, description, link, score } = req.body || {};
  const trackerId = await ensureTracker(req.params.id, req.params.date);
  const wellnessId = await ensureWellness(trackerId);

  await query(
    'UPDATE tracker_wellness SET name = ?, description = ?, link = ?, score = ? WHERE id = ?',
    [name || null, description || null, link || null, (score === '' || score === undefined) ? null : score, wellnessId]
  );
  res.json(await loadTracker(req.params.id, req.params.date));
});

router.post('/:date/wellness/screenshots', upload.array('screenshots', 10), async (req, res) => {
  const cleanup = () => (req.files || []).forEach(f => { try { fs.unlinkSync(f.path); } catch { /* best-effort cleanup */ } });

  if (!(await assertOwnsProfile(req.params.id, req.session.userId))) { cleanup(); return res.status(404).json({ error: 'Profile not found' }); }
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });

  const quota = await getQuotaStatus(req.session.userId, 'screenshot_upload', req.files.length);
  if (!quota.allowed) {
    cleanup();
    return res.status(429).json({
      error: `Daily screenshot upload limit reached (${quota.used}/${quota.limit} in the last ${quota.windowHours}h). Try again later.`,
      ...quota
    });
  }

  const trackerId = await ensureTracker(req.params.id, req.params.date);
  const wellnessId = await ensureWellness(trackerId);
  for (const file of req.files) {
    const publicPath = `/uploads/tracker/${req.params.id}/${req.params.date}/${file.filename}`;
    await query(
      'INSERT INTO wellness_screenshots (id, wellness_id, file_path) VALUES (?, ?, ?)',
      [crypto.randomUUID(), wellnessId, publicPath]
    );
  }
  await recordUsage(req.session.userId, 'screenshot_upload', req.files.length);

  res.status(201).json(await loadTracker(req.params.id, req.params.date));
});

router.delete('/:date/wellness/screenshots/:shotId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query(
    `SELECT ws.id, ws.file_path FROM wellness_screenshots ws
     JOIN tracker_wellness tw ON tw.id = ws.wellness_id
     JOIN daily_trackers dt ON dt.id = tw.tracker_id
     WHERE ws.id = ? AND dt.profile_id = ? AND dt.date = ?`,
    [req.params.shotId, req.params.id, req.params.date]
  );
  if (rows[0]) {
    const filePath = path.join(__dirname, '..', '..', '..', rows[0].file_path);
    if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ } }
    await query('DELETE FROM wellness_screenshots WHERE id = ?', [req.params.shotId]);
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
