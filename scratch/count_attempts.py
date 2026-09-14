import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT count(*) FROM quiz_attempts;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
print("Total attempts:", stdout.read().decode('utf-8').strip())

c.close()
