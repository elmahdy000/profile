import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title FROM quizzes WHERE title LIKE '%12-9-2026%';" """
stdin, stdout, stderr = c.exec_command(cmd)
print("Quizzes with 12-9-2026 in title:")
print(stdout.read().decode('utf-8'))

cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title FROM quizzes WHERE questions::text LIKE '%العلاقة بين الذكاء الاصطناعي والتعلم الآلي%';" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
print("Quizzes containing 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي':")
print(stdout2.read().decode('utf-8'))

c.close()
