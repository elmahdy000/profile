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

q("ALL UNIT 2 QUESTIONS IN QUESTION_BANK", """
SELECT lesson, count(*), min(id), max(id)
FROM question_bank
WHERE unit LIKE '%الوحدة الثانية%' OR unit LIKE '%Unit 2%'
GROUP BY lesson;
""")

q("VIDEOS COURSE 18", """
SELECT id, title, quiz_id
FROM videos
WHERE course_id = 18
ORDER BY id;
""")

c.close()
