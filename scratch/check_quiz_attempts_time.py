import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, created_at, updated_at FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
print("Quiz 37:", stdout.read().decode('utf-8').strip())

cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, student_id, score, created_at FROM quiz_attempts WHERE quiz_id = 37 ORDER BY id ASC;" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
print("\nAttempts on Quiz 37:")
for line in stdout2:
    print(line.strip())

c.close()
