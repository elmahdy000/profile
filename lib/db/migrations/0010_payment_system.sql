-- Add payment_status to students (unpaid = free preview, pending_review = receipt uploaded, paid = full access)
-- IMPORTANT: The one-time backfill below MUST only run when the column is first
-- created. Running it unconditionally on every deploy overwrites admin decisions
-- (e.g. a lapsed/refunded student reset back to 'paid'). See audit fix #2.
DO $$
DECLARE
  column_existed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'payment_status'
  ) INTO column_existed;

  ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'unpaid';

  -- Only backfill on the very first creation of the column. Never touch existing
  -- payment_status values on re-run — they are authoritative admin state.
  IF NOT column_existed THEN
    UPDATE "students" SET "payment_status" = 'paid' WHERE "status" = 'approved';
  END IF;
END $$;

-- Payment receipts table for uploaded payment proof images
CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "image_storage_name" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "admin_notes" text,
  "reviewed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_receipts_student_idx" ON "payment_receipts" ("student_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_status_idx" ON "payment_receipts" ("status");
