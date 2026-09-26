import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

out = q("""
SELECT id, student_id, score, details::text
FROM quiz_attempts
WHERE quiz_id = 44;
""")

sql_updates = ["BEGIN;\n"]
affected_count = 0

for line in out.strip().split("\n"):
    if not line.strip(): continue
    parts = line.split("|")
    if len(parts) < 4: continue
    aid, sid, score_s, details_json = parts[0], parts[1], parts[2], parts[3]
    try:
        score = int(score_s)
        details = json.loads(details_json)
        target = next((d for d in details if d.get('questionIndex') == 21), None)
        if target:
            is_cor = target.get('isCorrect') or target.get('correct')
            if not is_cor:
                target['isCorrect'] = True
                target['correct'] = True
                target['points'] = 1
                new_score = min(100, score + 4)
                new_passed = new_score >= 60

                updated_details_str = json.dumps(details, ensure_ascii=False).replace("'", "''")
                sql_updates.append(f"""
UPDATE quiz_attempts
SET score = {new_score},
    passed = {str(new_passed).lower()},
    details = '{updated_details_str}'::jsonb
WHERE id = {aid};
""")
                affected_count += 1
    except Exception as e:
        pass

sql_updates.append("COMMIT;\n")

if affected_count > 0:
    print(f"جاري تصحيح {affected_count} محاولة طالب في اختبار 44...")
    full_sql = "".join(sql_updates)
    res = q(full_sql)
    print("نتيجة التنفيذ:", res.strip())
else:
    print("لا توجد محاولات تحتاج إلى تصحيح.")

# التحقق بعد التحديث
verify_out = q("""
SELECT 
    count(*) as total_attempts,
    sum(case when (d->>'isCorrect')::boolean = true or (d->>'correct')::boolean = true then 1 else 0 end) as correct_count,
    sum(case when (d->>'isCorrect')::boolean = false or (d->>'correct')::boolean = false then 1 else 0 end) as wrong_count
FROM quiz_attempts,
jsonb_array_elements(details) as d
WHERE quiz_id = 44 AND (d->>'questionIndex')::int = 21;
""")
print("الإحصائية بعد التحديث لسؤال 22 في اختبار 44 (إجمالي | صحيح | خطأ):", verify_out.strip())
