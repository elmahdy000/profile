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

print("--- 1. كورس 17 في جدول courses ---")
course17_raw = q("SELECT id, title, is_published, stage, stages::text FROM courses WHERE id = 17;")
print(course17_raw.strip())

print("\n--- 2. فيديوهات كورس 17 ---")
videos_raw = q("SELECT id, title, category, stage, stages::text, is_published, course_id FROM videos WHERE course_id = 17;")
for l in videos_raw.strip().split("\n"):
    print(" ", l)

print("\n--- 3. اختبارات كورس 17 ---")
quizzes_raw = q("SELECT id, title, category, stage, stages::text, is_published, course_id FROM quizzes WHERE course_id = 17;")
for l in quizzes_raw.strip().split("\n"):
    print(" ", l)
