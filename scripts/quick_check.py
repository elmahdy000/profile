import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

cmd = (
    "cd /var/www/profile && "
    "DB=$(grep DATABASE_URL .env | head -1 | cut -d= -f2-) && "
    "psql \"$DB\" -c \"SELECT 'videos' as tbl, COUNT(*) FROM videos UNION ALL SELECT 'students', COUNT(*) FROM students;\" && "
    "pm2 status drelmahdy-backend"
)

stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode("utf-8", errors="replace"))
client.close()
