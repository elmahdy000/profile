import paramiko, json, sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = 'su - postgres -c "psql -d profile -t -A -c \\"SELECT questions->24 FROM quizzes WHERE id = 40;\\""'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Quiz 40 Question 25:")
print(stdout.read().decode('utf-8'))
ssh.close()
