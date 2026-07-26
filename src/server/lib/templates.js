/**
 * templates.js — Goal and training-block template content
 *
 * Plain config, same spirit as src/js/db.js: editable content, not user
 * data, so it lives in code rather than a database table. Served to the
 * frontend via GET /api/profiles/:id/goals/templates and
 * GET /api/profiles/:id/training/block-templates so the Week Builder
 * palette and the Goal Dashboard's "start from template" picker both read
 * from this single source of truth — and so does the server-side
 * auto-build rule engine in lib/autobuild.js.
 *
 * Goal templates below are grounded in widely-cited, evidence-based
 * standards rather than invented numbers — a natural "regular person to
 * capable athlete" progression, deliberately excluding bodybuilding/
 * aesthetics-focused goals:
 *   - Calisthenics: the r/bodyweightfitness Recommended Routine progression
 *     model (strength via leverage/range-of-motion progression, not added
 *     load) — pull-up, muscle-up, pistol squat, handstand push-up, front
 *     lever, L-sit are its standard benchmark skills.
 *   - Cycling: Andrew Coggan's power-training zones and FTP (Functional
 *     Threshold Power) — the standard evidence-based cycling metric.
 *   - Swimming: Critical Swim Speed (CSS), the swimming analog to
 *     lactate/functional threshold, standard in competitive swim coaching.
 *   - Running/trail: standard race distances plus elevation-gain framing
 *     for trail (vert is the sport-specific load metric road running lacks).
 *   - Boxing: amateur (not competitive-fight) heavy-bag conditioning —
 *     the standard 3-minute round / 1-minute rest structure used in
 *     amateur bouts, applied to bag work and HIIT conditioning.
 */

const GOAL_TEMPLATES = [
  // Running / trail running
  { id: 'race5k',        goalType: 'race5k',       icon: '🏁', title: '5K Race',            unit: 'minutes', description: 'A target finish time for a 5K race.' },
  { id: 'race10k',       goalType: 'race10k',      icon: '🏁', title: '10K Race',           unit: 'minutes', description: 'A target finish time for a 10K race.' },
  { id: 'half_marathon', goalType: 'half',         icon: '🏁', title: 'Half Marathon',      unit: 'minutes', description: 'A target finish time for a half marathon (21.1km).' },
  { id: 'marathon',      goalType: 'marathon',     icon: '🏁', title: 'Marathon',           unit: 'minutes', description: 'A target finish time for a full marathon (42.2km).' },
  { id: 'trail_ultra',   goalType: 'trail_ultra',  icon: '⛰️', title: '50K Trail Ultra',     unit: 'minutes', description: 'A target finish time for a 50K trail ultramarathon — pacing here is governed more by cumulative elevation gain than flat pace.' },

  // Strength / recomposition
  { id: 'weight_target', goalType: 'weight',       icon: '⚖️', title: 'Body Weight Target', unit: 'kg',      description: 'A target body weight for recomposition.' },
  { id: 'lift_pr',       goalType: 'lift_pr',      icon: '🏋️', title: 'Barbell Lift PR',     unit: 'kg',      description: 'A target 1-rep-max on a barbell lift (squat/deadlift/bench/press).' },

  // Calisthenics — natural bodyweight progression, not bodybuilding
  { id: 'first_pullup',     goalType: 'calisthenics_pull', icon: '🤺', title: 'First Strict Pull-Up',      unit: 'reps',    description: 'The foundational pulling-strength milestone in the r/bodyweightfitness Recommended Routine progression (dead hang → scapular pulls → negatives → strict rep).' },
  { id: 'twenty_pullups',   goalType: 'calisthenics_pull', icon: '🤺', title: '20 Consecutive Pull-Ups',   unit: 'reps',    description: 'The routine\'s advanced pulling benchmark — relative-strength standard, no added load required.' },
  { id: 'muscle_up',        goalType: 'calisthenics_pull', icon: '🤺', title: 'First Muscle-Up',           unit: 'reps',    description: 'The transition skill from pulling to pressing strength (bar or rings) — standard "next step after 15+ pull-ups" progression goal.' },
  { id: 'pistol_squat',     goalType: 'calisthenics_legs', icon: '🤺', title: 'Pistol Squat (Each Leg)',   unit: 'reps',    description: 'Single-leg squat to full depth — the routine\'s unilateral-leg-strength benchmark, built via assisted/box-supported progressions.' },
  { id: 'handstand_pushup', goalType: 'calisthenics_push', icon: '🤺', title: 'Handstand Push-Up',         unit: 'reps',    description: 'Vertical pressing strength progression: wall-supported hold → wall HSPU → freestanding — the routine\'s advanced pushing skill.' },
  { id: 'front_lever',      goalType: 'calisthenics_core', icon: '🤺', title: 'Front Lever Hold',          unit: 'seconds', description: 'An advanced static-strength skill (tuck → advanced tuck → straddle → full lever) built through isometric progression, not added weight.' },
  { id: 'l_sit',            goalType: 'calisthenics_core', icon: '🤺', title: 'L-Sit Hold',                unit: 'seconds', description: 'A core/hip-flexor compression-strength benchmark, standard in the routine\'s "core" category.' },

  // Cycling
  { id: 'ftp_target',   goalType: 'ftp',   icon: '🚴', title: 'Cycling FTP Target', unit: 'watts', description: 'Functional Threshold Power — the standard cycling fitness metric (Coggan power zones); training around it (sweet spot, threshold intervals) is well-evidenced for raising it.' },
  { id: 'century_ride', goalType: 'ride',  icon: '🚴', title: 'Century Ride',       unit: 'km',    description: 'A target single-ride distance on the bike (100km/100mi).' },

  // Swimming
  { id: 'swim_1500', goalType: 'swim_distance', icon: '🏊', title: 'Continuous 1500m Swim', unit: 'minutes',  description: 'Swim 1500m (open-water standard distance) without stopping — the natural "can I actually swim" milestone before pace work matters.' },
  { id: 'swim_css',   goalType: 'swim_pace',     icon: '🏊', title: 'Critical Swim Speed (CSS) Improvement', unit: 'sec/100m', description: 'CSS — the swimming analog to lactate/functional threshold — estimated from a 400m + 200m time trial and improved via threshold-paced interval sets.' },

  // Boxing (amateur conditioning, not competitive fighting)
  { id: 'boxing_rounds',       goalType: 'boxing', icon: '🥊', title: '12×3min Heavy Bag Rounds',   unit: 'rounds',  description: 'Sustain the standard amateur-bout structure (3-minute rounds, 1-minute rest) for 12 rounds of heavy-bag work without dropping output — a conditioning, not a fighting, milestone.' },
  { id: 'boxing_conditioning', goalType: 'boxing', icon: '🥊', title: 'Bag HIIT Conditioning Test', unit: 'minutes', description: 'A timed high-intensity bag+bodyweight circuit (e.g. round-based burpee/combo intervals) used as a conditioning benchmark in amateur gyms.' }
];

const BLOCK_TEMPLATES = [
  // Running
  { id: 'zone2_run',    category: 'run',      icon: '🏃',  label: 'Zone 2 Easy Run',              defaultDurationMin: 30,  details: { intensity: 'zone2' } },
  { id: 'interval_run', category: 'run',      icon: '🏃‍💨', label: 'Interval / Speed Work',        defaultDurationMin: 35,  details: { intensity: 'interval' } },
  { id: 'tempo_run',    category: 'run',      icon: '⏱️',  label: 'Tempo / Race-Pace Run',        defaultDurationMin: 30,  details: { intensity: 'tempo' } },
  { id: 'long_run',     category: 'run',      icon: '🏃‍♂️', label: 'Long Run',                     defaultDurationMin: 60,  details: { intensity: 'zone2' } },

  // Trail running (separate from road run — elevation/terrain is the load variable)
  { id: 'trail_run',      category: 'trail', icon: '⛰️', label: 'Trail Run (Rolling Terrain)', defaultDurationMin: 50,  details: { intensity: 'zone2' } },
  { id: 'vert_hike',      category: 'trail', icon: '🥾', label: 'Vert/Hill Repeats',           defaultDurationMin: 60,  details: { focus: 'elevation' } },
  { id: 'long_trail_run', category: 'trail', icon: '⛰️', label: 'Long Trail Run',              defaultDurationMin: 120, details: { intensity: 'zone2' } },

  // Weight training
  { id: 'workout_a',    category: 'weights',  icon: '💪',  label: 'Workout A — Upper Body & Core', defaultDurationMin: 35,  details: { refPage: 13 } },
  { id: 'workout_b',    category: 'weights',  icon: '🦵',  label: 'Workout B — Lower Body & Posterior Chain', defaultDurationMin: 35, details: { refPage: 14 } },
  { id: 'full_body',    category: 'weights',  icon: '🏋️',  label: 'Full Body Strength',            defaultDurationMin: 40,  details: {} },

  // Calisthenics — natural bodyweight progression (r/bodyweightfitness Recommended Routine pattern)
  { id: 'push_progression', category: 'calisthenics', icon: '🤺', label: 'Push Progression (Push-Up → HSPU)',   defaultDurationMin: 25, details: { skillLine: 'push' } },
  { id: 'pull_progression', category: 'calisthenics', icon: '🤺', label: 'Pull Progression (Pull-Up → Muscle-Up)', defaultDurationMin: 25, details: { skillLine: 'pull' } },
  { id: 'leg_progression',  category: 'calisthenics', icon: '🤺', label: 'Leg Progression (Squat → Pistol)',    defaultDurationMin: 25, details: { skillLine: 'legs' } },
  { id: 'skill_practice',   category: 'calisthenics', icon: '🤺', label: 'Skill Practice (Lever/L-Sit/Handstand)', defaultDurationMin: 20, details: { skillLine: 'core' } },

  // Cycling
  { id: 'sweet_spot_ride', category: 'cycling', icon: '🚴', label: 'Sweet Spot Ride',             defaultDurationMin: 90,  details: { refPage: 11 } },
  { id: 'ftp_intervals',   category: 'cycling', icon: '🚴', label: 'FTP Interval Session',        defaultDurationMin: 60,  details: { intensity: 'threshold' } },
  { id: 'recovery_spin',   category: 'cycling', icon: '🚲', label: 'Recovery Spin',                defaultDurationMin: 30,  details: {} },
  { id: 'long_ride',       category: 'cycling', icon: '🚵', label: 'Sunday Long Ride',             defaultDurationMin: 150, details: { refPage: 11 } },

  // Swimming
  { id: 'swim_technique', category: 'swimming', icon: '🏊', label: 'Technique & Drills',        defaultDurationMin: 30, details: {} },
  { id: 'swim_endurance', category: 'swimming', icon: '🏊', label: 'Endurance Swim',             defaultDurationMin: 40, details: { intensity: 'zone2' } },
  { id: 'swim_intervals', category: 'swimming', icon: '🏊', label: 'CSS Interval Set',           defaultDurationMin: 45, details: { intensity: 'threshold' } },

  // Boxing (amateur bag work + conditioning, not sparring)
  { id: 'bag_technique',       category: 'boxing', icon: '🥊', label: 'Heavy Bag Technique & Combos', defaultDurationMin: 30, details: {} },
  { id: 'bag_hiit',            category: 'boxing', icon: '🥊', label: 'Bag HIIT Rounds',              defaultDurationMin: 25, details: { structure: '3min-on/1min-off' } },
  { id: 'boxing_conditioning', category: 'boxing', icon: '🥊', label: 'Footwork & Conditioning Circuit', defaultDurationMin: 30, details: {} },

  // Stretching / rehab
  { id: 'heel_rehab', category: 'stretch', icon: '🦶', label: 'Heel Rehab (Rathleff Protocol)', defaultDurationMin: 10, details: { refPage: 16 } },
  { id: 'mobility',   category: 'stretch', icon: '🤸', label: 'General Mobility & Stretch',      defaultDurationMin: 15, details: {} }
];

function findBlockTemplate(id) {
  return BLOCK_TEMPLATES.find(t => t.id === id) || null;
}

module.exports = { GOAL_TEMPLATES, BLOCK_TEMPLATES, findBlockTemplate };
