import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('''su - postgres -c "psql -d profile -t -A -c \\"
SELECT 
    count(*) as total_attempts,
    sum(case when (d->>'isCorrect')::boolean = true or (d->>'correct')::boolean = true then 1 else 0 end) as correct_count,
    sum(case when (d->>'isCorrect')::boolean = false or (d->>'correct')::boolean = false then 1 else 0 end) as wrong_count
FROM quiz_attempts,
jsonb_array_elements(details) as d
WHERE quiz_id = 44 AND (d->>'questionIndex')::int = 21;
\\""''')

res = stdout.read().decode('utf-8', errors='replace')
print("Q44 Question #22 stats:", res)
