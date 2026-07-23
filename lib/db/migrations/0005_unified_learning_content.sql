ALTER TABLE "learning_files" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "video_id" integer;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "scope" text NOT NULL DEFAULT 'course';
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 3;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "required_progress" integer NOT NULL DEFAULT 80;
ALTER TABLE "quizzes" ALTER COLUMN "is_published" SET DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "learning_files" ADD CONSTRAINT "learning_files_course_id_courses_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_video_id_videos_id_fk"
    FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "learning_files_course_idx" ON "learning_files" ("course_id");
CREATE INDEX IF NOT EXISTS "quizzes_course_idx" ON "quizzes" ("course_id");
CREATE INDEX IF NOT EXISTS "quizzes_video_idx" ON "quizzes" ("video_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quizzes_video_unique" ON "quizzes" ("video_id") WHERE "video_id" IS NOT NULL;

UPDATE "quizzes" SET "stages" = jsonb_build_array("stage")
WHERE "stage" IS NOT NULL AND "stage" <> '' AND "stages" = '[]'::jsonb;

UPDATE "quizzes" q SET "course_id" = c."id"
FROM "courses" c
WHERE q."course_id" IS NULL AND lower(trim(q."category")) = lower(trim(c."title"));

UPDATE "quizzes" q SET "video_id" = v."id", "course_id" = v."course_id", "scope" = 'lesson'
FROM "videos" v WHERE v."quiz_id" = q."id" AND q."video_id" IS NULL;
