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
    'title', title,
    'questions', questions
)::text
FROM quizzes
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
quizzes = [json.loads(l) for l in lines if l.strip()]

target_prompts = [
    "أي مجموعة تضم تحولات اجتماعية وردت في الدرس؟",
    "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟",
    "ما الفكرة الأساسية للمعالجة المتوازية؟"
]

found_in_quizzes = []

for qz in quizzes:
    qzid = qz['id']
    title = qz.get('title')
    questions = qz.get('questions', [])
    for idx, q_item in enumerate(questions):
        p = q_item.get('prompt', '').strip()
        for tp in target_prompts:
            if tp in p:
                found_in_quizzes.append({
                    'quiz_id': qzid,
                    'title': title,
                    'q_idx': idx,
                    'prompt': p,
                    'c_idx': q_item.get('correctIndex'),
                    'chosen': q_item.get('options', [])[q_item.get('correctIndex', 0)] if q_item.get('options') else '',
                    'explanation': q_item.get('explanation')
                })

print(f"Found {len(found_in_quizzes)} occurrences of problematic questions in quizzes:")
for f in found_in_quizzes:
    print(f"\nQuiz #{f['quiz_id']} ({f['title']}) - Q[{f['q_idx']+1}]")
    print(f"  Prompt: {f['prompt']}")
    print(f"  Current correctIndex: {f['c_idx']} -> {f['chosen']}")
    print(f"  Explanation: {f['explanation']}")

c.close()
