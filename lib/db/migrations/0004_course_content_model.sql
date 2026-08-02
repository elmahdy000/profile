ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add is_published and, ONLY on first creation, backfill existing courses to
-- published (they were visible before drafts existed). Guarded so a re-run never
-- force-publishes courses an admin later unpublished. See audit fix #7.
DO $$
DECLARE
  column_existed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_published'
  ) INTO column_existed;

  ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false;

  IF NOT column_existed THEN
    UPDATE "courses" SET "is_published" = true;
  END IF;
END $$;

ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "stage" text;

DO $$ BEGIN
  ALTER TABLE "curriculums"
    ADD CONSTRAINT "curriculums_course_id_courses_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "curriculums_course_idx" ON "curriculums" ("course_id");
