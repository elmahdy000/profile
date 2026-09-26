import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A -c \'SELECT question::text FROM question_bank WHERE id = 579;\'"')
res = stdout.read().decode('utf-8', errors='replace')
print("Bank 579:", res)
