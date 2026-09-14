import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT details::text FROM quiz_attempts WHERE id = 1325;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
details = json.loads(raw)
print(f"Details count: {len(details)}")
print(json.dumps(details, ensure_ascii=False, indent=2))

c.close()
