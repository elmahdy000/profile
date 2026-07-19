CREATE TABLE IF NOT EXISTS "students" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "access_code" text,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text,
  "governorate" text,
  "city" text,
  "grade" text,
  "other_grade_detail" text,
  "enrolled_categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "approved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "governorate" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "grade" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "other_grade_detail" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "enrolled_categories" jsonb NOT NULL DEFAULT '[]'::jsonb;
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
  "stage" text,
  "subject" text,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "order" integer NOT NULL DEFAULT 0,
  "original_name" text NOT NULL,
  "storage_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "is_published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
ALTER TABLE "learning_files" ADD COLUMN IF NOT EXISTS "stage" text;
ALTER TABLE "learning_files" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "learning_files" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "learning_files" ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS "video_progress" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "video_id" integer NOT NULL,
  "progress" integer NOT NULL DEFAULT 0,
  "completed" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "video_progress_student_video_unique" ON "video_progress" ("student_id", "video_id");
CREATE INDEX IF NOT EXISTS "video_progress_student_idx" ON "video_progress" ("student_id");

ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "stage" text;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "video_file_attachments" (
  "id" serial PRIMARY KEY,
  "video_id" integer NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "file_id" integer NOT NULL REFERENCES "learning_files"("id") ON DELETE CASCADE,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "video_file_attachments_video_file_unique" ON "video_file_attachments" ("video_id", "file_id");
CREATE INDEX IF NOT EXISTS "video_file_attachments_video_idx" ON "video_file_attachments" ("video_id");
