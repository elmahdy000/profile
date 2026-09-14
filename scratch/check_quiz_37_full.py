import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT questions FROM quizzes WHERE id = 37;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
qs = json.loads(stdout.read().decode('utf-8').strip())
print(f"Quiz 37 has {len(qs)} questions:")
for idx, q in enumerate(qs):
    ci = q.get('correctIndex')
    opts = q.get('options', [])
    corr_text = opts[ci] if ci is not None and ci < len(opts) else 'INVALID'
    print(f"\n{idx+1}. {q.get('prompt')}")
    print(f"   Correct [{ci}]: {corr_text}")
    print(f"   Expl: {q.get('explanation')}")

c.close()
