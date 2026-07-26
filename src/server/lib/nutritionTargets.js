/**
 * nutritionTargets.js — daily calorie/macro target for the Food Planner
 *
 * Mirrors the formulas already used client-side in
 * src/js/components/calculators.js (BmrCalc, MacroCalc) and the standing
 * protocol described in db.js pages 3/6 — not a new nutrition philosophy,
 * just the existing one exposed as a per-day target line in the planner:
 *   - BMR: Mifflin-St Jeor
 *   - TDEE: BMR × 1.55 (the app's default "moderate activity" multiplier)
 *   - Calories: 2,100 kcal Mon–Sat (recomposition deficit), 2,800 kcal
 *     Sunday (the "Sunday Strategic Surplus" protocol) — a fixed protocol,
 *     not derived from TDEE, matching how the rest of the app states it
 *   - Protein: 1.6 g/kg bodyweight; Fat: 22% of calories; Carbs: remainder
 */

const ACTIVITY_MULTIPLIER = 1.55;
const WEEKDAY_CALORIES = 2100;
const SUNDAY_CALORIES = 2800;

function bmr({ weight, height, age, gender }) {
  const base = 10 * (weight || 70) + 6.25 * (height || 170) - 5 * (age || 30);
  return gender === 'female' ? base - 161 : base + 5;
}

/** @param {number} dayOfWeek — 0=Mon..6=Sun */
function dailyTarget(profile, dayOfWeek) {
  const calories = dayOfWeek === 6 ? SUNDAY_CALORIES : WEEKDAY_CALORIES;
  const protein = Math.round((profile.weight || 70) * 1.6);
  const proteinCals = protein * 4;
  const fat = Math.round((calories * 0.22) / 9);
  const fatCals = fat * 9;
  const carbs = Math.round((calories - proteinCals - fatCals) / 4);
  return {
    calories, protein, fat, carbs,
    tdee: Math.round(bmr(profile) * ACTIVITY_MULTIPLIER)
  };
}

module.exports = { dailyTarget, bmr, ACTIVITY_MULTIPLIER, WEEKDAY_CALORIES, SUNDAY_CALORIES };
