/**
 * routes/log.js — Exercise Journal (run / cycle / lift sessions)
 *
 * API surface (unchanged from v2):
 *   GET    /api/profiles/:id/log
 *   POST   /api/profiles/:id/log
 *   DELETE /api/profiles/:id/log/:entryId
 */

const express = require('express');
const crypto  = require('crypto');

const { query }       = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows.length > 0;
}

function toApiEntry(row) {
  return {
    id: row.id, type: row.type, date: row.date,
    duration: row.duration, distance: row.distance,
    weight: row.weight, reps: row.reps, notes: row.notes
  };
}

async function loadLog(profileId) {
  const rows = await query(
    'SELECT * FROM workout_logs WHERE profile_id = ? ORDER BY created_at DESC',
    [profileId]
  );
  return rows.map(toApiEntry);
}

router.get('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  res.json(await loadLog(req.params.id));
});

router.post('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { type, date, duration, distance, weight, reps, notes } = req.body || {};
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO workout_logs (id, profile_id, type, date, duration, distance, weight, reps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.id, type, date, duration ?? null, distance ?? null, weight ?? null, reps ?? null, notes ?? null]
  );
  res.status(201).json(await loadLog(req.params.id));
});

router.delete('/:entryId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  await query('DELETE FROM workout_logs WHERE id = ? AND profile_id = ?', [req.params.entryId, req.params.id]);
  res.json(await loadLog(req.params.id));
});

module.exports = router;
