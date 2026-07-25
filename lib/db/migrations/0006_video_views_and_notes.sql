ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "max_views" integer;
ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "student_notes" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "video_id" integer NOT NULL,
  "content" text NOT NULL,
  "timestamp_seconds" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "student_notes_student_video_idx" ON "student_notes" ("student_id", "video_id");
