import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

out = q("""
SELECT json_build_object(
    'id', id,
    'question', question
)::text
FROM question_bank
WHERE id BETWEEN 580 AND 604
ORDER BY id ASC;
""")

for line in out.strip().split("\n"):
    if not line.strip(): continue
    row = json.loads(line)
    qid = row['id']
    qst = row['question']
    c_idx = qst.get('correctIndex', 0)
    opts = qst.get('options', [])
    prompt = qst.get('prompt', '')
    expl = qst.get('explanation', '')
    chosen = opts[c_idx] if 0 <= c_idx < len(opts) else "ERR"
    print(f"ID {qid}: c_idx={c_idx} -> '{chosen}'")
    print(f"  Prompt: {prompt}")
    print(f"  Options: {opts}")
    print(f"  Explanation: {expl}")
    print("-" * 50)

c.close()
