CREATE TABLE IF NOT EXISTS "students" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "access_code" text,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text,
  "approved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "students_phone_unique" ON "students" ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "students_access_code_unique" ON "students" ("access_code");
CREATE INDEX IF NOT EXISTS "students_status_idx" ON "students" ("status");

CREATE TABLE IF NOT EXISTS "student_sessions" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_sessions_token_unique" ON "student_sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "student_sessions_student_idx" ON "student_sessions" ("student_id");

CREATE TABLE IF NOT EXISTS "learning_files" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'عام',
  "original_name" text NOT NULL,
  "storage_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "is_published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'عام',
  "passing_score" integer NOT NULL DEFAULT 60,
  "questions" jsonb NOT NULL,
  "is_published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY,
  "quiz_id" integer NOT NULL REFERENCES "quizzes"("id") ON DELETE CASCADE,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "answers" jsonb NOT NULL,
  "score" integer NOT NULL,
  "passed" boolean NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_idx" ON "quiz_attempts" ("quiz_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_student_idx" ON "quiz_attempts" ("student_id");
