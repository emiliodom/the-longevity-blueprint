/**
 * routes/goals.js — Goal Dashboard (milestones per profile)
 *
 * Mounted at /api/profiles/:id/goals (see server.js) — API surface (new):
 *   GET    /api/profiles/:id/goals/templates   — static milestone templates
 *   GET    /api/profiles/:id/goals
 *   POST   /api/profiles/:id/goals
 *   PUT    /api/profiles/:id/goals/:goalId
 *   DELETE /api/profiles/:id/goals/:goalId
 */

const express = require('express');
const crypto  = require('crypto');

const { query }         = require('../db/pool');
const { requireAuth }   = require('../middleware/auth');
const { GOAL_TEMPLATES } = require('../lib/templates');
const { blankToNull }   = require('../lib/validation');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows.length > 0;
}

function toApiGoal(row) {
  return {
    id: row.id, profileId: row.profile_id, title: row.title, goalType: row.goal_type,
    targetDate: row.target_date, targetValue: row.target_value === null ? null : Number(row.target_value),
    unit: row.unit, currentValue: row.current_value === null ? null : Number(row.current_value),
    notes: row.notes, status: row.status, createdAt: row.created_at
  };
}

router.get('/templates', (_req, res) => res.json(GOAL_TEMPLATES));

router.get('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query(
    'SELECT * FROM goals WHERE profile_id = ? ORDER BY (target_date IS NULL), target_date ASC',
    [req.params.id]
  );
  res.json(rows.map(toApiGoal));
});

router.post('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { title, goalType, targetDate, targetValue, unit, currentValue, notes } = req.body || {};
  if (!title || !goalType) return res.status(400).json({ error: 'title and goalType are required' });

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO goals (id, profile_id, title, goal_type, target_date, target_value, unit, current_value, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [id, req.params.id, title, goalType, blankToNull(targetDate), blankToNull(targetValue),
     blankToNull(unit), blankToNull(currentValue), blankToNull(notes)]
  );
  const rows = await query('SELECT * FROM goals WHERE id = ?', [id]);
  res.status(201).json(toApiGoal(rows[0]));
});

router.put('/:goalId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const existingRows = await query('SELECT * FROM goals WHERE id = ? AND profile_id = ?', [req.params.goalId, req.params.id]);
  if (!existingRows[0]) return res.status(404).json({ error: 'Goal not found' });

  const merged = { ...toApiGoal(existingRows[0]), ...req.body };
  await query(
    `UPDATE goals SET title=?, goal_type=?, target_date=?, target_value=?, unit=?, current_value=?, notes=?, status=?
     WHERE id=?`,
    [merged.title, merged.goalType, blankToNull(merged.targetDate), blankToNull(merged.targetValue),
     blankToNull(merged.unit), blankToNull(merged.currentValue), blankToNull(merged.notes), merged.status, req.params.goalId]
  );
  const rows = await query('SELECT * FROM goals WHERE id = ?', [req.params.goalId]);
  res.json(toApiGoal(rows[0]));
});

router.delete('/:goalId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  await query('DELETE FROM goals WHERE id = ? AND profile_id = ?', [req.params.goalId, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
