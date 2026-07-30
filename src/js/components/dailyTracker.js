/**
 * dailyTracker.js — Daily Exercise Tracker (multiple activities per day,
 * each with its own name + Strava link + notes + screenshots) plus a
 * single-per-day Wellness Track entry (name + description + optional link +
 * score + screenshots) for wearable summaries like a Samsung Galaxy Watch
 * daily score — see routes/tracker.js's header comment on why it's a
 * separate concept from activities.
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
      // Each item: { id, name, stravaUrl, notes, screenshots }. Edited
      // in place via v-model, persisted per-activity by saveActivity() —
      // there's no single day-level save anymore, every activity is its
      // own independent record (see routes/tracker.js).
      activities:    [],
      // Single per-day entry (wearable summaries, e.g. Samsung Galaxy Watch
      // daily score) — unlike activities, never a list. Defaulted to a blank
      // shape when the day has no row yet; saveWellness() upserts on first save.
      wellness:      { id: null, name: '', description: '', link: '', score: null, screenshots: [] },
      plannedBlocks: [],
      loading:       false,
      addingActivity: false, // guards "+ Add activity" against double-click firing two overlapping requests
      savingId:      null, // activity id currently being saved, for that one card's button state
      uploadingId:   null, // activity id currently uploading, for that one card's spinner
      savingWellness:    false,
      uploadingWellness: false
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
        // current date's activities with stale ones.
        if (this.date !== requestedDate) return;
        this.activities = data?.activities || [];
        this.wellness = data?.wellness || { id: null, name: '', description: '', link: '', score: null, screenshots: [] };
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

    // ── Activities: add ("+"), edit+save, remove ("−", warn+confirm) ────
    async addActivity() {
      if (this.addingActivity) return;
      this.addingActivity = true;
      try {
        const data = await Storage.addTrackerActivity(this.profile.id, this.date, { name: '', stravaUrl: '', notes: '' });
        this.activities = data.activities;
      } finally {
        this.addingActivity = false;
      }
    },

    async saveActivity(activity) {
      this.savingId = activity.id;
      try {
        const data = await Storage.updateTrackerActivity(this.profile.id, this.date, activity.id, {
          name: activity.name, stravaUrl: activity.stravaUrl, notes: activity.notes
        });
        this.activities = data.activities;
      } finally {
        this.savingId = null;
      }
    },

    // Destructive and permanent (screenshots are deleted from disk too) —
    // a native confirm() is the same pattern weekBuilder.js's runAutobuild()
    // already uses for its one destructive action, kept consistent here
    // rather than introducing a custom modal for just this.
    async removeActivity(activity) {
      const label = activity.name?.trim() || 'this activity';
      if (!confirm(`Remove "${label}" and all of its screenshots? This cannot be undone.`)) return;
      const data = await Storage.deleteTrackerActivity(this.profile.id, this.date, activity.id);
      this.activities = data.activities;
    },

    async onFilesSelected(event, activity) {
      const files = event.target.files;
      if (!files || !files.length) return;
      this.uploadingId = activity.id;
      try {
        const data = await Storage.uploadActivityScreenshots(this.profile.id, this.date, activity.id, files);
        this.activities = data.activities;
      } catch (e) {
        alert('Upload failed: ' + e.message);
      } finally {
        this.uploadingId = null;
        event.target.value = '';
      }
    },

    async deleteScreenshot(shotId) {
      const data = await Storage.deleteScreenshot(this.profile.id, this.date, shotId);
      this.activities = data.activities;
    },

    // ── Wellness Track: single per-day entry, upserted on save ──────────
    async saveWellness() {
      this.savingWellness = true;
      try {
        const data = await Storage.saveWellness(this.profile.id, this.date, {
          name: this.wellness.name, description: this.wellness.description,
          link: this.wellness.link, score: this.wellness.score
        });
        this.wellness = data.wellness || this.wellness;
      } finally {
        this.savingWellness = false;
      }
    },

    async onWellnessFilesSelected(event) {
      const files = event.target.files;
      if (!files || !files.length) return;
      this.uploadingWellness = true;
      try {
        const data = await Storage.uploadWellnessScreenshots(this.profile.id, this.date, files);
        this.wellness = data.wellness;
      } catch (e) {
        alert('Upload failed: ' + e.message);
      } finally {
        this.uploadingWellness = false;
        event.target.value = '';
      }
    },

    async deleteWellnessScreenshot(shotId) {
      const data = await Storage.deleteWellnessScreenshot(this.profile.id, this.date, shotId);
      this.wellness = data.wellness;
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
      </div>

      <!-- One card per logged activity — "+" below adds another, "−" on each
           card removes it (warns + confirms first, since screenshots are
           deleted permanently too). -->
      <div v-for="activity in activities" :key="activity.id" class="module-card tracker-activity-card space-y-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Activity name</label>
          <input v-model="activity.name" type="text" class="calc-input" placeholder="e.g. Morning Run, Evening Swim">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Strava Activity Link</label>
          <input v-model="activity.stravaUrl" type="url" class="calc-input" placeholder="https://www.strava.com/activities/...">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Notes</label>
          <textarea v-model="activity.notes" rows="3" class="calc-input resize-none" placeholder="How did it feel? Effort, soreness, pace…"></textarea>
        </div>

        <div class="tracker-activity-actions">
          <button @click="saveActivity(activity)" :disabled="savingId === activity.id"
                  class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {{ savingId === activity.id ? 'Saving…' : '💾 Save' }}
          </button>
          <button @click="removeActivity(activity)" class="tracker-remove-btn">− Remove</button>
        </div>

        <div>
          <label class="text-xs text-slate-400 mb-2 block">Screenshots (Strava / insights / wearable summaries)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
                 @change="onFilesSelected($event, activity)" class="text-xs text-slate-400">
          <p v-if="uploadingId === activity.id" class="text-xs text-sky-400 mt-1">Uploading…</p>
          <div v-if="activity.screenshots && activity.screenshots.length" class="flex flex-wrap gap-2 mt-3">
            <div v-for="s in activity.screenshots" :key="s.id" class="relative group">
              <img :src="s.url" class="screenshot-thumb">
              <button @click="deleteScreenshot(s.id)"
                      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>
          </div>
        </div>
      </div>

      <button @click="addActivity" :disabled="addingActivity" class="tracker-add-activity-btn disabled:opacity-50">
        {{ addingActivity ? 'Adding…' : '+ Add activity' }}
      </button>

      <!-- Wellness Track: single per-day entry for wearable summaries (e.g.
           Samsung Galaxy Watch daily score) — not a list, unlike activities. -->
      <div class="module-card tracker-wellness-card space-y-3">
        <h3 class="text-sm font-semibold text-slate-300">⌚ Wellness Track</h3>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Name</label>
          <input v-model="wellness.name" type="text" class="calc-input" placeholder="e.g. Galaxy Watch Daily Score">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Description</label>
          <textarea v-model="wellness.description" rows="3" class="calc-input resize-none" placeholder="Sleep, energy, heart rate insights, how you felt…"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Daily score</label>
            <input v-model.number="wellness.score" type="number" min="0" max="100" class="calc-input" placeholder="0-100">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Link (optional)</label>
            <input v-model="wellness.link" type="url" class="calc-input" placeholder="https://...">
          </div>
        </div>

        <div class="tracker-activity-actions">
          <button @click="saveWellness" :disabled="savingWellness"
                  class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {{ savingWellness ? 'Saving…' : '💾 Save' }}
          </button>
        </div>

        <div>
          <label class="text-xs text-slate-400 mb-2 block">Screenshots (Watch app / wellness summary)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
                 @change="onWellnessFilesSelected" class="text-xs text-slate-400">
          <p v-if="uploadingWellness" class="text-xs text-sky-400 mt-1">Uploading…</p>
          <div v-if="wellness.screenshots && wellness.screenshots.length" class="flex flex-wrap gap-2 mt-3">
            <div v-for="s in wellness.screenshots" :key="s.id" class="relative group">
              <img :src="s.url" class="screenshot-thumb">
              <button @click="deleteWellnessScreenshot(s.id)"
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
