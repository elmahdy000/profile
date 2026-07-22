ALTER TABLE "learning_files"
  ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "learning_files"
  ADD COLUMN IF NOT EXISTS "target_type" text NOT NULL DEFAULT 'stages';

UPDATE "learning_files"
SET "stages" = jsonb_build_array("stage")
WHERE "stage" IS NOT NULL AND "stage" <> '' AND "stages" = '[]'::jsonb;
