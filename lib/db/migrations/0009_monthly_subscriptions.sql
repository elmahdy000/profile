-- Migration: Monthly subscription payments tracking
-- Description: Track monthly payment cycles per student with automated expiry notifications

-- Monthly subscriptions table
CREATE TABLE IF NOT EXISTS "monthly_subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "month_start_date" TIMESTAMP NOT NULL, -- Start of this subscription month
  "month_end_date" TIMESTAMP NOT NULL,   -- End of this subscription month (29 days later)
  "amount_due" INTEGER NOT NULL DEFAULT 500, -- Amount in EGP (default 500 جنيه)
  "payment_status" TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
  "payment_date" TIMESTAMP, -- Actual date when payment was confirmed
  "receipt_id" INTEGER REFERENCES "payment_receipts"("id") ON DELETE SET NULL,
  "admin_notes" TEXT,
  "notified_at" TIMESTAMP, -- Last time student was notified about this payment
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "monthly_subscriptions_student_idx" ON "monthly_subscriptions"("student_id");
CREATE INDEX "monthly_subscriptions_payment_status_idx" ON "monthly_subscriptions"("payment_status");
CREATE INDEX "monthly_subscriptions_month_end_date_idx" ON "monthly_subscriptions"("month_end_date");
CREATE UNIQUE INDEX "monthly_subscriptions_student_month_unique" ON "monthly_subscriptions"("student_id", "month_start_date");

-- Add subscription tracking fields to students table if not exists
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "current_subscription_id" INTEGER REFERENCES "monthly_subscriptions"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "subscription_start_date" TIMESTAMP, -- First ever subscription date
  ADD COLUMN IF NOT EXISTS "subscription_status" TEXT DEFAULT 'active'; -- active | suspended | expired

CREATE INDEX IF NOT EXISTS "students_subscription_status_idx" ON "students"("subscription_status");
