-- Add payment status to students (unpaid = free preview, pending_review = receipt uploaded, paid = full access)
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'unpaid';

-- Existing approved students get 'paid' status so they keep full access
UPDATE "students" SET "payment_status" = 'paid' WHERE "status" = 'approved';

-- Payment receipts table
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
