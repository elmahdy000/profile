import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=20)
_, out, _ = c.exec_command("""sudo -u postgres psql -d profile -c "SELECT id, title, stage, stages, is_published FROM quizzes ORDER BY id DESC LIMIT 15;" -c "SELECT quiz_id, count(*) as attempts, count(distinct student_id) as students FROM quiz_attempts GROUP BY quiz_id ORDER BY attempts DESC LIMIT 15;" """)
print(out.read().decode('utf-8', 'replace'))
c.close()
