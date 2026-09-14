import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT questions FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
questions = json.loads(raw.strip())
print(f"Quiz 37 has {len(questions)} questions:")
for idx, q in enumerate(questions):
    ci = q.get('correctIndex')
    opts = q.get('options', [])
    ans = opts[ci] if ci is not None and ci < len(opts) else 'INVALID'
    print(f"{idx+1}. {q.get('prompt')} | Ans [{ci}]: {ans}")

c.close()
