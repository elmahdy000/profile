import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

script = """
UPDATE learning_files SET category = 'C++ Programming' WHERE id IN (1, 2);
"""

sftp = c.open_sftp()
with sftp.file('/tmp/fix_categories.sql', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = c.exec_command('psql "postgresql://postgres:pass1234@localhost/profile" -f /tmp/fix_categories.sql')
print("=== CATEGORIES FIX OUTPUT ===")
print(stdout.read().decode('utf-8'))

c.close()
