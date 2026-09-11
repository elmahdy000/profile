import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=40)

def run_query(sql):
    escaped_sql = sql.replace('"', '\\"')
    stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d profile -c "{escaped_sql}"')
    return stdout.read().decode('utf-8', errors='replace')

print("=== STATS OF ALL UNASSIGNED STUDENTS ===")
out = run_query("""
SELECT 
    COALESCE(learning_mode, 'غير محدد') as mode,
    status,
    COUNT(*) as count
FROM students
WHERE center_name IS NULL OR TRIM(center_name) = ''
GROUP BY 1, 2
ORDER BY 1, 2;
""")
print(out)

print("=== OFFLINE STUDENTS BREAKDOWN BY GRADE ===")
out2 = run_query("""
SELECT 
    COALESCE(grade, 'غير محدد') as grade,
    status,
    COUNT(*) as count
FROM students
WHERE learning_mode = 'offline' AND (center_name IS NULL OR TRIM(center_name) = '')
GROUP BY 1, 2
ORDER BY count DESC;
""")
print(out2)

print("=== ALL 50 OFFLINE STUDENTS DETAILS (ID, Name, Phone, Parent, Grade, Status) ===")
out3 = run_query("""
SELECT id, name, phone, parent_phone, grade, status
FROM students
WHERE learning_mode = 'offline' AND (center_name IS NULL OR TRIM(center_name) = '')
ORDER BY status ASC, id ASC;
""")
print(out3)

ssh.close()
