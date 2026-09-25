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
    'question', question
)::text
FROM question_bank
WHERE id BETWEEN 520 AND 604
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
rows = [json.loads(l) for l in lines if l.strip()]

with open("batch_520_604_full.txt", "w", encoding="utf-8") as f:
    for r in rows:
        qid = r['id']
        qst = r['question']
        c_idx = qst.get('correctIndex', 0)
        opts = qst.get('options', [])
        cur = opts[c_idx] if 0 <= c_idx < len(opts) else "INVALID"
        f.write(f"ID {qid}: {qst.get('prompt')}\n")
        f.write(f"   Options: {opts}\n")
        f.write(f"   CorrectIndex={c_idx} -> '{cur}'\n")
        f.write(f"   Explanation: {qst.get('explanation')}\n")
        f.write("=" * 60 + "\n")

print(f"Dumped {len(rows)} questions to batch_520_604_full.txt")
c.close()
