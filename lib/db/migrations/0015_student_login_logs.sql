-- Migration: Create student_login_logs table
-- This table was defined in the schema but never had a migration file.

CREATE TABLE IF NOT EXISTS "student_login_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "device_id" text,
  "ip_address" text,
  "user_agent" text,
  "status" text NOT NULL DEFAULT 'success',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "student_login_logs_student_idx" ON "student_login_logs" ("student_id");
CREATE INDEX IF NOT EXISTS "student_login_logs_created_at_idx" ON "student_login_logs" ("created_at");
