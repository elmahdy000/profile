import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Note: /api/admin/learning/essay-exams/:id/submissions requires admin authentication or returns 401 if unauthenticated (not 404!)
stdin, stdout, stderr = c.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/admin/learning/essay-exams/1/submissions')
http_code = stdout.read().decode('utf-8').strip()
print(f"HTTP Status code for /api/admin/learning/essay-exams/1/submissions: {http_code}")
