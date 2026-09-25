import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def query_json(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

print("Fetching bank and quizzes data...")
out_bank = query_json("SELECT json_build_object('id', id, 'question', question)::text FROM question_bank ORDER BY id;")
bank_rows = [json.loads(l) for l in out_bank.strip().split("\n") if l.strip()]

out_quiz = query_json("SELECT json_build_object('id', id, 'questions', questions)::text FROM quizzes ORDER BY id;")
quiz_rows = [json.loads(l) for l in out_quiz.strip().split("\n") if l.strip()]

sql_statements = ["BEGIN;\n"]

# 1. Specific fixes for IDs 588, 592, 593
manual_fixes = {
    588: 0, # 'SNS والتجارة الإلكترونية والعمل عن بُعد'
    592: 2, # 'زيادة استهلاك الطاقة والحرارة'
    593: 1  # 'تنفيذ عدة عمليات أو أجزاء من العمل في الوقت نفسه'
}

updated_bank = 0
for r in bank_rows:
    qid = r['id']
    q = r['question']
    opts = q.get('options', [])
    
    if qid in manual_fixes:
        target_idx = manual_fixes[qid]
        q['correctIndex'] = target_idx
        q['correctAnswer'] = opts[target_idx].strip()
        q_str = json.dumps(q, ensure_ascii=False).replace("'", "''")
        sql_statements.append(f"UPDATE question_bank SET question = '{q_str}'::jsonb WHERE id = {qid};\n")
        updated_bank += 1
        continue
    
    c_idx = q.get('correctIndex', 0)
    ca = q.get('correctAnswer')
    if isinstance(c_idx, int) and 0 <= c_idx < len(opts):
        true_ans = opts[c_idx].strip()
        if not ca or ca.strip() != true_ans:
            q['correctAnswer'] = true_ans
            q_str = json.dumps(q, ensure_ascii=False).replace("'", "''")
            sql_statements.append(f"UPDATE question_bank SET question = '{q_str}'::jsonb WHERE id = {qid};\n")
            updated_bank += 1

updated_quizzes = 0
for r in quiz_rows:
    qzid = r['id']
    questions = r.get('questions', [])
    mod = False
    for q in questions:
        opts = q.get('options', [])
        c_idx = q.get('correctIndex', 0)
        ca = q.get('correctAnswer')
        if isinstance(c_idx, int) and 0 <= c_idx < len(opts):
            true_ans = opts[c_idx].strip()
            if not ca or ca.strip() != true_ans:
                q['correctAnswer'] = true_ans
                mod = True
    if mod:
        qs_str = json.dumps(questions, ensure_ascii=False).replace("'", "''")
        sql_statements.append(f"UPDATE quizzes SET questions = '{qs_str}'::jsonb WHERE id = {qzid};\n")
        updated_quizzes += 1

sql_statements.append("COMMIT;\n")

full_sql = "".join(sql_statements)
print(f"Total SQL statements generated: {len(sql_statements)-2}")
print(f"Bank questions to update: {updated_bank}")
print(f"Quizzes to update: {updated_quizzes}")

# Upload and execute via SFTP
sftp = c.open_sftp()
with sftp.open('/tmp/fast_fix.sql', 'w') as f:
    f.write(full_sql)
sftp.close()

print("Executing SQL transaction on server...")
stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -f /tmp/fast_fix.sql"')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("Execution output snippet:", out[-300:])
if err.strip():
    print("Execution errors:", err)

# Clean up
c.exec_command('rm -f /tmp/fast_fix.sql')
c.close()

print("✅ Finished fast batch update successfully!")
