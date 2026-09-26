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
SELECT id, student_id, score, answers::text, details::text
FROM quiz_attempts
WHERE quiz_id = 44;
""")

lines = [l for l in out.strip().split("\n") if l.strip()]
print(f"عدد محاولات الطلاب في اختبار 44: {len(lines)}")
for l in lines:
    parts = l.split("|")
    aid, sid, score = parts[0], parts[1], parts[2]
    print(f"محاولة ID: {aid}, طالب: {sid}, درجة: {score}%")
