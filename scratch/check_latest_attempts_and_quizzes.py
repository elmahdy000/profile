import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, score, created_at FROM quiz_attempts ORDER BY id DESC LIMIT 20;" """
stdin, stdout, stderr = c.exec_command(cmd)
print("Latest attempts:")
print(stdout.read().decode('utf-8'))

cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, created_at, is_published FROM quizzes ORDER BY id DESC;" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
print("All Quizzes:")
print(stdout2.read().decode('utf-8'))

c.close()
