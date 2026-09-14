import paramiko
import json
import urllib.request
import urllib.parse

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Query questions via psql outputting clean JSON lines
query = "SELECT row_to_json(t) FROM (SELECT q.id, q.stage, q.unit, q.lesson, q.difficulty, q.question FROM question_bank q ORDER BY RANDOM() LIMIT 5) t;"
cmd = f'PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -c "{query}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
raw_output = stdout.read().decode("utf-8").strip()
ssh.close()

lines = [line.strip() for line in raw_output.split("\n") if line.strip()]
print(f"Fetched {len(lines)} questions from bank.")

questions = []
for line in lines:
    try:
        questions.append(json.loads(line))
    except Exception as e:
        print("Parse error:", e)

if not questions:
    print("No questions found!")
    exit(0)

# Format Telegram message
token = "8821235319:AAFdp8sjIFo9G75AmDf9UXLcbVQxYjS2lac"
chat_id = "744591440"

first_q = questions[0]
stage_name = first_q.get("stage") or "الثانوية العامة"
unit_name = first_q.get("unit") or "الوحدة الأولى"
lesson_name = first_q.get("lesson") or "شامل"

msg_lines = [
    "📝 <b>نموذج اختبار تجريبي جديد للمراجعة والاعتماد</b>",
    "━━━━━━━━━━━━━━━━━━",
    f"📚 <b>المرحلة:</b> {stage_name}",
    f"📖 <b>الوحدة / الدرس:</b> {unit_name} · {lesson_name}",
    "⏱ <b>المدة:</b> 15 دقيقة · <b>الأسئلة:</b> 5 أسئلة",
    "🎯 <b>درجة النجاح:</b> 60%",
    "🔒 <b>الحالة:</b> مسودة خاصة (مخفية عن الطلاب لحين اعتمادك)",
    "━━━━━━━━━━━━━━━━━━\n"
]

opt_labels = ["أ", "ب", "ج", "د", "هـ"]
for idx, item in enumerate(questions, 1):
    q_data = item.get("question") or {}
    prompt = q_data.get("prompt", "").strip()
    options = q_data.get("options", [])
    corr_idx = q_data.get("correctIndex", 0)
    diff = item.get("difficulty") or "medium"
    diff_tag = "🟢 سهل" if diff == "easy" else ("🔴 صعب" if diff == "hard" else "🟡 متوسط")
    
    msg_lines.append(f"<b>س{idx}: {prompt}</b> ({diff_tag})")
    for o_idx, opt in enumerate(options):
        is_corr = (o_idx == corr_idx)
        lbl = opt_labels[o_idx] if o_idx < len(opt_labels) else str(o_idx+1)
        if is_corr:
            msg_lines.append(f"   ✅ <b>{lbl} - {opt}</b> <i>(الإجابة الصحيحة)</i>")
        else:
            msg_lines.append(f"   ⚪ {lbl} - {opt}")
    
    explanation = q_data.get("explanation")
    if explanation:
        msg_lines.append(f"   💡 <i>الشرح: {explanation}</i>")
    msg_lines.append("")

msg_lines.append("━━━━━━━━━━━━━━━━━━")
msg_lines.append("👇 <b>اختر الإجراء المطلوب بضغطة واحدة:</b>")

full_html = "\n".join(msg_lines)

inline_keyboard = {
    "inline_keyboard": [
        [
            {
                "text": "✅ اعتماد ونشر الاختبار للطلاب الآن 🚀",
                "url": "https://drelmahdy.com/admin"
            }
        ],
        [
            {
                "text": "👁️ معاينة وتعديل الأسئلة في المنصة ✏️",
                "url": "https://drelmahdy.com/admin"
            }
        ]
    ]
}

payload = {
    "chat_id": chat_id,
    "text": full_html,
    "parse_mode": "HTML",
    "reply_markup": json.dumps(inline_keyboard)
}

data = urllib.parse.urlencode(payload).encode("utf-8")
req = urllib.request.Request(
    f"https://api.telegram.org/bot{token}/sendMessage",
    data=data,
    headers={"User-Agent": "Mozilla/5.0"}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    print("Telegram Exam Sent Result:", res.get("ok"))
