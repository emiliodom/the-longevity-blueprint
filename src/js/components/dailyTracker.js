/**
 * dailyTracker.js — Daily Exercise Tracker (Strava link + screenshots)
 *
 * Embeds <ai-analyzer> (aiAnalyzer.js) below the day's data so "analyze
 * my day" always has this profile's current date in view.
 */

/* global app, Storage */

function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

app.component('DailyTracker', {
  props: ['profile'],
  data() {
    return {
      date:      toIsoDateLocal(new Date()),
      entry:     { stravaUrl: '', notes: '', screenshots: [] },
      loading:   false,
      saving:    false,
      uploading: false
    };
  },
  async mounted() {
    await this.loadEntry();
  },
  methods: {
    async loadEntry() {
      this.loading = true;
      try {
        const data = await Storage.getTrackerDay(this.profile.id, this.date);
        this.entry = data || { stravaUrl: '', notes: '', screenshots: [] };
      } finally {
        this.loading = false;
      }
    },

    async shiftDay(delta) {
      const d = new Date(`${this.date}T00:00:00`);
      d.setDate(d.getDate() + delta);
      this.date = toIsoDateLocal(d);
      await this.loadEntry();
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
          <input v-model="date" @change="loadEntry" type="date" class="calc-input max-w-[10rem]">
          <button @click="shiftDay(1)" class="pill-btn">›</button>
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
