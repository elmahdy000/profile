import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

out, err = q("""
SELECT json_build_object(
    'id', id,
    'stage', stage,
    'unit', unit,
    'lesson', lesson,
    'question', question
)::text
FROM question_bank
WHERE question::text LIKE '%تيار التسرب%' OR question::text LIKE '%المعالجة المتوازية%'
LIMIT 5;
""")

print("=== QUESTION BANK MATCHES ===")
print(out)
if err: print("ERR:", err)

out2, err2 = q("""
SELECT json_build_object(
    'id', id,
    'title', title,
    'questions', questions
)::text
FROM quizzes
WHERE questions::text LIKE '%تيار التسرب%' OR questions::text LIKE '%المعالجة المتوازية%'
LIMIT 5;
""")

print("=== QUIZZES MATCHES ===")
print(out2)
if err2: print("ERR:", err2)

out3, err3 = q("""
SELECT json_build_object(
    'id', id,
    'session_id', session_id,
    'answers', answers,
    'details', details
)::text
FROM self_assessment_sessions
WHERE questions::text LIKE '%تيار التسرب%' OR questions::text LIKE '%المعالجة المتوازية%'
ORDER BY id DESC
LIMIT 1;
""")

print("=== SESSIONS MATCHES ===")
print(out3)
if err3: print("ERR:", err3)

c.close()
