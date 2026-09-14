import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Find student with code 88S9JP
sql = """
SELECT id, name, phone, code, stage, category, course_id, status, is_approved, created_at 
FROM students 
WHERE UPPER(code) = '88S9JP';
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
out = stdout.read().decode('utf-8').strip()
print("Student row:")
print(out)

if out:
    sid = out.split('|')[0]
    print(f"\nAttempts for student ID {sid}:")
    sql2 = f"""
    SELECT qa.id, qa.quiz_id, q.title, q.category, q.stage, qa.score, qa.passed, qa.created_at 
    FROM quiz_attempts qa 
    LEFT JOIN quizzes q ON q.id = qa.quiz_id 
    WHERE qa.student_id = {sid} 
    ORDER BY qa.id DESC;
    """
    b64_2 = base64.b64encode(sql2.encode('utf-8')).decode('ascii')
    stdin2, stdout2, stderr2 = c.exec_command(f'echo {b64_2} | base64 -d | sudo -u postgres psql -d profile -t -A')
    print(stdout2.read().decode('utf-8').strip())

c.close()
