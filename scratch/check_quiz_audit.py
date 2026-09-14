import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, action, entity_type, entity_id, details, created_at FROM audit_logs WHERE action LIKE '%QUIZ%' OR details LIKE '%اختبار%' ORDER BY id DESC LIMIT 30;" """
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode('utf-8'))

c.close()
