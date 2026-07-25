ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "shuffle_questions" boolean NOT NULL DEFAULT false;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "show_explanations" boolean NOT NULL DEFAULT true;

ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "time_spent_seconds" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "details" jsonb;
