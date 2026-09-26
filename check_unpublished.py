import paramiko
import json
import sys

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

out = q("""
SELECT id, title, course_id, is_published, jsonb_array_length(questions) as q_count
FROM quizzes
WHERE is_published = false;
""")

print("الاختبارات غير المنشورة:")
for l in out.strip().split("\n"):
    if not l.strip(): continue
    parts = l.split("|")
    print(f"ID {parts[0]}: '{parts[1]}' (كورس {parts[2]}) - عدد الأسئلة: {parts[4]}")
