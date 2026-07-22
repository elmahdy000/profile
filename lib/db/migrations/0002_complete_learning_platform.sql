-- Bring existing installations in sync with the current learning-platform
-- schema. Every statement is idempotent so deployment retries are safe.

ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "learning_mode" text NOT NULL DEFAULT 'online';
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "enrolled_course_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "education_system" text;
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "education_grade" text;
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "school_type" text;
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "academic_track" text;
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "avatar_url" text;

ALTER TABLE "video_progress"
  ADD COLUMN IF NOT EXISTS "current_time_seconds" integer NOT NULL DEFAULT 0;
ALTER TABLE "video_progress"
  ADD COLUMN IF NOT EXISTS "duration_seconds" integer NOT NULL DEFAULT 0;

ALTER TABLE "quizzes"
  ADD COLUMN IF NOT EXISTS "stage" text;

ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "course_id" integer REFERENCES "courses"("id") ON DELETE SET NULL;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "learning_mode" text NOT NULL DEFAULT 'online';
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "duration_text" text;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "lessons_count" integer;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "level" text;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "pdf_file_id" integer REFERENCES "learning_files"("id") ON DELETE SET NULL;
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "quiz_id" integer REFERENCES "quizzes"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "student_notifications" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text NOT NULL DEFAULT 'info',
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "student_notifications_student_idx"
  ON "student_notifications" ("student_id");
CREATE INDEX IF NOT EXISTS "student_notifications_created_at_idx"
  ON "student_notifications" ("created_at");

CREATE TABLE IF NOT EXISTS "code_recovery_requests" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "resolved_at" timestamp
);
CREATE INDEX IF NOT EXISTS "code_recovery_requests_student_idx"
  ON "code_recovery_requests" ("student_id");
CREATE INDEX IF NOT EXISTS "code_recovery_requests_status_idx"
  ON "code_recovery_requests" ("status");
