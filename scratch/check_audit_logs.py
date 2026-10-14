import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

print("--- AUDIT LOGS FOR STUDENT 316 (Malak Atef) & 331 (M9VGXY) ---")
res = q("""
SELECT id, action, details, created_at
FROM audit_logs
WHERE details::text ILIKE '%331%' OR details::text ILIKE '%M9VGXY%' OR details::text ILIKE '%316%'
ORDER BY id DESC
LIMIT 10;
""")
print(res if res.strip() else "NO AUDIT LOGS FOUND")

c.close()
