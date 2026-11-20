import os
import paramiko

host = os.environ.get("REMOTE_HOST", "72.62.27.196")
password = os.environ.get("REMOTE_SSH_PASSWORD", "")
pg_password = os.environ.get("PGPASSWORD", "")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username='root', password=password)

def run_query(sql):
    cmd = f'PGPASSWORD={pg_password} psql -h localhost -U postgres -d profile -c "{sql}"'
    _, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', errors='replace')

print("=== AUDIT LOGS FOR QUIZZES ===")
print(run_query("""
SELECT id, action, entity_type, entity_id, details, created_at 
FROM audit_logs 
WHERE entity_type = 'quiz' OR action ILIKE '%quiz%' 
ORDER BY id DESC 
LIMIT 5;
"""))

c.close()
