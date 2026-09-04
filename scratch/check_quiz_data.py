import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

cmd = """export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d= -f2-) && psql "$DATABASE_URL" -c "SELECT id, score, jsonb_array_length(details) as details_len, (SELECT count(*) FROM jsonb_array_elements(details) elem WHERE (elem->>'isCorrect')::boolean = true) as correct_count FROM quiz_attempts ORDER BY id DESC LIMIT 5;" 2>&1"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8', 'replace'))

ssh.close()
