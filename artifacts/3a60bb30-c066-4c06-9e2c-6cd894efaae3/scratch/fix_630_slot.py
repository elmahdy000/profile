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
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if err and "NOTICE" not in err:
        print("ERR:", err)
    return out

print("=== UPDATING STUDENT 66 AND 29 TO OFFICIAL SLOTS ===")

# 1. Update Student 66 in Rafal from 6:30 to 3:00 PM
print(run_query("""
UPDATE students 
SET appointment_slot = 'سبت - اتنين - أربع (3:00 عصراً)' 
WHERE id = 66 AND appointment_slot LIKE '%6:30%';
"""))

# 2. Update Student 29 in Zag from 3:30 to 5:00 PM
print(run_query("""
UPDATE students 
SET appointment_slot = 'سبت - اتنين - أربع (5:00 مساءً)' 
WHERE id = 29 AND appointment_slot LIKE '%3:30%';
"""))

# 3. If any attendance records exist with 6:30, update them
print(run_query("""
UPDATE student_attendance
SET appointment_slot = 'سبت - اتنين - أربع (3:00 عصراً)'
WHERE appointment_slot LIKE '%6:30%';
"""))

print("=== VERIFYING ALL DISTINCT SLOTS ACROSS OFFLINE STUDENTS ===")
out = run_query("""
SELECT center_name, appointment_slot, count(*)
FROM students
WHERE center_name IS NOT NULL
GROUP BY center_name, appointment_slot
ORDER BY center_name, appointment_slot;
""")
print(out)

ssh.close()
