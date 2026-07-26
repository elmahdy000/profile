-- Create unique index for non-null, non-empty email addresses in students table
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique ON students (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) <> '';
