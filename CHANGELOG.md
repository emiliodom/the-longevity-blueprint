# Changelog

Notable changes to the Longevity Blueprint, newest first. Backfilled from
git history on 2026-07-30; kept up to date going forward at each commit
milestone. This is a curated log of user-facing/behavioral changes — for
line-by-line detail see `git log`, and for *why* things are built the way
they are see `docs/ARCHITECTURE.md`.

## 2026-07-30

- Week Builder: run blocks (Zone 2, Interval, Tempo, Long Run) now offer a
  duration picker (15–180 min, 5 min steps) instead of one fixed default —
  a dropdown in the "📍 Place" modal or tap-to-place bar, not 34 separate
  palette tiles.
- Fixed a race in the Daily Tracker where a double-clicked "+ Add activity"
  (or an overlapping Wellness save/upload) could crash with "Failed to add
  activity"; add/update/delete calls now also surface the server's real
  error message instead of a generic one.

## 2026-07-28

- Added Wellness Track to the Daily Tracker: a single per-day entry (name,
  description, optional link, 0–100 score, screenshots) for wearable
  summaries like a Samsung Galaxy Watch daily score.

## 2026-07-27

- Daily Tracker rewritten to hold multiple activities per day (previously
  one Strava link + notes per day) — each with its own name, link, notes,
  and screenshots; add/remove with confirmation. Pre-existing single-
  activity data is synthesized as a "legacy" entry, not migrated.
- AI Analyzer scoped through each activity individually; Strava links
  dropped from what's sent to the model (not fetchable).
- Added `docs/features.json`, a machine-readable page/feature manifest.
- Added the Sprint/Interval Timer: giant glanceable UI, voice/beep cues,
  warmup/cooldown, round-tracking sidebar; code-review pass fixed an
  AudioContext leak, timer drift, and a race condition.
- Week Builder: Day/Week/Month views; compound blocks (multiple exercises
  per session) with an inline timer widget; block-card footer actions
  (Swap/Insights/Start/Remove); "Start Workout" hands off to Sprint Timer.
- Week Builder mobile pass: "📍 Place" day/position-picker modal, palette
  collapsed into a category accordion (desktop) or tile grid + modal
  (mobile), horizontal-scrolling day board, fixed touch taps being
  captured as drags.
- Added mode/timer fields to all 200 exercise catalog entries; back-filled
  `exercises.js` so every block template resolves in Insights.
- Daily Tracker shows that day's planned Week Builder blocks.
- Mobile nav drawer switched to a group tile grid + modal.
- Hid Google Translate's floating icon overlay.
- Fixed session persistence ("Failed to save language: Unauthorized")
  across server restarts; graceful SIGTERM/SIGINT handling (fixed Railway
  showing failed deploys); current page now persists across reloads.
- Added a collapsible desktop sidebar for more content width.

## 2026-07-26

- Exercise catalog + drag-and-drop bug fixes and general UI polish.
- Block-detail modal can replace a placed block's exercise; palette moved
  above the board; palette collapsed by default with bigger info icons.

## 2026-07-25

- Migrated the data layer to MySQL; added the Week Training Builder, Goal
  Dashboard, Daily Tracker, and AI Analyzer; general security hardening.
- Added durable per-account usage quotas for screenshot uploads and AI
  analysis calls.
- Added an account Settings page (change password, usage quotas, language,
  theme).
- Replaced hardcoded Unsplash hero images with Pexels.
- Added tap-to-place to the Week Builder; fixed a 500 on blank optional
  goal/profile fields.
- Made Week Builder block style/behavior config-driven.
- Expanded goal/block templates across calisthenics, cycling, swimming,
  trail running, and boxing; made auto-build goal-aware.
- Added the Calorie & Food Planner (Guatemalan food); fixed a cross-file
  global-scope collision bug.
- Added the Supplements tracker (the same evidence-based stack cited in
  `db.js`).
- Attached the AI analyzer to nutrition/supplements data.

## 2026-06-18

- Added authentication, split the single JSON DB, avatar upload, and
  several new content pages.
