import sys; sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

cmd = "source /etc/environment 2>/dev/null || true; cd /var/www/profile && grep DATABASE_URL .env | head -1 | cut -d= -f2- | xargs -I{} psql \"{}\" -c \"\\d courses\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
for line in stdout:
    print(line, end='')
client.close()
