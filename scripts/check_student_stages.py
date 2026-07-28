import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

cmd = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, name, phone, grade, education_system, education_grade, school_type, academic_track, enrolled_course_ids FROM students WHERE payment_status = \'paid\' AND (enrolled_course_ids IS NULL OR enrolled_course_ids = \'[]\'::jsonb) LIMIT 10;"'
stdin, stdout, stderr = c.exec_command(cmd)
print("=== PAID STUDENTS WITH EMPTY ENROLLED_COURSE_IDS ===")
print(stdout.read().decode('utf-8'))

cmd2 = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, title, stages FROM courses;"'
stdin, stdout, stderr = c.exec_command(cmd2)
print("=== COURSES STAGES ===")
print(stdout.read().decode('utf-8'))

c.close()
