# -*- coding: utf-8 -*-
import json, subprocess, tempfile

with open('/tmp/repairs_data.json', 'r', encoding='utf-8') as f:
    repairs = json.load(f)

# 1. Update question_bank
sql_lines = ["BEGIN;"]
for qid_str, qdata in repairs.items():
    qid = int(qid_str)
    escaped_json = json.dumps(qdata, ensure_ascii=False).replace("'", "''")
    sql_lines.append(f"UPDATE question_bank SET question = '{escaped_json}'::jsonb WHERE id = {qid};")

sql_lines.append("COMMIT;")

sql_file = '/tmp/bank_repairs.sql'
with open(sql_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

cmd = f"su - postgres -c \"psql -d profile -f {sql_file}\""
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Question bank repair output:", res.stdout)
if res.stderr:
    print("Question bank repair error:", res.stderr)

# 2. Update quizzes
cmd_get_quizzes = "su - postgres -c \"psql -d profile -t -A -c \\\"SELECT id, questions FROM quizzes;\\\"\" "
res_q = subprocess.run(cmd_get_quizzes, shell=True, capture_output=True, text=True)

quiz_lines = ["BEGIN;"]
updated_count = 0

for line in res_q.stdout.strip().split('\n'):
    if not line.strip(): continue
    parts = line.split('|', 1)
    if len(parts) < 2: continue
    quiz_id = parts[0]
    try:
        questions = json.loads(parts[1])
    except:
        continue
    
    modified = False
    new_questions = []
    for q in questions:
        p = (q.get('prompt') or '').strip()
        matched = False
        for qid_str, rep in repairs.items():
            rep_p = rep['prompt']
            # Match
            if (len(p) >= 8 and (rep_p.startswith(p[:12]) or p.startswith(rep_p[:12]))) or (len(p) >= 6 and p in rep_p):
                new_q = dict(q)
                new_q['prompt'] = rep['prompt']
                new_q['options'] = rep['options']
                new_q['correctIndex'] = rep['correctIndex']
                if 'explanation' in rep:
                    new_q['explanation'] = rep['explanation']
                new_questions.append(new_q)
                matched = True
                modified = True
                break
        if not matched:
            new_questions.append(q)

    if modified:
        escaped_q = json.dumps(new_questions, ensure_ascii=False).replace("'", "''")
        quiz_lines.append(f"UPDATE quizzes SET questions = '{escaped_q}'::jsonb WHERE id = {quiz_id};")
        updated_count += 1
        print(f"Propagating repair to Quiz {quiz_id}")

quiz_lines.append("COMMIT;")
with open('/tmp/quizzes_repairs.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(quiz_lines))

cmd_apply_quizzes = f"su - postgres -c \"psql -d profile -f /tmp/quizzes_repairs.sql\""
res_apply = subprocess.run(cmd_apply_quizzes, shell=True, capture_output=True, text=True)
print("Quizzes repair output:", res_apply.stdout)
print(f"Updated {updated_count} quizzes.")
