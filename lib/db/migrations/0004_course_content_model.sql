ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false;

ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "stage" text;

DO $$ BEGIN
  ALTER TABLE "curriculums"
    ADD CONSTRAINT "curriculums_course_id_courses_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "curriculums_course_idx" ON "curriculums" ("course_id");

-- Existing courses were already visible before drafts existed, so preserve that behavior.
UPDATE "courses" SET "is_published" = true;
