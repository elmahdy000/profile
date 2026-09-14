import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Search in quizzes
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, created_at FROM quizzes WHERE questions::text LIKE '%التعلم الآلي أحد أساليبه%';" """
stdin, stdout, stderr = c.exec_command(cmd)
print("Quizzes containing 'التعلم الآلي أحد أساليبه':")
print(stdout.read().decode('utf-8'))

# Search in quiz_attempts
cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, created_at FROM quiz_attempts WHERE answers::text LIKE '%التعلم الآلي أحد أساليبه%' OR details::text LIKE '%التعلم الآلي أحد أساليبه%';" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
print("Attempts containing 'التعلم الآلي أحد أساليبه':")
print(stdout2.read().decode('utf-8'))

# Search in question_bank
cmd3 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, lesson FROM question_bank WHERE question::text LIKE '%التعلم الآلي أحد أساليبه%';" """
stdin3, stdout3, stderr3 = c.exec_command(cmd3)
print("Question Bank containing 'التعلم الآلي أحد أساليبه':")
print(stdout3.read().decode('utf-8'))

c.close()
