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

# 1. جلب أسئلة اختبار 44
raw = q("SELECT questions::text FROM quizzes WHERE id = 44;")
questions = json.loads(raw.strip())

print(f"قبل التعديل - سؤال #22: {questions[21]}")

# 2. تصحيح السؤال بالبيانات الكاملة من بنك الأسئلة ID 579
questions[21] = {
    "points": 1,
    "prompt": "حاسب إلكتروني ضخم يُستخدم للأغراض العلمية والعسكرية. إلى أي مرحلة تكنولوجية ينتمي هذا الوصف؟",
    "options": [
        "الحوسبة السحابية",
        "الحواسيب الإلكترونية المبكرة",
        "الهواتف الذكية والإنترنت",
        "الحوسبة الكمية"
    ],
    "correctIndex": 1,
    "correctAnswer": "الحواسيب الإلكترونية المبكرة",
    "explanation": "كانت الحواسيب الإلكترونية المبكرة كبيرة الحجم ومكلفة وتُستخدم أساسًا في الأغراض العسكرية والعلمية."
}

updated_json = json.dumps(questions, ensure_ascii=False).replace("'", "''")

update_sql = f"""
UPDATE quizzes
SET questions = '{updated_json}'::jsonb,
    updated_at = NOW()
WHERE id = 44;
"""

res = q(update_sql)
print("نتيجة التحديث:", res)

# 3. التحقق بعد التحديث
verify_raw = q("SELECT questions->21::text FROM quizzes WHERE id = 44;")
print("بعد التعديل في قاعدة البيانات:", verify_raw.strip())
