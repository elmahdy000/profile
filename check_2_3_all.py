import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(title, sql):
    print(f"=== {title} ===")
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)

q("ALL ROWS MATCHING 2-3", """
SELECT id, lesson, created_at, question->>'prompt' as prompt 
FROM question_bank 
WHERE lesson LIKE '%2-3%' OR lesson LIKE '%Security Incident%'
ORDER BY id LIMIT 5;
""")

q("TOTAL COUNT OF 2-3 ROWS", """
SELECT count(*), lesson FROM question_bank 
WHERE lesson LIKE '%2-3%' OR lesson LIKE '%Security Incident%'
GROUP BY lesson;
""")

c.close()
