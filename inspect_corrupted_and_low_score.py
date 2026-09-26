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
    err = stderr.read().decode('utf-8', errors='replace')
    if err.strip():
        print("SQL Error:", err.strip())
    return out

# 1. تفاصيل سؤال 22 في اختبار 44
print("--- فحص اختبار 44 بالكامل ---")
out44 = q("SELECT questions::text FROM quizzes WHERE id = 44;")
q44_data = json.loads(out44.strip())
print(f"عدد أسئلة اختبار 44: {len(q44_data)}")
for i, qst in enumerate(q44_data):
    prompt = qst.get('prompt', '')
    opts = qst.get('options', [])
    if i == 21 or len(set(opts)) < len(opts) or any(len(o) <= 2 for o in opts) or len(prompt) < 15:
        print(f"\nسؤال #{i+1}:")
        print(f"  نص: {prompt}")
        print(f"  خيارات: {opts}")
        print(f"  الإجابة المحددة: ({qst.get('correctIndex')}) {opts[qst.get('correctIndex', 0)] if opts else ''}")
        print(f"  الشرح: {qst.get('explanation')}")

# 2. فحص جميع الأسئلة في المنصة التي تحتوي على نصوص مقطوعة أو خيارات قصيرة جداً (أقل من حرفين)
print("\n--- فحص جميع أسئلة المنصة بحثاً عن أسئلة مقطوعة أو خيارات مشوهة ---")
all_quizzes_raw = q("SELECT id, title, questions::text FROM quizzes;")
corrupted_questions = []

for line in all_quizzes_raw.strip().split("\n"):
    if not line.strip(): continue
    parts = line.split("|", 2)
    if len(parts) < 3: continue
    qid, title, q_json = parts
    try:
        questions = json.loads(q_json)
        for idx, qst in enumerate(questions):
            prompt = qst.get('prompt', '')
            opts = qst.get('options', [])
            c_idx = qst.get('correctIndex')

            # خيارات قصيرة جداً ومكررة
            if len(opts) > 0 and all(len(o.strip()) <= 3 for o in opts):
                corrupted_questions.append((qid, title, idx + 1, "خيارات قصيرة جداً", prompt, opts, qst.get('explanation')))
            # نص سؤال ينتهي فجأة مثل "إلى أي" أو "ما هو"
            elif any(prompt.strip().endswith(w) for w in ['إلى أي', 'إلى أية', 'من هو', 'ما هي', 'ما هو', 'أين ي']):
                corrupted_questions.append((qid, title, idx + 1, "نص سؤال يبدو مقطوعاً في النهاية", prompt, opts, qst.get('explanation')))
            # خيارات تحتوي على خيار فارغ
            elif any(not o.strip() for o in opts):
                corrupted_questions.append((qid, title, idx + 1, "خيار فارغ تماماً", prompt, opts, qst.get('explanation')))
    except Exception as e:
        print(f"Error parsing quiz {qid}: {e}")

print(f"إجمالي الأسئلة المشبوهة/المشوهة: {len(corrupted_questions)}")
for cq in corrupted_questions:
    print(f"\n🔴 اختبار {cq[0]} ({cq[1]}) - سؤال #{cq[2]}: [{cq[3]}]")
    print(f"   السؤال: {cq[4]}")
    print(f"   الخيارات: {cq[5]}")
    print(f"   الشرح: {cq[6]}")

# 3. فحص إحصائيات محاولات الطلاب في الأسئلة (باستخدام quiz_id الصحيح)
print("\n--- فحص محاولات الطلاب (نسب النجاح الصفرية والمنخفضة جداً) ---")
attempts_raw = q("""
SELECT 
    quiz_id,
    d->>'questionIndex' as q_idx,
    count(*) as total_answers,
    sum(case when (d->>'isCorrect')::boolean = true or (d->>'correct')::boolean = true then 1 else 0 end) as correct_answers
FROM quiz_attempts,
jsonb_array_elements(details) as d
WHERE details IS NOT NULL
GROUP BY quiz_id, d->>'questionIndex'
HAVING count(*) >= 10
ORDER BY quiz_id, (d->>'questionIndex')::int;
""")

low_success = []
for line in attempts_raw.strip().split("\n"):
    if not line.strip(): continue
    parts = line.split("|")
    if len(parts) < 4: continue
    qid_s, q_idx_s, tot_s, cor_s = parts
    try:
        qid = int(qid_s)
        q_idx = int(q_idx_s)
        total = int(tot_s)
        correct = int(cor_s)
        rate = (correct / total) * 100
        if rate <= 10.0: # نسبة نجاح 10% أو أقل مع 10 طلاب فأكثر!
            low_success.append((qid, q_idx, total, correct, rate))
    except Exception as e:
        pass

print(f"الأسئلة التي نسبة النجاح فيها <= 10% (مع 10 طلاب فأكثر): {len(low_success)}")
for ls in low_success:
    # جلب تفاصيل السؤال
    q_detail = q(f"SELECT questions->{ls[1]}::text FROM quizzes WHERE id = {ls[0]};")
    if q_detail.strip():
        q_obj = json.loads(q_detail.strip())
        print(f"\n⚠️ اختبار {ls[0]} - سؤال #{ls[1]+1} (نسبة النجاح {ls[4]:.1f}% فقط! من أصل {ls[2]} طالب):")
        print(f"   السؤال: {q_obj.get('prompt')}")
        print(f"   الخيارات: {q_obj.get('options')}")
        c_i = q_obj.get('correctIndex', 0)
        print(f"   الإجابة المحددة حالياً: ({c_i}) {q_obj.get('options', [])[c_i] if q_obj.get('options') else ''}")
        print(f"   الشرح: {q_obj.get('explanation')}")

