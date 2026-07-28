import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

script = """
SELECT id, title, category, stage, stages, course_id, target_type FROM learning_files;
SELECT id, title, stages, is_published FROM courses;
"""

sftp = c.open_sftp()
with sftp.file('/tmp/check_all_files.sql', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = c.exec_command('psql "postgresql://postgres:pass1234@localhost/profile" -f /tmp/check_all_files.sql')
print("=== DB AUDIT FOR FILES & COURSES ===")
print(stdout.read().decode('utf-8'))

c.close()
