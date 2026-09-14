import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, title, questions FROM quizzes WHERE id = 39;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
line = stdout.read().decode('utf-8').strip()
parts = line.split('|', 2)
qid, qtitle, qjson = parts[0], parts[1], parts[2]
questions = json.loads(qjson)
print(f"Quiz {qid}: {qtitle} has {len(questions)} questions")
for idx, q in enumerate(questions):
    ci = q.get('correctIndex')
    opts = q.get('options', [])
    print(f"Q#{idx+1}: {q.get('prompt')}")
    print(f"  Options: {opts}")
    print(f"  correctIndex: {ci} -> {opts[ci] if ci is not None and ci < len(opts) else 'INVALID'}")
    print(f"  Expl: {q.get('explanation')}")
    print()

c.close()
