/**
 * app.js — Main Vue 3 Application Controller v2
 *
 * State machine:
 *   loading  → check server + session
 *   auth     → not logged in (login / register tabs)
 *   setup    → logged in, no profiles yet (or new profile flow)
 *   select   → logged in, multiple profiles, pick one
 *   app      → profile loaded, main app active
 *
 * All storage I/O goes through the Storage async API client (storage.js).
 */

/* global Vue, Storage, DB, NAV_GROUPS */

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      // ── App state ──────────────────────────────────────────────────────
      appState:     'loading',   // 'loading' | 'auth' | 'setup' | 'select' | 'app'
      serverOnline: true,

      // ── Auth ───────────────────────────────────────────────────────────
      currentUser:  null,        // { id, email, avatar }
      authMode:     'login',     // 'login' | 'register'
      authForm:     { email: '', password: '', confirmPassword: '' },
      authError:    '',
      authLoading:  false,
      showPassword: false,

      // ── Profiles ───────────────────────────────────────────────────────
      profiles:     [],
      profile:      null,

      // ── Profile setup form ─────────────────────────────────────────────
      newProfile: {
        name:      '',
        age:       30,
        weight:    70,
        height:    170,
        gender:    'male',
        restingHr: 60,
        maxHr:     185
      },

      // ── Navigation ─────────────────────────────────────────────────────
      currentPageId: 1,
      sidebarOpen:   false,
      navGroups:     NAV_GROUPS,

      // ── Dashboard ──────────────────────────────────────────────────────
      dashboard: {
        calories: 2100, protein: 0, water: 0, sleep: 0,
        fasted5k: false, suppDone: false, liftDone: false,
        rideDone: false, heelDone: false, sleepDone: false,
        notes: ''
      },
      dashSaveTimer: null,

      // ── Exercise journal ───────────────────────────────────────────────
      workoutLog:  [],
      newLog: { type: 'run', date: '', duration: '', distance: '', weight: '', reps: '', notes: '' },
      logFilter:   'all',
      logLoading:  false,

      // ── UI ─────────────────────────────────────────────────────────────
      DB,
      darkMode:   true,
      showHrHelp: false,

      // ── Cross-component handoff (Goal Dashboard → Week Builder) ─────────
      // Set by goalDashboard.js's "Build Week from this Goal" button, read
      // and cleared by weekBuilder.js on mount. See both files for context.
      pendingAutobuildGoalId: null
    };
  },

  computed: {
    currentPage() {
      return DB.find(p => p.id === this.currentPageId) || DB[0];
    },

    passwordStrength() {
      const p = this.authForm.password;
      if (!p) return { score: 0, label: '', pct: 0, color: '' };
      let s = 0;
      if (p.length >= 8)            s++;
      if (p.length >= 12)           s++;
      if (/[A-Z]/.test(p))          s++;
      if (/[0-9]/.test(p))          s++;
      if (/[^A-Za-z0-9]/.test(p))   s++;
      const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
      const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#22c55e'];
      return {
        score: s,
        label: labels[s] || 'Weak',
        pct:   Math.round((s / 5) * 100),
        color: colors[s] || '#ef4444'
      };
    },

    filteredLog() {
      if (this.logFilter === 'all') return this.workoutLog;
      return this.workoutLog.filter(e => e.type === this.logFilter);
    },

    runChartData() {
      const runs = [...this.workoutLog].filter(e => e.type === 'run').reverse().slice(-10);
      return {
        labels:   runs.map(e => e.date || '—'),
        datasets: [{ label: 'Distance (km)', data: runs.map(e => parseFloat(e.distance) || 0),
          backgroundColor: 'rgba(56,189,248,0.6)', borderColor: '#38bdf8', borderWidth: 1 }]
      };
    },
    cycleChartData() {
      const rides = [...this.workoutLog].filter(e => e.type === 'cycle').reverse().slice(-10);
      return {
        labels:   rides.map(e => e.date || '—'),
        datasets: [{ label: 'Distance (km)', data: rides.map(e => parseFloat(e.distance) || 0),
          backgroundColor: 'rgba(251,146,60,0.6)', borderColor: '#fb923c', borderWidth: 1 }]
      };
    },
    liftChartData() {
      const lifts = [...this.workoutLog].filter(e => e.type === 'lift').reverse().slice(-10);
      return {
        labels:   lifts.map(e => e.date || '—'),
        datasets: [{ label: 'Weight (kg)', data: lifts.map(e => parseFloat(e.weight) || 0),
          backgroundColor: 'rgba(167,139,250,0.6)', borderColor: '#a78bfa', borderWidth: 1 }]
      };
    },
    activityDonutData() {
      const counts = { run: 0, cycle: 0, lift: 0 };
      this.workoutLog.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
      return {
        labels:   ['Running', 'Cycling', 'Lifting'],
        datasets: [{ data: [counts.run, counts.cycle, counts.lift],
          backgroundColor: ['rgba(56,189,248,0.8)', 'rgba(251,146,60,0.8)', 'rgba(167,139,250,0.8)'],
          borderColor:     ['#38bdf8', '#fb923c', '#a78bfa'],
          borderWidth: 1 }]
      };
    },
    logHasData() {
      return this.workoutLog.length > 0;
    }
  },

  watch: {
    dashboard: {
      deep: true,
      handler() {
        clearTimeout(this.dashSaveTimer);
        this.dashSaveTimer = setTimeout(() => this.persistDashboard(), 500);
      }
    }
  },

  async mounted() {
    // Apply saved theme before any content renders
    const saved = localStorage.getItem('bp_theme');
    this.darkMode = saved !== 'light';
    this.applyTheme();

    // Check server availability
    this.serverOnline = await Storage.ping();
    if (!this.serverOnline) { this.appState = 'error'; return; }

    // Check if already authenticated via existing session
    const user = await Storage.getMe();
    if (!user) {
      this.appState = 'auth';
      return;
    }

    await this.postAuthInit(user);
  },

  methods: {

    // ── Auth ─────────────────────────────────────────────────────────────

    async loginUser() {
      this.authError = '';
      if (!this.authForm.email || !this.authForm.password)
        return (this.authError = 'Please enter your email and password.');
      this.authLoading = true;
      try {
        const user = await Storage.login(this.authForm.email, this.authForm.password);
        await this.postAuthInit(user);
      } catch (e) {
        this.authError = e.message;
      } finally {
        this.authLoading = false;
      }
    },

    async registerUser() {
      this.authError = '';
      const err = this.validateAuthForm();
      if (err) return (this.authError = err);
      this.authLoading = true;
      try {
        const user = await Storage.register(this.authForm.email, this.authForm.password);
        await this.postAuthInit(user);
      } catch (e) {
        this.authError = e.message;
      } finally {
        this.authLoading = false;
      }
    },

    validateAuthForm() {
      const { email, password, confirmPassword } = this.authForm;
      if (!email || !password) return 'All fields are required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';
      if (this.authMode === 'register') {
        if (password.length < 8)         return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(password))      return 'Password needs at least one uppercase letter.';
        if (!/[0-9]/.test(password))      return 'Password needs at least one number.';
        if (password !== confirmPassword)  return 'Passwords do not match.';
      }
      return null;
    },

    async postAuthInit(user) {
      this.currentUser = user;
      this.authForm    = { email: '', password: '', confirmPassword: '' };
      this.authError   = '';
      try {
        this.profiles = await Storage.getProfiles();
      } catch {
        this.profiles = [];
      }
      const savedId = Storage.getActiveProfileId();
      if (savedId && this.profiles.find(p => p.id === savedId)) {
        await this.loadProfile(savedId);
      } else if (this.profiles.length === 0) {
        this.appState = 'setup';
      } else {
        this.appState = 'select';
      }
    },

    async logout() {
      await Storage.logout();
      this.currentUser  = null;
      this.profile      = null;
      this.profiles     = [];
      this.appState     = 'auth';
      this.authForm     = { email: '', password: '', confirmPassword: '' };
      this.authError    = '';
      this.authMode     = 'login';
    },

    async uploadAvatar(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const result = await Storage.uploadAvatar(file);
        this.currentUser = { ...this.currentUser, avatar: result.avatar };
      } catch (e) {
        alert('Avatar upload failed: ' + e.message);
      }
      event.target.value = '';
    },

    // ── Profile Management ───────────────────────────────────────────────

    async createProfile() {
      if (!this.newProfile.name.trim()) return;
      try {
        const profile = await Storage.createProfile({ ...this.newProfile });
        this.profiles.push(profile);
        await this.loadProfile(profile.id);
      } catch (e) {
        console.error('Create profile failed:', e);
      }
    },

    async loadProfile(id) {
      try {
        this.profile  = await Storage.getProfile(id);
        Storage.setActiveProfileId(id);
        const dash = await Storage.getDashboard(id);
        if (dash) Object.assign(this.dashboard, dash);
        this.workoutLog = await Storage.getLog(id);
        this.appState   = 'app';
        this.newLog.date = new Date().toISOString().split('T')[0];
      } catch (e) {
        console.error('Load profile failed:', e);
      }
    },

    async switchProfile(id) {
      await this.loadProfile(id);
    },

    async deleteProfile(id) {
      if (!confirm('Delete this profile? This cannot be undone.')) return;
      try {
        await Storage.deleteProfile(id);
        this.profiles = this.profiles.filter(p => p.id !== id);
        if (this.profiles.length === 0) {
          this.profile  = null;
          this.appState = 'setup';
        } else {
          this.appState = 'select';
        }
      } catch (e) {
        console.error('Delete profile failed:', e);
      }
    },

    startNewProfile() {
      this.newProfile = { name:'', age:30, weight:70, height:170, gender:'male', restingHr:60, maxHr:185 };
      this.showHrHelp = false;
      this.appState   = 'setup';
    },

    // ── Theme ────────────────────────────────────────────────────────────

    toggleTheme() {
      this.darkMode = !this.darkMode;
      this.applyTheme();
      localStorage.setItem('bp_theme', this.darkMode ? 'dark' : 'light');
    },

    applyTheme() {
      if (this.darkMode) document.documentElement.classList.remove('light-mode');
      else               document.documentElement.classList.add('light-mode');
    },

    // ── HR Helpers ───────────────────────────────────────────────────────

    autoCalcMaxHr() {
      // Tanaka formula: 208 - 0.7 × age (Tanaka et al., 2001)
      this.newProfile.maxHr = Math.round(208 - 0.7 * (this.newProfile.age || 30));
    },

    // ── PDF Export ───────────────────────────────────────────────────────

    exportPDF() {
      window.print();
    },

    // ── Navigation ───────────────────────────────────────────────────────

    setPage(id) {
      this.currentPageId = id;
      this.sidebarOpen   = false;
      this.$nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
          MathJax.typesetPromise();
        }
      });
    },

    // ── Dashboard ────────────────────────────────────────────────────────

    async persistDashboard() {
      if (!this.profile) return;
      try {
        await Storage.saveDashboard(this.profile.id, this.dashboard);
      } catch (e) {
        console.warn('Dashboard save failed:', e);
      }
    },

    toggleDash(key) {
      this.dashboard[key] = !this.dashboard[key];
    },

    // ── Exercise Journal ─────────────────────────────────────────────────

    async saveLog() {
      if (!this.profile) return;
      const entry = { ...this.newLog };
      if (!entry.date) entry.date = new Date().toISOString().split('T')[0];
      this.logLoading = true;
      try {
        this.workoutLog = await Storage.addLogEntry(this.profile.id, entry);
        this.newLog = { type: this.newLog.type, date: entry.date, duration:'', distance:'', weight:'', reps:'', notes:'' };
      } catch (e) {
        console.error('Save log failed:', e);
      } finally {
        this.logLoading = false;
      }
    },

    async deleteLog(entryId) {
      if (!this.profile) return;
      try {
        this.workoutLog = await Storage.deleteLogEntry(this.profile.id, entryId);
      } catch (e) {
        console.error('Delete log failed:', e);
      }
    },

    setLogFilter(f) { this.logFilter = f; },

    logTypeColor(type) {
      return type === 'run' ? 'text-sky-400' : type === 'cycle' ? 'text-orange-400' : 'text-purple-400';
    },

    logTypeLabel(type) {
      return type === 'run' ? '🏃 Run' : type === 'cycle' ? '🚴 Ride' : '🏋️ Lift';
    },

    // ── Utility ──────────────────────────────────────────────────────────

    heroStyle(url) {
      if (!url) return {};
      return { backgroundImage: `url('${url}')` };
    }
  }
});
