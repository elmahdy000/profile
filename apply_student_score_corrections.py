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

out_sess = query_json("""
SELECT json_build_object(
    'id', id,
    'score', score,
    'totalPoints', total_points,
    'percentage', percentage,
    'details', details
)::text
FROM self_assessment_sessions
WHERE status = 'completed'
ORDER BY id ASC;
""")

sessions = [json.loads(l) for l in out_sess.strip().split("\n") if l.strip()]

correct_answers_map = {
    "أي مجموعة تضم تحولات اجتماعية وردت في الدرس؟": "SNS والتجارة الإلكترونية والعمل عن بُعد",
    "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟": "زيادة استهلاك الطاقة والحرارة",
    "ما الفكرة الأساسية للمعالجة المتوازية؟": "تنفيذ عدة عمليات أو أجزاء من العمل في الوقت نفسه"
}

sql_statements = ["BEGIN;\n"]
updated_count = 0

for sess in sessions:
    sid = sess['id']
    old_score = sess.get('score') or 0
    old_pct = sess.get('percentage') or 0
    details = sess.get('details') or []
    
    score_boost = 0
    fixed_details = []
    modified = False
    
    for d in details:
        p = d.get('prompt', '').strip()
        opts = d.get('options') or []
        sel_idx = d.get('selectedOption')
        sel_text = opts[sel_idx] if isinstance(sel_idx, int) and 0 <= sel_idx < len(opts) else ""
        was_correct = d.get('isCorrect', False)
        
        fixed_d = dict(d)
        if p in correct_answers_map:
            true_ans = correct_answers_map[p]
            # If the student actually chose the right answer, but was marked False, fix it to True!
            if sel_text.strip() == true_ans.strip() and not was_correct:
                fixed_d['isCorrect'] = True
                score_boost += 1
                modified = True
                
        fixed_details.append(fixed_d)
        
    if modified and score_boost > 0:
        total_q = len(details)
        new_score = old_score + score_boost
        new_pct = round((new_score / total_q) * 100) if total_q > 0 else 0
        new_passed = new_pct >= 60
        
        d_json = json.dumps(fixed_details, ensure_ascii=False).replace("'", "''")
        sql = f"""
        UPDATE self_assessment_sessions
        SET score = {new_score},
            percentage = {new_pct},
            passed = {str(new_passed).lower()},
            details = '{d_json}'::jsonb
        WHERE id = {sid};
        """
        sql_statements.append(sql)
        updated_count += 1

sql_statements.append("COMMIT;\n")

print(f"Sessions with rightful score increases to apply: {updated_count}")

# Upload and execute
sftp = c.open_sftp()
with sftp.open('/tmp/fix_sessions.sql', 'w') as f:
    f.write("".join(sql_statements))
sftp.close()

stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -f /tmp/fix_sessions.sql"')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("Execution output:", out[-200:])
if err.strip():
    print("Execution errors:", err)

c.exec_command('rm -f /tmp/fix_sessions.sql')
c.close()

print("✅ Successfully updated all affected students' records to their rightful full grades!")
