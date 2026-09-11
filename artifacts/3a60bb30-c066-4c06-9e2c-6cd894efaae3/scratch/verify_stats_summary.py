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

print("=== STATS SUMMARY ===")
print("TOTAL STUDENTS:", run_query("SELECT count(*) FROM students;").strip())
print("WITH CENTER:", run_query("SELECT count(*) FROM students WHERE center_name IS NOT NULL AND TRIM(center_name) != '';").strip())
print("WITHOUT CENTER:", run_query("SELECT count(*) FROM students WHERE center_name IS NULL OR TRIM(center_name) = '';").strip())

print("\nWITHOUT CENTER BY LEARNING MODE:")
print(run_query("""
SELECT 
  COALESCE(learning_mode, 'غير محدد') as mode,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended
FROM students 
WHERE center_name IS NULL OR TRIM(center_name) = ''
GROUP BY 1;
"""))

print("\nOFFLINE STUDENTS WITHOUT CENTER BY GRADE:")
print(run_query("""
SELECT 
  COALESCE(grade, 'غير محدد') as grade,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended
FROM students 
WHERE learning_mode = 'offline' AND (center_name IS NULL OR TRIM(center_name) = '')
GROUP BY 1
ORDER BY total DESC;
"""))

ssh.close()
