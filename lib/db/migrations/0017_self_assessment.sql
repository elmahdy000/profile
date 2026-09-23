CREATE TABLE IF NOT EXISTS self_assessment_entitlements (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    student_name TEXT NOT NULL DEFAULT '',
    free_attempt_used BOOLEAN NOT NULL DEFAULT FALSE,
    paid_attempts_balance INTEGER NOT NULL DEFAULT 0,
    total_purchased_attempts INTEGER NOT NULL DEFAULT 0,
    last_granted_by TEXT,
    last_granted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_assessment_entitlements_phone ON self_assessment_entitlements(phone);

CREATE TABLE IF NOT EXISTS self_assessment_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    student_name TEXT NOT NULL DEFAULT '',
    stage TEXT,
    unit TEXT,
    lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions_count INTEGER NOT NULL DEFAULT 10,
    questions JSONB NOT NULL,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER,
    total_points INTEGER,
    percentage INTEGER,
    passed BOOLEAN,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress',
    details JSONB,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    is_free_trial BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_self_assessment_sessions_session_id ON self_assessment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_self_assessment_sessions_phone ON self_assessment_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_self_assessment_sessions_student_id ON self_assessment_sessions(student_id);
