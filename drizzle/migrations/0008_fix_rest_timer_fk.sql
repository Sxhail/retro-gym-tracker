-- 0008_fix_rest_timer_fk.sql
-- Purpose: Remove the incorrect FK on active_session_timers.session_id so rest timers can persist
-- This migration recreates the table without the FK and preserves existing data.

PRAGMA foreign_keys=off;

-- 1) Create new table without FK
CREATE TABLE IF NOT EXISTS __new_active_session_timers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timer_type TEXT NOT NULL, -- 'workout' | 'rest'
  start_time TEXT NOT NULL, -- ISO
  duration INTEGER NOT NULL DEFAULT 0,
  elapsed_when_paused INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2) Copy data from old table if it exists
INSERT INTO __new_active_session_timers (id, session_id, timer_type, start_time, duration, elapsed_when_paused, is_active, created_at)
SELECT id, session_id, timer_type, start_time, duration, elapsed_when_paused, is_active, created_at
FROM active_session_timers;

-- 3) Drop old table and rename
DROP TABLE active_session_timers;
ALTER TABLE __new_active_session_timers RENAME TO active_session_timers;

-- 4) Recreate helpful indexes
CREATE INDEX IF NOT EXISTS idx_active_session_timers_session_id ON active_session_timers(session_id);
CREATE INDEX IF NOT EXISTS idx_active_session_timers_type ON active_session_timers(timer_type);
CREATE INDEX IF NOT EXISTS idx_active_session_timers_active ON active_session_timers(is_active);

PRAGMA foreign_keys=on;
