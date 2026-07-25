/**
 * goalDashboard.js — Goal Dashboard (milestones + auto-build trigger)
 *
 * Cross-component handoff to the Week Builder page uses `this.$root` —
 * the single Vue root instance already holds global state (profile,
 * navigation) in app.js, so a `pendingAutobuildGoalId` field there is
 * enough of a signal without introducing a separate state-management
 * library. See app.js and weekBuilder.js for the other side of this.
 */

/* global app, Storage */

const EMPTY_FORM = { title: '', goalType: 'race5k', targetDate: '', targetValue: '', unit: '', currentValue: '', notes: '' };
const WEEK_BUILDER_PAGE_ID = 25;

app.component('GoalDashboard', {
  props: ['profile'],
  data() {
    return {
      goals:      [],
      templates:  [],
      form:       { ...EMPTY_FORM },
      editingId:  null,
      showForm:   false,
      saving:     false
    };
  },
  async mounted() {
    this.templates = await Storage.getGoalTemplates(this.profile.id);
    await this.reload();
  },
  methods: {
    async reload() {
      this.goals = await Storage.getGoals(this.profile.id);
    },

    useTemplate(t) {
      this.editingId = null;
      this.form = { ...EMPTY_FORM, title: t.title, goalType: t.goalType, unit: t.unit };
      this.showForm = true;
    },

    newBlankGoal() {
      this.editingId = null;
      this.form = { ...EMPTY_FORM };
      this.showForm = true;
    },

    editGoal(g) {
      this.editingId = g.id;
      this.form = {
        title: g.title, goalType: g.goalType, targetDate: g.targetDate || '',
        targetValue: g.targetValue ?? '', unit: g.unit || '', currentValue: g.currentValue ?? '', notes: g.notes || ''
      };
      this.showForm = true;
    },

    async saveGoal() {
      if (!this.form.title.trim()) return;
      this.saving = true;
      try {
        if (this.editingId) await Storage.updateGoal(this.profile.id, this.editingId, this.form);
        else await Storage.createGoal(this.profile.id, this.form);
        this.showForm = false;
        this.form = { ...EMPTY_FORM };
        this.editingId = null;
        await this.reload();
      } finally {
        this.saving = false;
      }
    },

    async deleteGoal(g) {
      if (!confirm(`Delete goal "${g.title}"?`)) return;
      await Storage.deleteGoal(this.profile.id, g.id);
      await this.reload();
    },

    async toggleAchieved(g) {
      await Storage.updateGoal(this.profile.id, g.id, { status: g.status === 'achieved' ? 'active' : 'achieved' });
      await this.reload();
    },

    buildWeekFrom(g) {
      this.$root.pendingAutobuildGoalId = g.id;
      this.$root.setPage(WEEK_BUILDER_PAGE_ID);
    },

    daysUntil(g) {
      if (!g.targetDate) return null;
      const ms = new Date(`${g.targetDate}T00:00:00`) - new Date(new Date().toDateString());
      return Math.round(ms / 86400000);
    },

    progressPct(g) {
      if (!g.targetValue || g.currentValue === null || g.currentValue === undefined) return null;
      return Math.max(0, Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)));
    }
  },
  template: `
    <div class="space-y-5">
      <div class="module-card">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider mb-3">Start from a milestone template</h3>
        <div class="flex flex-wrap gap-2">
          <button v-for="t in templates" :key="t.id" @click="useTemplate(t)" class="pill-btn">
            {{ t.icon }} {{ t.title }}
          </button>
          <button @click="newBlankGoal" class="pill-btn">+ Custom Goal</button>
        </div>
      </div>

      <div v-if="showForm" class="module-card space-y-3">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">{{ editingId ? 'Edit Goal' : 'New Goal' }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Title</label>
            <input v-model="form.title" type="text" class="calc-input" placeholder="e.g. 4/30 Milestone 5K">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Target Date</label>
            <input v-model="form.targetDate" type="date" class="calc-input">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Target Value</label>
            <input v-model.number="form.targetValue" type="number" step="0.1" class="calc-input" placeholder="e.g. 25 (minutes)">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Unit</label>
            <input v-model="form.unit" type="text" class="calc-input" placeholder="minutes / kg / km">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Current Value</label>
            <input v-model.number="form.currentValue" type="number" step="0.1" class="calc-input">
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Notes</label>
          <textarea v-model="form.notes" rows="2" class="calc-input resize-none"></textarea>
        </div>
        <div class="flex gap-2">
          <button @click="saveGoal" :disabled="saving" class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {{ saving ? 'Saving…' : 'Save Goal' }}
          </button>
          <button @click="showForm = false" class="py-2 px-4 text-slate-400 hover:text-slate-200 text-sm transition">Cancel</button>
        </div>
      </div>

      <div v-if="goals.length === 0" class="text-center py-8 text-slate-500 text-sm">
        No goals yet — start from a template above.
      </div>

      <div v-for="g in goals" :key="g.id" class="goal-card space-y-2" :class="{ 'opacity-50': g.status === 'achieved' }">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-semibold text-white text-sm">
              {{ g.title }} <span v-if="g.status === 'achieved'" class="text-emerald-400 text-xs">✓ Achieved</span>
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              <span v-if="g.targetDate">Target: {{ g.targetDate }} ({{ daysUntil(g) }} days)</span>
              <span v-if="g.targetValue !== null"> · {{ g.currentValue ?? '—' }} / {{ g.targetValue }} {{ g.unit }}</span>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button @click="buildWeekFrom(g)" class="pill-btn" title="Auto-build a week from this goal">⚡ Build Week</button>
            <button @click="editGoal(g)" class="text-slate-500 hover:text-sky-400 text-xs px-1">Edit</button>
            <button @click="toggleAchieved(g)" class="text-slate-500 hover:text-emerald-400 text-xs px-1">{{ g.status === 'achieved' ? 'Reopen' : 'Done' }}</button>
            <button @click="deleteGoal(g)" class="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
          </div>
        </div>
        <div v-if="progressPct(g) !== null" class="goal-progress-track">
          <div class="goal-progress-fill" :style="{ width: progressPct(g) + '%' }"></div>
        </div>
        <p v-if="g.notes" class="text-xs text-slate-500">{{ g.notes }}</p>
      </div>
    </div>
  `
});
