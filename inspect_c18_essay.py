import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

print("--- دروس كورس 18 (تانية بكالوريا لغات) ---")
v_out = q("SELECT id, title, unit FROM videos WHERE course_id = 18 ORDER BY id;")
for l in v_out.strip().split("\n"):
    print(" ", l)

print("\n--- جدول essay_exams الحالي ---")
ee_out = q("SELECT id, title, course_id, jsonb_array_length(questions) as q_len FROM essay_exams;")
for l in ee_out.strip().split("\n"):
    print(" ", l)
