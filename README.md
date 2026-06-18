# Longevity Blueprint

A science-backed longevity and body recomposition dashboard for the developer-athlete.  
24 interactive pages covering nutrition, training, recovery, and biomarker tracking — personalized to your biometrics and locked to your private account.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- npm (included with Node.js)

---

## Installation

```bash
# 1. Clone or download the project
cd training-plan

# 2. Install dependencies (Express + bcryptjs + express-session + multer)
npm install
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

> Data files are created automatically under `data/` on first run.

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

### 24 Pages

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

### Multi-Profile Support
- Create unlimited profiles per account (e.g. different training phases)
- All profile data is isolated to your account — other users cannot see it
- Profile switcher accessible from the sidebar

### UI Features
- **Dark / Light mode** — persisted in localStorage
- **Google Translate** widget — EN ↔ ES and more
- **PDF export** — browser print dialog for any calculator page
- **Avatar upload** — personal photo shown in sidebar and profile selector

---

## Authentication

- Passwords are hashed with **bcryptjs** (12 salt rounds) before being stored
- Sessions are managed server-side via **express-session** (in-memory store, 7-day cookie)
- Restarting the server clears all active sessions — users will need to sign in again
- Profile data, dashboards, and workout logs are strictly scoped to the authenticated user

---

## Data Storage

Data is split into four JSON files under `data/` (auto-created, gitignored):

| File | Contents |
|---|---|
| `data/users.json` | Email, bcrypt password hash, avatar path |
| `data/profiles.json` | Biometric profiles (each linked to a `userId`) |
| `data/dashboards.json` | Dashboard state per profile ID |
| `data/logs.json` | Workout log entries per profile ID |

Avatar images are stored under `uploads/avatars/` (also gitignored).

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
