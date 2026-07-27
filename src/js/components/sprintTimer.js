/**
 * sprintTimer.js — Sprint/Interval Timer
 *
 * Deliberately built for glancing at (or just listening to) mid-run/ride/
 * swim, not for careful reading: a giant, full-width, phase-colored
 * countdown plus optional beep + spoken cues, so it's usable without
 * stopping or staring at the screen. Presets come from lib/timerPresets.js
 * — structured rounds/workSec/restSec, unlike exercises.js's human-readable
 * `dosage` text, specifically so this can run a workout directly instead
 * of trying to parse free text.
 *
 * Phase sequence: idle -> [warmup] -> (work -> rest) x rounds -> [cooldown]
 * -> done. warmup/cooldown are each individually toggleable and are simply
 * skipped (not looped through with 0 duration) when disabled.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why.
 */
(function () {

/* global app, Storage, BlockStyleConfig */

const SOUND_PREF_KEY    = 'bp_timer_sound';
const VOICE_PREF_KEY    = 'bp_timer_voice';
const VOLUME_PREF_KEY   = 'bp_timer_volume';
const WARMUP_PREF_KEY   = 'bp_timer_warmup';
const COOLDOWN_PREF_KEY = 'bp_timer_cooldown';

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

      warmupEnabled:   true,
      warmupSec:       180,
      cooldownEnabled: true,
      cooldownSec:     180,

      phase:        'idle',   // idle | warmup | work | rest | cooldown | done
      secondsLeft:  0,
      currentRound: 0,
      running:      false,
      _tickHandle:  null,
      _wakeLock:    null,
      _phaseEndAt:  null,
      _pausedRemainingMs: 0,
      _motivationShownForPhase: false,

      soundEnabled: true,
      voiceEnabled: true,
      volume:       1,

      // Collapsible panels — decluttering in service of the giant countdown
      // being the thing that actually matters while running/riding/swimming.
      showSetup:      true,
      showSoundPanel: false,

      phrases: { getReady: [], pushThrough: [] },
      motivationMessage: null,
      _motivationTimeoutHandle: null
    };
  },
  computed: {
    presetsByCategory() {
      return this.presets.filter(p => p.category === this.category);
    },
    phaseLabel() {
      return {
        idle: 'Ready', warmup: 'WARM UP', work: 'WORK', rest: 'REST',
        cooldown: 'COOL DOWN', done: 'DONE'
      }[this.phase];
    },
    phaseClass() {
      return `timer-phase-${this.phase}`;
    },
    // Whole-session sidebar: warm up (if enabled) + one card per round +
    // cool down (if enabled) — real-time "how much is done, how much is
    // left" across the entire session, not just the current round.
    sessionCards() {
      const cards = [];
      if (this.warmupEnabled) {
        cards.push({ label: 'Warm Up', status: this.phase === 'warmup' ? 'current' : (this.phase === 'idle' ? 'upcoming' : 'done') });
      }
      for (let r = 1; r <= this.rounds; r++) {
        cards.push({ label: `Round ${r}`, status: this.roundStatus(r) });
      }
      if (this.cooldownEnabled) {
        cards.push({ label: 'Cool Down', status: this.phase === 'cooldown' ? 'current' : (this.phase === 'done' ? 'done' : 'upcoming') });
      }
      return cards;
    }
  },
  async mounted() {
    this.presets = await Storage.getTimerPresets(this.profile.id);

    try {
      const res = await fetch('src/js/data/timerPhrases.json');
      if (res.ok) this.phrases = await res.json();
    } catch { /* motivational phrases are a nice-to-have, not required */ }

    const savedSound    = localStorage.getItem(SOUND_PREF_KEY);
    const savedVoice     = localStorage.getItem(VOICE_PREF_KEY);
    const savedVolume    = localStorage.getItem(VOLUME_PREF_KEY);
    const savedWarmup    = localStorage.getItem(WARMUP_PREF_KEY);
    const savedCooldown  = localStorage.getItem(COOLDOWN_PREF_KEY);
    if (savedSound    !== null) this.soundEnabled    = savedSound === 'true';
    if (savedVoice    !== null) this.voiceEnabled    = savedVoice === 'true';
    if (savedVolume   !== null) this.volume          = Number(savedVolume);
    if (savedWarmup   !== null) this.warmupEnabled   = savedWarmup === 'true';
    if (savedCooldown !== null) this.cooldownEnabled = savedCooldown === 'true';

    // "Start Workout" handoff from a Week Builder block — same pattern as
    // goalDashboard.js's pendingAutobuildGoalId -> WeekBuilder handoff, a
    // field on the shared $root instance. Only pre-selects the category;
    // there's no attempt to map a specific exercise to a timer preset.
    if (this.$root.pendingTimerCategory) {
      this.category = this.$root.pendingTimerCategory;
      this.$root.pendingTimerCategory = null;
    }
  },
  beforeUnmount() {
    this._stopTicking();
    this._releaseWakeLock();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; }
    clearTimeout(this._motivationTimeoutHandle);
  },
  methods: {
    formatTime,

    iconFor(cat) {
      return BlockStyleConfig.categoryStyle(cat).fallbackIcon;
    },

    roundStatus(roundNum) {
      if (this.phase === 'warmup' || this.phase === 'idle') return 'upcoming';
      if (roundNum < this.currentRound) return 'done';
      if (roundNum > this.currentRound) return 'upcoming';
      // roundNum === currentRound: mid-work is "current"; resting after it
      // (or in cooldown/done once it was the last round) counts as "done" —
      // the round's work is what the card is tracking, not its recovery.
      return this.phase === 'work' ? 'current' : 'done';
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

    // ── Sound / voice / warmup / cooldown prefs (persisted) ──────────────
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
    toggleWarmup() {
      this.warmupEnabled = !this.warmupEnabled;
      localStorage.setItem(WARMUP_PREF_KEY, this.warmupEnabled);
    },
    toggleCooldown() {
      this.cooldownEnabled = !this.cooldownEnabled;
      localStorage.setItem(COOLDOWN_PREF_KEY, this.cooldownEnabled);
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

    // Random phrase from lib phrases + a brief on-screen popup, layered on
    // top of the beep/voice cues above (e.g. "Prepárate" a few seconds
    // before work starts, "Esfuérzate, es lo último" a few seconds before
    // it ends) — separate from the structural "Rest"/"Go" announcements.
    _showMotivation(type) {
      const list = this.phrases[type];
      if (!list || !list.length) return;
      const phrase = list[Math.floor(Math.random() * list.length)];
      this.motivationMessage = phrase;
      this._speak(phrase);
      clearTimeout(this._motivationTimeoutHandle);
      this._motivationTimeoutHandle = setTimeout(() => { this.motivationMessage = null; }, 2500);
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
    // decrement drifts behind real elapsed time. Every tick recomputes
    // secondsLeft from _phaseEndAt instead, so a late tick just catches up
    // to the true remaining time rather than compounding.
    start() {
      this.currentRound = 0;
      this.running = true;
      this._requestWakeLock();
      if (this.warmupEnabled) {
        this._enterPhase('warmup', this.warmupSec);
        this._speak('Warm up');
      } else {
        this.currentRound = 1;
        this._enterPhase('work', this.workSec);
        this._speak('Go');
      }
      this._playTransition();
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
      this.motivationMessage = null;
      clearTimeout(this._motivationTimeoutHandle);
    },

    _enterPhase(phase, durationSec) {
      this.phase = phase;
      this.secondsLeft = durationSec;
      this._phaseEndAt = Date.now() + durationSec * 1000;
      this._motivationShownForPhase = false;
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

      if (this.secondsLeft > 0 && this.secondsLeft <= 3) {
        this._playTick();
        if (!this._motivationShownForPhase) {
          if (this.phase === 'rest' || this.phase === 'warmup') this._showMotivation('getReady');
          else if (this.phase === 'work') this._showMotivation('pushThrough');
          this._motivationShownForPhase = true;
        }
      }
      if (remainingMs <= 0) this._transitionPhase();
    },

    _transitionPhase() {
      if (this.phase === 'warmup') {
        this.currentRound = 1;
        this._enterPhase('work', this.workSec);
        this._playTransition();
        this._speak('Go');
      } else if (this.phase === 'work') {
        if (this.currentRound >= this.rounds) {
          if (this.cooldownEnabled) {
            this._enterPhase('cooldown', this.cooldownSec);
            this._playTransition();
            this._speak('Cool down');
          } else {
            this._finish();
          }
          return;
        }
        this._enterPhase('rest', this.restSec);
        this._playTransition();
        this._speak('Rest');
      } else if (this.phase === 'rest') {
        this.currentRound++;
        this._enterPhase('work', this.workSec);
        this._playTransition();
        this._speak('Go');
      } else if (this.phase === 'cooldown') {
        this._finish();
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
        <button @click="showSetup = !showSetup" class="timer-section-toggle">
          <span>{{ showSetup ? '▾' : '▸' }} ⏱️ Sprint Timer setup</span>
        </button>

        <template v-if="showSetup">
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

          <div class="grid grid-cols-2 gap-3">
            <div class="flex items-center gap-2">
              <button @click="toggleWarmup" class="pill-btn" :class="warmupEnabled ? 'pill-btn-active' : ''">
                {{ warmupEnabled ? '✓' : '○' }} Warm up
              </button>
              <input v-if="warmupEnabled" v-model.number="warmupSec" type="number" min="1" class="calc-input" title="Warm up seconds">
            </div>
            <div class="flex items-center gap-2">
              <button @click="toggleCooldown" class="pill-btn" :class="cooldownEnabled ? 'pill-btn-active' : ''">
                {{ cooldownEnabled ? '✓' : '○' }} Cool down
              </button>
              <input v-if="cooldownEnabled" v-model.number="cooldownSec" type="number" min="1" class="calc-input" title="Cool down seconds">
            </div>
          </div>

          <button @click="start" class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white text-xl font-bold rounded-xl transition">
            ▶ Start
          </button>
        </template>
      </div>

      <!-- ── Running/paused/done: giant, glanceable + session sidebar ── -->
      <div v-else class="timer-layout">
        <div class="timer-big-card" :class="phaseClass">
          <div v-if="motivationMessage" class="timer-motivation-popup">{{ motivationMessage }}</div>
          <div class="timer-phase-label">{{ phaseLabel }}</div>
          <div class="timer-display">{{ formatTime(Math.max(secondsLeft, 0)) }}</div>
          <div v-if="phase === 'work' || phase === 'rest'" class="timer-round-label">Round {{ currentRound }} / {{ rounds }}</div>

          <div class="timer-controls">
            <button v-if="phase !== 'done' && running" @click="pause" class="timer-control-btn">⏸ Pause</button>
            <button v-if="phase !== 'done' && !running" @click="resume" class="timer-control-btn">▶ Resume</button>
            <button @click="reset" class="timer-control-btn timer-control-btn-secondary">↺ Reset</button>
          </div>
        </div>

        <div class="timer-rounds-sidebar">
          <div v-for="card in sessionCards" :key="card.label" class="timer-round-card" :class="'timer-round-card-' + card.status">
            <span>{{ card.label }}</span>
            <span v-if="card.status === 'done'">✓</span>
            <span v-else-if="card.status === 'current'">●</span>
          </div>
        </div>
      </div>

      <!-- ── Sound settings — collapsed by default, secondary to the timer ── -->
      <div class="module-card">
        <button @click="showSoundPanel = !showSoundPanel" class="timer-section-toggle">
          <span>{{ showSoundPanel ? '▾' : '▸' }} 🔊 Sound &amp; voice settings</span>
        </button>
        <div v-if="showSoundPanel" class="flex flex-wrap items-center gap-4 mt-3">
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
    </div>
  `
});

})();
