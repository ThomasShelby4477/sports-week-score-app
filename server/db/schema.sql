-- Sports Week Score App Database Schema (PostgreSQL)

-- Users table for admins and organisers only
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'organiser')),
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments participating in sports week
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    short_code VARCHAR(50) UNIQUE NOT NULL
);

-- Sports list with day info
CREATE TABLE IF NOT EXISTS sports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    day INTEGER NOT NULL CHECK(day IN (1, 2)),
    icon VARCHAR(50) DEFAULT '🏆',
    has_gender_categories BOOLEAN DEFAULT TRUE,
    boys_only BOOLEAN DEFAULT FALSE,
    girls_only BOOLEAN DEFAULT FALSE,
    fixtures_visible BOOLEAN DEFAULT FALSE,
    visible_rounds VARCHAR(255)
);

-- Individual events within a sport (e.g., 100m, 400m in Athletics)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    sport_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK(category IN ('boys', 'girls', 'mixed')),
    event_type VARCHAR(50) DEFAULT 'individual' CHECK(event_type IN ('individual', 'team')),
    status VARCHAR(50) DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'completed')),
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
);

-- Results for individual events (positions)
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    participant_name VARCHAR(255) NOT NULL,
    position INTEGER CHECK(position IN (1, 2, 3)),
    score VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER,
    match_id INTEGER,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- Match results for team sports
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    team1_department_id INTEGER NOT NULL,
    team2_department_id INTEGER,
    team1_name VARCHAR(255),
    team2_name VARCHAR(255),
    team1_score VARCHAR(255),
    team2_score VARCHAR(255),
    winner_department_id INTEGER,
    match_type VARCHAR(50) DEFAULT 'round1',
    status VARCHAR(50) DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'completed')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_department_id) REFERENCES departments(id),
    FOREIGN KEY (team2_department_id) REFERENCES departments(id),
    FOREIGN KEY (winner_department_id) REFERENCES departments(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255),
    entity_id INTEGER,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_sport ON events(sport_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_results_event ON results(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
