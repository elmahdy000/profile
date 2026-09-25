import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def query_json(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

out_att = query_json("""
SELECT count(*) FROM quiz_attempts;
""")
print("Total quiz_attempts:", out_att.strip())

# Check how details are structured in quiz_attempts
out_sample = query_json("""
SELECT json_build_object(
    'id', id,
    'quiz_id', quiz_id,
    'student_id', student_id,
    'score', score,
    'passed', passed,
    'details', details
)::text
FROM quiz_attempts
ORDER BY id DESC
LIMIT 5;
""")
for l in out_sample.strip().split("\n"):
    if l.strip():
        print(l[:300])

c.close()
