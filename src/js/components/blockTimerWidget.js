/**
 * blockTimerWidget.js — compact inline timer for an expanded Week Builder block
 *
 * Steps through a workoutQueue.js queue right on the block card: a 'steady'
 * step is a plain continuous countdown, an 'interval' step runs its own
 * work/rest rounds — exactly the same per-step logic the full-page Sprint
 * Timer uses (sprintTimer.js), just without the audio/voice/wake-lock
 * machinery, since this is for glancing while planning/reviewing, not the
 * immersive outdoor case. For that, "▶ Start" still opens the dedicated
 * full-page timer (weekBuilder.js's startWorkout()).
 *
 * The `queue` prop is read once at mount — this widget is only ever mounted
 * while its block card is expanded (v-if in weekBuilder.js), so a fresh
 * instance is created every time it's opened. Re-deriving from the prop
 * reactively would reset the running timer on every unrelated parent
 * re-render (e.g. editing a different day's block), since workoutQueueFor()
 * builds a new array each call — reading it once at mount avoids that.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why.
 */
(function () {

/* global app */

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

app.component('BlockTimerWidget', {
  props: { queue: { type: Array, required: true } },
  data() {
    return {
      steps: this.queue,
      stepIndex:    0,
      phase:        'idle', // idle | work | rest | steady | done
      secondsLeft:  0,
      currentRound: 0,
      running:      false,
      _tickHandle:  null,
      _phaseEndAt:  null,
      _pausedRemainingMs: 0
    };
  },
  computed: {
    currentStep() {
      return this.steps[this.stepIndex] || null;
    },
    phaseLabel() {
      return { idle: 'Ready', work: 'WORK', rest: 'REST', steady: 'GO', done: 'DONE' }[this.phase];
    },
    stepCards() {
      return this.steps.map((s, i) => ({
        label: s.label,
        status: i < this.stepIndex ? 'done' : (i === this.stepIndex && this.phase !== 'idle' ? 'current' : 'upcoming')
      }));
    }
  },
  beforeUnmount() {
    this._stopTicking();
  },
  methods: {
    formatTime,

    start() {
      this.stepIndex = 0;
      this.running = true;
      this._enterStep(0);
      this._startTicking();
    },
    pause() {
      this.running = false;
      this._pausedRemainingMs = Math.max(0, this._phaseEndAt - Date.now());
      this._stopTicking();
    },
    resume() {
      this.running = true;
      this._phaseEndAt = Date.now() + this._pausedRemainingMs;
      this._startTicking();
    },
    reset() {
      this._stopTicking();
      this.phase = 'idle';
      this.stepIndex = 0;
      this.secondsLeft = 0;
      this.currentRound = 0;
      this.running = false;
      this._phaseEndAt = null;
    },
    // Move straight to the next exercise in the queue, abandoning any
    // remaining rounds of the current one — a deliberate "I'm done with
    // this one" action, not a phase-by-phase nudge.
    skip() {
      this._advanceStep();
    },

    _enterStep(index) {
      const step = this.steps[index];
      if (!step) return this._finish();
      if (step.mode === 'interval') {
        this.currentRound = 1;
        this._enterPhase('work', step.workSec);
      } else {
        this._enterPhase('steady', step.durationSec);
      }
    },
    _enterPhase(phase, durationSec) {
      this.phase = phase;
      this.secondsLeft = durationSec;
      this._phaseEndAt = Date.now() + durationSec * 1000;
    },

    _startTicking() {
      this._stopTicking();
      this._tickHandle = setInterval(() => this._tick(), 1000);
    },
    _stopTicking() {
      if (this._tickHandle) { clearInterval(this._tickHandle); this._tickHandle = null; }
    },
    _tick() {
      const remainingMs = this._phaseEndAt - Date.now();
      this.secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) this._transition();
    },

    _transition() {
      const step = this.currentStep;
      if (this.phase === 'steady') {
        this._advanceStep();
      } else if (this.phase === 'work') {
        if (this.currentRound >= step.rounds) { this._advanceStep(); return; }
        this._enterPhase('rest', step.restSec);
      } else if (this.phase === 'rest') {
        this.currentRound++;
        this._enterPhase('work', step.workSec);
      }
    },
    _advanceStep() {
      const next = this.stepIndex + 1;
      if (next >= this.steps.length) { this._finish(); return; }
      this.stepIndex = next;
      this._enterStep(next);
    },
    _finish() {
      this.phase = 'done';
      this.running = false;
      this._stopTicking();
    }
  },
  template: `
    <div class="inline-timer">
      <div v-if="phase === 'idle'" class="inline-timer-idle">
        <button @click="start" class="inline-timer-start-btn">▶ Quick start ({{ steps.length }} {{ steps.length === 1 ? 'step' : 'steps' }})</button>
      </div>
      <div v-else class="inline-timer-running" :class="'inline-timer-phase-' + phase">
        <div class="inline-timer-step-label">{{ currentStep?.label || '' }}</div>
        <div class="inline-timer-display">{{ formatTime(Math.max(secondsLeft, 0)) }}</div>
        <div class="inline-timer-phase-label">
          {{ phaseLabel }}<span v-if="phase === 'work' || phase === 'rest'"> · Round {{ currentRound }}/{{ currentStep.rounds }}</span>
        </div>
        <div class="inline-timer-controls">
          <button v-if="phase !== 'done' && running" @click="pause" class="inline-timer-btn">⏸</button>
          <button v-if="phase !== 'done' && !running" @click="resume" class="inline-timer-btn">▶</button>
          <button v-if="phase !== 'done'" @click="skip" class="inline-timer-btn">⏭</button>
          <button @click="reset" class="inline-timer-btn">↺</button>
        </div>
        <div class="inline-timer-steps">
          <span v-for="card in stepCards" :key="card.label" class="inline-timer-step-dot" :class="'inline-timer-step-dot-' + card.status" :title="card.label"></span>
        </div>
      </div>
    </div>
  `
});

})();
