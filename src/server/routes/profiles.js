/**
 * routes/profiles.js — biometric profile CRUD (the "athlete" record)
 *
 * Every other domain (dashboard, log, goals, training weeks, tracker, AI
 * analyses) hangs off profile_id, so this stays the one place a new
 * athlete gets created — the app never assumes a single hard-coded user.
 *
 * API surface (unchanged from v2):
 *   GET    /api/profiles
 *   POST   /api/profiles
 *   GET    /api/profiles/:id
 *   PUT    /api/profiles/:id
 *   DELETE /api/profiles/:id
 */

const express = require('express');
const crypto  = require('crypto');

const { query }         = require('../db/pool');
const { requireAuth }   = require('../middleware/auth');
const { blankToNull }   = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

function toApiProfile(row) {
  return {
    id:        row.id,
    userId:    row.user_id,
    createdAt: row.created_at,
    name:      row.name,
    age:       row.age,
    weight:    row.weight === null ? null : Number(row.weight),
    height:    row.height === null ? null : Number(row.height),
    gender:    row.gender,
    restingHr: row.resting_hr,
    maxHr:     row.max_hr
  };
}

async function findOwnedProfile(id, userId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0] || null;
}

router.get('/', async (req, res) => {
  const rows = await query('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC', [req.session.userId]);
  res.json(rows.map(toApiProfile));
});

router.post('/', async (req, res) => {
  const { name, age, weight, height, gender, restingHr, maxHr } = req.body || {};
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO profiles (id, user_id, name, age, weight, height, gender, resting_hr, max_hr)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.session.userId, name, blankToNull(age), blankToNull(weight), blankToNull(height),
     blankToNull(gender), blankToNull(restingHr), blankToNull(maxHr)]
  );
  const profile = await findOwnedProfile(id, req.session.userId);
  res.status(201).json(toApiProfile(profile));
});

router.get('/:id', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(toApiProfile(profile));
});

router.put('/:id', async (req, res) => {
  const existing = await findOwnedProfile(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Profile not found' });

  const merged = { ...toApiProfile(existing), ...req.body };
  await query(
    `UPDATE profiles SET name=?, age=?, weight=?, height=?, gender=?, resting_hr=?, max_hr=? WHERE id=?`,
    [merged.name, blankToNull(merged.age), blankToNull(merged.weight), blankToNull(merged.height),
     blankToNull(merged.gender), blankToNull(merged.restingHr), blankToNull(merged.maxHr), req.params.id]
  );
  const updated = await findOwnedProfile(req.params.id, req.session.userId);
  res.json(toApiProfile(updated));
});

router.delete('/:id', async (req, res) => {
  const existing = await findOwnedProfile(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Profile not found' });

  // ON DELETE CASCADE (schema.sql) removes dashboards, workout_logs, goals,
  // training_weeks/blocks, daily_trackers/screenshots, and ai_analyses rows.
  await query('DELETE FROM profiles WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
