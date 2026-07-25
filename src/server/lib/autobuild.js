/**
 * autobuild.js — deterministic rules-based week generator
 *
 * NOT an AI feature — this is plain rules over the active goal's target
 * date, producing the same suggested week every time for the same inputs.
 * (The OpenAI-backed piece of this app is only the day/week/month
 * analyzer in lib/openai.js.)
 *
 * Rule set, tuned for the 4/30 milestone 5K but generic to any race-type
 * goal with a target_date:
 *   - Daily Zone 2 run (the existing daily-5k streak habit)
 *   - Mon/Thu: Workout A (upper), Tue/Fri: Workout B (lower) — 2x/week
 *     frequency per muscle group, matching the barbell pages already in db.js
 *   - Wed: interval work normally, switching to race-pace tempo work in the
 *     final 4 weeks before target_date (specificity phase)
 *   - Sat: long run, distance/duration nudged up as the race approaches
 *   - Sun: long ride + daily run + mobility (rest from lifting)
 *   - Every day: a short heel-rehab / mobility stretch block
 */

const { findBlockTemplate } = require('./templates');

const DAY = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

function weeksUntil(targetDate, weekStartDate) {
  if (!targetDate) return null;
  const ms = new Date(targetDate) - new Date(weekStartDate);
  return Math.max(0, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

function block(day, templateId, overrides = {}) {
  const t = findBlockTemplate(templateId);
  return {
    day_of_week:  day,
    block_type:   t.category,
    title:        overrides.title || t.label,
    duration_min: overrides.durationMin || t.defaultDurationMin,
    details:      { ...t.details, ...(overrides.details || {}) }
  };
}

/**
 * @param {{goal_type: string, target_date: string|null}} goal
 * @param {string} weekStartDateIso — YYYY-MM-DD, Monday of the target week
 * @returns {Array} training_blocks rows (without id/week_id — caller inserts them)
 */
function buildWeekFromGoal(goal, weekStartDateIso) {
  const weeksRemaining = weeksUntil(goal && goal.target_date, weekStartDateIso);
  const inSpecificityPhase = weeksRemaining !== null && weeksRemaining <= 4;
  const longRunMinutes = weeksRemaining === null ? 60 : Math.min(90, 45 + (12 - Math.min(weeksRemaining, 12)) * 4);

  const blocks = [];

  [DAY.MON, DAY.TUE, DAY.WED, DAY.THU, DAY.FRI, DAY.SAT, DAY.SUN].forEach(day => {
    if (day === DAY.WED) {
      blocks.push(block(day, inSpecificityPhase ? 'tempo_run' : 'interval_run'));
    } else if (day === DAY.SAT) {
      blocks.push(block(day, 'long_run', { durationMin: longRunMinutes }));
    } else {
      blocks.push(block(day, 'zone2_run'));
    }

    if (day === DAY.MON || day === DAY.THU) blocks.push(block(day, 'workout_a'));
    if (day === DAY.TUE || day === DAY.FRI)  blocks.push(block(day, 'workout_b'));
    if (day === DAY.SUN) blocks.push(block(day, 'long_ride'));

    blocks.push(block(day, 'heel_rehab'));
  });

  return blocks;
}

module.exports = { buildWeekFromGoal, weeksUntil };
