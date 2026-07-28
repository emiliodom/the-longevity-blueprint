/**
 * routes/ai.js — day/week/month AI analyzer endpoint
 *
 * API surface (new):
 *   POST /api/profiles/:id/ai/analyze   body: { scope: 'day'|'week'|'month', date, regenerate?: boolean }
 *
 * Results are cached in ai_analyses keyed by (profile_id, scope, period_start)
 * so repeat views of the same period don't re-spend OpenAI credits — pass
 * regenerate:true to force a fresh call.
 */

const express = require('express');
const path    = require('path');
const crypto  = require('crypto');

const { query }                     = require('../db/pool');
const { requireAuth }               = require('../middleware/auth');
const { analyze }                   = require('../lib/openai');
const { getQuotaStatus, recordUsage } = require('../lib/quota');
const { macrosFor }                 = require('../lib/foods');
const { findSupplement }            = require('../lib/supplements');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function findOwnedProfile(profileId, userId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows[0] || null;
}

// YYYY-MM-DD from local date parts — NOT toISOString(), which converts to UTC
// and would silently shift the date by one for servers running east of UTC.
function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function periodFor(scope, dateIso) {
  const d = new Date(`${dateIso}T00:00:00`);
  if (scope === 'day') {
    return { start: dateIso, end: dateIso };
  }
  if (scope === 'week') {
    const day = (d.getDay() + 6) % 7; // 0=Mon
    const start = new Date(d); start.setDate(d.getDate() - day);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return { start: toIsoDateLocal(start), end: toIsoDateLocal(end) };
  }
  if (scope === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toIsoDateLocal(start), end: toIsoDateLocal(end) };
  }
  return null;
}

router.post('/analyze', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { scope, date, regenerate } = req.body || {};
  if (!['day', 'week', 'month'].includes(scope) || !date)
    return res.status(400).json({ error: 'scope (day|week|month) and date are required' });

  const period = periodFor(scope, date);

  if (!regenerate) {
    const cached = await query(
      'SELECT * FROM ai_analyses WHERE profile_id = ? AND scope = ? AND period_start = ?',
      [req.params.id, scope, period.start]
    );
    if (cached[0]) {
      return res.json({
        summary: cached[0].summary, periodStart: cached[0].period_start,
        periodEnd: cached[0].period_end, cached: true, createdAt: cached[0].created_at
      });
    }
  }

  // Only counts against the quota once we're actually about to spend an
  // OpenAI call — cached reads above already returned and never reach here.
  const quota = await getQuotaStatus(req.session.userId, 'ai_analyze');
  if (!quota.allowed) {
    return res.status(429).json({
      error: `Daily AI analysis limit reached (${quota.used}/${quota.limit} in the last ${quota.windowHours}h). Try again later.`,
      ...quota
    });
  }

  try {
    const logs = await query(
      'SELECT * FROM workout_logs WHERE profile_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
      [req.params.id, period.start, period.end]
    );
    // Nested per-day/per-activity shape for lib/openai.js — deliberately
    // drops strava_url (see that file's buildIntro() note: not fetchable,
    // so it isn't sent to the model at all) and keeps each activity's own
    // screenshots grouped with it rather than one flat pool for the day.
    const trackers = await query(
      'SELECT * FROM daily_trackers WHERE profile_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
      [req.params.id, period.start, period.end]
    );
    const trackerIds = trackers.map(t => t.id);
    let activityRows = [], legacyShotRows = [];
    if (trackerIds.length) {
      const placeholders = trackerIds.map(() => '?').join(',');
      activityRows = await query(
        `SELECT * FROM tracker_activities WHERE tracker_id IN (${placeholders}) ORDER BY sort_order ASC, created_at ASC`,
        trackerIds
      );
      legacyShotRows = await query(
        `SELECT tracker_id, file_path FROM tracker_screenshots WHERE tracker_id IN (${placeholders}) AND activity_id IS NULL`,
        trackerIds
      );
    }
    const activityIds = activityRows.map(a => a.id);
    let activityShotRows = [];
    if (activityIds.length) {
      const placeholders = activityIds.map(() => '?').join(',');
      activityShotRows = await query(
        `SELECT activity_id, file_path FROM tracker_screenshots WHERE activity_id IN (${placeholders})`,
        activityIds
      );
    }
    const toAbs = p => path.join(__dirname, '..', '..', '..', p);
    const trackersByDate = trackers.map(t => {
      const activities = activityRows
        .filter(a => a.tracker_id === t.id)
        .map(a => ({
          name: a.name, notes: a.notes,
          screenshotPaths: activityShotRows.filter(s => s.activity_id === a.id).map(s => toAbs(s.file_path))
        }));
      // Legacy pre-multi-activity data (see routes/tracker.js's loadTracker()
      // comment): synthesize the same single pseudo-activity here too, so
      // an un-promoted old entry still gets analyzed instead of vanishing.
      if (!activities.length && (t.strava_url || t.notes || legacyShotRows.some(s => s.tracker_id === t.id))) {
        activities.push({
          name: null, notes: t.notes,
          screenshotPaths: legacyShotRows.filter(s => s.tracker_id === t.id).map(s => toAbs(s.file_path))
        });
      }
      return { date: t.date, activities };
    });

    // Meal items don't carry an absolute date — they're (week_start_date +
    // day_of_week) on their plan — so the date-range filter is computed in
    // SQL via DATE_ADD rather than fetched wholesale and filtered in JS.
    const mealRows = await query(
      `SELECT mpi.day_of_week, mpi.meal_slot, mpi.food_id, mpi.grams,
              DATE_ADD(mp.week_start_date, INTERVAL mpi.day_of_week DAY) AS meal_date
       FROM meal_plan_items mpi
       JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
       WHERE mp.profile_id = ?
         AND DATE_ADD(mp.week_start_date, INTERVAL mpi.day_of_week DAY) BETWEEN ? AND ?
       ORDER BY meal_date ASC`,
      [req.params.id, period.start, period.end]
    );
    const meals = mealRows.map(m => ({
      date: m.meal_date, mealSlot: m.meal_slot, foodId: m.food_id, grams: Number(m.grams),
      macros: macrosFor(m.food_id, Number(m.grams))
    }));

    const supplementRows = await query(
      'SELECT date, supplement_key FROM supplement_intakes WHERE profile_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
      [req.params.id, period.start, period.end]
    );
    const supplementsTaken = supplementRows.map(s => ({
      date: s.date, name: findSupplement(s.supplement_key)?.name || s.supplement_key
    }));

    const result = await analyze({ scope, profile, logs, trackersByDate, meals, supplementsTaken });

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO ai_analyses (id, profile_id, scope, period_start, period_end, summary, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE summary = VALUES(summary), raw_response = VALUES(raw_response), created_at = CURRENT_TIMESTAMP`,
      [id, req.params.id, scope, period.start, period.end, result.summary, JSON.stringify(result.raw)]
    );
    await recordUsage(req.session.userId, 'ai_analyze');

    res.json({ summary: result.summary, periodStart: period.start, periodEnd: period.end, cached: false });
  } catch (err) {
    res.status(502).json({ error: err.message || 'AI analysis failed' });
  }
});

module.exports = router;
