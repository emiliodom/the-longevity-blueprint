/**
 * routes/training.js — Week Training Builder (drag-and-drop week + blocks)
 *
 * API surface (new):
 *   GET    /api/training/block-templates
 *   GET    /api/profiles/:id/training/weeks
 *   POST   /api/profiles/:id/training/weeks                       — get-or-create by weekStartDate
 *   GET    /api/profiles/:id/training/weeks/:weekId
 *   PUT    /api/profiles/:id/training/weeks/:weekId                — e.g. link/unlink a goal
 *   DELETE /api/profiles/:id/training/weeks/:weekId
 *   POST   /api/profiles/:id/training/weeks/:weekId/blocks         — drop a palette block onto a day
 *   PUT    /api/profiles/:id/training/weeks/:weekId/blocks/:blockId — move/edit a block (drag to another day)
 *   DELETE /api/profiles/:id/training/weeks/:weekId/blocks/:blockId
 *   POST   /api/profiles/:id/training/weeks/:weekId/autobuild      — rules-based fill from a goal (lib/autobuild.js)
 *   GET    /api/profiles/:id/training/weeks/:weekId/export/csv
 *   GET    /api/profiles/:id/training/weeks/:weekId/export/ics
 *   GET    /api/profiles/:id/training/weeks/:weekId/export/pdf
 */

const express    = require('express');
const crypto     = require('crypto');
const PDFDocument = require('pdfkit');

const { query }              = require('../db/pool');
const { requireAuth }        = require('../middleware/auth');
const { BLOCK_TEMPLATES }    = require('../lib/templates');
const { buildWeekFromGoal }  = require('../lib/autobuild');
const { buildCsv }           = require('../lib/exporters/csv');
const { buildIcs }           = require('../lib/exporters/ics');
const { renderWeekPdf }      = require('../lib/exporters/pdf');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function assertOwnsProfile(profileId, userId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows[0] || null;
}

async function findOwnedWeek(weekId, profileId) {
  const rows = await query('SELECT * FROM training_weeks WHERE id = ? AND profile_id = ?', [weekId, profileId]);
  return rows[0] || null;
}

function toApiBlock(row) {
  return {
    id: row.id, weekId: row.week_id, dayOfWeek: row.day_of_week, startTime: row.start_time,
    durationMin: row.duration_min, blockType: row.block_type, title: row.title,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
    sortOrder: row.sort_order
  };
}

async function loadWeekWithBlocks(weekId) {
  const weeks = await query('SELECT * FROM training_weeks WHERE id = ?', [weekId]);
  if (!weeks[0]) return null;
  const blocks = await query('SELECT * FROM training_blocks WHERE week_id = ? ORDER BY day_of_week, sort_order', [weekId]);
  return {
    id: weeks[0].id, profileId: weeks[0].profile_id, weekStartDate: weeks[0].week_start_date,
    goalId: weeks[0].goal_id, blocks: blocks.map(toApiBlock)
  };
}

// ── Block templates (palette) ──────────────────────────────────────────────
router.get('/block-templates', (_req, res) => res.json(BLOCK_TEMPLATES));

// ── Weeks ────────────────────────────────────────────────────────────────
router.get('/weeks', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const rows = await query(
    'SELECT id, week_start_date, goal_id FROM training_weeks WHERE profile_id = ? ORDER BY week_start_date DESC',
    [req.params.id]
  );
  res.json(rows.map(r => ({ id: r.id, weekStartDate: r.week_start_date, goalId: r.goal_id })));
});

// Get-or-create by weekStartDate so the frontend can always "ensure this week exists"
router.post('/weeks', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });

  const { weekStartDate, goalId } = req.body || {};
  if (!weekStartDate) return res.status(400).json({ error: 'weekStartDate is required' });

  const existing = await query(
    'SELECT id FROM training_weeks WHERE profile_id = ? AND week_start_date = ?',
    [req.params.id, weekStartDate]
  );

  let weekId;
  if (existing[0]) {
    weekId = existing[0].id;
    if (goalId) await query('UPDATE training_weeks SET goal_id = ? WHERE id = ?', [goalId, weekId]);
  } else {
    weekId = crypto.randomUUID();
    await query(
      'INSERT INTO training_weeks (id, profile_id, week_start_date, goal_id) VALUES (?, ?, ?, ?)',
      [weekId, req.params.id, weekStartDate, goalId || null]
    );
  }

  res.status(existing[0] ? 200 : 201).json(await loadWeekWithBlocks(weekId));
});

router.get('/weeks/:weekId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  res.json(await loadWeekWithBlocks(req.params.weekId));
});

router.put('/weeks/:weekId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  const { goalId } = req.body || {};
  await query('UPDATE training_weeks SET goal_id = ? WHERE id = ?', [goalId || null, req.params.weekId]);
  res.json(await loadWeekWithBlocks(req.params.weekId));
});

router.delete('/weeks/:weekId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  await query('DELETE FROM training_weeks WHERE id = ?', [req.params.weekId]);
  res.json({ ok: true });
});

// ── Blocks ───────────────────────────────────────────────────────────────
router.post('/weeks/:weekId/blocks', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  const { dayOfWeek, startTime, durationMin, blockType, title, details, sortOrder } = req.body || {};
  if (dayOfWeek === undefined || !blockType || !title)
    return res.status(400).json({ error: 'dayOfWeek, blockType and title are required' });

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO training_blocks (id, week_id, day_of_week, start_time, duration_min, block_type, title, details, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.weekId, dayOfWeek, startTime || null, durationMin || null, blockType, title,
     JSON.stringify(details || {}), sortOrder || 0]
  );
  res.status(201).json(await loadWeekWithBlocks(req.params.weekId));
});

router.put('/weeks/:weekId/blocks/:blockId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  const existingRows = await query('SELECT * FROM training_blocks WHERE id = ? AND week_id = ?', [req.params.blockId, req.params.weekId]);
  if (!existingRows[0]) return res.status(404).json({ error: 'Block not found' });

  const merged = { ...toApiBlock(existingRows[0]), ...req.body };
  await query(
    `UPDATE training_blocks SET day_of_week=?, start_time=?, duration_min=?, block_type=?, title=?, details=?, sort_order=?
     WHERE id=?`,
    [merged.dayOfWeek, merged.startTime || null, merged.durationMin || null, merged.blockType, merged.title,
     JSON.stringify(merged.details || {}), merged.sortOrder || 0, req.params.blockId]
  );
  res.json(await loadWeekWithBlocks(req.params.weekId));
});

router.delete('/weeks/:weekId/blocks/:blockId', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedWeek(req.params.weekId, req.params.id)))
    return res.status(404).json({ error: 'Week not found' });

  await query('DELETE FROM training_blocks WHERE id = ? AND week_id = ?', [req.params.blockId, req.params.weekId]);
  res.json(await loadWeekWithBlocks(req.params.weekId));
});

// ── Auto-build from goal ───────────────────────────────────────────────────
router.post('/weeks/:weekId/autobuild', async (req, res) => {
  if (!(await assertOwnsProfile(req.params.id, req.session.userId)))
    return res.status(404).json({ error: 'Profile not found' });
  const week = await findOwnedWeek(req.params.weekId, req.params.id);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  const { goalId } = req.body || {};
  let goal = null;
  if (goalId) {
    const rows = await query('SELECT * FROM goals WHERE id = ? AND profile_id = ?', [goalId, req.params.id]);
    goal = rows[0] || null;
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    await query('UPDATE training_weeks SET goal_id = ? WHERE id = ?', [goalId, req.params.weekId]);
  }

  const generated = buildWeekFromGoal(goal, week.week_start_date);

  // Auto-build replaces the current block set for this week — the palette-based
  // manual edit flow is for tweaking after; re-running autobuild is an intentional reset.
  await query('DELETE FROM training_blocks WHERE week_id = ?', [req.params.weekId]);
  for (const b of generated) {
    await query(
      `INSERT INTO training_blocks (id, week_id, day_of_week, start_time, duration_min, block_type, title, details, sort_order)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0)`,
      [crypto.randomUUID(), req.params.weekId, b.day_of_week, b.duration_min, b.block_type, b.title, JSON.stringify(b.details)]
    );
  }

  res.json(await loadWeekWithBlocks(req.params.weekId));
});

// ── Exports ──────────────────────────────────────────────────────────────
router.get('/weeks/:weekId/export/csv', async (req, res) => {
  const profile = await assertOwnsProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const week = await loadWeekWithBlocks(req.params.weekId);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  const csv = buildCsv({ week_start_date: week.weekStartDate, blocks: week.blocks.map(b => ({
    day_of_week: b.dayOfWeek, start_time: b.startTime, duration_min: b.durationMin,
    block_type: b.blockType, title: b.title, details: b.details, sort_order: b.sortOrder
  })) });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="week-${week.weekStartDate}.csv"`);
  res.send(csv);
});

router.get('/weeks/:weekId/export/ics', async (req, res) => {
  const profile = await assertOwnsProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const week = await loadWeekWithBlocks(req.params.weekId);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  const ics = buildIcs({ week_start_date: week.weekStartDate, blocks: week.blocks.map(b => ({
    day_of_week: b.dayOfWeek, start_time: b.startTime, duration_min: b.durationMin,
    block_type: b.blockType, title: b.title
  })) }, profile.name);

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="week-${week.weekStartDate}.ics"`);
  res.send(ics);
});

router.get('/weeks/:weekId/export/pdf', async (req, res) => {
  const profile = await assertOwnsProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const week = await loadWeekWithBlocks(req.params.weekId);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  let goal = null;
  if (week.goalId) {
    const rows = await query('SELECT * FROM goals WHERE id = ?', [week.goalId]);
    goal = rows[0] || null;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="week-${week.weekStartDate}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  renderWeekPdf(doc, { week_start_date: week.weekStartDate, blocks: week.blocks.map(b => ({
    day_of_week: b.dayOfWeek, start_time: b.startTime, duration_min: b.durationMin,
    block_type: b.blockType, title: b.title
  })) }, profile.name, goal);
  doc.end();
});

module.exports = router;
