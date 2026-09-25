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
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print("ERR:", err)

q("SAMPLE FROM 1312-1370 (CURRENT 2-2)", """
SELECT id, substring(question->>'prompt', 1, 80) as prompt 
FROM question_bank 
WHERE id BETWEEN 1312 AND 1320;
""")

q("SAMPLE FROM 1371-1429 (CURRENT 2-3)", """
SELECT id, substring(question->>'prompt', 1, 80) as prompt 
FROM question_bank 
WHERE id BETWEEN 1371 AND 1380;
""")

c.close()
