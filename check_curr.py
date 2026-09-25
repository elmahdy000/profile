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

q("CURRICULUM LESSONS FOR UNIT 2", """
SELECT id, title, course_id
FROM curriculums
WHERE course_id IN (17, 18) OR title ILIKE '%Unit 2%' OR title ILIKE '%الثانية%'
ORDER BY id;
""")

q("ALL LESSON NAMES IN QUESTION_BANK FOR UNIT 2", """
SELECT DISTINCT stage, unit, lesson
FROM question_bank
WHERE unit ILIKE '%Unit 2%' OR unit ILIKE '%الثانية%'
ORDER BY stage, lesson;
""")

c.close()
