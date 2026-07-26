/**
 * supplementStack.js — daily supplement checklist
 *
 * Same day-navigation pattern as dailyTracker.js. The 8 supplements here
 * are the same ones already discussed with citations in db.js pages 7/8
 * (see lib/supplements.js on the server) — this is a tracker for that
 * existing content, not a new supplement list.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why.
 */
(function () {

/* global app, Storage */

function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

app.component('SupplementStack', {
  props: ['profile'],
  data() {
    return {
      date:       toIsoDateLocal(new Date()),
      templates:  [],
      taken:      [],
      loading:    false,
      saving:     false,
      expandedId: null
    };
  },
  async mounted() {
    this.templates = await Storage.getSupplementTemplates(this.profile.id);
    await this.loadDay();
  },
  methods: {
    async loadDay() {
      this.loading = true;
      try {
        const data = await Storage.getSupplementsForDay(this.profile.id, this.date);
        this.taken = data.taken || [];
      } finally {
        this.loading = false;
      }
    },
    async shiftDay(delta) {
      const d = new Date(`${this.date}T00:00:00`);
      d.setDate(d.getDate() + delta);
      this.date = toIsoDateLocal(d);
      await this.loadDay();
    },
    isTaken(id) {
      return this.taken.includes(id);
    },
    async toggle(id) {
      this.taken = this.isTaken(id) ? this.taken.filter(k => k !== id) : [...this.taken, id];
      this.saving = true;
      try { await Storage.saveSupplementsForDay(this.profile.id, this.date, this.taken); }
      finally { this.saving = false; }
    },
    toggleExpanded(id) {
      this.expandedId = this.expandedId === id ? null : id;
    }
  },
  template: `
    <div class="space-y-5">
      <div class="module-card">
        <div class="flex items-center gap-2">
          <button @click="shiftDay(-1)" class="pill-btn">‹ Prev Day</button>
          <span class="text-sm font-semibold text-white flex-1 text-center">{{ date }}</span>
          <button @click="shiftDay(1)" class="pill-btn">Next Day ›</button>
        </div>
      </div>

      <div class="module-card space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sky-400 font-semibold uppercase tracking-wider text-sm">Today's Stack</h2>
          <span class="text-xs text-slate-500">{{ taken.length }} / {{ templates.length }} taken{{ saving ? ' · saving…' : '' }}</span>
        </div>

        <div v-for="s in templates" :key="s.id">
          <div class="supplement-row">
            <button @click="toggle(s.id)" class="flex items-center gap-3 flex-1 min-w-0 text-left">
              <span class="text-lg flex-shrink-0">{{ isTaken(s.id) ? '✅' : '⬜' }}</span>
              <span class="min-w-0">
                <span class="block text-sm text-slate-200">{{ s.name }}</span>
                <span class="block text-xs text-slate-500">{{ s.dose }} · {{ s.timing }}</span>
              </span>
            </button>
            <button @click="toggleExpanded(s.id)" class="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 px-2">
              {{ expandedId === s.id ? '▲' : 'Why?' }}
            </button>
          </div>
          <p v-if="expandedId === s.id" class="text-xs text-slate-400 leading-relaxed bg-slate-800/50 rounded-lg p-3 mt-1">
            {{ s.evidence }}
          </p>
        </div>
      </div>
    </div>
  `
});

})();
