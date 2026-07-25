/**
 * templates.js — Goal and training-block template content
 *
 * Plain config, same spirit as src/js/db.js: editable content, not user
 * data, so it lives in code rather than a database table. Served to the
 * frontend via GET /api/templates (see routes/training.js) so the Week
 * Builder palette and the Goal Dashboard's "start from template" picker
 * both read from this single source of truth — and so does the
 * server-side auto-build rule engine in lib/autobuild.js.
 */

const GOAL_TEMPLATES = [
  { id: 'race5k',        goalType: 'race5k',       icon: '🏁', title: '5K Race',            unit: 'minutes', description: 'A target finish time for a 5K race.' },
  { id: 'race10k',       goalType: 'race10k',      icon: '🏁', title: '10K Race',           unit: 'minutes', description: 'A target finish time for a 10K race.' },
  { id: 'half_marathon', goalType: 'half',         icon: '🏁', title: 'Half Marathon',      unit: 'minutes', description: 'A target finish time for a half marathon (21.1km).' },
  { id: 'weight_target', goalType: 'weight',       icon: '⚖️', title: 'Body Weight Target', unit: 'kg',      description: 'A target body weight for recomposition.' },
  { id: 'lift_pr',       goalType: 'lift_pr',      icon: '🏋️', title: 'Lift PR',            unit: 'kg',      description: 'A target 1-rep-max on a barbell lift.' },
  { id: 'century_ride',  goalType: 'ride',         icon: '🚴', title: 'Century Ride',       unit: 'km',      description: 'A target single-ride distance on the bike.' }
];

const BLOCK_TEMPLATES = [
  { id: 'zone2_run',    category: 'run',      icon: '🏃',  label: 'Zone 2 Easy Run',              defaultDurationMin: 30,  details: { intensity: 'zone2' } },
  { id: 'interval_run', category: 'run',      icon: '🏃‍💨', label: 'Interval / Speed Work',        defaultDurationMin: 35,  details: { intensity: 'interval' } },
  { id: 'tempo_run',    category: 'run',      icon: '⏱️',  label: 'Tempo / Race-Pace Run',        defaultDurationMin: 30,  details: { intensity: 'tempo' } },
  { id: 'long_run',     category: 'run',      icon: '🏃‍♂️', label: 'Long Run',                     defaultDurationMin: 60,  details: { intensity: 'zone2' } },

  { id: 'workout_a',    category: 'weights',  icon: '💪',  label: 'Workout A — Upper Body & Core', defaultDurationMin: 35,  details: { refPage: 13 } },
  { id: 'workout_b',    category: 'weights',  icon: '🦵',  label: 'Workout B — Lower Body & Posterior Chain', defaultDurationMin: 35, details: { refPage: 14 } },
  { id: 'full_body',    category: 'weights',  icon: '🏋️',  label: 'Full Body Strength',            defaultDurationMin: 40,  details: {} },

  { id: 'sweet_spot_ride', category: 'cycling', icon: '🚴', label: 'Sweet Spot Ride',             defaultDurationMin: 90,  details: { refPage: 11 } },
  { id: 'recovery_spin',   category: 'cycling', icon: '🚲', label: 'Recovery Spin',                defaultDurationMin: 30,  details: {} },
  { id: 'long_ride',       category: 'cycling', icon: '🚵', label: 'Sunday Long Ride',             defaultDurationMin: 150, details: { refPage: 11 } },

  { id: 'heel_rehab', category: 'stretch', icon: '🦶', label: 'Heel Rehab (Rathleff Protocol)', defaultDurationMin: 10, details: { refPage: 16 } },
  { id: 'mobility',   category: 'stretch', icon: '🤸', label: 'General Mobility & Stretch',      defaultDurationMin: 15, details: {} }
];

function findBlockTemplate(id) {
  return BLOCK_TEMPLATES.find(t => t.id === id) || null;
}

module.exports = { GOAL_TEMPLATES, BLOCK_TEMPLATES, findBlockTemplate };
