import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, title, course_id, created_at FROM quizzes ORDER BY id ASC;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)

for line in stdout:
    parts = line.strip().split('|')
    if len(parts) >= 4:
        print(f"ID {parts[0]}: '{parts[1]}' (Course {parts[2]}, Date {parts[3]})")

c.close()
