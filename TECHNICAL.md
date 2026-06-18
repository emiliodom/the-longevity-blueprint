# Technical Reference — Longevity Blueprint v2

## Architecture Overview

```
training-plan/
├── index.html                   # HTML template only — no inline JS or CSS
├── server.js                    # Express REST API + auth + static file serving
├── package.json
├── .gitignore
├── README.md
├── TECHNICAL.md
├── SCIENCE.md                   # Primary citations for all formulas
├── data/                        # Runtime database files (auto-created, gitignored)
│   ├── users.json               # User accounts (hashed passwords, avatar paths)
│   ├── profiles.json            # Biometric profiles (scoped by userId)
│   ├── dashboards.json          # Dashboard state keyed by profileId
│   └── logs.json                # Workout log entries keyed by profileId
├── uploads/
│   └── avatars/                 # Uploaded profile photos (gitignored)
└── src/
    ├── css/
    │   └── style.css            # All custom CSS + CSS custom properties for theming
    └── js/
        ├── db.js                # Page content database (DB array + NAV_GROUPS)
        ├── storage.js           # Async REST API client (auth + data methods)
        ├── app.js               # Vue 3 app — createApp() without mount()
        └── components/
            ├── calculators.js   # 9 calculator Vue components
            └── charts.js        # BarChart + DonutChart Vue components
```

### Script Load Order (index.html)

Scripts must load in this exact order. Each file depends on globals from the previous:

```
db.js → storage.js → app.js → calculators.js → charts.js → app.mount('#app')
```

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

| Package | Version | Purpose |
|---|---|---|
| `bcryptjs` | ^2.4.3 | Password hashing (12 salt rounds) |
| `express-session` | ^1.17.3 | Server-side session management |
| `multer` | ^1.4.5-lts.1 | Multipart file upload for avatars |

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

## REST API Reference

Base URL: `http://localhost:3000`

All endpoints except health, register, and login require an active session (authenticated).

### Health

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | No | `{ ok: true }` |

### Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ email, password }` | `{ id, email, avatar }` + sets session |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ id, email, avatar }` + sets session |
| POST | `/api/auth/logout` | No | — | `{ ok: true }` + destroys session |
| GET | `/api/auth/me` | Yes | — | `{ id, email, avatar }` or 401 |
| POST | `/api/auth/avatar` | Yes | `multipart/form-data` field `avatar` | `{ avatar: '/uploads/avatars/...' }` |

### Profiles (scoped to session user)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/profiles` | — | `Profile[]` (current user only) |
| POST | `/api/profiles` | Profile fields | Created `Profile` (auto `id`, `userId`, `createdAt`) |
| GET | `/api/profiles/:id` | — | `Profile` or 404 |
| PUT | `/api/profiles/:id` | Partial profile | Updated `Profile` |
| DELETE | `/api/profiles/:id` | — | `{ ok: true }` — also deletes dashboard + log |

### Dashboard

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/profiles/:id/dashboard` | — | Dashboard object or `null` |
| PUT | `/api/profiles/:id/dashboard` | Dashboard object | Saved dashboard |

### Workout Log

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/profiles/:id/log` | — | `LogEntry[]` (newest first) |
| POST | `/api/profiles/:id/log` | Log entry fields | Full updated `LogEntry[]` |
| DELETE | `/api/profiles/:id/log/:entryId` | — | Full updated `LogEntry[]` |

---

## Database Schema (Split JSON Files)

### data/users.json — `User[]`

```typescript
interface User {
  id:           string;   // Date.now().toString()
  email:        string;   // lowercase
  passwordHash: string;   // bcryptjs hash, 12 rounds
  avatar:       string | null;  // '/uploads/avatars/...' or null
  createdAt:    string;   // ISO 8601
}
```

### data/profiles.json — `Profile[]`

```typescript
interface Profile {
  id:        string;   // Date.now().toString()
  userId:    string;   // FK → User.id
  createdAt: string;   // ISO 8601
  name:      string;
  age:       number;
  weight:    number;   // kg
  height:    number;   // cm
  gender:    'male' | 'female';
  restingHr: number;   // bpm (awake, seated)
  maxHr:     number;   // bpm
}
```

### data/dashboards.json — `Record<profileId, Dashboard>`

```typescript
interface Dashboard {
  calories:  number;
  protein:   number;
  water:     number;
  sleep:     number;
  fasted5k:  boolean;
  suppDone:  boolean;
  liftDone:  boolean;
  rideDone:  boolean;
  heelDone:  boolean;
  sleepDone: boolean;
  notes:     string;
}
```

### data/logs.json — `Record<profileId, LogEntry[]>`

```typescript
interface LogEntry {
  id:        string;              // Date.now().toString()
  type:      'run' | 'cycle' | 'lift';
  date:      string;              // YYYY-MM-DD
  duration:  string;              // minutes
  distance?: string;              // km (run/cycle)
  weight?:   string;              // kg (lift)
  reps?:     string;              // lift
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
  hero: 'https://images.unsplash.com/...', // '' for Dashboard/Journal
  isDashboard: true,  // optional — marks page 20
  isJournal:   true,  // optional — marks page 21
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

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `SESSION_SECRET` | `bp-longevity-secret-2024` | express-session secret key (change in production) |
