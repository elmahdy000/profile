CREATE TABLE IF NOT EXISTS "question_bank" (
  "id" serial PRIMARY KEY,
  "course_id" integer REFERENCES "courses"("id") ON DELETE CASCADE,
  "subject" text,
  "stage" text,
  "stages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "category" text NOT NULL DEFAULT 'عام',
  "difficulty" text NOT NULL DEFAULT 'medium',
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "question" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "question_bank_course_idx" ON "question_bank" ("course_id");
CREATE INDEX IF NOT EXISTS "question_bank_category_idx" ON "question_bank" ("category");
