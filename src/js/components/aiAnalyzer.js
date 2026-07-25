/**
 * aiAnalyzer.js — OpenAI day/week/month training analyzer panel
 *
 * Calls POST /api/profiles/:id/ai/analyze (routes/ai.js). The server
 * caches results per (profile, scope, period) — "Analyze" loads a cached
 * result if one exists for the period, "Regenerate" forces a fresh
 * (billed) OpenAI call. Never touches the OpenAI key directly — that
 * stays server-side (src/server/lib/openai.js).
 */

/* global app, Storage */

app.component('AiAnalyzer', {
  props: ['profile', 'date'],
  data() {
    return {
      scope:   'day',
      result:  null,
      loading: false,
      error:   ''
    };
  },
  watch: {
    date() { this.result = null; this.error = ''; },
    scope() { this.result = null; this.error = ''; }
  },
  methods: {
    async run(regenerate) {
      this.loading = true;
      this.error   = '';
      try {
        this.result = await Storage.analyzeAI(this.profile.id, this.scope, this.date, regenerate);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    }
  },
  template: `
    <div class="module-card space-y-3">
      <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">🤖 AI Analyzer</h3>
      <div class="flex flex-wrap items-center gap-2">
        <button @click="scope='day'"   :class="['pill-btn', scope==='day'   ? 'active-run'   : '']">Day</button>
        <button @click="scope='week'"  :class="['pill-btn', scope==='week'  ? 'active-cycle' : '']">Week</button>
        <button @click="scope='month'" :class="['pill-btn', scope==='month' ? 'active-lift'  : '']">Month</button>
        <button @click="run(false)" :disabled="loading" class="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
          {{ loading ? 'Analyzing…' : 'Analyze' }}
        </button>
        <button v-if="result" @click="run(true)" :disabled="loading" class="py-1.5 px-3 text-slate-400 hover:text-slate-200 text-xs transition">
          Regenerate
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{{ error }}</p>

      <div v-if="result" class="space-y-1">
        <div class="ai-summary">{{ result.summary }}</div>
        <p class="text-[10px] text-slate-500">
          {{ result.periodStart }} → {{ result.periodEnd }} · {{ result.cached ? 'cached result' : 'freshly generated' }}
        </p>
      </div>
    </div>
  `
});
