import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')
stdin, stdout, stderr = ssh.exec_command('grep -A 5 -rn "location /" /etc/nginx/sites-enabled/drelmahdy')
print("LOCATIONS:\n", stdout.read().decode('utf-8'))
stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/profile/artifacts/dr-mahmoud/dist/')
print("DR MAHMOUD DIST:\n", stdout.read().decode('utf-8'))
ssh.close()
