import paramiko
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json

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
    'created_at', created_at,
    'question', question
)::text
FROM question_bank
WHERE id BETWEEN 588 AND 596
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
for line in lines:
    if not line.strip(): continue
    row = json.loads(line)
    qid = row['id']
    qst = row['question']
    c_idx = qst.get('correctIndex')
    opts = qst.get('options', [])
    chosen = opts[c_idx] if 0 <= c_idx < len(opts) else "OUT_OF_BOUNDS"
    print(f"ID {qid}: correctIndex={c_idx} -> '{chosen}'")
    print(f"   Prompt: {qst.get('prompt')}")
    print(f"   Options: {opts}")
    print(f"   Explanation: {qst.get('explanation')}")
    print("-" * 50)

c.close()
