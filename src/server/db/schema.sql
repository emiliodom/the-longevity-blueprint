-- schema.sql — Longevity Blueprint v3
--
-- All tables use VARCHAR(36) UUID primary keys (crypto.randomUUID(), generated
-- app-side) rather than AUTO_INCREMENT, so every route keeps returning the
-- same opaque string `id` the frontend (storage.js / app.js) has always
-- expected — no client-side changes needed when swapping JSON files for MySQL.
--
-- Safe to re-run: every statement is idempotent (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id                 VARCHAR(36)  PRIMARY KEY,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  avatar             VARCHAR(255) NULL,
  preferred_language VARCHAR(10)  NOT NULL DEFAULT 'en',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Forward-migration pattern for columns added after a table already shipped:
-- CREATE TABLE above is a no-op on an existing DB, so upgrade it in place.
-- `ADD COLUMN IF NOT EXISTS` isn't portable across MySQL/MariaDB versions, so
-- this is deliberately plain — setup.js runs ALTER TABLE statements separately
-- from the CREATE TABLE batch and ignores ER_DUP_FIELDNAME, which is how
-- existing installs pick up `preferred_language` without re-running everything.
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS profiles (
  id          VARCHAR(36)  PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  age         INT          NULL,
  weight      DECIMAL(6,2) NULL,
  height      DECIMAL(6,2) NULL,
  gender      VARCHAR(16)  NULL,
  resting_hr  INT          NULL,
  max_hr      INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_profiles_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboards (
  profile_id  VARCHAR(36) PRIMARY KEY,
  data        JSON        NOT NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dashboards_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_logs (
  id          VARCHAR(36) PRIMARY KEY,
  profile_id  VARCHAR(36) NOT NULL,
  type        VARCHAR(16) NOT NULL,   -- run | cycle | lift
  date        VARCHAR(10) NOT NULL,   -- YYYY-MM-DD
  duration    VARCHAR(16) NULL,
  distance    VARCHAR(16) NULL,
  weight      VARCHAR(16) NULL,
  reps        VARCHAR(16) NULL,
  notes       TEXT        NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_logs_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Athlete-scalable goal/milestone tracking (Goal Dashboard)
CREATE TABLE IF NOT EXISTS goals (
  id            VARCHAR(36)   PRIMARY KEY,
  profile_id    VARCHAR(36)   NOT NULL,
  title         VARCHAR(255)  NOT NULL,
  goal_type     VARCHAR(32)   NOT NULL,   -- race5k | race10k | half | weight | lift_pr | ride | custom
  target_date   DATE          NULL,
  target_value  DECIMAL(10,2) NULL,
  unit          VARCHAR(32)   NULL,
  current_value DECIMAL(10,2) NULL,
  notes         TEXT          NULL,
  status        VARCHAR(16)   NOT NULL DEFAULT 'active', -- active | achieved | archived
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_goals_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Week Training Builder
CREATE TABLE IF NOT EXISTS training_weeks (
  id              VARCHAR(36) PRIMARY KEY,
  profile_id      VARCHAR(36) NOT NULL,
  week_start_date DATE        NOT NULL,  -- Monday of the week
  goal_id         VARCHAR(36) NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weeks_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_weeks_goal    FOREIGN KEY (goal_id)    REFERENCES goals(id)    ON DELETE SET NULL,
  UNIQUE KEY uniq_profile_week (profile_id, week_start_date),
  INDEX idx_weeks_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_blocks (
  id            VARCHAR(36)  PRIMARY KEY,
  week_id       VARCHAR(36)  NOT NULL,
  day_of_week   TINYINT      NOT NULL,  -- 0=Mon .. 6=Sun
  start_time    VARCHAR(5)   NULL,      -- 'HH:MM'
  duration_min  INT          NULL,
  block_type    VARCHAR(16)  NOT NULL,  -- run | weights | cycling | stretch
  title         VARCHAR(255) NOT NULL,
  details       JSON         NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_blocks_week FOREIGN KEY (week_id) REFERENCES training_weeks(id) ON DELETE CASCADE,
  INDEX idx_blocks_week (week_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily Exercise Tracker (Strava link + screenshots)
-- daily_trackers is now just the per-(profile,date) container; strava_url/
-- notes stay here (read-only) purely so any pre-existing single-activity
-- data written before tracker_activities existed still displays — see
-- routes/tracker.js's loadTracker() legacy-fallback comment. Every new
-- write goes to tracker_activities instead, which is what actually
-- supports multiple activities per day.
CREATE TABLE IF NOT EXISTS daily_trackers (
  id          VARCHAR(36)  PRIMARY KEY,
  profile_id  VARCHAR(36)  NOT NULL,
  date        VARCHAR(10)  NOT NULL,  -- YYYY-MM-DD
  strava_url  VARCHAR(500) NULL,
  notes       TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trackers_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_profile_date (profile_id, date),
  INDEX idx_trackers_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per activity logged for a day (running, swimming, lifting, etc. —
-- the same day can now hold several). sort_order controls display order.
CREATE TABLE IF NOT EXISTS tracker_activities (
  id          VARCHAR(36)  PRIMARY KEY,
  tracker_id  VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NULL,
  strava_url  VARCHAR(500) NULL,
  notes       TEXT         NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activities_tracker FOREIGN KEY (tracker_id) REFERENCES daily_trackers(id) ON DELETE CASCADE,
  INDEX idx_activities_tracker (tracker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tracker_screenshots (
  id          VARCHAR(36)  PRIMARY KEY,
  tracker_id  VARCHAR(36)  NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  uploaded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_screenshots_tracker FOREIGN KEY (tracker_id) REFERENCES daily_trackers(id) ON DELETE CASCADE,
  INDEX idx_screenshots_tracker (tracker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- activity_id associates a screenshot with one specific activity instead of
-- just "the day" — nullable and app-level only (no FK constraint), same
-- non-enforced-reference convention as training_blocks.details JSON
-- elsewhere in this schema. Pre-existing screenshots (uploaded before
-- activities existed) keep activity_id NULL and surface under the
-- synthesized legacy activity — see loadTracker()'s comment in tracker.js.
ALTER TABLE tracker_screenshots ADD COLUMN activity_id VARCHAR(36) NULL;

-- Calorie & Food Planner — food items themselves are static content
-- (src/server/lib/foods.js, referenced here only by string id), not a table.
CREATE TABLE IF NOT EXISTS meal_plans (
  id              VARCHAR(36) PRIMARY KEY,
  profile_id      VARCHAR(36) NOT NULL,
  week_start_date DATE        NOT NULL,  -- Monday of the week
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meal_plans_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_profile_meal_week (profile_id, week_start_date),
  INDEX idx_meal_plans_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id           VARCHAR(36)   PRIMARY KEY,
  meal_plan_id VARCHAR(36)   NOT NULL,
  day_of_week  TINYINT       NOT NULL,  -- 0=Mon .. 6=Sun
  meal_slot    VARCHAR(16)   NOT NULL,  -- breakfast | lunch | dinner | snack
  food_id      VARCHAR(64)   NOT NULL,  -- references FOOD_TEMPLATES id (static content, not a FK)
  grams        DECIMAL(7,1)  NOT NULL,
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meal_items_plan FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  INDEX idx_meal_items_plan (meal_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplements tracker — supplement_key references SUPPLEMENT_TEMPLATES in
-- src/server/lib/supplements.js (static content, not a table), the same
-- pattern as meal_plan_items.food_id above. One row = "taken that day";
-- toggling off just deletes the row rather than storing a false flag.
CREATE TABLE IF NOT EXISTS supplement_intakes (
  id              VARCHAR(36) PRIMARY KEY,
  profile_id      VARCHAR(36) NOT NULL,
  date            VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  supplement_key  VARCHAR(64) NOT NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_supplement_intakes_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_profile_date_supplement (profile_id, date, supplement_key),
  INDEX idx_supplement_intakes_profile_date (profile_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-account usage quotas ("wall it so no one exhausts the app") — one row
-- per actual attempt (a screenshot uploaded, a real OpenAI call made). See
-- src/server/lib/quota.js. Deliberately a durable DB table, not an in-memory
-- counter — an in-memory quota would reset on every restart/redeploy, which
-- defeats the point of a hard daily ceiling. Applies to every account, with
-- no bypass for any user.
CREATE TABLE IF NOT EXISTS usage_events (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  kind       VARCHAR(32) NOT NULL,  -- screenshot_upload | ai_analyze
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usage_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_usage_events_lookup (user_id, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OpenAI day/week/month analyzer — cached so repeat views don't re-spend API credits
CREATE TABLE IF NOT EXISTS ai_analyses (
  id            VARCHAR(36) PRIMARY KEY,
  profile_id    VARCHAR(36) NOT NULL,
  scope         VARCHAR(8)  NOT NULL,  -- day | week | month
  period_start  DATE        NOT NULL,
  period_end    DATE        NOT NULL,
  summary       TEXT        NOT NULL,
  raw_response  JSON        NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_analyses_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_profile_scope_period (profile_id, scope, period_start),
  INDEX idx_analyses_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
