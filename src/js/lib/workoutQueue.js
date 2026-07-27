/**
 * workoutQueue.js — turns a Week Builder block into a runnable step queue
 *
 * Both the inline timer widget (blockTimerWidget.js, on the block card) and
 * the full-page Sprint Timer (sprintTimer.js, for the immersive/outdoor
 * case) consume the exact same queue from here — so a steady-effort
 * exercise can never render as an interval-rounds UI on one surface but
 * not the other, and a compound block's exercises always run in the same
 * order everywhere.
 *
 * A compound block (details.subBlocks, see weekBuilder.js) becomes one step
 * per sub-item; a simple block becomes a single step from its resolved
 * exercise. Steps carry each exercise's own `mode`/`timer` (exercises.js) —
 * this is what fixes the bug where an easy/steady run or swim opened the
 * same rounds-based timer as a real interval session: routing keys off
 * this per-exercise data, never the sport/category alone.
 *
 * Plain script, no Vue — usable from any component. Wrapped in an IIFE, see
 * weekBuilder.js's header comment for why plain <script> tags need this.
 */
(function () {

function stepForExercise(exerciseId, fallbackLabel, exercises, fallbackDurationMin) {
  const ex = exerciseId ? exercises.find(e => e.id === exerciseId) : null;

  if (ex && ex.mode === 'interval' && ex.timer) {
    return { label: ex.name, mode: 'interval', rounds: ex.timer.rounds, workSec: ex.timer.workSec, restSec: ex.timer.restSec };
  }
  if (ex && ex.mode === 'steady' && ex.timer) {
    return { label: ex.name, mode: 'steady', durationSec: ex.timer.durationSec };
  }
  // Strength/mobility exercises (no countdown data) and unresolved blocks
  // both fall back to a plain steady step sized from the block's own
  // duration — there's nothing to run rounds against either way.
  return { label: ex ? ex.name : (fallbackLabel || 'Workout'), mode: 'steady', durationSec: (fallbackDurationMin || 20) * 60 };
}

// block: the Week Builder block object (see weekBuilder.js); exercises: the
// full EXERCISE_TEMPLATES list (this.exercises in weekBuilder.js/sprintTimer.js).
function buildQueueFromBlock(block, exercises) {
  const subBlocks = block?.details?.subBlocks;
  const steps = (Array.isArray(subBlocks) && subBlocks.length)
    ? subBlocks.map(sb => stepForExercise(sb.exerciseId, sb.title, exercises))
    : [stepForExercise(block?.details?.exerciseId, block?.title, exercises, block?.durationMin)];

  return steps.map((step, i) => ({ id: `${block?.id || 'block'}-${i}`, ...step }));
}

window.WorkoutQueue = { buildQueueFromBlock };

})();
