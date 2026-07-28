import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

cmd = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT id, name, phone, payment_status, enrolled_course_ids, enrolled_categories FROM students WHERE array_length(enrolled_course_ids, 1) IS NULL OR enrolled_course_ids = \'[]\'::jsonb LIMIT 15;"'
stdin, stdout, stderr = c.exec_command(cmd)
print("=== STUDENTS WITH EMPTY ENROLLED_COURSE_IDS ===")
print(stdout.read().decode('utf-8'))

cmd2 = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT count(*) FROM students WHERE payment_status = \'paid\';" '
stdin, stdout, stderr = c.exec_command(cmd2)
print("=== PAID COUNT ===")
print(stdout.read().decode('utf-8'))

cmd3 = 'psql "postgresql://postgres:pass1234@localhost/profile" -c "SELECT count(*) FROM students WHERE payment_status = \'paid\' AND (enrolled_course_ids IS NULL OR enrolled_course_ids = \'[]\'::jsonb);" '
stdin, stdout, stderr = c.exec_command(cmd3)
print("=== PAID BUT EMPTY ENROLLED_COURSE_IDS COUNT ===")
print(stdout.read().decode('utf-8'))

c.close()
