/**
 * sprintTimer.js — Sprint/Interval Timer
 *
 * Deliberately built for glancing at (or just listening to) mid-run/ride/
 * swim, not for careful reading: a giant, full-width, phase-colored
 * countdown plus optional beep + spoken ("Go"/"Rest"/"Done") cues, so it's
 * usable without stopping or staring at the screen. Presets come from
 * lib/timerPresets.js — structured rounds/workSec/restSec, unlike
 * exercises.js's human-readable `dosage` text, specifically so this can run
 * a workout directly instead of trying to parse free text.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why.
 */
(function () {

/* global app, Storage, BlockStyleConfig */

const SOUND_PREF_KEY  = 'bp_timer_sound';
const VOICE_PREF_KEY  = 'bp_timer_voice';
const VOLUME_PREF_KEY = 'bp_timer_volume';

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

app.component('SprintTimer', {
  props: ['profile'],
  data() {
    return {
      category:         'run',
      presets:          [],
      selectedPresetId: null,

      // Editable even after picking a preset — presets are a starting
      // point, not a locked-in config.
      rounds:  8,
      workSec: 30,
      restSec: 30,

      phase:        'idle',   // 'idle' | 'work' | 'rest' | 'done'
      secondsLeft:  0,
      currentRound: 0,
      running:      false,
      _tickHandle:  null,
      _wakeLock:    null,

      soundEnabled: true,
      voiceEnabled: true,
      volume:       0.7
    };
  },
  computed: {
    presetsByCategory() {
      return this.presets.filter(p => p.category === this.category);
    },
    phaseLabel() {
      return { idle: 'Ready', work: 'WORK', rest: 'REST', done: 'DONE' }[this.phase];
    },
    phaseClass() {
      return `timer-phase-${this.phase}`;
    }
  },
  async mounted() {
    this.presets = await Storage.getTimerPresets(this.profile.id);

    const savedSound  = localStorage.getItem(SOUND_PREF_KEY);
    const savedVoice  = localStorage.getItem(VOICE_PREF_KEY);
    const savedVolume = localStorage.getItem(VOLUME_PREF_KEY);
    if (savedSound  !== null) this.soundEnabled = savedSound === 'true';
    if (savedVoice  !== null) this.voiceEnabled = savedVoice === 'true';
    if (savedVolume !== null) this.volume = Number(savedVolume);
  },
  beforeUnmount() {
    this._stopTicking();
    this._releaseWakeLock();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; }
  },
  methods: {
    formatTime,

    iconFor(cat) {
      return BlockStyleConfig.categoryStyle(cat).fallbackIcon;
    },

    selectCategory(cat) {
      this.category = cat;
      this.selectedPresetId = null;
    },

    selectPreset(p) {
      this.selectedPresetId = p.id;
      this.rounds  = p.rounds;
      this.workSec = p.workSec;
      this.restSec = p.restSec;
    },

    // ── Sound / voice prefs (persisted) ──────────────────────────────────
    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      localStorage.setItem(SOUND_PREF_KEY, this.soundEnabled);
    },
    toggleVoice() {
      this.voiceEnabled = !this.voiceEnabled;
      localStorage.setItem(VOICE_PREF_KEY, this.voiceEnabled);
    },
    setVolume(v) {
      this.volume = Number(v);
      localStorage.setItem(VOLUME_PREF_KEY, this.volume);
    },

    // ── Audio cues (Web Audio beeps — no asset files, matches this app's
    //    no-build-step, no-extra-dependencies approach elsewhere) ─────────
    _beep(freq, durationMs) {
      if (!this.soundEnabled) return;
      try {
        const ctx = this._audioCtx || (this._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.value = this.volume * 0.3; // oscillators are loud at full gain — scale down
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch { /* Web Audio unavailable — cues are a nice-to-have, not required */ }
    },
    _playTick()       { this._beep(880, 100); },
    _playTransition() { this._beep(440, 150); setTimeout(() => this._beep(880, 200), 180); },
    _playComplete()   { [660, 880, 1100].forEach((f, i) => setTimeout(() => this._beep(f, 250), i * 220)); },

    _speak(text) {
      if (!this.voiceEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    },

    // ── Screen wake lock — this is meant to run untouched for minutes at a
    //    time; the phone dimming/locking mid-set would defeat the point. ──
    async _requestWakeLock() {
      try {
        if (navigator.wakeLock) this._wakeLock = await navigator.wakeLock.request('screen');
      } catch { /* not supported / permission denied — timer still works, screen just may sleep */ }
    },
    _releaseWakeLock() {
      if (this._wakeLock) { this._wakeLock.release().catch(() => {}); this._wakeLock = null; }
    },

    // ── Timer control ─────────────────────────────────────────────────────
    // Anchored to Date.now(), not a naive per-tick decrement — setInterval
    // ticks can be delayed (a busy event loop, a backgrounded tab throttled
    // to <1/sec) without that delay ever being reclaimed, so a pure
    // decrement drifts behind real elapsed time the longer it runs. Every
    // tick recomputes secondsLeft from _phaseEndAt instead, so a late tick
    // just catches up to the true remaining time rather than compounding.
    start() {
      this.phase        = 'work';
      this.secondsLeft  = this.workSec;
      this.currentRound = 1;
      this.running      = true;
      this._phaseEndAt  = Date.now() + this.workSec * 1000;
      this._requestWakeLock();
      this._playTransition();
      this._speak('Go');
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
      this._requestWakeLock();
      this._startTicking();
    },
    reset() {
      this._stopTicking();
      this._releaseWakeLock();
      this.phase = 'idle';
      this.secondsLeft = 0;
      this.currentRound = 0;
      this.running = false;
      this._phaseEndAt = null;
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
      if (this.secondsLeft > 0 && this.secondsLeft <= 3) this._playTick();
      if (remainingMs <= 0) this._transitionPhase();
    },

    _transitionPhase() {
      if (this.phase === 'work') {
        if (this.currentRound >= this.rounds) { this._finish(); return; }
        this.phase = 'rest';
        this.secondsLeft = this.restSec;
        this._phaseEndAt = Date.now() + this.restSec * 1000;
        this._playTransition();
        this._speak('Rest');
      } else if (this.phase === 'rest') {
        this.currentRound++;
        this.phase = 'work';
        this.secondsLeft = this.workSec;
        this._phaseEndAt = Date.now() + this.workSec * 1000;
        this._playTransition();
        this._speak('Go');
      }
    },

    _finish() {
      this.phase = 'done';
      this.running = false;
      this._stopTicking();
      this._releaseWakeLock();
      this._playComplete();
      this._speak('Workout complete');
    }
  },
  template: `
    <div class="space-y-5">

      <!-- ── Setup: category + preset + rounds/work/rest, hidden once running ── -->
      <div v-if="phase === 'idle'" class="module-card space-y-4">
        <div class="flex gap-2">
          <button v-for="cat in ['run', 'cycling', 'swimming']" :key="cat"
                  @click="selectCategory(cat)" class="pill-btn"
                  :class="category === cat ? 'pill-btn-active' : ''">
            {{ iconFor(cat) }} {{ cat === 'run' ? 'Running' : cat === 'cycling' ? 'Cycling' : 'Swimming' }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button v-for="p in presetsByCategory" :key="p.id" @click="selectPreset(p)"
                  class="timer-preset-card" :class="selectedPresetId === p.id ? 'timer-preset-card-selected' : ''">
            <div class="font-semibold text-sm text-white">{{ p.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5">{{ p.description }}</div>
            <div class="text-xs text-sky-400 mt-1">{{ p.rounds }} × ({{ formatTime(p.workSec) }} work / {{ formatTime(p.restSec) }} rest)</div>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Rounds</label>
            <input v-model.number="rounds" type="number" min="1" class="calc-input">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Work (sec)</label>
            <input v-model.number="workSec" type="number" min="1" class="calc-input">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Rest (sec)</label>
            <input v-model.number="restSec" type="number" min="0" class="calc-input">
          </div>
        </div>

        <button @click="start" class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white text-xl font-bold rounded-xl transition">
          ▶ Start
        </button>
      </div>

      <!-- ── Running/paused/done: giant, glanceable ── -->
      <div v-else class="timer-big-card" :class="phaseClass">
        <div class="timer-phase-label">{{ phaseLabel }}</div>
        <div class="timer-display">{{ formatTime(Math.max(secondsLeft, 0)) }}</div>
        <div v-if="phase !== 'done'" class="timer-round-label">Round {{ currentRound }} / {{ rounds }}</div>

        <div class="timer-controls">
          <button v-if="phase !== 'done' && running" @click="pause" class="timer-control-btn">⏸ Pause</button>
          <button v-if="phase !== 'done' && !running" @click="resume" class="timer-control-btn">▶ Resume</button>
          <button @click="reset" class="timer-control-btn timer-control-btn-secondary">↺ Reset</button>
        </div>
      </div>

      <!-- ── Sound settings — always visible, small, secondary to the giant display above ── -->
      <div class="module-card flex flex-wrap items-center gap-4">
        <button @click="toggleSound" class="pill-btn" :class="soundEnabled ? 'pill-btn-active' : ''">
          {{ soundEnabled ? '🔊' : '🔇' }} Beeps
        </button>
        <button @click="toggleVoice" class="pill-btn" :class="voiceEnabled ? 'pill-btn-active' : ''">
          {{ voiceEnabled ? '🗣️' : '🚫' }} Voice cues
        </button>
        <div class="flex items-center gap-2 flex-1 min-w-[10rem]">
          <span class="text-xs text-slate-400">Volume</span>
          <input type="range" min="0" max="1" step="0.05" :value="volume" @input="setVolume($event.target.value)" class="flex-1">
        </div>
      </div>
    </div>
  `
});

})();
