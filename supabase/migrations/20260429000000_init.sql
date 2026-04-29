CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'clarifying',
  outline       TEXT,
  clarify_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paper_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  summary_md  TEXT,
  bibtex_raw  TEXT,
  cite_key    TEXT,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title       TEXT NOT NULL,
  latex       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  critic_log  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
