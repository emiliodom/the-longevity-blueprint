/**
 * autobuild.js — deterministic rules-based week generator
 *
 * NOT an AI feature — this is plain rules over the active goal's type and
 * target date, producing the same suggested week every time for the same
 * inputs. (The OpenAI-backed piece of this app is only the day/week/month
 * analyzer in lib/openai.js.)
 *
 * Every goal_type (see lib/templates.js GOAL_TEMPLATES) maps to a coarse
 * "domain", and each domain has its own weekly block arrangement — the
 * running-only version tuned for the 4/30 milestone 5K in v1 has been
 * generalized so a cycling FTP goal, a calisthenics muscle-up goal, a
 * swim CSS goal, or a boxing conditioning goal each get a week actually
 * built around their sport, not a running week with the label changed.
 *
 * Shared across every domain: a daily heel-rehab/mobility stretch block
 * (injury-prevention baseline), and — except where the goal itself IS the
 * running/trail specificity — a short daily Zone 2 run, since the app's
 * whole premise (see db.js page 9) is a daily cardio streak habit that
 * a goal in another sport shouldn't require abandoning.
 */

const { findBlockTemplate } = require('./templates');

const DAY = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
const ALL_DAYS = [DAY.MON, DAY.TUE, DAY.WED, DAY.THU, DAY.FRI, DAY.SAT, DAY.SUN];

const GOAL_TYPE_DOMAIN = {
  race5k: 'running', race10k: 'running', half: 'running', marathon: 'running',
  trail_ultra: 'trail',
  calisthenics_pull: 'calisthenics', calisthenics_push: 'calisthenics', calisthenics_legs: 'calisthenics', calisthenics_core: 'calisthenics',
  ftp: 'cycling', ride: 'cycling',
  swim_distance: 'swimming', swim_pace: 'swimming',
  boxing: 'boxing'
  // weight, lift_pr, and no goal at all fall through to the 'general' domain below
};

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

function dailyStretch(blocks) {
  ALL_DAYS.forEach(day => blocks.push(block(day, 'heel_rehab')));
}

function maintenanceRun(blocks, days, minutes = 20) {
  days.forEach(day => blocks.push(block(day, 'zone2_run', { durationMin: minutes })));
}

// ── Running (5K / 10K / half / marathon) ────────────────────────────────
function buildRunningWeek(weeksRemaining) {
  const inSpecificityPhase = weeksRemaining !== null && weeksRemaining <= 4;
  const longRunMinutes = weeksRemaining === null ? 60 : Math.min(90, 45 + (12 - Math.min(weeksRemaining, 12)) * 4);
  const blocks = [];

  ALL_DAYS.forEach(day => {
    if (day === DAY.WED) blocks.push(block(day, inSpecificityPhase ? 'tempo_run' : 'interval_run'));
    else if (day === DAY.SAT) blocks.push(block(day, 'long_run', { durationMin: longRunMinutes }));
    else blocks.push(block(day, 'zone2_run'));

    if (day === DAY.MON || day === DAY.THU) blocks.push(block(day, 'workout_a'));
    if (day === DAY.TUE || day === DAY.FRI)  blocks.push(block(day, 'workout_b'));
    if (day === DAY.SUN) blocks.push(block(day, 'long_ride'));
  });

  dailyStretch(blocks);
  return blocks;
}

// ── Trail running (elevation/vert is the load variable road running lacks) ──
function buildTrailWeek(weeksRemaining) {
  const inSpecificityPhase = weeksRemaining !== null && weeksRemaining <= 4;
  const longTrailMinutes = weeksRemaining === null ? 120 : Math.min(240, 90 + (12 - Math.min(weeksRemaining, 12)) * 12);
  const blocks = [];

  blocks.push(block(DAY.MON, 'workout_a'));
  blocks.push(block(DAY.TUE, 'vert_hike'));
  blocks.push(block(DAY.WED, 'trail_run', { durationMin: inSpecificityPhase ? 70 : 50 }));
  blocks.push(block(DAY.THU, 'workout_b'));
  blocks.push(block(DAY.FRI, 'zone2_run', { durationMin: 30 }));
  blocks.push(block(DAY.SAT, 'long_trail_run', { durationMin: longTrailMinutes }));
  blocks.push(block(DAY.SUN, 'trail_run', { durationMin: 40 }));

  dailyStretch(blocks);
  return blocks;
}

// ── Calisthenics (r/bodyweightfitness-style push/pull/leg/skill split) ──
function buildCalisthenicsWeek() {
  const blocks = [];
  blocks.push(block(DAY.MON, 'pull_progression'));
  blocks.push(block(DAY.TUE, 'push_progression'));
  blocks.push(block(DAY.WED, 'skill_practice'));
  blocks.push(block(DAY.THU, 'leg_progression'));
  blocks.push(block(DAY.FRI, 'pull_progression'));
  blocks.push(block(DAY.SAT, 'push_progression'));
  blocks.push(block(DAY.SUN, 'skill_practice', { durationMin: 15 }));

  maintenanceRun(blocks, ALL_DAYS, 20); // cardio baseline — not the specificity focus here
  dailyStretch(blocks);
  return blocks;
}

// ── Cycling (FTP / century) — Coggan sweet-spot + threshold structure ──
function buildCyclingWeek() {
  const blocks = [];
  blocks.push(block(DAY.MON, 'recovery_spin'));
  blocks.push(block(DAY.TUE, 'ftp_intervals'));
  blocks.push(block(DAY.WED, 'workout_a'));
  blocks.push(block(DAY.THU, 'sweet_spot_ride'));
  blocks.push(block(DAY.FRI, 'workout_b'));
  blocks.push(block(DAY.SAT, 'recovery_spin', { durationMin: 20 }));
  blocks.push(block(DAY.SUN, 'long_ride'));

  maintenanceRun(blocks, [DAY.MON, DAY.WED, DAY.FRI], 20);
  dailyStretch(blocks);
  return blocks;
}

// ── Swimming (CSS-based threshold work, the swim analog to cycling FTP) ──
function buildSwimmingWeek() {
  const blocks = [];
  blocks.push(block(DAY.MON, 'swim_technique'));
  blocks.push(block(DAY.TUE, 'swim_intervals'));
  blocks.push(block(DAY.WED, 'workout_a'));
  blocks.push(block(DAY.THU, 'swim_endurance'));
  blocks.push(block(DAY.FRI, 'workout_b'));
  blocks.push(block(DAY.SAT, 'swim_intervals', { durationMin: 35 }));
  blocks.push(block(DAY.SUN, 'swim_endurance', { durationMin: 30 }));

  maintenanceRun(blocks, [DAY.MON, DAY.WED, DAY.FRI], 20);
  dailyStretch(blocks);
  return blocks;
}

// ── Boxing (amateur bag work + HIIT conditioning, not sparring) ──
function buildBoxingWeek() {
  const blocks = [];
  blocks.push(block(DAY.MON, 'bag_technique'));
  blocks.push(block(DAY.TUE, 'bag_hiit'));
  blocks.push(block(DAY.WED, 'boxing_conditioning'));
  blocks.push(block(DAY.THU, 'bag_technique'));
  blocks.push(block(DAY.FRI, 'bag_hiit'));
  blocks.push(block(DAY.SAT, 'boxing_conditioning', { durationMin: 40 }));

  maintenanceRun(blocks, ALL_DAYS, 20);
  dailyStretch(blocks);
  return blocks;
}

// ── General (weight/lift_pr goals, or no goal linked yet) — the original default ──
function buildGeneralWeek() {
  const blocks = [];
  ALL_DAYS.forEach(day => {
    blocks.push(block(day, 'zone2_run'));
    if (day === DAY.MON || day === DAY.THU) blocks.push(block(day, 'workout_a'));
    if (day === DAY.TUE || day === DAY.FRI)  blocks.push(block(day, 'workout_b'));
    if (day === DAY.SUN) blocks.push(block(day, 'long_ride'));
  });
  dailyStretch(blocks);
  return blocks;
}

/**
 * @param {{goal_type: string, target_date: string|null}|null} goal
 * @param {string} weekStartDateIso — YYYY-MM-DD, Monday of the target week
 * @returns {Array} training_blocks rows (without id/week_id — caller inserts them)
 */
function buildWeekFromGoal(goal, weekStartDateIso) {
  const domain = goal ? GOAL_TYPE_DOMAIN[goal.goal_type] : null;
  const weeksRemaining = weeksUntil(goal && goal.target_date, weekStartDateIso);

  switch (domain) {
    case 'running':      return buildRunningWeek(weeksRemaining);
    case 'trail':        return buildTrailWeek(weeksRemaining);
    case 'calisthenics': return buildCalisthenicsWeek();
    case 'cycling':       return buildCyclingWeek();
    case 'swimming':      return buildSwimmingWeek();
    case 'boxing':        return buildBoxingWeek();
    default:              return buildGeneralWeek();
  }
}

module.exports = { buildWeekFromGoal, weeksUntil };
