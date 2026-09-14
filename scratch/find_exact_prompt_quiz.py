import paramiko, json, sys

sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Search quizzes
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title FROM quizzes WHERE questions::text LIKE '%العلاقة بين الذكاء الاصطناعي والتعلم الآلي%';" """
stdin, stdout, stderr = c.exec_command(cmd)
print("Quizzes containing 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي':")
for line in stdout:
    print(line.strip())

# Search question bank
cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, prompt, correct_index, options FROM question_bank WHERE prompt LIKE '%العلاقة بين الذكاء الاصطناعي والتعلم الآلي%';" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
print("\nQuestion Bank containing prompt:")
for line in stdout2:
    print(line.strip())

# Also search all attempts for that prompt in details or anywhere
cmd3 = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, score, created_at FROM quiz_attempts WHERE details::text LIKE '%العلاقة بين الذكاء الاصطناعي والتعلم الآلي%';" """
stdin3, stdout3, stderr3 = c.exec_command(cmd3)
print("\nAttempts containing prompt in details:")
for line in stdout3:
    print(line.strip())

c.close()
