import paramiko, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('sudo -u postgres psql -d profile -c "SELECT qa.id, qa.quiz_id, q.title, q.category, q.stage, q.course_id, qa.score, qa.passed, qa.created_at FROM quiz_attempts qa LEFT JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.student_id = 357 ORDER BY qa.id DESC;"')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

c.close()
