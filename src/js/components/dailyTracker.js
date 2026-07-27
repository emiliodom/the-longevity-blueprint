/**
 * dailyTracker.js — Daily Exercise Tracker (Strava link + screenshots)
 *
 * Embeds <ai-analyzer> (aiAnalyzer.js) below the day's data so "analyze
 * my day" always has this profile's current date in view.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why: plain
 * <script> tags share one global scope, and this file's own toIsoDateLocal
 * was silently colliding with (and being silently overwritten by) other
 * component files' identically-named helper before this fix.
 */
(function () {

/* global app, Storage, BlockStyleConfig */

function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Same date math as weekBuilder.js's mondayOf() — duplicated rather than
// shared, per this file's own header comment on why these small date
// helpers are kept as private per-file copies instead of a shared global.
function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

app.component('DailyTracker', {
  props: ['profile'],
  data() {
    return {
      date:          toIsoDateLocal(new Date()),
      entry:         { stravaUrl: '', notes: '', screenshots: [] },
      plannedBlocks: [],
      loading:       false,
      saving:        false,
      uploading:     false
    };
  },
  async mounted() {
    await this.refreshDay();
  },
  methods: {
    async refreshDay() {
      await Promise.all([this.loadEntry(), this.loadPlannedBlocks()]);
    },

    async loadEntry() {
      const requestedDate = this.date;
      this.loading = true;
      try {
        const data = await Storage.getTrackerDay(this.profile.id, requestedDate);
        // Rapid day-shift clicks fire overlapping requests — if the date
        // moved on again before this one resolved, its response is for a
        // day we're no longer showing; applying it would overwrite the
        // current date's entry with a stale one.
        if (this.date !== requestedDate) return;
        this.entry = data || { stravaUrl: '', notes: '', screenshots: [] };
      } finally {
        if (this.date === requestedDate) this.loading = false;
      }
    },

    // Pulls in whatever Week Builder planned for this exact date — every
    // week is its own independently-stored row (training_weeks is unique on
    // profile_id + week_start_date), so this always resolves to that
    // specific week's data, same as flipping to any date on a calendar
    // would, never a shared/generic "current week."
    async loadPlannedBlocks() {
      const requestedDate = this.date;
      const d = new Date(`${requestedDate}T00:00:00`);
      const weekStartDate = toIsoDateLocal(mondayOf(d));
      const dayOfWeek = (d.getDay() + 6) % 7; // 0 = Monday, matches training_blocks.day_of_week
      const week = await Storage.getWeekByDate(this.profile.id, weekStartDate);
      if (this.date !== requestedDate) return; // see loadEntry()'s comment above
      this.plannedBlocks = (week?.blocks || [])
        .filter(b => b.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },

    blockIcon(block) {
      return BlockStyleConfig.categoryStyle(block.blockType).fallbackIcon;
    },
    // Template expressions only see component data/methods/props, not
    // arbitrary window globals — so, same as weekBuilder.js's cardStyle(),
    // BlockStyleConfig access is wrapped in a method rather than referenced
    // directly in the template.
    blockAccentStyle(block) {
      return { '--block-accent': BlockStyleConfig.categoryStyle(block.blockType).accent };
    },

    async shiftDay(delta) {
      const d = new Date(`${this.date}T00:00:00`);
      d.setDate(d.getDate() + delta);
      this.date = toIsoDateLocal(d);
      await this.refreshDay();
    },

    async save() {
      this.saving = true;
      try {
        this.entry = await Storage.saveTrackerDay(this.profile.id, this.date, {
          stravaUrl: this.entry.stravaUrl, notes: this.entry.notes
        });
      } finally {
        this.saving = false;
      }
    },

    async onFilesSelected(event) {
      const files = event.target.files;
      if (!files || !files.length) return;
      this.uploading = true;
      try {
        this.entry = await Storage.uploadScreenshots(this.profile.id, this.date, files);
      } catch (e) {
        alert('Upload failed: ' + e.message);
      } finally {
        this.uploading = false;
        event.target.value = '';
      }
    },

    async deleteScreenshot(shotId) {
      this.entry = await Storage.deleteScreenshot(this.profile.id, this.date, shotId);
    }
  },
  template: `
    <div class="space-y-5">
      <div class="module-card space-y-4">
        <div class="flex items-center gap-2">
          <button @click="shiftDay(-1)" class="pill-btn">‹</button>
          <input v-model="date" @change="refreshDay" type="date" class="calc-input max-w-[10rem]">
          <button @click="shiftDay(1)" class="pill-btn">›</button>
        </div>

        <div v-if="plannedBlocks.length" class="planned-blocks">
          <label class="text-xs text-slate-400 mb-1 block">Planned for this day (from Week Builder)</label>
          <div class="flex flex-wrap gap-2">
            <span v-for="b in plannedBlocks" :key="b.id" class="planned-block-chip" :style="blockAccentStyle(b)">
              {{ blockIcon(b) }} {{ b.title }} <span class="text-slate-500">· {{ b.durationMin || '?' }}m</span>
            </span>
          </div>
        </div>

        <div>
          <label class="text-xs text-slate-400 mb-1 block">Strava Activity Link</label>
          <input v-model="entry.stravaUrl" type="url" class="calc-input" placeholder="https://www.strava.com/activities/...">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Notes</label>
          <textarea v-model="entry.notes" rows="3" class="calc-input resize-none" placeholder="How did today feel? Effort, soreness, sleep, mood…"></textarea>
        </div>
        <button @click="save" :disabled="saving" class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {{ saving ? 'Saving…' : 'Save Day' }}
        </button>

        <div>
          <label class="text-xs text-slate-400 mb-2 block">Screenshots (Strava / insights / wearable summaries)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple @change="onFilesSelected" class="text-xs text-slate-400">
          <p v-if="uploading" class="text-xs text-sky-400 mt-1">Uploading…</p>
          <div v-if="entry.screenshots && entry.screenshots.length" class="flex flex-wrap gap-2 mt-3">
            <div v-for="s in entry.screenshots" :key="s.id" class="relative group">
              <img :src="s.url" class="screenshot-thumb">
              <button @click="deleteScreenshot(s.id)"
                      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>
          </div>
        </div>
      </div>

      <ai-analyzer :profile="profile" :date="date"></ai-analyzer>
    </div>
  `
});

})();
