import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')
_, o, _ = c.exec_command('grep -E "test-bank|422" /root/.pm2/logs/drelmahdy-backend-out.log | tail -n 30')
print("OUTPUT:", o.read().decode('utf-8', 'ignore'))
_, o2, _ = c.exec_command('tail -n 30 /root/.pm2/logs/drelmahdy-backend-error.log')
print("ERRORS:", o2.read().decode('utf-8', 'ignore'))
c.close()
