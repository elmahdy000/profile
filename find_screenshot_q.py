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

q("SEARCH QUESTION IN QUESTION_BANK", """
SELECT id, stage, unit, lesson, question->>'prompt' as prompt
FROM question_bank
WHERE question::text ILIKE '%digital certificate%' OR question::text ILIKE '%browser do with the server%';
""")

q("SEARCH QUESTION IN QUIZZES", """
SELECT id, title, course_id, video_id
FROM quizzes
WHERE questions::text ILIKE '%digital certificate%' OR questions::text ILIKE '%browser do with the server%';
""")

c.close()
