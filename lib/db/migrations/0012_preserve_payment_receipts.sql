-- Migration to keep payment receipts permanently even if student is deleted
ALTER TABLE "payment_receipts" ALTER COLUMN "student_id" DROP NOT NULL;
ALTER TABLE "payment_receipts" DROP CONSTRAINT IF EXISTS "payment_receipts_student_id_fkey";
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL;

ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "snapshot_student_name" text;
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "snapshot_student_phone" text;
