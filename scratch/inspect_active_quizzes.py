import json, sys

sys.stdout.reconfigure(encoding='utf-8')
with open('scratch/run_full_audit.py', 'r') as f:
    pass

# Let's inspect all questions in Quiz 37, 40, 41
import paramiko, base64

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, title, questions FROM quizzes WHERE id IN (37, 40, 41);"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
lines = stdout.read().decode('utf-8').strip().split('\n')
for l in lines:
    parts = l.split('|', 2)
    qid, title = parts[0], parts[1]
    qs = json.loads(parts[2])
    print(f"\n================ QUIZ {qid}: {title} ({len(qs)} questions) ================")
    for idx, q in enumerate(qs):
        ci = q.get('correctIndex')
        opts = q.get('options', [])
        ans = opts[ci] if ci is not None and ci < len(opts) else 'INVALID'
        expl = q.get('explanation', '')
        print(f"{idx+1}. {q.get('prompt')}")
        print(f"   Correct [{ci}]: {ans}")
        if expl:
            print(f"   Expl: {expl}")

c.close()
