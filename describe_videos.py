import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A -c \'\\d videos\'"')
print("Videos columns:\n", stdout.read().decode('utf-8'))
