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

print("=== STUDENT_NOTIFICATIONS COLUMNS ===")
print(run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_notifications';"))

print("=== ALL STUDENTS COLUMNS ===")
print(run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position;"))

print("=== SAMPLE RECENT STUDENT_NOTIFICATIONS ===")
print(run_query("SELECT * FROM student_notifications ORDER BY id DESC LIMIT 5;"))

ssh.close()
