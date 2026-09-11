import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """su - postgres -c "psql -d profile -c \\"SELECT id, lesson, question->'prompt' as prompt, question->'options' as options FROM question_bank WHERE question::text ILIKE '%judgment%' OR question::text ILIKE '%incorrect%';\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Question bank search:")
print(stdout.read().decode('utf-8', 'replace'))

cmd = """su - postgres -c "psql -d profile -c \\"SELECT id, title, created_at FROM quizzes ORDER BY id DESC LIMIT 5;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Recent quizzes:")
print(stdout.read().decode('utf-8', 'replace'))

ssh.close()
