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

/* global app, Sortable, Storage, BlockStyleConfig, WorkoutQueue */

// Cross-component handoff to the Sprint Timer page, same pattern as
// goalDashboard.js's pendingAutobuildGoalId -> WeekBuilder handoff: a field
// on the shared $root instance is enough of a signal without a separate
// state-management library. See sprintTimer.js's mounted() for the other side.
const SPRINT_TIMER_PAGE_ID = 31;

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
      // Category accordion state for the palette — collapsed by default so
      // browsing 26 items across 8 categories doesn't dump one long
      // scrolling list. Desktop-only now (≥1024px, see .palette-row's media
      // query in style.css) — this is what a mouse-and-drag user sees.
      expandedCategories: {},
      // Mobile's palette browsing path: a grid of category tiles (below
      // 1024px, see .palette-category-grid's media query) replaces the
      // accordion entirely, since even collapsed-by-category it still grew
      // the card taller with every category opened. Tapping a tile opens a
      // modal (activeCategoryModal = that category) listing its templates —
      // the card's own height never changes regardless of what's browsed.
      activeCategoryModal: null,
      // "📍 Place" flow: pick a template, then a day, then a position —
      // entirely from a modal, without ever scrolling down to a day column.
      // The primary mobile fix; drag-and-drop and tap-then-tap-day (below)
      // still work unchanged for anyone who prefers them.
      placementItem: null,
      placementDay:  null,
      // Detail modal: normalized to { title, icon, durationMin, category, mode }
      // regardless of whether it was opened from a palette template or a
      // placed board block — see openTemplateDetail()/openBlockDetail().
      // mode: 'replace' is the original Swap flow (browsing alternatives to
      // replace the block's exercise); mode: 'append' (openAddSubBlock) adds
      // a new entry to the block's details.subBlocks instead, building a
      // compound session — see selectExercise()'s branch on detailItem.mode.
      detailItem: null,
      // Which block's compound sub-item list is currently revealed. Only one
      // at a time — same pattern as detailItem/insightItem, a single shared
      // "what's open right now" field rather than per-block state.
      expandedBlockId: null,
      // Insights panel: the single EXERCISE_TEMPLATES entry currently
      // resolved for one specific placed block (see resolvedExercise()) —
      // a deep-dive on what's already assigned, not a list of alternatives.
      insightItem: null,
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

    toggleCategory(cat) {
      this.expandedCategories[cat] = !this.expandedCategories[cat];
    },

    // ── "📍 Place" — day + position picker modal ────────────────────────
    // The mobile-first alternative to drag/tap-then-tap-day: pick a
    // template's Place button right where you're browsing, then a day and
    // a position, all from one small modal — no scrolling to a day column.
    openPlacement(t) {
      this.placementItem = t;
      this.placementDay  = null;
    },
    closePlacement() {
      this.placementItem = null;
      this.placementDay  = null;
    },
    // insertAtIndex is a position among that day's *current* blocks (0 =
    // first). The new block is created with a sortOrder guaranteed higher
    // than every existing one on that day (regardless of what those
    // existing sortOrders actually are — old tap/drag-placed blocks can
    // all be 0), so it's unambiguous to find afterward; it's then spliced
    // into the intended slot and the whole day is renumbered sequentially,
    // the same pattern handleReorder() already uses for drag reordering.
    async placeWithOrder(dayIndex, insertAtIndex) {
      const template = this.placementItem;
      if (!template) return;
      const before = this.dayBlocks(dayIndex);
      const safeSortOrder = before.length ? Math.max(...before.map(b => b.sortOrder)) + 1 : 0;
      await Storage.addBlock(this.profile.id, this.week.id, {
        dayOfWeek: dayIndex, blockType: template.category, title: template.label,
        durationMin: template.defaultDurationMin, details: template.details, sortOrder: safeSortOrder
      });
      await this.loadWeek();

      const after = this.dayBlocks(dayIndex);
      const newBlock = after.reduce((max, b) => (!max || b.sortOrder > max.sortOrder) ? b : max, null);
      const rest = after.filter(b => b.id !== newBlock.id);
      rest.splice(insertAtIndex, 0, newBlock);
      await Promise.all(rest.map((b, i) =>
        Storage.updateBlock(this.profile.id, this.week.id, b.id, { dayOfWeek: dayIndex, sortOrder: i })
      ));
      this.closePlacement();
      await this.loadWeek();
    },

    // ── Detail modal ─────────────────────────────────────────────────────
    // blockId is only set when opened from an already-placed block — that's
    // what selectExercise() needs to know it has something to replace.
    // Opening from a palette template (not yet on a day) is reference-only.
    openTemplateDetail(t) {
      this.detailItem = { title: t.label, icon: t.icon, durationMin: t.defaultDurationMin, category: t.category, blockId: null, mode: 'replace' };
    },
    openBlockDetail(block) {
      this.detailItem = { title: block.title, icon: this.blockIcon(block), durationMin: block.durationMin, category: block.blockType, blockId: block.id, mode: 'replace' };
    },
    // "+ Add exercise" inside an expanded compound block — same modal as
    // Swap, but selectExercise() appends to details.subBlocks instead of
    // replacing the block's own exercise. blockRef carries the full block
    // (not just its id) since appending needs its current details.subBlocks.
    openAddSubBlock(block) {
      this.detailItem = { title: block.title, icon: this.blockIcon(block), durationMin: block.durationMin, category: block.blockType, blockId: block.id, mode: 'append', blockRef: block };
    },
    closeDetail() {
      this.detailItem = null;
    },
    async selectExercise(ex) {
      if (!this.detailItem?.blockId) return;

      if (this.detailItem.mode === 'append') {
        const block = this.detailItem.blockRef;
        const subBlocks = [...this.subBlocksFor(block), { id: crypto.randomUUID(), exerciseId: ex.id, title: ex.name, category: ex.category }];
        await Storage.updateBlock(this.profile.id, this.week.id, block.id, { details: { ...block.details, subBlocks } });
      } else {
        await Storage.updateBlock(this.profile.id, this.week.id, this.detailItem.blockId, {
          title: ex.name, details: { exerciseId: ex.id }
        });
      }
      this.closeDetail();
      await this.loadWeek();
    },

    // ── Compound blocks — a session's inner exercises (details.subBlocks) ──
    toggleExpand(block) {
      this.expandedBlockId = this.expandedBlockId === block.id ? null : block.id;
    },
    isExpanded(block) {
      return this.expandedBlockId === block.id;
    },
    // Falls back to the block's single resolved exercise as an implicit one-
    // item list when details.subBlocks hasn't been created yet — so a plain
    // block (the common case) still shows something sensible when expanded,
    // and workoutQueue.js's fallback logic mirrors this exact rule.
    subBlocksFor(block) {
      const list = block.details?.subBlocks;
      if (Array.isArray(list) && list.length) return list;
      const ex = this.resolvedExercise(block);
      return ex ? [{ id: `${block.id}-0`, exerciseId: ex.id, title: ex.name, category: block.blockType }] : [];
    },
    subExercise(sb) {
      return this.exercises.find(e => e.id === sb.exerciseId) || null;
    },
    modeIcon(sb) {
      return BlockStyleConfig.modeStyle(this.subExercise(sb)?.mode).icon;
    },
    // Feeds BlockTimerWidget — see workoutQueue.js's header comment for why
    // this exact function is also what sprintTimer.js's full-page timer
    // consumes for the "▶ Start" handoff, so both surfaces always agree.
    workoutQueueFor(block) {
      return WorkoutQueue.buildQueueFromBlock(block, this.exercises);
    },
    async removeSubBlock(block, subId) {
      const subBlocks = this.subBlocksFor(block).filter(sb => sb.id !== subId);
      await Storage.updateBlock(this.profile.id, this.week.id, block.id, { details: { ...block.details, subBlocks } });
      await this.loadWeek();
    },
    async moveSubBlock(block, subId, dir) {
      const list = [...this.subBlocksFor(block)];
      const idx = list.findIndex(sb => sb.id === subId);
      const swapWith = idx + dir;
      if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;
      [list[idx], list[swapWith]] = [list[swapWith], list[idx]];
      await Storage.updateBlock(this.profile.id, this.week.id, block.id, { details: { ...block.details, subBlocks: list } });
      await this.loadWeek();
    },

    // ── Exercise insights ────────────────────────────────────────────────
    // Resolves a placed block to one specific EXERCISE_TEMPLATES entry —
    // by details.exerciseId first (set by selectExercise() above whenever a
    // block has actually been swapped), falling back to an exact name match
    // for blocks placed straight from a palette template and never swapped.
    // Returns null if neither resolves, which the modal shows as an
    // empty state rather than guessing.
    resolvedExercise(block) {
      if (block.details?.exerciseId) {
        const byId = this.exercises.find(e => e.id === block.details.exerciseId);
        if (byId) return byId;
      }
      return this.exercises.find(e => e.name === block.title) || null;
    },
    openExerciseInsights(block) {
      this.insightItem = { block, exercise: this.resolvedExercise(block) };
    },
    closeInsights() {
      this.insightItem = null;
    },

    // ── Start Workout → Sprint Timer handoff ─────────────────────────────
    // Hands off the block's full step queue (workoutQueue.js), not just its
    // sport category — this is what fixes the bug where an easy/steady run
    // (or any steady-mode exercise) incorrectly opened the same rounds-based
    // interval UI as a real sprint session: the Sprint Timer now branches on
    // each step's own resolved mode, never on block.blockType alone.
    startWorkout(block) {
      this.$root.pendingTimerQueue = this.workoutQueueFor(block);
      this.$root.setPage(SPRINT_TIMER_PAGE_ID);
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
        <p v-if="showPalette" class="text-xs text-slate-500 mt-1 mb-3">Tap 📍 Place for the fastest path on mobile — pick a day and position from a popup, no scrolling needed. Drag onto a day, or tap a block then tap a day, both still work too.</p>

        <!-- Mobile: a grid of category tiles, not an inline-growing accordion —
             tapping one opens a modal (below) so this card's own height never
             changes no matter how many templates a category has. Hidden at
             desktop widths (see the media query in style.css), where the
             accordion below is the browsing surface instead. -->
        <div v-show="showPalette" class="palette-category-grid">
          <button v-for="(items, cat) in templatesByCategory" :key="cat"
                   @click="activeCategoryModal = cat" :style="cardStyle(cat)" class="palette-category-tile">
            <span>{{ categoryLabel(cat) }}</span>
            <span class="palette-category-tile-count">{{ items.length }}</span>
          </button>
        </div>

        <div ref="palette" class="palette-row" v-show="showPalette">
          <template v-for="(items, cat) in templatesByCategory" :key="cat">
            <button @click.stop="toggleCategory(cat)" class="palette-category-header basis-full">
              <span>{{ expandedCategories[cat] ? '▾' : '▸' }} {{ categoryLabel(cat) }}</span>
              <span class="palette-category-count">{{ items.length }}</span>
            </button>
            <div v-for="t in items" :key="t.id" :data-template-id="t.id" v-show="expandedCategories[cat]"
                 @click="selectTemplate(t)" :style="cardStyle(t.category)"
                 class="palette-item" :class="selectedTemplateId === t.id ? 'palette-item-selected' : ''">
              <div class="palette-item-row">
                <span>{{ t.icon }}</span>
                <span class="flex-1 min-w-0 truncate">{{ t.label }}</span>
                <span class="text-xs text-slate-500">{{ t.defaultDurationMin }}m</span>
                <button @click.stop="openTemplateDetail(t)" class="palette-item-info" title="More info">ⓘ</button>
              </div>
              <button @click.stop="openPlacement(t)" class="palette-item-place-btn">📍 Place</button>
            </div>
          </template>
        </div>
      </div>

      <!-- Mobile category modal: the drill-down for a tapped tile above —
           lists that category's templates without growing the palette card
           itself. Placing closes this and opens the day/position modal. -->
      <div v-if="activeCategoryModal" class="detail-modal-backdrop" @click.self="activeCategoryModal = null">
        <div class="detail-modal module-card">
          <div class="flex items-start justify-between gap-3 mb-3">
            <h3 class="text-white font-semibold text-sm">{{ categoryLabel(activeCategoryModal) }}</h3>
            <button @click="activeCategoryModal = null" class="text-slate-500 hover:text-red-400 text-sm flex-shrink-0">✕</button>
          </div>
          <div class="detail-modal-list">
            <div v-for="t in templatesByCategory[activeCategoryModal]" :key="t.id" :style="cardStyle(t.category)" class="palette-item">
              <div class="palette-item-row">
                <span>{{ t.icon }}</span>
                <span class="flex-1 min-w-0 truncate">{{ t.label }}</span>
                <span class="text-xs text-slate-500">{{ t.defaultDurationMin }}m</span>
                <button @click="openTemplateDetail(t)" class="palette-item-info" title="More info">ⓘ</button>
              </div>
              <button @click="openPlacement(t); activeCategoryModal = null" class="palette-item-place-btn">📍 Place</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Day/Week board — wraps as cards; Day view is just this same board
           filtered to one column via visibleDayIndices. -->
      <div v-if="viewMode !== 'month'"
           :class="viewMode === 'day' ? 'max-w-md' : 'hscroll-card-row'">
        <div v-for="dayIndex in visibleDayIndices" :key="dayIndex" class="day-column">
            <div class="day-column-header">
              <div class="font-semibold text-xs text-white">{{ DAY_LABELS[dayIndex] }}</div>
              <div class="text-[10px] text-slate-500">{{ dayLabel(dayIndex) }}</div>
            </div>
            <ul ref="dayLists" class="day-column-list" :data-day="dayIndex">
              <li v-for="block in dayBlocks(dayIndex)" :key="block.id" :data-block-id="block.id"
                  class="block-card" :style="cardStyle(block.blockType)">
                <div class="flex items-center gap-1 min-w-0">
                  <span class="text-sm truncate flex-1">{{ blockIcon(block) }} {{ block.title }}</span>
                  <button @click.stop="toggleExpand(block)" class="block-card-expand-btn" :title="isExpanded(block) ? 'Collapse' : 'Expand'">
                    {{ isExpanded(block) ? '▾' : '▸' }}
                  </button>
                </div>
                <div class="text-[10px] text-slate-500 mt-0.5">
                  {{ block.durationMin || '?' }} min<span v-if="subBlocksFor(block).length > 1"> · {{ subBlocksFor(block).length }} exercises</span>
                </div>

                <div v-if="isExpanded(block)" class="subblock-panel">
                  <div v-for="(sb, si) in subBlocksFor(block)" :key="sb.id" class="subblock-row">
                    <span class="subblock-mode-badge">{{ modeIcon(sb) }}</span>
                    <span class="flex-1 min-w-0 truncate text-xs text-slate-300">{{ sb.title || subExercise(sb)?.name || 'Exercise' }}</span>
                    <button @click="moveSubBlock(block, sb.id, -1)" :disabled="si === 0" class="subblock-move-btn">▲</button>
                    <button @click="moveSubBlock(block, sb.id, 1)" :disabled="si === subBlocksFor(block).length - 1" class="subblock-move-btn">▼</button>
                    <button @click="removeSubBlock(block, sb.id)" class="subblock-remove-btn">✕</button>
                  </div>
                  <button @click="openAddSubBlock(block)" class="subblock-add-btn">+ Add exercise</button>
                  <block-timer-widget :queue="workoutQueueFor(block)"></block-timer-widget>
                </div>

                <div class="block-card-actions">
                  <button @click.stop="openBlockDetail(block)" class="block-card-action-btn">🔄 Swap</button>
                  <button @click.stop="openExerciseInsights(block)" class="block-card-action-btn">📊 Insights</button>
                  <button @click.stop="startWorkout(block)" class="block-card-action-btn">▶ Start</button>
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
            {{ detailItem.mode === 'append' ? 'Add an exercise to this session' : (detailItem.blockId ? 'Pick one to replace this block' : 'Exercises to draw from') }}
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
                <button v-if="detailItem.blockId" @click="selectExercise(ex)" class="exercise-select-btn">{{ detailItem.mode === 'append' ? '+ Add' : 'Use this →' }}</button>
              </div>
            </div>
            <p v-if="!detailExercises.length" class="text-xs text-slate-500">No exercises catalogued for this category yet.</p>
          </div>
        </div>
      </div>

      <!-- Exercise Insights: deep-dive on the ONE exercise resolved for this
           placed block — not a list of alternatives, that's the Swap modal above. -->
      <div v-if="insightItem" class="detail-modal-backdrop" @click.self="closeInsights">
        <div class="detail-modal module-card">
          <div class="flex items-start justify-between gap-3 mb-1">
            <h3 class="text-white font-semibold text-sm">{{ blockIcon(insightItem.block) }} {{ insightItem.block.title }}</h3>
            <button @click="closeInsights" class="text-slate-500 hover:text-red-400 text-sm flex-shrink-0">✕</button>
          </div>
          <p class="text-xs text-slate-500 mb-3">{{ categoryLabel(insightItem.block.blockType) }} · {{ insightItem.block.durationMin || '?' }} min</p>
          <template v-if="insightItem.exercise">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">Exercise insights</span>
              <span class="exercise-badge" :class="'exercise-badge-' + insightItem.exercise.difficulty">{{ insightItem.exercise.difficulty }}</span>
            </div>
            <p class="text-sm text-slate-300 leading-relaxed mb-3">{{ insightItem.exercise.description }}</p>
            <div class="insight-callout">💡 {{ insightItem.exercise.insight }}</div>
            <p class="text-[11px] text-slate-500 mt-3">{{ insightItem.exercise.dosage }} · {{ insightItem.exercise.equipment }}</p>
          </template>
          <p v-else class="text-xs text-slate-500">
            This block isn't linked to a specific exercise yet — use Swap to pick one from the catalog and its insights will show up here.
          </p>
        </div>
      </div>

      <!-- Place: day + position picker — the mobile-first placement path,
           reachable from wherever you're browsing the palette without
           scrolling down to a day column. -->
      <div v-if="placementItem" class="detail-modal-backdrop" @click.self="closePlacement">
        <div class="detail-modal module-card">
          <div class="flex items-start justify-between gap-3 mb-3">
            <h3 class="text-white font-semibold text-sm">📍 Place: {{ placementItem.icon }} {{ placementItem.label }}</h3>
            <button @click="closePlacement" class="text-slate-500 hover:text-red-400 text-sm flex-shrink-0">✕</button>
          </div>

          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Choose a day</p>
          <div class="placement-day-grid">
            <button v-for="dayIndex in [0,1,2,3,4,5,6]" :key="dayIndex" @click="placementDay = dayIndex"
                    class="placement-day-btn" :class="placementDay === dayIndex ? 'placement-day-btn-active' : ''">
              <span>{{ DAY_LABELS[dayIndex].slice(0, 3) }}</span>
              <span class="placement-day-date">{{ dayLabel(dayIndex) }}</span>
            </button>
          </div>

          <template v-if="placementDay !== null">
            <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-4 mb-2">Choose a position</p>
            <div class="placement-slot-list">
              <button @click="placeWithOrder(placementDay, 0)" class="placement-slot-insert-btn">+ Place here</button>
              <template v-for="(b, i) in dayBlocks(placementDay)" :key="b.id">
                <div class="placement-slot-existing">{{ blockIcon(b) }} {{ b.title }}</div>
                <button @click="placeWithOrder(placementDay, i + 1)" class="placement-slot-insert-btn">+ Place here</button>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  `
});

})();
