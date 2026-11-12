-- Phase 1: Kholasa Integration Schema (Programming Only)
-- Safe, non-destructive, idempotent migration

ALTER TABLE question_bank
  ADD COLUMN IF NOT EXISTS concept TEXT,
  ADD COLUMN IF NOT EXISTS skill_category TEXT,
  ADD COLUMN IF NOT EXISTS translation TEXT;

CREATE TABLE IF NOT EXISTS lesson_kholasa_materials (
  id SERIAL PRIMARY KEY,
  video_id INTEGER,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit TEXT NOT NULL,
  lesson TEXT NOT NULL,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mindmap_title TEXT,
  mindmap_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  mindmap_data JSONB,
  structured_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  flashcards JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_url TEXT,
  pdf_url TEXT,
  source_key TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kholasa_materials_video_id ON lesson_kholasa_materials(video_id);
CREATE INDEX IF NOT EXISTS idx_kholasa_materials_stage_unit_lesson ON lesson_kholasa_materials(stage, unit, lesson);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kholasa_materials_source_key_unique ON lesson_kholasa_materials(source_key);

CREATE TABLE IF NOT EXISTS student_mistakes (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_bank_id INTEGER REFERENCES question_bank(id) ON DELETE SET NULL,
  question_hash TEXT NOT NULL,
  stage TEXT,
  unit TEXT,
  lesson TEXT,
  concept TEXT,
  source_type TEXT NOT NULL DEFAULT 'quiz',
  source_id INTEGER,
  diagnosis_tag TEXT,
  question_snapshot JSONB NOT NULL,
  last_wrong_option INTEGER,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  mastered BOOLEAN NOT NULL DEFAULT FALSE,
  last_wrong_at TIMESTAMP NOT NULL DEFAULT NOW(),
  mastered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mistakes_student_question_unique ON student_mistakes(student_id, question_hash);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_student_mastered ON student_mistakes(student_id, mastered);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_question_bank_id ON student_mistakes(question_bank_id);

CREATE TABLE IF NOT EXISTS student_daily_challenges (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_date VARCHAR(16) NOT NULL,
  stage TEXT,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 5,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_daily_challenges_student_date_unique ON student_daily_challenges(student_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_student_id ON student_daily_challenges(student_id);

CREATE TABLE IF NOT EXISTS student_bookmarks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES lesson_kholasa_materials(id) ON DELETE CASCADE,
  video_id INTEGER,
  item_type TEXT NOT NULL DEFAULT 'lesson',
  item_key TEXT NOT NULL,
  title TEXT,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_bookmarks_student_item_unique ON student_bookmarks(student_id, item_type, item_key);
CREATE INDEX IF NOT EXISTS idx_student_bookmarks_student_id ON student_bookmarks(student_id);

