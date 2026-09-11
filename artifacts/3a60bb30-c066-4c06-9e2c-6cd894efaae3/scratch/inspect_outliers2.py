import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=40)

def run_query(sql):
    escaped_sql = sql.replace('"', '\\"')
    cmd = f'sudo -u postgres psql -d profile -c "{escaped_sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace')

print("=== CHECK ZAG 3:30 or other non-standard ===")
out = run_query("""
SELECT id, name, phone, parent_phone, center_name, appointment_slot, grade, status, created_at
FROM students
WHERE center_name LIKE '%زاج%' AND appointment_slot LIKE '%3:30%';
""")
print(out)

print("=== CHECK ALL SLOTS IN STUDENTS ===")
out2 = run_query("""
SELECT center_name, appointment_slot, count(*)
FROM students
WHERE center_name IS NOT NULL
GROUP BY center_name, appointment_slot
ORDER BY center_name, count(*) DESC;
""")
print(out2)

ssh.close()
