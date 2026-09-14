import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, score, created_at FROM quiz_attempts WHERE quiz_id = 37 ORDER BY id ASC;" """
stdin, stdout, stderr = c.exec_command(cmd)
print("All attempts for Quiz 37:")
print(stdout.read().decode('utf-8'))

c.close()
