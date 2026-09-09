CREATE TABLE IF NOT EXISTS student_attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL, -- YYYY-MM-DD
    status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late'
    attended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    center_name VARCHAR(100),
    academic_stage VARCHAR(100),
    recorded_by VARCHAR(100),
    notes TEXT,
    parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
    parent_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON student_attendance(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_attendance_student_date ON student_attendance(student_id, date);
