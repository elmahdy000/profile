import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('cd /var/www/profile && git branch -a && wc -l artifacts/api-server/src/routes/learning.ts')
print("Server branch & lines:\n", stdout.read().decode('utf-8'))
