import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

cmd = """export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-) && psql "$DATABASE_URL" -c "SELECT id, actor_role, action, target_type, target_id, details, ip_address, created_at FROM audit_logs ORDER BY id DESC LIMIT 50;" """
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='ignore'))
print(stderr.read().decode('utf-8', errors='ignore'))
client.close()
