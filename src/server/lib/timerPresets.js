/**
 * timerPresets.js — Sprint/Interval Timer presets
 *
 * Plain config, same pattern as templates.js/exercises.js: editable content,
 * not user data. Unlike exercises.js's free-text `dosage` field (meant for
 * humans to read, not parse — "8-12 x 400m, 90s jog rest" mixes a distance
 * with a duration, which a countdown timer can't run on), every entry here
 * is fully structured (rounds/workSec/restSec) specifically so the Sprint
 * Timer can run it directly. The Week Builder's exercise catalog is
 * "what to do"; this is "how to time it" — deliberately separate, smaller,
 * and only for the three split-based sports (run/cycling/swimming), not all
 * 8 block categories.
 */

const TIMER_PRESETS = [
  // ── Running ────────────────────────────────────────────────────────────
  { id: 'run_tabata',       category: 'run', name: 'Tabata Sprints',      description: 'Classic all-out/rest protocol — brutal, short.', rounds: 8,  workSec: 20,  restSec: 10 },
  { id: 'run_400_repeats',  category: 'run', name: '400m Repeats',        description: 'Fast, controlled repeats for speed and running economy.', rounds: 8,  workSec: 90,  restSec: 90 },
  { id: 'run_800_repeats',  category: 'run', name: '800m Repeats',        description: 'Mid-distance repeats targeting VO2max.', rounds: 5,  workSec: 180, restSec: 120 },
  { id: 'run_hill_repeats', category: 'run', name: 'Hill Repeats',        description: 'Uphill efforts building strength and power with low impact.', rounds: 8,  workSec: 60,  restSec: 90 },
  { id: 'run_fartlek',      category: 'run', name: 'Fartlek Surges',      description: 'Unstructured speed play, timed into even surge/float blocks.', rounds: 6,  workSec: 60,  restSec: 90 },

  // ── Cycling ────────────────────────────────────────────────────────────
  { id: 'cyc_vo2max_3030',  category: 'cycling', name: 'VO2 Max 30/30s',     description: 'Very short, very hard efforts to raise your aerobic ceiling.', rounds: 10, workSec: 30,  restSec: 30 },
  { id: 'cyc_sprint',       category: 'cycling', name: 'Sprint Intervals',   description: 'Maximal short sprints from a standing start, full recovery.', rounds: 8,  workSec: 15,  restSec: 165 },
  { id: 'cyc_hill_climb',   category: 'cycling', name: 'Hill Climb Repeats', description: 'Repeated seated/standing climbs for strength and threshold power.', rounds: 5,  workSec: 300, restSec: 240 },
  { id: 'cyc_sweet_spot',   category: 'cycling', name: 'Sweet Spot Intervals', description: 'Sustained efforts just below threshold — high benefit, moderate fatigue.', rounds: 3,  workSec: 1200, restSec: 300 },
  { id: 'cyc_over_unders',  category: 'cycling', name: 'Over-Unders',        description: 'Alternating just-above/just-below threshold, simulating race surges.', rounds: 3,  workSec: 540, restSec: 300 },

  // ── Swimming ───────────────────────────────────────────────────────────
  { id: 'swim_50_sprint',   category: 'swimming', name: '50s Sprint Set',      description: 'Short maximal-effort sprints with generous rest for pure speed.', rounds: 8,  workSec: 40,  restSec: 60 },
  { id: 'swim_100_interval', category: 'swimming', name: '100s Interval Set',   description: 'Repeated efforts on a set send-off for pacing consistency.', rounds: 10, workSec: 90,  restSec: 30 },
  { id: 'swim_im_set',      category: 'swimming', name: 'IM Interval Set',     description: 'Rotating through all four strokes for well-rounded technique work.', rounds: 4,  workSec: 100, restSec: 30 },
  { id: 'swim_css',         category: 'swimming', name: 'CSS Threshold Set',   description: 'Efforts at Critical Swim Speed, the swimming analog to lactate threshold.', rounds: 6,  workSec: 180, restSec: 30 },
  { id: 'swim_broken_1500', category: 'swimming', name: 'Broken 1500 Race Pace', description: 'A long swim broken into race-pace reps with brief rest.', rounds: 15, workSec: 90,  restSec: 10 }
];

function timerPresetsByCategory(category) {
  return TIMER_PRESETS.filter(p => p.category === category);
}

module.exports = { TIMER_PRESETS, timerPresetsByCategory };
