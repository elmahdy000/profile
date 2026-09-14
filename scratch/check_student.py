import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = 'sudo -u postgres psql -d profile -x -c "SELECT id, name, phone, access_code, grade, status, school_type, last_active_at, last_login_at, updated_at, created_at FROM students WHERE access_code = \'88S9JP\';"'
stdin, stdout, stderr = c.exec_command(cmd)
print("=== STUDENT ===")
print(stdout.read().decode('utf-8'))

cmd2 = 'sudo -u postgres psql -d profile -x -c "SELECT id, quiz_id, student_id, score, passed, time_spent_seconds, created_at FROM quiz_attempts WHERE student_id = 357 ORDER BY id DESC;"'
stdin, stdout, stderr = c.exec_command(cmd2)
print("=== QUIZ ATTEMPTS ===")
print(stdout.read().decode('utf-8'))

cmd3 = 'sudo -u postgres psql -d profile -x -c "SELECT id, title, stage, stages, category, is_published FROM quizzes WHERE id IN (36, 29, 23);"'
stdin, stdout, stderr = c.exec_command(cmd3)
print("=== QUIZZES ===")
print(stdout.read().decode('utf-8'))

c.close()
