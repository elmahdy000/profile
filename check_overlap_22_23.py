import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
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

q("CHECK OVERLAP BETWEEN 2-2 AND 2-3", """
SELECT count(*) 
FROM question_bank q1 
JOIN question_bank q2 ON q1.question->>'prompt' = q2.question->>'prompt' 
WHERE q1.lesson = 'Lesson 2-2: Network Encryption Technologies' 
  AND q2.lesson = 'Lesson 2-3: Security Incident (التعامل مع الحوادث الأمنية)';
""")

q("SAMPLE PROMPTS FROM 2-2", """
SELECT id, question->>'prompt' as prompt FROM question_bank WHERE lesson = 'Lesson 2-2: Network Encryption Technologies' LIMIT 5;
""")

q("SAMPLE PROMPTS FROM 2-3", """
SELECT id, question->>'prompt' as prompt FROM question_bank WHERE lesson = 'Lesson 2-3: Security Incident (التعامل مع الحوادث الأمنية)' LIMIT 5;
""")

c.close()
