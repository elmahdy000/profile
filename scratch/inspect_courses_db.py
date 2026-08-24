import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

def run(cmd):
    i, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', 'replace').strip()

print("=== 1. ALL COURSES IN DB ===")
print(run('sudo -u postgres psql -d profile -c "SELECT id, title, category, stages, is_published FROM courses ORDER BY id;"'))

print("\n=== 2. TOTAL VIDEOS BY COURSE ===")
print(run('sudo -u postgres psql -d profile -c "SELECT course_id, category, stage, COUNT(*) as count, SUM(CASE WHEN is_published THEN 1 ELSE 0 END) as published_count FROM videos GROUP BY course_id, category, stage;"'))

print("\n=== 3. STUDENTS COUNT BY GRADE & ENROLLED COURSES ===")
print(run('sudo -u postgres psql -d profile -c "SELECT grade, COUNT(*) as total_students, SUM(CASE WHEN enrolled_course_ids IS NOT NULL AND enrolled_course_ids != \'[]\' THEN 1 ELSE 0 END) as has_explicit_enrollment FROM students GROUP BY grade;"'))

c.close()
