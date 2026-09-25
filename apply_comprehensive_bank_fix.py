import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def run_psql(cmd):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile"')
    stdin.write(cmd)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

def query_json(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

print("=" * 70)
print("1. تصحيح الأسئلة المعطوبة في question_bank (ID 588, 592, 593)")
print("=" * 70)

# Fetch 588, 592, 593
out = query_json("""
SELECT json_build_object('id', id, 'question', question)::text
FROM question_bank
WHERE id IN (588, 592, 593)
ORDER BY id;
""")

fixes = {
    588: 0, # 'SNS والتجارة الإلكترونية والعمل عن بُعد'
    592: 2, # 'زيادة استهلاك الطاقة والحرارة'
    593: 1  # 'تنفيذ عدة عمليات أو أجزاء من العمل في الوقت نفسه'
}

for l in out.strip().split("\n"):
    if not l.strip(): continue
    row = json.loads(l)
    qid = row['id']
    q = row['question']
    target_idx = fixes[qid]
    q['correctIndex'] = target_idx
    q['correctAnswer'] = q['options'][target_idx].strip()
    
    # Update in DB
    q_str = json.dumps(q, ensure_ascii=False).replace("'", "''")
    update_sql = f"UPDATE question_bank SET question = '{q_str}'::jsonb WHERE id = {qid};\n"
    res, err = run_psql(update_sql)
    print(f"✅ تم تصحيح سؤال بنك الأسئلة ID {qid}: correctIndex={target_idx} -> '{q['correctAnswer']}'")

print("\n" + "=" * 70)
print("2. إضافة correctAnswer لجميع أسئلة بنك الأسئلة (1158 سؤال)")
print("=" * 70)

# Fetch all question_bank rows
out = query_json("SELECT json_build_object('id', id, 'question', question)::text FROM question_bank ORDER BY id;")
bank_rows = [json.loads(l) for l in out.strip().split("\n") if l.strip()]

updated_bank_count = 0
for r in bank_rows:
    qid = r['id']
    q = r['question']
    opts = q.get('options', [])
    c_idx = q.get('correctIndex', 0)
    ca = q.get('correctAnswer')
    
    if 0 <= c_idx < len(opts):
        true_answer = opts[c_idx].strip()
        if not ca or ca.strip() != true_answer:
            q['correctAnswer'] = true_answer
            q_str = json.dumps(q, ensure_ascii=False).replace("'", "''")
            update_sql = f"UPDATE question_bank SET question = '{q_str}'::jsonb WHERE id = {qid};\n"
            run_psql(update_sql)
            updated_bank_count += 1

print(f"✅ تم تحديث correctAnswer لـ {updated_bank_count} سؤال في question_bank بنجاح.")

print("\n" + "=" * 70)
print("3. إضافة correctAnswer لجميع أسئلة الاختبارات في quizzes (46 اختبار)")
print("=" * 70)

out = query_json("SELECT json_build_object('id', id, 'questions', questions)::text FROM quizzes ORDER BY id;")
quiz_rows = [json.loads(l) for l in out.strip().split("\n") if l.strip()]

updated_quizzes_count = 0
total_quiz_questions_updated = 0

for r in quiz_rows:
    qzid = r['id']
    questions = r.get('questions', [])
    modified = False
    
    for q in questions:
        opts = q.get('options', [])
        c_idx = q.get('correctIndex', 0)
        ca = q.get('correctAnswer')
        if isinstance(c_idx, int) and 0 <= c_idx < len(opts):
            true_answer = opts[c_idx].strip()
            if not ca or ca.strip() != true_answer:
                q['correctAnswer'] = true_answer
                modified = True
                total_quiz_questions_updated += 1
    
    if modified:
        qs_str = json.dumps(questions, ensure_ascii=False).replace("'", "''")
        update_sql = f"UPDATE quizzes SET questions = '{qs_str}'::jsonb WHERE id = {qzid};\n"
        run_psql(update_sql)
        updated_quizzes_count += 1

print(f"✅ تم تحديث {updated_quizzes_count} اختبار بإجمالي {total_quiz_questions_updated} سؤال في جدول quizzes بنجاح.")

c.close()
print("\n🎉 تم إنهاء المراجعة والتصحيح الشامل بالكامل!")
