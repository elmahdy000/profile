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
    'title', title,
    'questions', questions
)::text
FROM quizzes;
""")

lines = out.strip().split("\n")
quizzes = [json.loads(l) for l in lines if l.strip()]
print(f"Total quizzes: {len(quizzes)}")

mismatches = []
for qz in quizzes:
    qid = qz['id']
    title = qz.get('title')
    questions = qz.get('questions', [])
    for idx, q_item in enumerate(questions):
        prompt = q_item.get('prompt', '')
        opts = q_item.get('options', [])
        c_idx = q_item.get('correctIndex', 0)
        expl = q_item.get('explanation', '')
        if not expl or not opts or len(opts) < 2: continue

        cur_opt = opts[c_idx] if 0 <= c_idx < len(opts) else ""
        cur_overlap = sum(1 for w in cur_opt.split() if len(w) > 2 and w in expl)

        for i, o in enumerate(opts):
            if i == c_idx: continue
            o_words = [w for w in o.split() if len(w) > 2]
            overlap = sum(1 for w in o_words if w in expl)
            if overlap >= 2 and overlap > cur_overlap and cur_overlap == 0:
                # Exclude negative questions
                if not any(neg in prompt for neg in ['غير', 'ليس', 'ليست', 'لا ي', 'لا ت', 'لا م', 'خطأ']):
                    mismatches.append({
                        'quiz_id': qid,
                        'quiz_title': title,
                        'q_idx': idx,
                        'prompt': prompt,
                        'options': opts,
                        'current': (c_idx, cur_opt),
                        'better': (i, o, overlap, len(o_words)),
                        'explanation': expl
                    })

print(f"Total quiz mismatches flagged: {len(mismatches)}")
for m in mismatches:
    print(f"\nQuiz #{m['quiz_id']} ({m['quiz_title']}) - Q[{m['q_idx']+1}]: {m['prompt']}")
    print(f"  Current: [{m['current'][0]}] {m['current'][1]}")
    print(f"  Better: [{m['better'][0]}] {m['better'][1]}")
    print(f"  Explanation: {m['explanation']}")

c.close()
