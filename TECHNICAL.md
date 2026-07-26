# Technical Reference — Longevity Blueprint v3

For the full folder map, database schema, and API surface, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — that is now the primary reference for the backend (`src/server/`). This file focuses on the frontend (Vue app, page content, theming) which is unchanged in structure from v2 aside from eight new component files.

## Architecture Overview

```
the-longevity-blueprint/
├── index.html                   # HTML template only — no inline JS or CSS
├── server.js                    # Express bootstrap only — mounts routers from src/server/
├── package.json
├── .env / .env.example          # MySQL + OpenAI + session config (see docs/ARCHITECTURE.md)
├── .gitignore
├── README.md
├── TECHNICAL.md
├── SCIENCE.md                   # Primary citations for all formulas
├── docs/
│   ├── ARCHITECTURE.md          # Full backend folder map, schema, API surface
│   └── DEPLOYMENT.md            # Hostinger Node.js app setup
├── uploads/                     # Avatars + tracker screenshots (gitignored)
└── src/
    ├── css/
    │   └── style.css            # All custom CSS + CSS custom properties for theming
    ├── js/                      # Frontend — Vue 3 via CDN, no build step
    │   ├── db.js                # Page content database (DB array + NAV_GROUPS)
    │   ├── storage.js           # Async REST API client (auth + data methods)
    │   ├── app.js               # Vue 3 app — createApp() without mount()
    │   └── components/
    │       ├── calculators.js      # 9 calculator Vue components
    │       ├── charts.js           # BarChart + DonutChart Vue components
    │       ├── blockStyleConfig.js # Block style/position/collision/animation tuning (plain data)
    │       ├── weekBuilder.js      # Drag-and-drop Week Training Builder
    │       ├── goalDashboard.js    # Goal Dashboard (milestones)
    │       ├── dailyTracker.js     # Daily Exercise Tracker
    │       ├── aiAnalyzer.js       # OpenAI day/week/month analyzer panel
    │       ├── settingsPage.js     # Password, usage quotas, language, theme
    │       ├── foodPlanner.js      # Calorie & Food Planner (Guatemalan food)
    │       └── supplementStack.js  # Daily supplement checklist
    └── server/                  # Backend — see docs/ARCHITECTURE.md for the full map
        ├── db/                  # MySQL pool, schema.sql, setup.js
        ├── middleware/          # requireAuth, auth rate limiter
        ├── lib/                 # templates, autobuild rules, foods, supplements, OpenAI client, exporters
        └── routes/              # one Express router per domain
```

Every component file wraps its body in an IIFE — see the "IIFE" note in `docs/ARCHITECTURE.md`'s folder map for why (plain `<script>` tags share one global scope; a `const` collision between two files silently aborted a whole script the first time this bit us).

### Script Load Order (index.html)

Scripts must load in this exact order. Each file depends on globals from the previous:

```
db.js → storage.js → app.js → calculators.js → charts.js → blockStyleConfig.js
   → weekBuilder.js → goalDashboard.js → aiAnalyzer.js → dailyTracker.js
   → settingsPage.js → foodPlanner.js → supplementStack.js → app.mount('#app')
```

`aiAnalyzer.js` loads before `dailyTracker.js` because `DailyTracker`'s template embeds `<ai-analyzer>` — Vue needs the child component already registered on `app`.

`app.js` creates the Vue app as the global `app` but does **not** call `.mount()`.  
`calculators.js` and `charts.js` call `app.component(...)` to register components.  
The inline `<script>app.mount('#app');</script>` at the end wires everything together.

---

## State Machine

The app cycles through five states stored in `this.appState`:

```
loading  — server ping + session check (Storage.getMe())
   ↓
auth     — not authenticated (login / register tabs on one screen)
   ↓
setup    — logged in, no profiles yet OR user clicked "New Profile"
   ↓
select   — logged in, ≥1 profile exists, pick one
   ↓
app      — profile loaded, full UI rendered
```

On server unreachable: `appState = 'error'` (shows instructions to run `npm start`).

---

## Authentication

### Packages

| Package | Purpose |
|---|---|
| `bcryptjs` | Password hashing (12 salt rounds) |
| `express-session` | Server-side session management |
| `express-async-errors` | Forwards rejected promises in async route handlers to Express's error middleware (required — Express 4 doesn't do this natively; see `docs/ARCHITECTURE.md`) |
| `multer` | Multipart file upload (avatars + tracker screenshots) |
| `mysql2` | MySQL connection pool + queries |
| `dotenv` | Loads `.env` |
| `openai` | AI Analyzer (day/week/month) |
| `pdfkit` | Week Builder PDF export |
| `helmet` | Security response headers |
| `express-rate-limit` | Login/register brute-force protection |

### Session

Sessions use `express-session` with an in-memory store. This is acceptable for a local personal app.

- Cookie: `httpOnly: true`, `maxAge: 7 days`
- The session store is cleared on server restart — users must re-authenticate
- `requireAuth` middleware checks `req.session.userId` on all data endpoints

### Password Policy

Enforced on both client (checklist + strength bar) and server (validation before hashing):

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

### Avatar Upload

- Handled by `multer` on `POST /api/auth/avatar`
- Stored at `uploads/avatars/<userId>-<timestamp>.<ext>`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Maximum file size: **2 MB**
- Old avatar file is deleted from disk when a new one is uploaded

---

## REST API Reference & Database Schema

Both moved to [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — every route file in `src/server/routes/` documents its own endpoints in a header comment, and `src/server/db/schema.sql` is the authoritative schema. Keeping one copy avoids this file and that one drifting apart.

IDs are `crypto.randomUUID()` strings generated app-side (not `AUTO_INCREMENT`) — see "IDs" in `docs/ARCHITECTURE.md` for why.

Quick shape reference for the original v2 entities (unchanged since the MySQL migration, now backed by the `profiles`/`dashboards`/`workout_logs` tables instead of JSON files):

```typescript
interface Profile {
  id: string; userId: string; createdAt: string;
  name: string; age: number; weight: number /* kg */; height: number /* cm */;
  gender: 'male' | 'female'; restingHr: number; maxHr: number;
}

interface Dashboard {
  calories: number; protein: number; water: number; sleep: number;
  fasted5k: boolean; suppDone: boolean; liftDone: boolean;
  rideDone: boolean; heelDone: boolean; sleepDone: boolean; notes: string;
}

interface LogEntry {
  id: string; type: 'run' | 'cycle' | 'lift'; date: string /* YYYY-MM-DD */;
  duration: string; distance?: string; weight?: string; reps?: string;
  notes?:    string;
}
```

---

## src/js/db.js — Page Content Database

`DB` is a plain JavaScript array of page objects. `NAV_GROUPS` groups them for the sidebar.

### Page Object Shape

```js
{
  id: 1,
  icon: '🗺️',
  title: 'Page Title',
  hero: 'mountain sunrise trail runner', // a Pexels search query string, NOT a URL — '' for utility pages (Dashboard, Journal, Week Builder, etc.); see docs/ARCHITECTURE.md's "Hero images" section
  isDashboard: true,  // optional — marks page 20; the isX flags below follow the same one-per-special-page pattern
  isJournal:   true,  // page 21
  // isTrainingBuilder (25) / isGoals (26) / isTracker (27) / isSettings (28) / isNutrition (29) / isSupplements (30)
  content: [
    { type: 'paragraph',  text: '<HTML string>' },
    { type: 'quote',      text: 'Plain text' },
    { type: 'list',       items: ['<HTML string>', ...] },
    { type: 'equation',   text: '$$LaTeX$$' },
    { type: 'calculator', component: 'BmrCalc' }
  ]
}
```

### NAV_GROUPS

| Group | Page IDs |
|---|---|
| Framework | 1, 2, 3, 4 |
| Nutrition | 5, 6, 7, 8 |
| Training | 9–15 |
| Health | 16, 17, 18, 19, 22 |
| Reference | 23, 24 |
| System | 20, 21 |
| Training Builder | 25, 26, 27 |
| Planner | 29, 30 |
| Account | 28 |

### Adding a New Page

1. Push a new object into `DB` in `src/js/db.js`.
2. Add it to the correct `NAV_GROUPS` filter in the same file.
3. If it needs a calculator, add the component to `src/js/components/calculators.js` and add its render case to the `v-else-if` chain in `index.html`.

---

## src/js/components/calculators.js — Calculator Components

All 9 components follow the same pattern:

```js
app.component('ComponentName', {
  props: ['profile'],
  data() { return { /* local state, seeded from profile */ }; },
  computed: { /* formula results */ },
  template: `...`
});
```

### Available Components

| Component | Formula | Profile fields used |
|---|---|---|
| `BmrCalc` | Mifflin-St Jeor | age, weight, height, gender |
| `BodyFatCalc` | US Navy | gender, height |
| `MacroCalc` | 1.6 g/kg protein, 22% fat | weight |
| `Vo2MaxCalc` | Cooper 12-min or Karvonen HR | age, gender, restingHr, maxHr |
| `HrZoneCalc` | Karvonen 5-zone | restingHr, maxHr |
| `OneRmCalc` | Epley + Brzycki average | none |
| `IdealWeightCalc` | 5-formula average | height, gender |
| `BellyMeasureCalc` | WHtR + WHR + WHO waist | height, gender |
| `EnvCalc` | Altitude VO₂, heat index, Rothfusz | weight |

---

## src/js/components/charts.js — Chart Components

Both components accept `chartData` and `chartOptions` props matching the Chart.js API.

They destroy the canvas instance in `beforeUnmount()` and rebuild on prop changes via a deep watcher — this prevents the "Canvas is already in use" error when navigating away and back.

---

## src/js/storage.js — API Client

All data methods are `async` and `throw` on non-OK HTTP responses (except `ping()` which returns `false`).

Auth methods: `register(email, password)`, `login(email, password)`, `logout()`, `getMe()`, `uploadAvatar(file)`.

The only localStorage key used is `bp_active_profile` (stores the profile ID string, cleared on logout).

---

## src/js/app.js — Vue App Controller

### Key Data Properties

| Property | Type | Description |
|---|---|---|
| `appState` | string | State machine: `loading\|auth\|setup\|select\|app` |
| `currentUser` | object\|null | `{ id, email, avatar }` from active session |
| `authMode` | string | `'login'` or `'register'` |
| `authForm` | object | `{ email, password, confirmPassword }` |
| `authError` | string | Current auth error message |
| `authLoading` | boolean | Disables submit while request is in flight |
| `showPassword` | boolean | Toggles password field type |
| `profile` | object\|null | Active biometric profile |
| `profiles` | array | All profiles for current user (for selector) |
| `dashboard` | object | Current dashboard state |
| `workoutLog` | array | All log entries for active profile |
| `currentPageId` | number | Which DB page is rendered |
| `DB` | array | Reference to db.js DB constant |
| `darkMode` | boolean | Current theme (persisted in localStorage as `bp_theme`) |

### Key Computed Properties

| Property | Returns | Notes |
|---|---|---|
| `currentPage` | DB page object | Derived from `currentPageId` |
| `passwordStrength` | `{ score, label, pct, color }` | 0–5 score mapped to Weak/Fair/Good/Strong |
| `filteredLog` | LogEntry[] | Filtered by `logFilter` |
| `runChartData` | Chart.js dataset | Last 10 runs |
| `cycleChartData` | Chart.js dataset | Last 10 rides |
| `liftChartData` | Chart.js dataset | Last 10 lifts |

### postAuthInit(user)

Called after both successful login and registration. Sets `currentUser`, loads the user's profiles, then decides the next state: auto-resumes the previously active profile, shows the selector if profiles exist, or shows setup if none.

### Dashboard Debounce

The dashboard watcher fires on any nested change and schedules a server save after 500 ms:

```js
dashSaveTimer = setTimeout(() => persistDashboard(), 500)
```

### MathJax Re-render

`setPage()` calls `MathJax.typesetPromise()` inside `$nextTick` so the BMR equation on page 3 re-renders correctly after Vue updates the DOM.

---

## Theming (CSS Custom Properties)

Dark mode (default) uses `:root` values. Light mode overrides with `html.light-mode`:

```css
:root           { --c-base: #020617; --c-surface: #0f172a; ... }
html.light-mode { --c-base: #f0f4f8; --c-surface: #ffffff; ... }
```

All custom classes reference only `var(--c-*)` tokens. Tailwind utility overrides are applied via `html.light-mode .bg-slate-900 { ... !important }`.

Theme is toggled via `toggleTheme()` and persisted as `bp_theme` in localStorage.

---

## Styling — Key CSS Classes

| Class | Purpose |
|---|---|
| `.hero` / `.hero-content` | Full-bleed hero image with gradient overlay |
| `.calc-input` | Consistent themed input field |
| `.nav-btn` / `.nav-btn.active` | Sidebar navigation button |
| `.module-card` | Bordered content card |
| `.check-row` | Dashboard checklist row |
| `.toggle-track` / `.toggle-track.on` | Custom CSS toggle switch |
| `.pill-btn` + `.active-run/cycle/lift` | Journal activity type selector |
| `.prose-custom` | Scoped prose styles for content pages |
| `.stat-box` | Centered metric display box |
| `.info-notice` / `.warn-notice` | Sky / orange tinted alert banners |
| `.hr-help-panel` | Collapsible HR measurement guide |
| `.input-unit` / `.unit-badge` | Input with inline unit suffix (kg, cm, bpm) |
| `.theme-btn` | Dark/Light mode toggle button |
| `.pdf-btn` | PDF export trigger button |
| `.auth-tab` / `.auth-tab.active` | Login/Register tab switcher |
| `.pw-toggle` | Show/hide password eye button |
| `.pw-strength-bar` / `.pw-strength-fill` | Password strength progress bar |
| `.avatar-circle` | Round profile photo display |
| `.avatar-placeholder` | Emoji fallback when no avatar |
| `.avatar-upload-btn` | Small "Change photo" button |
| `.translate-wrap` | Google Translate widget container |
| `.palette-item` / `.block-card` | Week Builder draggable template / placed block |
| `.day-column` / `.day-column-list` | Week Builder's 7-day board columns |
| `.goal-card` / `.goal-progress-track` / `.goal-progress-fill` | Goal Dashboard card + progress bar |
| `.screenshot-thumb` | Daily Tracker screenshot thumbnail |
| `.ai-summary` | AI Analyzer result panel |

---

## Environment Variables

Loaded from `.env` via `dotenv` (see `.env.example`). Full list and purpose in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#environment-variables):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `SESSION_SECRET` | `bp-longevity-secret-2024` | express-session secret key (change in production) |
| `NODE_ENV` | — | Set to `production` in real deployments — gates the session cookie's `secure` flag |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `localhost` / `3306` / `root` / `` / `longevity_blueprint` | MySQL connection |
| `OPENAI_API_KEY` | — | Required for the AI Analyzer; server-side only |
| `OPENAI_MODEL` | `gpt-4o-mini` | Vision-capable chat completions model |
| `PEXELS_API_KEY` | — | Optional; hero images just don't render without it |
