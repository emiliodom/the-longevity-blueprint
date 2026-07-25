/**
 * settingsPage.js — Account Settings (password, usage quotas, language, theme)
 *
 * Language preference is persisted server-side (users.preferred_language)
 * but only actually applied to the Google Translate widget when the user
 * clicks "Apply" — that flips the `googtrans` cookie Google Translate reads
 * on load and reloads the page. Not auto-re-applied silently on every
 * login: a surprise reload on login would be worse than asking once.
 */

/* global app, Storage */

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' }
];

app.component('SettingsPage', {
  props: ['profile', 'currentUser'],
  data() {
    return {
      LANGUAGES,
      usage:            null,
      selectedLanguage: this.currentUser?.preferredLanguage || 'en',
      pwForm:           { currentPassword: '', newPassword: '', confirmPassword: '' },
      pwError:          '',
      pwSuccess:        '',
      pwSaving:         false,
      langSaving:       false
    };
  },
  async mounted() {
    this.usage = await Storage.getUsage();
  },
  methods: {
    pct(u) { return u ? Math.round((u.used / u.limit) * 100) : 0; },

    async changePassword() {
      this.pwError = ''; this.pwSuccess = '';
      const { currentPassword, newPassword, confirmPassword } = this.pwForm;
      if (!currentPassword || !newPassword) return (this.pwError = 'All fields are required.');
      if (newPassword !== confirmPassword)  return (this.pwError = 'New passwords do not match.');

      this.pwSaving = true;
      try {
        await Storage.changePassword(currentPassword, newPassword);
        this.pwSuccess = 'Password updated.';
        this.pwForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      } catch (e) {
        this.pwError = e.message;
      } finally {
        this.pwSaving = false;
      }
    },

    async applyLanguage() {
      this.langSaving = true;
      try {
        await Storage.updatePreferences(this.selectedLanguage);
        // Google Translate reads this cookie on page load to pick the target language.
        document.cookie = `googtrans=/en/${this.selectedLanguage}; path=/`;
        document.cookie = `googtrans=/en/${this.selectedLanguage}; domain=${location.hostname}; path=/`;
        location.reload();
      } catch (e) {
        alert('Failed to save language: ' + e.message);
        this.langSaving = false;
      }
    }
  },
  template: `
    <div class="space-y-5">

      <div class="module-card space-y-3">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">Usage &amp; Limits</h3>
        <p class="text-xs text-slate-500">Daily caps apply to every account, with no exceptions — this protects the app (and the OpenAI bill) from being exhausted by any single account.</p>
        <div v-if="usage" class="space-y-3">
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>Screenshot uploads</span>
              <span>{{ usage.screenshotUpload.used }} / {{ usage.screenshotUpload.limit }} (24h)</span>
            </div>
            <div class="goal-progress-track"><div class="goal-progress-fill" :style="{ width: pct(usage.screenshotUpload) + '%' }"></div></div>
          </div>
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>AI analyses</span>
              <span>{{ usage.aiAnalyze.used }} / {{ usage.aiAnalyze.limit }} (24h)</span>
            </div>
            <div class="goal-progress-track"><div class="goal-progress-fill" :style="{ width: pct(usage.aiAnalyze) + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div class="module-card space-y-3">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">Appearance</h3>
        <button @click="$root.toggleTheme()" class="theme-btn">
          {{ $root.darkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode' }}
        </button>
      </div>

      <div class="module-card space-y-3">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">Language</h3>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="selectedLanguage" class="calc-input max-w-xs">
            <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.label }}</option>
          </select>
          <button @click="applyLanguage" :disabled="langSaving" class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {{ langSaving ? 'Applying…' : 'Apply' }}
          </button>
        </div>
        <p class="text-xs text-slate-500">Reloads the page to apply — the same Google Translate widget in the sidebar works too.</p>
      </div>

      <div class="module-card space-y-3">
        <h3 class="text-sky-400 font-semibold text-xs uppercase tracking-wider">Change Password</h3>
        <p v-if="pwError" class="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{{ pwError }}</p>
        <p v-if="pwSuccess" class="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2">{{ pwSuccess }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Current Password</label>
            <input v-model="pwForm.currentPassword" type="password" class="calc-input">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">New Password</label>
            <input v-model="pwForm.newPassword" type="password" class="calc-input">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Confirm New Password</label>
            <input v-model="pwForm.confirmPassword" type="password" class="calc-input">
          </div>
        </div>
        <p class="text-xs text-slate-600">At least 8 characters, 1 uppercase letter, 1 number.</p>
        <button @click="changePassword" :disabled="pwSaving" class="py-2 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {{ pwSaving ? 'Saving…' : 'Update Password' }}
        </button>
      </div>

    </div>
  `
});
