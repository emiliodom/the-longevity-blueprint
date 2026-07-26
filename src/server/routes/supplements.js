/**
 * routes/supplements.js — Supplements tracker (daily checklist)
 *
 * API surface (new):
 *   GET /api/profiles/:id/supplements/templates
 *   GET /api/profiles/:id/supplements/:date          — { date, taken: [supplementKey, ...] }
 *   PUT /api/profiles/:id/supplements/:date           — body { taken: [supplementKey, ...] }, replaces the whole day's set
 */

const express = require('express');
const crypto  = require('crypto');

const { query }         = require('../db/pool');
const { requireAuth }   = require('../middleware/auth');
const { SUPPLEMENT_TEMPLATES, findSupplement } = require('../lib/supplements');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows.length > 0;
}

router.get('/templates', (_req, res) => res.json(SUPPLEMENT_TEMPLATES));

router.get('/:date', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query(
    'SELECT supplement_key FROM supplement_intakes WHERE profile_id = ? AND date = ?',
    [req.params.id, req.params.date]
  );
  res.json({ date: req.params.date, taken: rows.map(r => r.supplement_key) });
});

router.put('/:date', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { taken } = req.body || {};
  if (!Array.isArray(taken)) return res.status(400).json({ error: 'taken must be an array of supplement keys' });

  const validKeys = taken.filter(key => findSupplement(key));
  if (validKeys.length !== taken.length) return res.status(400).json({ error: 'Unknown supplement key in taken[]' });

  await query('DELETE FROM supplement_intakes WHERE profile_id = ? AND date = ?', [req.params.id, req.params.date]);
  for (const key of validKeys) {
    await query(
      'INSERT INTO supplement_intakes (id, profile_id, date, supplement_key) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), req.params.id, req.params.date, key]
    );
  }

  res.json({ date: req.params.date, taken: validKeys });
});

module.exports = router;
