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

print("=== 28 APPROVED ACTIVE OFFLINE STUDENTS WITHOUT A CENTER ===")
out = run_query("""
SELECT id, name, phone, COALESCE(parent_phone, '-') as parent_phone, 
       CASE 
         WHEN grade LIKE '%لغات%' THEN 'لغات'
         WHEN grade LIKE '%عربي%' THEN 'عربي'
         ELSE 'جامعي'
       END as track
FROM students
WHERE learning_mode = 'offline' AND (center_name IS NULL OR TRIM(center_name) = '') AND status = 'approved'
ORDER BY id ASC;
""")
print(out)

print("=== 22 SUSPENDED OFFLINE STUDENTS WITHOUT A CENTER ===")
out2 = run_query("""
SELECT id, name, phone, COALESCE(parent_phone, '-') as parent_phone,
       CASE 
         WHEN grade LIKE '%لغات%' THEN 'لغات'
         WHEN grade LIKE '%عربي%' THEN 'عربي'
         ELSE 'جامعي'
       END as track
FROM students
WHERE learning_mode = 'offline' AND (center_name IS NULL OR TRIM(center_name) = '') AND status = 'suspended'
ORDER BY id ASC;
""")
print(out2)

ssh.close()
