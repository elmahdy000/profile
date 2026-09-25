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

q("VIDEOS IN COURSE 18", """
SELECT id, title, course_id, quiz_id 
FROM videos 
WHERE course_id = 18 
ORDER BY id;
""")

q("SAMPLE QUESTION PROMPT FROM 1114-1120", """
SELECT id, question->>'prompt' as prompt, question->>'options' as options 
FROM question_bank 
WHERE id IN (1114, 1115, 1116)
""")

c.close()
