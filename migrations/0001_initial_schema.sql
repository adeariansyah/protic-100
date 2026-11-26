-- 1. Tabel Events (Mendukung Multi-Event & Reusability)
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_count INTEGER NOT NULL CHECK (team_count IN (4, 6, 8)),
  timer_seconds INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Tabel Teams
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  seed_order INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 3. Tabel Matches (Struktur Turnamen & Progresi Otomatis)
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  match_number INTEGER NOT NULL,        -- 1..4 (4 tim), 1..6 (6 tim), 1..8 (8 tim)
  round_name TEXT NOT NULL,             -- 'Penyisihan', 'Semifinal', 'Perebutan Juara 3', 'Final'
  team_a_id TEXT,                       -- NULL jika menunggu pemenang/kalah match sebelumnya
  team_b_id TEXT,
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  winner_team_id TEXT,
  loser_team_id TEXT,
  next_win_match_number INTEGER,        -- Nomor match tujuan pemenang
  next_win_slot TEXT CHECK (next_win_slot IN ('A', 'B')),
  next_lose_match_number INTEGER,       -- Nomor match tujuan tim kalah (untuk Perebutan Juara 3)
  next_lose_slot TEXT CHECK (next_lose_slot IN ('A', 'B')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 4. Tabel Questions (Soal Utama & Pool Soal Cadangan)
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'backup')),
  match_number INTEGER,                 -- Diisi untuk type='main', NULL untuk type='backup'
  question_order INTEGER,               -- 1 atau 2 untuk type='main', NULL untuk type='backup'
  question_text TEXT NOT NULL,
  answers_json TEXT NOT NULL,           -- JSON Array: [{"text":"...", "points":35}, ...] (5 item)
  is_used INTEGER NOT NULL DEFAULT 0,   -- 0 = belum terpakai, 1 = sudah terpakai (penting untuk backup)
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_teams_event ON teams(event_id);
CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_questions_event ON questions(event_id, type, is_used);