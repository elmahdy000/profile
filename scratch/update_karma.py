import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')
cmd = "sudo -u postgres psql -d profile -c \"UPDATE students SET last_active_at = NOW(), updated_at = NOW() WHERE access_code = '88S9JP';\""
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode('utf-8'))
c.close()
