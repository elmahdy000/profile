import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT questions FROM quizzes WHERE id = 39;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8').strip()
questions = json.loads(raw)
for idx, q in enumerate(questions):
    print(f"Item #{idx+1}: {list(q.keys())}")
    print(json.dumps(q, ensure_ascii=False, indent=2))

c.close()
