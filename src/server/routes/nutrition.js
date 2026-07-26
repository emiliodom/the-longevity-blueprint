/**
 * routes/nutrition.js — Calorie & Food Planner (Guatemalan food, per week)
 *
 * API surface (new):
 *   GET    /api/profiles/:id/nutrition/foods
 *   POST   /api/profiles/:id/nutrition/weeks                        — get-or-create by weekStartDate
 *   GET    /api/profiles/:id/nutrition/weeks/:planId
 *   POST   /api/profiles/:id/nutrition/weeks/:planId/items
 *   PUT    /api/profiles/:id/nutrition/weeks/:planId/items/:itemId
 *   DELETE /api/profiles/:id/nutrition/weeks/:planId/items/:itemId
 *
 * Computed macros (per item, per day, per week) are derived server-side
 * from lib/foods.js on every read — grams are the only thing stored, so
 * changing a food's macro data in foods.js doesn't require a migration.
 */

const express = require('express');
const crypto  = require('crypto');

const { query }            = require('../db/pool');
const { requireAuth }      = require('../middleware/auth');
const { FOOD_TEMPLATES, macrosFor } = require('../lib/foods');
const { dailyTarget }      = require('../lib/nutritionTargets');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

async function findOwnedProfile(profileId, userId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, userId]);
  return rows[0] || null;
}

async function findOwnedPlan(planId, profileId) {
  const rows = await query('SELECT * FROM meal_plans WHERE id = ? AND profile_id = ?', [planId, profileId]);
  return rows[0] || null;
}

function toApiItem(row) {
  const macros = macrosFor(row.food_id, Number(row.grams));
  return {
    id: row.id, planId: row.meal_plan_id, dayOfWeek: row.day_of_week, mealSlot: row.meal_slot,
    foodId: row.food_id, grams: Number(row.grams), sortOrder: row.sort_order, macros
  };
}

async function loadPlanWithItems(planId, profile) {
  const plans = await query('SELECT * FROM meal_plans WHERE id = ?', [planId]);
  if (!plans[0]) return null;
  const itemRows = await query(
    'SELECT * FROM meal_plan_items WHERE meal_plan_id = ? ORDER BY day_of_week, meal_slot, sort_order',
    [planId]
  );
  const items = itemRows.map(toApiItem);

  const round1 = n => Math.round(n * 10) / 10;
  const totalsByDay = Array.from({ length: 7 }, (_, day) => {
    const dayItems = items.filter(i => i.dayOfWeek === day);
    const raw = dayItems.reduce((acc, i) => ({
      kcal: acc.kcal + i.macros.kcal, protein: acc.protein + i.macros.protein,
      carbs: acc.carbs + i.macros.carbs, fat: acc.fat + i.macros.fat
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    // Each item's macros are already rounded individually; round the sum too
    // — summing rounded decimals otherwise leaves floating-point artifacts
    // like 74.50000000000001 in the API response.
    const totals = { kcal: Math.round(raw.kcal), protein: round1(raw.protein), carbs: round1(raw.carbs), fat: round1(raw.fat) };
    return { dayOfWeek: day, totals, target: dailyTarget(profile, day) };
  });

  return { id: plans[0].id, profileId: plans[0].profile_id, weekStartDate: plans[0].week_start_date, items, totalsByDay };
}

router.get('/foods', (_req, res) => res.json(FOOD_TEMPLATES));

router.post('/weeks', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { weekStartDate } = req.body || {};
  if (!weekStartDate) return res.status(400).json({ error: 'weekStartDate is required' });

  const existing = await query('SELECT id FROM meal_plans WHERE profile_id = ? AND week_start_date = ?', [req.params.id, weekStartDate]);
  let planId;
  if (existing[0]) {
    planId = existing[0].id;
  } else {
    planId = crypto.randomUUID();
    await query('INSERT INTO meal_plans (id, profile_id, week_start_date) VALUES (?, ?, ?)', [planId, req.params.id, weekStartDate]);
  }

  res.status(existing[0] ? 200 : 201).json(await loadPlanWithItems(planId, profile));
});

router.get('/weeks/:planId', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedPlan(req.params.planId, req.params.id))) return res.status(404).json({ error: 'Meal plan not found' });

  res.json(await loadPlanWithItems(req.params.planId, profile));
});

router.post('/weeks/:planId/items', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedPlan(req.params.planId, req.params.id))) return res.status(404).json({ error: 'Meal plan not found' });

  const { dayOfWeek, mealSlot, foodId, grams, sortOrder } = req.body || {};
  if (dayOfWeek === undefined || !mealSlot || !foodId || !grams)
    return res.status(400).json({ error: 'dayOfWeek, mealSlot, foodId and grams are required' });
  if (!macrosFor(foodId, grams)) return res.status(400).json({ error: 'Unknown foodId' });

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO meal_plan_items (id, meal_plan_id, day_of_week, meal_slot, food_id, grams, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.planId, dayOfWeek, mealSlot, foodId, grams, sortOrder || 0]
  );
  res.status(201).json(await loadPlanWithItems(req.params.planId, profile));
});

router.put('/weeks/:planId/items/:itemId', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedPlan(req.params.planId, req.params.id))) return res.status(404).json({ error: 'Meal plan not found' });

  const existingRows = await query('SELECT * FROM meal_plan_items WHERE id = ? AND meal_plan_id = ?', [req.params.itemId, req.params.planId]);
  if (!existingRows[0]) return res.status(404).json({ error: 'Item not found' });

  const merged = { ...toApiItem(existingRows[0]), ...req.body };
  if (!macrosFor(merged.foodId, merged.grams)) return res.status(400).json({ error: 'Unknown foodId' });

  await query(
    `UPDATE meal_plan_items SET day_of_week=?, meal_slot=?, food_id=?, grams=?, sort_order=? WHERE id=?`,
    [merged.dayOfWeek, merged.mealSlot, merged.foodId, merged.grams, merged.sortOrder || 0, req.params.itemId]
  );
  res.json(await loadPlanWithItems(req.params.planId, profile));
});

router.delete('/weeks/:planId/items/:itemId', async (req, res) => {
  const profile = await findOwnedProfile(req.params.id, req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!(await findOwnedPlan(req.params.planId, req.params.id))) return res.status(404).json({ error: 'Meal plan not found' });

  await query('DELETE FROM meal_plan_items WHERE id = ? AND meal_plan_id = ?', [req.params.itemId, req.params.planId]);
  res.json(await loadPlanWithItems(req.params.planId, profile));
});

module.exports = router;
