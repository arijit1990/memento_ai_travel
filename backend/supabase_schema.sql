-- ══════════════════════════════════════════════════════════════════════════════
-- Memento AI — Supabase database schema
-- Paste this entire file into Supabase dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Users
CREATE TABLE IF NOT EXISTS users (
    user_id     TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    picture     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (server-side httpOnly cookie sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id             BIGSERIAL PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_token  TEXT UNIQUE NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Trips (itinerary stored as JSONB)
CREATE TABLE IF NOT EXISTS trips (
    trip_id          TEXT PRIMARY KEY,
    user_id          TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    guest_session_id TEXT,
    model            TEXT,
    last_model       TEXT,
    updated_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    trip             JSONB NOT NULL DEFAULT '{}'
);

-- Health check log
CREATE TABLE IF NOT EXISTS status_checks (
    id           TEXT PRIMARY KEY,
    client_name  TEXT NOT NULL,
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

-- Public share tokens
CREATE TABLE IF NOT EXISTS shares (
    token       TEXT PRIMARY KEY,
    trip_id     TEXT REFERENCES trips(trip_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Saved activities / places
CREATE TABLE IF NOT EXISTS saved_items (
    id               TEXT PRIMARY KEY,
    user_id          TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    guest_session_id TEXT,
    title            TEXT,
    type             TEXT,
    location         TEXT DEFAULT '',
    image            TEXT DEFAULT '',
    activity_id      TEXT,
    trip_id          TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Export audit log
CREATE TABLE IF NOT EXISTS exports (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         TEXT,
    email           TEXT,
    webhook_status  INTEGER,
    share_token     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for common query patterns ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_user_id           ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_guest_session_id  ON trips(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token          ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id        ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_user_id           ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_guest_id          ON saved_items(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_shares_trip_id          ON shares(trip_id);
