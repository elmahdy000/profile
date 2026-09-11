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

print("=== LEARNING MODE VS CENTER_NAME ===")
print(run_query("""
SELECT 
    COALESCE(learning_mode, 'NULL') as mode,
    CASE WHEN center_name IS NOT NULL AND TRIM(center_name) != '' THEN 'With Center' ELSE 'No Center' END as center_status,
    count(*)
FROM students
GROUP BY 1, 2
ORDER BY 1, 2;
"""))

print("=== STUDENTS WITH NO CENTER BY LEARNING_MODE AND GRADE ===")
print(run_query("""
SELECT 
    COALESCE(learning_mode, 'NULL') as mode,
    status,
    count(*)
FROM students
WHERE center_name IS NULL OR TRIM(center_name) = ''
GROUP BY 1, 2;
"""))

ssh.close()
