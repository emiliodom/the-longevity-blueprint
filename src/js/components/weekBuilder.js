/**
 * weekBuilder.js — Week Training Builder (drag-and-drop calendar)
 *
 * Layout: a collapsible, horizontal palette of draggable block templates
 * above a Day/Week/Month board. Drag-and-drop is SortableJS (CDN, see
 * index.html) — touch-friendly, no build step.
 *
 * Sync strategy: every drag operation (drop from palette, move between
 * days, reorder within a day) calls the API, then reloads the whole week
 * from the server and re-initializes Sortable instances. This trades a
 * little UI snappiness for a single source of truth — Vue's DOM and
 * Sortable's DOM never fight over ordering. Day/Week view both reuse this
 * exact same handleDrop/handleReorder/deleteBlock path — nothing about
 * switching views changes how or whether a modification gets saved; only
 * Month view has no drag surface at all (see below).
 *
 * Wrapped in an IIFE: this is a plain <script> tag, not an ES module, so
 * every top-level `const`/`function` here would otherwise land in the
 * same global scope as every other component file — a `const` collision
 * (e.g. two files both declaring DAY_LABELS) throws and silently aborts
 * that whole script; a `function` collision just gets overwritten with no
 * warning. The IIFE keeps everything below private except the
 * `app.component(...)` registration, which is the actual public contract.
 */
(function () {

/* global app, Sortable, Storage, BlockStyleConfig */

function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

app.component('WeekBuilder', {
  props: ['profile'],
  data() {
    return {
      weekStartDate:  toIsoDateLocal(mondayOf(new Date())),
      week:           null,
      blockTemplates: [],
      exercises:      [],
      goals:          [],
      selectedGoalId: '',
      loading:        false,
      autobuilding:   false,
      _sortables:     [],

      // 'week' (default, 7-day board) | 'day' (one day, same board machinery
      // just filtered to one column) | 'month' (read-only calendar overview,
      // no drag surface — see loadMonthView()).
      viewMode:     'week',
      dayViewIndex: 0,
      monthAnchor:  toIsoDateLocal(new Date()),
      monthWeeksData: {}, // weekStartDate -> week object, populated by loadMonthView()

      // Tap-to-place: select a palette template, then tap a day to add it —
      // an equivalent to dragging, not just a fallback for it. Drag-and-drop
      // is nice on a desktop mouse but unusable for touch/keyboard/screen-
      // reader users without this, so it's a first-class path, not an
      // afterthought.
      selectedTemplateId: null,
      // Collapsed by default — the palette is ~24 items across 8 categories,
      // too much vertical space to show unconditionally on every visit.
      showPalette: false,
      // Detail modal: normalized to { title, icon, durationMin, category }
      // regardless of whether it was opened from a palette template or a
      // placed board block — see openTemplateDetail()/openBlockDetail().
      detailItem: null,
      DAY_LABELS
    };
  },
  computed: {
    selectedTemplate() {
      return this.blockTemplates.find(t => t.id === this.selectedTemplateId) || null;
    },
    weekEndDate() {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + 6);
      return toIsoDateLocal(d);
    },
    // Which day-of-week indices the board should render — all 7 in Week
    // view, just one in Day view. initSortables() maps array position back
    // to the real day-of-week through this same array, so drag/reorder
    // always saves against the correct day regardless of which view is
    // showing it.
    visibleDayIndices() {
      return this.viewMode === 'day' ? [this.dayViewIndex] : [0, 1, 2, 3, 4, 5, 6];
    },
    viewRangeLabel() {
      if (this.viewMode === 'day') {
        const d = this.dayDate(this.dayViewIndex);
        return `${DAY_LABELS[this.dayViewIndex]} · ${toIsoDateLocal(d)}`;
      }
      if (this.viewMode === 'month') {
        const d = new Date(`${this.monthAnchor}T00:00:00`);
        return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      }
      return `${this.weekStartDate} → ${this.weekEndDate}`;
    },
    // Every Monday whose week overlaps the visible month grid — the fetch
    // list for loadMonthView().
    monthWeekStarts() {
      const anchor = new Date(`${this.monthAnchor}T00:00:00`);
      const month  = anchor.getMonth();
      const lastOfMonth = new Date(anchor.getFullYear(), month + 1, 0);
      const starts = [];
      let cursor = mondayOf(new Date(anchor.getFullYear(), month, 1));
      while (cursor <= lastOfMonth) {
        starts.push(toIsoDateLocal(cursor));
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
      return starts;
    },
    // [{ date, inMonth, dayOfWeek }] for every cell in the calendar grid,
    // grouped into weeks of 7 for the template to render as rows.
    monthGridWeeks() {
      const anchor = new Date(`${this.monthAnchor}T00:00:00`);
      const month = anchor.getMonth();
      return this.monthWeekStarts.map(weekStart => {
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(`${weekStart}T00:00:00`);
          d.setDate(d.getDate() + i);
          days.push({ date: toIsoDateLocal(d), inMonth: d.getMonth() === month, dayOfWeek: i });
        }
        return days;
      });
    },
    templatesByCategory() {
      const groups = {};
      this.blockTemplates.forEach(t => { (groups[t.category] ||= []).push(t); });
      return groups;
    },
    activeGoal() {
      return this.goals.find(g => g.id === this.week?.goalId) || null;
    },
    detailExercises() {
      if (!this.detailItem) return [];
      return this.exercises.filter(e => e.category === this.detailItem.category);
    }
  },
  async mounted() {
    this.blockTemplates = await Storage.getBlockTemplates(this.profile.id);
    this.exercises      = await Storage.getExercises(this.profile.id);
    this.goals = await Storage.getGoals(this.profile.id);
    await this.loadWeek();

    // Handoff from Goal Dashboard's "Build Week from this Goal" button (see goalDashboard.js)
    if (this.$root.pendingAutobuildGoalId) {
      this.selectedGoalId = this.$root.pendingAutobuildGoalId;
      this.$root.pendingAutobuildGoalId = null;
      await this.runAutobuild();
    }
  },
  beforeUnmount() {
    this.destroySortables();
  },
  methods: {
    dayDate(dayIndex) {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + dayIndex);
      return d;
    },
    // toIsoDateLocal, not toISOString — the latter converts to UTC, which
    // would silently show the previous day's date for anyone east of UTC.
    dayLabel(dayIndex) {
      return toIsoDateLocal(this.dayDate(dayIndex)).slice(5);
    },
    dayBlocks(dayIndex) {
      if (!this.week) return [];
      return this.week.blocks
        .filter(b => b.dayOfWeek === dayIndex)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    // Which day-of-week index today is within the currently-loaded week, or
    // 0 if today isn't in it (e.g. you've paged Week view elsewhere, then
    // switch to Day view) — a sensible default rather than an arbitrary one.
    _todayIndexInLoadedWeek() {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const ws = new Date(`${this.weekStartDate}T00:00:00`);
      const diffDays = Math.round((today - ws) / 86400000);
      return (diffDays >= 0 && diffDays <= 6) ? diffDays : 0;
    },
    blockIcon(block) {
      const t = this.blockTemplates.find(bt => bt.category === block.blockType && bt.label === block.title);
      return t?.icon || BlockStyleConfig.categoryStyle(block.blockType).fallbackIcon;
    },
    categoryLabel(category) {
      return BlockStyleConfig.categoryStyle(category).label;
    },
    cardStyle(category) {
      return BlockStyleConfig.cardInlineStyle(category);
    },

    async loadWeek() {
      this.loading = true;
      try {
        this.week = await Storage.ensureWeek(this.profile.id, this.weekStartDate);
        this.selectedGoalId = this.week.goalId || this.selectedGoalId;
        await this.$nextTick();
        this.initSortables();
      } finally {
        this.loading = false;
      }
    },

    // ── View mode switching ──────────────────────────────────────────────
    async setViewMode(mode) {
      this.viewMode = mode;
      if (mode === 'day') this.dayViewIndex = this._todayIndexInLoadedWeek();
      if (mode === 'month') await this.loadMonthView();
      await this.$nextTick();
      this.initSortables();
    },

    async shiftView(direction) {
      if (this.viewMode === 'day')   return this.shiftDay(direction);
      if (this.viewMode === 'month') return this.shiftMonth(direction);
      return this.shiftWeek(direction * 7);
    },

    async shiftDay(delta) {
      let next = this.dayViewIndex + delta;
      if (next < 0 || next > 6) {
        // Crossed a week boundary — move the underlying week and wrap the index.
        const weekDelta = next < 0 ? -7 : 7;
        next = ((next % 7) + 7) % 7;
        const d = new Date(`${this.weekStartDate}T00:00:00`);
        d.setDate(d.getDate() + weekDelta);
        this.weekStartDate = toIsoDateLocal(mondayOf(d));
        this.dayViewIndex = next;
        await this.loadWeek();
      } else {
        this.dayViewIndex = next;
        await this.$nextTick();
        this.initSortables();
      }
    },

    async shiftWeek(days) {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + days);
      this.weekStartDate = toIsoDateLocal(mondayOf(d));
      await this.loadWeek();
    },

    async shiftMonth(delta) {
      const d = new Date(`${this.monthAnchor}T00:00:00`);
      d.setMonth(d.getMonth() + delta, 1); // day 1 avoids month-length rollover (e.g. Jan 31 + 1 month)
      this.monthAnchor = toIsoDateLocal(d);
      await this.loadMonthView();
    },

    // Read-only — reuses the same never-creates-a-row endpoint the Daily
    // Tracker uses, since just looking at a month overview shouldn't seed
    // empty week rows for every week it happens to span.
    async loadMonthView() {
      const starts = this.monthWeekStarts;
      const results = await Promise.all(starts.map(ws => Storage.getWeekByDate(this.profile.id, ws)));
      const map = {};
      starts.forEach((ws, i) => { map[ws] = results[i]; });
      this.monthWeeksData = map;
    },

    blocksForDate(dateStr) {
      const d = new Date(`${dateStr}T00:00:00`);
      const ws = toIsoDateLocal(mondayOf(d));
      const dow = (d.getDay() + 6) % 7;
      const week = this.monthWeeksData[ws];
      return (week?.blocks || []).filter(b => b.dayOfWeek === dow);
    },

    async goToDay(dateStr) {
      const d = new Date(`${dateStr}T00:00:00`);
      this.weekStartDate = toIsoDateLocal(mondayOf(d));
      this.dayViewIndex = (d.getDay() + 6) % 7;
      this.viewMode = 'day';
      await this.loadWeek();
    },

    async deleteBlock(blockId) {
      await Storage.deleteBlock(this.profile.id, this.week.id, blockId);
      await this.loadWeek();
    },

    async runAutobuild() {
      if (!this.selectedGoalId) return alert('Pick a goal first — Auto-Build needs a target date to plan around.');
      if (!confirm('This replaces every block currently on this week with a plan generated from the selected goal. Continue?')) return;
      this.autobuilding = true;
      try {
        this.week = await Storage.autobuildWeek(this.profile.id, this.week.id, this.selectedGoalId);
        await this.$nextTick();
        this.initSortables();
      } finally {
        this.autobuilding = false;
      }
    },

    exportUrl(format) {
      return this.week ? Storage.exportWeekUrl(this.profile.id, this.week.id, format) : '#';
    },

    // ── Tap-to-place (drag-and-drop's click/touch/keyboard equivalent) ──
    selectTemplate(t) {
      this.selectedTemplateId = this.selectedTemplateId === t.id ? null : t.id;
    },

    async placeOnDay(dayIndex) {
      const template = this.selectedTemplate;
      if (!template) return;
      await Storage.addBlock(this.profile.id, this.week.id, {
        dayOfWeek: dayIndex, blockType: template.category, title: template.label,
        durationMin: template.defaultDurationMin, details: template.details
      });
      this.selectedTemplateId = null;
      await this.loadWeek();
    },

    // ── Detail modal ─────────────────────────────────────────────────────
    // blockId is only set when opened from an already-placed block — that's
    // what selectExercise() needs to know it has something to replace.
    // Opening from a palette template (not yet on a day) is reference-only.
    openTemplateDetail(t) {
      this.detailItem = { title: t.label, icon: t.icon, durationMin: t.defaultDurationMin, category: t.category, blockId: null };
    },
    openBlockDetail(block) {
      this.detailItem = { title: block.title, icon: this.blockIcon(block), durationMin: block.durationMin, category: block.blockType, blockId: block.id };
    },
    closeDetail() {
      this.detailItem = null;
    },
    async selectExercise(ex) {
      if (!this.detailItem?.blockId) return;
      await Storage.updateBlock(this.profile.id, this.week.id, this.detailItem.blockId, {
        title: ex.name, details: { exerciseId: ex.id }
      });
      this.closeDetail();
      await this.loadWeek();
    },

    // ── Drag and drop wiring ────────────────────────────────────────────
    destroySortables() {
      this._sortables.forEach(s => s.destroy());
      this._sortables = [];
    },

    initSortables() {
      this.destroySortables();
      if (typeof Sortable === 'undefined' || !this.week) return;

      const paletteEl = this.$refs.palette;
      if (paletteEl) {
        this._sortables.push(new Sortable(paletteEl, BlockStyleConfig.sortableOptions({
          group: { name: 'week-blocks', pull: 'clone', put: false },
          sort:     false,
          // Category headers are flat siblings of .palette-item (see template
          // below — Sortable treats direct children as its drag units, so
          // without this, grabbing any item under a header dragged the
          // *entire category group* as one clump instead of a single item.
          filter:   '.palette-category-header'
        })));
      }

      // this.$refs.dayLists is populated in visibleDayIndices order (Day
      // view renders just one), so array position i maps back to the real
      // day-of-week through that same array — not i itself.
      (this.$refs.dayLists || []).forEach((el, i) => {
        const dayIndex = this.visibleDayIndices[i];
        this._sortables.push(new Sortable(el, BlockStyleConfig.sortableOptions({
          group: { name: 'week-blocks', pull: true, put: true },
          onAdd: evt => this.handleDrop(evt, dayIndex, paletteEl),
          onUpdate: evt => this.handleReorder(evt, dayIndex)
        })));
      });
    },

    async handleDrop(evt, dayIndex, paletteEl) {
      const el = evt.item;
      const fromPalette  = evt.from === paletteEl;
      const templateId   = el.dataset.templateId;
      const blockId      = el.dataset.blockId;
      el.parentNode && el.parentNode.removeChild(el); // Vue re-renders authoritative state after reload

      if (fromPalette) {
        const template = this.blockTemplates.find(t => t.id === templateId);
        if (!template) return;
        await Storage.addBlock(this.profile.id, this.week.id, {
          dayOfWeek: dayIndex, blockType: template.category, title: template.label,
          durationMin: template.defaultDurationMin, details: template.details
        });
      } else if (blockId) {
        await Storage.updateBlock(this.profile.id, this.week.id, blockId, { dayOfWeek: dayIndex });
      }
      await this.loadWeek();
    },

    async handleReorder(evt, dayIndex) {
      const ids = [...evt.to.children].map(c => c.dataset.blockId).filter(Boolean);
      await Promise.all(ids.map((id, i) =>
        Storage.updateBlock(this.profile.id, this.week.id, id, { dayOfWeek: dayIndex, sortOrder: i })
      ));
      await this.loadWeek();
    }
  },
  template: `
    <div class="space-y-5">
      <!-- Week nav + view mode + goal + export toolbar -->
      <div class="module-card space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button @click="shiftView(-1)" class="pill-btn">‹ Prev</button>
            <span class="text-sm font-semibold text-white">{{ viewRangeLabel }}</span>
            <button @click="shiftView(1)" class="pill-btn">Next ›</button>
          </div>
          <div class="flex items-center gap-1">
            <button v-for="mode in ['day', 'week', 'month']" :key="mode" @click="setViewMode(mode)"
                    class="pill-btn" :class="viewMode === mode ? 'pill-btn-active' : ''">
              {{ mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'Month' }}
            </button>
          </div>
        </div>
        <div v-if="viewMode !== 'month'" class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 flex-wrap">
            <select v-model="selectedGoalId" class="calc-input max-w-xs">
              <option value="">— Select a goal to auto-build from —</option>
              <option v-for="g in goals" :key="g.id" :value="g.id">{{ g.title }}{{ g.targetDate ? ' · ' + g.targetDate : '' }}</option>
            </select>
            <button @click="runAutobuild" :disabled="autobuilding" class="w-full sm:w-auto py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
              {{ autobuilding ? 'Building…' : '⚡ Build Week from Goal' }}
            </button>
            <span v-if="activeGoal" class="text-xs text-slate-500">Linked goal: {{ activeGoal.title }}</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <a :href="exportUrl('pdf')" class="pdf-btn no-print" title="Export as PDF">📄 PDF</a>
            <a :href="exportUrl('csv')" class="pdf-btn no-print" title="Export as CSV">📊 CSV</a>
            <a :href="exportUrl('ics')" class="pdf-btn no-print" title="Add to Calendar (.ics)">🗓️ Calendar</a>
          </div>
        </div>
      </div>

      <!-- Palette — collapsed by default (it's a lot of vertical space), horizontal
           and above the board when expanded. v-show (not v-if) keeps the ref="palette"
           DOM node alive while collapsed, so its Sortable instance never needs to be
           torn down/recreated — a v-if here would break drag every time you reopened it. -->
      <div v-if="viewMode !== 'month'" class="module-card">
        <button @click="showPalette = !showPalette" class="palette-toggle">
          <span class="text-sky-400 font-semibold text-xs uppercase tracking-wider">
            {{ showPalette ? '▾' : '▸' }} Add a block ({{ blockTemplates.length }})
          </span>
        </button>
        <p v-if="showPalette" class="text-xs text-slate-500 mt-1 mb-3">Drag a block onto a day, or tap a block then tap a day — works without a mouse.</p>
        <div ref="palette" class="palette-row" v-show="showPalette">
          <template v-for="(items, cat) in templatesByCategory" :key="cat">
            <div class="text-xs text-slate-500 font-medium palette-category-header basis-full">{{ categoryLabel(cat) }}</div>
            <div v-for="t in items" :key="t.id" :data-template-id="t.id"
                 @click="selectTemplate(t)" :style="cardStyle(t.category)"
                 class="palette-item" :class="selectedTemplateId === t.id ? 'palette-item-selected' : ''">
              <span>{{ t.icon }}</span>
              <span class="flex-1 min-w-0 truncate">{{ t.label }}</span>
              <span class="text-xs text-slate-500">{{ t.defaultDurationMin }}m</span>
              <button @click.stop="openTemplateDetail(t)" class="palette-item-info" title="More info">ⓘ</button>
            </div>
          </template>
        </div>
      </div>

      <!-- Day/Week board — wraps as cards; Day view is just this same board
           filtered to one column via visibleDayIndices. -->
      <div v-if="viewMode !== 'month'"
           class="grid grid-cols-1 gap-3"
           :class="viewMode === 'day' ? 'sm:grid-cols-1 max-w-md' : 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'">
        <div v-for="dayIndex in visibleDayIndices" :key="dayIndex" class="day-column">
            <div class="day-column-header">
              <div class="font-semibold text-xs text-white">{{ DAY_LABELS[dayIndex] }}</div>
              <div class="text-[10px] text-slate-500">{{ dayLabel(dayIndex) }}</div>
            </div>
            <ul ref="dayLists" class="day-column-list" :data-day="dayIndex">
              <li v-for="block in dayBlocks(dayIndex)" :key="block.id" :data-block-id="block.id"
                  class="block-card" :style="cardStyle(block.blockType)">
                <div class="flex items-center gap-1 min-w-0">
                  <span class="text-sm truncate">{{ blockIcon(block) }} {{ block.title }}</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-0.5">{{ block.durationMin || '?' }} min</div>
                <div class="block-card-actions">
                  <button @click.stop="openBlockDetail(block)" class="block-card-action-btn">ℹ️ Info</button>
                  <button @click.stop="deleteBlock(block.id)" class="block-card-action-btn block-card-action-btn-danger">✕</button>
                </div>
              </li>
            </ul>
            <button v-if="selectedTemplate" @click="placeOnDay(dayIndex)" class="day-column-tap-target">
              + Add {{ selectedTemplate.label }}
            </button>
            <p v-else-if="!dayBlocks(dayIndex).length" class="day-column-empty">Drop here</p>
        </div>
      </div>

      <!-- Month view — read-only calendar overview, click a day to drill into Day view. -->
      <div v-else class="month-grid">
        <div class="month-grid-weekdays">
          <div v-for="label in DAY_LABELS" :key="label" class="month-grid-weekday-label">{{ label.slice(0, 3) }}</div>
        </div>
        <div v-for="(week, wi) in monthGridWeeks" :key="wi" class="month-grid-row">
          <button v-for="day in week" :key="day.date" @click="goToDay(day.date)"
                  class="month-grid-cell" :class="day.inMonth ? '' : 'month-grid-cell-outside'">
            <span class="month-grid-date">{{ day.date.slice(-2) }}</span>
            <span v-if="blocksForDate(day.date).length" class="month-grid-count">{{ blocksForDate(day.date).length }}</span>
          </button>
        </div>
      </div>

      <!-- Detail modal: shows the exercise catalog for a template/block's category -->
      <div v-if="detailItem" class="detail-modal-backdrop" @click.self="closeDetail">
        <div class="detail-modal module-card">
          <div class="flex items-start justify-between gap-3 mb-1">
            <h3 class="text-white font-semibold text-sm">{{ detailItem.icon }} {{ detailItem.title }}</h3>
            <button @click="closeDetail" class="text-slate-500 hover:text-red-400 text-sm flex-shrink-0">✕</button>
          </div>
          <p class="text-xs text-slate-500 mb-3">{{ categoryLabel(detailItem.category) }} · {{ detailItem.durationMin || '?' }} min</p>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
            {{ detailItem.blockId ? 'Pick one to replace this block' : 'Exercises to draw from' }}
          </p>
          <div class="detail-modal-list">
            <div v-for="ex in detailExercises" :key="ex.id" class="exercise-row">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm text-white font-medium">{{ ex.name }}</span>
                <span class="exercise-badge" :class="'exercise-badge-' + ex.difficulty">{{ ex.difficulty }}</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed mt-0.5">{{ ex.description }}</p>
              <div class="flex items-end justify-between gap-2 mt-1">
                <p class="text-[11px] text-slate-500">{{ ex.dosage }} · {{ ex.equipment }}</p>
                <button v-if="detailItem.blockId" @click="selectExercise(ex)" class="exercise-select-btn">Use this →</button>
              </div>
            </div>
            <p v-if="!detailExercises.length" class="text-xs text-slate-500">No exercises catalogued for this category yet.</p>
          </div>
        </div>
      </div>
    </div>
  `
});

})();
