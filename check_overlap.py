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
questions = []
for l in lines:
    if l.strip():
        questions.append(json.loads(l))

print(f"Fetched {len(questions)} questions.")

mismatches = []
for item in questions:
    qid = item['id']
    qst = item['question']
    c_idx = qst.get('correctIndex', 0)
    opts = qst.get('options', [])
    expl = qst.get('explanation', '')
    prompt = qst.get('prompt', '')

    cur_opt = opts[c_idx] if 0 <= c_idx < len(opts) else ""

    # Check words of each option in explanation
    best_match = None
    best_score = 0
    scores = []
    
    # Simple word overlap check
    expl_words = set(expl.replace('،', ' ').replace('.', ' ').split())
    for idx, opt in enumerate(opts):
        opt_words = [w for w in opt.replace('،', ' ').replace('.', ' ').split() if len(w) > 2]
        matches = [w for w in opt_words if w in expl or any(w in ew for ew in expl_words)]
        score = len(matches) / max(1, len(opt_words))
        scores.append((idx, opt, score, matches))

    # sort by score
    scores.sort(key=lambda x: x[2], reverse=True)
    
    # If the current option has 0 score but another has high score, or if another option is literally substring of explanation
    opt_in_expl = [idx for idx, opt in enumerate(opts) if len(opt) > 3 and opt in expl]
    
    print(f"Q#{qid}: cIdx={c_idx} ('{cur_opt}')")
    if opt_in_expl and c_idx not in opt_in_expl:
        print(f"  *** POTENTIAL MISMATCH! Options in explanation: {[(i, opts[i]) for i in opt_in_expl]}")
        print(f"      Explanation: {expl}")
        mismatches.append(qid)

print(f"\nTotal potential mismatches by exact substring: {len(mismatches)}")
print("IDs:", mismatches)

c.close()
