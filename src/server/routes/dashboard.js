/**
 * routes/dashboard.js — Daily Mission Control state (one JSON blob per profile)
 *
 * API surface (unchanged from v2):
 *   GET /api/profiles/:id/dashboard
 *   PUT /api/profiles/:id/dashboard
 */

const express = require('express');

const { query }       = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows.length > 0;
}

function parseData(row) {
  if (!row) return null;
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

router.get('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query('SELECT data FROM dashboards WHERE profile_id = ?', [req.params.id]);
  res.json(parseData(rows[0]));
});

router.put('/', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const data = JSON.stringify(req.body || {});
  await query(
    `INSERT INTO dashboards (profile_id, data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [req.params.id, data]
  );
  res.json(req.body || {});
});

module.exports = router;
