import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=40)

def run_query(sql):
    escaped_sql = sql.replace('"', '\\"')
    stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d profile -c "{escaped_sql}"')
    return stdout.read().decode('utf-8', errors='replace')

print("=== VERIFY DB LIVE STATE ===")
print("Confirmed vs Unconfirmed across Offline students:")
print(run_query("""
SELECT 
    learning_mode,
    center_confirmed,
    count(*)
FROM students
WHERE learning_mode = 'offline'
GROUP BY 1, 2;
"""))

print("=== CHECK SAMPLE NOTIFICATIONS INSERTED ===")
print(run_query("""
SELECT student_id, title, message, created_at
FROM student_notifications
WHERE title LIKE '%تأكيد السنتر%'
ORDER BY id DESC
LIMIT 3;
"""))

stdin, stdout, stderr = ssh.exec_command('pm2 status drelmahdy-backend')
print("PM2 Status:")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
