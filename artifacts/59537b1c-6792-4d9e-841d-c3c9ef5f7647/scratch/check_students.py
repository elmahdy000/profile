import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -c "SELECT id, name, phone, access_code, grade, status, payment_status, created_at FROM students ORDER BY id DESC LIMIT 10;" """
stdin, stdout, stderr = client.exec_command(cmd)
print("RECENT STUDENTS:")
print(stdout.read().decode('utf-8', 'replace'))
client.close()
