import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

cmd = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, name, phone, payment_status, grade, education_system, education_grade, school_type, academic_track, enrolled_course_ids, enrolled_categories FROM students WHERE payment_status = \'paid\';"'
stdin, stdout, stderr = c.exec_command(cmd)
print("=== PAID STUDENTS ===")
print(stdout.read().decode('utf-8'))

cmd2 = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, title, category, stage, stages, course_id, is_published, learning_mode FROM videos LIMIT 20;"'
stdin, stdout, stderr = c.exec_command(cmd2)
print("=== VIDEOS ===")
print(stdout.read().decode('utf-8'))

cmd3 = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, title, is_published FROM courses;"'
stdin, stdout, stderr = c.exec_command(cmd3)
print("=== COURSES ===")
print(stdout.read().decode('utf-8'))

c.close()
