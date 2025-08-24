-- 0007_cool_cardio.sql
-- Create active cardio session persistence tables

CREATE TABLE IF NOT EXISTS active_cardio_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  params_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  phase_index INTEGER NOT NULL DEFAULT 0,
  cycle_index INTEGER NOT NULL DEFAULT 0,
  phase_started_at TEXT NOT NULL,
  phase_will_end_at TEXT NOT NULL,
  paused_at TEXT,
  accumulated_pause_ms INTEGER NOT NULL DEFAULT 0,
  schedule_json TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS active_cardio_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  fire_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_active_cardio_sessions_session_id ON active_cardio_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_cardio_notifications_session_id ON active_cardio_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_active_cardio_notifications_fire_at ON active_cardio_notifications(fire_at);
