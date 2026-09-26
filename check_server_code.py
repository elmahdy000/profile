import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('grep -n "/essay-exams" /root/profile/artifacts/api-server/src/routes/learning.ts 2>/dev/null || find / -name "learning.ts" 2>/dev/null')
print("Output:\n", stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err: print("Error:\n", err)
