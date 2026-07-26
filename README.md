# Longevity Blueprint

A science-backed longevity and body recomposition dashboard for the developer-athlete.  
24 interactive pages covering nutrition, training, recovery, and biomarker tracking — personalized to your biometrics and locked to your private account.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)
- A MySQL (or MariaDB) server, local or remote

---

## Installation

```bash
# 1. Clone or download the project
cd the-longevity-blueprint

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# edit .env: DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME,
# SESSION_SECRET, (optional, needed for the AI Analyzer) OPENAI_API_KEY, and
# (optional, needed for hero photos) PEXELS_API_KEY

# 4. Create the database schema (safe to re-run any time)
npm run db:setup
```

---

## Running the App

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Then open **http://localhost:3000** in your browser.

Deploying to Hostinger (or swapping in different MySQL credentials for production) — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). For the full folder map and API surface, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## First Launch

### 1. Create an account

On your first visit you will see a **Sign In / Create Account** screen:

- Enter your **email** and a **password** (min 8 chars, 1 uppercase, 1 number)
- Each email address creates a completely isolated account — no data is ever shared between users

### 2. Build your profile

After signing in, create a biometric profile:

| Field | Description |
|---|---|
| Name | Your name or alias |
| Age | In years (drives BMR, VO₂ max percentile, Tanaka Max HR) |
| Biological Sex | Male / Female (affects BMR, body fat formula) |
| Body Weight | In kilograms |
| Height | In centimetres (5'9" = 175 cm · 6'0" = 183 cm) |
| Resting HR | Beats per minute — measured **awake and seated** (not your wearable's sleeping HR) |
| Max HR | Your measured or estimated maximum heart rate — click **Auto** for the Tanaka formula |

All formulas throughout the app read from this profile — nothing is hardcoded.

### 3. (Optional) Upload a profile photo

Click the avatar circle in the profile setup screen or the sidebar to upload a photo.  
Allowed formats: **JPEG, PNG, WebP, GIF** · Maximum size: **2 MB**

---

## Features

### 30 Pages

| # | Page |
|---|---|
| 1 | Master Blueprint & Longevity |
| 2 | Visceral Fat & Biomarkers |
| 3 | Caloric Engine & Metabolic Math |
| 4 | Protein Mandate & Macro Engineering |
| 5 | Guatemalan Nutrition Protocol |
| 6 | Sunday Strategic Surplus |
| 7 | Minimalist Supplement Stack |
| 8 | Developer Athlete Advanced Stack |
| 9 | Daily 5k & VO₂ Max Engine |
| 10 | Structural Armor — Shoe Geometry |
| 11 | Sunday Ride — Power & Endurance |
| 12 | Barbell Recomposition Protocol |
| 13 | Workout A — Upper Body & Core |
| 14 | Workout B — Lower Body & Posterior Chain |
| 15 | Pull-Up Benchmark |
| 16 | Ankle & Heel Rehabilitation |
| 17 | Blood Markers & Biological Age |
| 18 | Recovery & Nervous System Regulation |
| 19 | Mindset & Discipline Architecture |
| 20 | Daily Mission Control (Dashboard) |
| 21 | Exercise Journal & Analytics |
| 22 | Belly Fat Measurement Guide |
| 23 | Science Cheatsheet |
| 24 | Environment & Caloric Factors |
| 25 | Week Builder |
| 26 | Goal Dashboard |
| 27 | Daily Tracker |
| 28 | Settings |
| 29 | Food Planner |
| 30 | Supplements |

### Calculators
- **BMR / TDEE** — Mifflin-St Jeor with activity multiplier
- **Body Fat %** — US Navy method (gender-aware: adds hip measurement for females)
- **Macro Targets** — protein at 1.6 g/kg, fat at 22%, remaining carbs
- **VO₂ Max** — Cooper 12-minute run or Karvonen HR ratio method
- **Heart Rate Zones** — 5-zone Karvonen method
- **1-Rep Max** — Epley + Brzycki average with percentage table
- **Ideal Weight** — 5 formulas averaged (Devine, Robinson, Miller, Hamwi, BMI-22)
- **Belly Fat** — WHtR + WHR + WHO waist classification with target calculator
- **Environment** — Altitude VO₂ penalty, heat index, caloric burn & hydration adjusted for temperature, humidity, and elevation

### Exercise Journal
- Log running, cycling, and lifting sessions
- Interactive Chart.js charts (bar charts per activity, donut for distribution)
- Persistent history per profile via the REST API

### Daily Dashboard
- Calorie, protein, water, and sleep trackers
- 6-item protocol checklist with toggle checkboxes
- Daily notes with auto-save (500 ms debounce)

### Week Training Builder
- Drag-and-drop weekly planner (Monday–Sunday), palette of Running / Trail Running / Weight Training / Calisthenics / Cycling / Swimming / Boxing / Stretching blocks
- Block style, sizing, and drag feel (color, animation timing, ghost opacity, swap threshold) all come from one plain-data config file (`src/js/components/blockStyleConfig.js`) — retune the whole builder's look and feel there without touching component code
- **Auto-Build**: generates a full week from an active goal's target date using a deterministic rules engine tailored to that goal's sport — e.g. a 5K/marathon goal gets daily Zone 2 running with an interval-to-tempo progression as race day nears; a calisthenics goal gets a push/pull/leg/skill split; a swim goal gets Critical-Swim-Speed interval sets; a boxing goal gets heavy-bag + HIIT rounds
- Export the week as **PDF**, **CSV**, or an **.ics calendar file** (import into Google/Apple/Outlook calendars)

### Goal Dashboard
- Track milestones with target dates and progress, across running/trail, natural bodyweight progression (pull-up → muscle-up, pistol squat, handstand push-up, front lever, L-sit — not bodybuilding), cycling (FTP), swimming (Critical Swim Speed), amateur boxing conditioning, weight targets, and lift PRs
- ~20 built-in templates grounded in widely-cited standards (r/bodyweightfitness's Recommended Routine, Coggan power zones, Critical Swim Speed) or start a custom goal
- "Build Week from this Goal" jumps straight into the Week Builder with a plan generated around it

### Calorie & Food Planner
- Plan meals for the week (breakfast/lunch/dinner/snack) from a ~24-item database of common Guatemalan staples — everyday food, not an exhaustive international database
- Calories/macros are computed automatically per item and totaled per day, shown against a daily target that mirrors the app's own protocol (2,100 kcal Mon–Sat, 2,800 kcal Sunday surplus, 1.6g/kg protein)

### Supplements
- Daily checklist for the same 8-supplement stack already discussed with sources on the Minimalist Supplement Stack and Developer Athlete Advanced Stack pages (creatine, whey, collagen+C, omega-3, D3/K2, lutein/zeaxanthin, glycine, magnesium glycinate) — dose, timing, and the evidence behind each

### Daily Tracker + AI Analyzer
- Log a Strava activity link, notes, and upload screenshots (Strava/insights/wearable summaries) per day
- **AI Analyzer** (OpenAI, server-side key): day / week / month analysis covering training, nutrition (meals logged in the Food Planner), and supplement adherence together, plus reading the screenshots themselves (vision model) — results are cached so re-viewing a period doesn't re-spend API credits
- Screenshot uploads and AI analyses are both capped per account per day (60 and 30 respectively) — a hard wall against any single account exhausting storage or OpenAI credits, with no exceptions for any account. Current usage is visible on the Settings page.

### Settings
- Change password, see current upload/AI usage against the daily limits, set a preferred language (applies the Google Translate widget's language and remembers it), toggle theme

### Multi-Profile Support
- Create unlimited profiles per account (e.g. different training phases)
- All profile data is isolated to your account — other users cannot see it
- Profile switcher accessible from the sidebar

### UI Features
- **Dark / Light mode** — persisted in localStorage
- **Google Translate** widget — English, Spanish, French, German, Portuguese, Italian, Chinese, Japanese, Korean, Arabic, Hindi, Russian
- **PDF export** — browser print dialog for any calculator page (the Week Builder has its own server-rendered PDF/CSV/ICS export instead)
- **Avatar upload** — personal photo shown in sidebar and profile selector
- **Hero images** — each content page's header photo comes from Pexels (optional `PEXELS_API_KEY`); pages just show a plain title header if it's not configured

---

## Authentication

- Passwords are hashed with **bcryptjs** (12 salt rounds) before being stored
- Sessions are managed server-side via **express-session** (in-memory store, 7-day cookie)
- Restarting the server clears all active sessions — users will need to sign in again
- Profile data, dashboards, and workout logs are strictly scoped to the authenticated user

---

## Data Storage

All data lives in **MySQL** (see `src/server/db/schema.sql` for the full schema — users, profiles, dashboards, workout logs, goals, training weeks/blocks, daily trackers/screenshots, and cached AI analyses). This replaced the earlier flat-JSON-file storage specifically so data survives redeploys on hosts with an ephemeral filesystem — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the table map.

Avatar images and tracker screenshots are stored under `uploads/` (gitignored) — file paths are recorded in MySQL, the files themselves stay on disk.

The browser stores only the active profile ID in `localStorage` (`bp_active_profile`).

---

## Port Configuration

The default port is **3000**. Override with an environment variable:

```bash
PORT=8080 npm start
```

---

## Scientific References

All formulas and recommendations are documented with primary citations in [`SCIENCE.md`](SCIENCE.md).
