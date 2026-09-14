import paramiko
import json
import urllib.request
import urllib.parse
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Select questions matching the user's exact schedule
stage = "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي"
unit = "منهج البكالوريا : دروس البكالوريا تانية عام (عربى)"
lesson = "شامل الوحدة"

escaped_stage = stage.replace("'", "''")
escaped_unit = unit.replace("'", "''")
escaped_lesson = lesson.replace("'", "''")

query = f"""
SELECT row_to_json(t) FROM (
  SELECT q.id, q.stage, q.unit, q.lesson, q.difficulty, q.question
  FROM question_bank q
  WHERE q.stage LIKE '%الصف الثاني%' AND q.unit LIKE '%دروس البكالوريا%'
  ORDER BY RANDOM()
  LIMIT 5
) t;
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/query.sql", "wb") as f:
    f.write(query.encode("utf-8"))
sftp.close()

cmd = 'PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -f /tmp/query.sql'
stdin, stdout, stderr = ssh.exec_command(cmd)
raw_output = stdout.read().decode("utf-8").strip()

lines = [line.strip() for line in raw_output.split("\n") if line.strip()]
print(f"Fetched {len(lines)} questions for lesson '{lesson}'.")

questions = []
for line in lines:
    try:
        questions.append(json.loads(line))
    except Exception as e:
        print("Parse error:", e)

if not questions:
    print("No questions found!")
    ssh.close()
    sys.exit(0)

# Insert draft quiz record into quizzes table
quiz_title = f"اختبار يومي: تانية بكالوريا عربي ({lesson[:30]})"
escaped_quiz_title = quiz_title.replace("'", "''")
questions_json = json.dumps(questions, ensure_ascii=False).replace("'", "''")

insert_sql = f"""
INSERT INTO quizzes (title, description, duration_minutes, passing_score, is_published, questions, created_at, updated_at)
VALUES ('{escaped_quiz_title}', 'اختبار مجدول تلقائياً للمراجعة والاعتماد', 15, 60, false, '{questions_json}'::jsonb, NOW(), NOW())
RETURNING id;
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/insert_quiz.sql", "wb") as f:
    f.write(insert_sql.encode("utf-8"))
sftp.close()

cmd_insert = 'PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -f /tmp/insert_quiz.sql'
stdin, stdout, stderr = ssh.exec_command(cmd_insert)
quiz_id = stdout.read().decode("utf-8").strip()
print(f"Created draft quiz ID in database: {quiz_id}")
ssh.close()

# Send Telegram Message
token = "8821235319:AAFdp8sjIFo9G75AmDf9UXLcbVQxYjS2lac"
chat_id = "744591440"
approval_url = f"https://drelmahdy.online/api/admin/learning/quizzes/{quiz_id}/quick-approve"

msg_lines = [
    "🎯 <b>نموذج اختبار مجدول لمرحلة ودرس محدد</b>",
    "",
    "📋 <b>الجدول:</b> New Exam",
    f"🎓 <b>المرحلة:</b> {stage}",
    f"📚 <b>الوحدة:</b> {unit}",
    f"📖 <b>الدرس:</b> {lesson}",
    f"🔢 <b>عدد الأسئلة:</b> {len(questions)} أسئلة",
    "⏱️ <b>المدة المقترحة:</b> 15 دقيقة | <b>درجة النجاح:</b> 60%",
    "🔒 <b>الحالة الحالية:</b> مسودة (غير منشورة للطلاب حتى توافق)",
    "",
    "📝 <b>عينة من أسئلة الاختبار:</b>"
]

for idx, q in enumerate(questions, 1):
    q_data = q.get("question") or {}
    q_text = str(q_data.get("prompt", "")).strip().replace("<", "&lt;").replace(">", "&gt;")
    if len(q_text) > 85:
        q_text = q_text[:85] + "..."
    diff = q.get("difficulty", "medium")
    diff_badge = "🟢 سهل" if diff == "easy" else ("🔴 صعب" if diff == "hard" else "🟡 متوسط")
    
    opts = q_data.get("options") or []
    c_idx = q_data.get("correctIndex", 0)
    ans = opts[c_idx] if (isinstance(opts, list) and 0 <= c_idx < len(opts)) else ""
    ans = str(ans).replace("<", "&lt;").replace(">", "&gt;")
    
    msg_lines.append(f"{idx}. {q_text} ({diff_badge})")
    if ans:
        msg_lines.append(f"   <i>الإجابة الصحيحة:</i> <b>{ans}</b>")

msg_lines.extend([
    "",
    "👇 <b>يمكنك اعتماد الاختبار ونشره للطلاب مباشرة بنقرة واحدة:</b>"
])

full_text = "\n".join(msg_lines)

payload = {
    "chat_id": chat_id,
    "text": full_text,
    "parse_mode": "HTML",
    "reply_markup": {
        "inline_keyboard": [
            [
                {"text": "🚀 اعتماد ونشر الاختبار للطلاب فوراً", "url": approval_url}
            ],
            [
                {"text": "🔍 فتح لوحة التحكم ومراجعة الأسئلة", "url": "https://drelmahdy.online/admin/learning"}
            ]
        ]
    }
}

req_data = json.dumps(payload).encode("utf-8")
url = f"https://api.telegram.org/bot{token}/sendMessage"
req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("Telegram API Response:", res.get("ok"))
        if res.get("ok"):
            print("Successfully sent message to Dr. Mahmoud's Telegram bot!")
except Exception as e:
    print("Failed to send Telegram message:", e)
