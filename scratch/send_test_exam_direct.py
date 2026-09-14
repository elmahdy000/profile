import paramiko

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Run a curl to localhost:5000 after generating a session token via node
node_runner = """
import { createAdminSessionToken } from "./artifacts/api-server/dist/index.mjs";
"""

# Or simply query questions from db and send a real exam to the user via Telegram right now!
py_script = """
import psycopg2, json, urllib.request, urllib.parse, hashlib, hmac, time

conn = psycopg2.connect("postgresql://postgres:pass1234@localhost:5432/profile")
cur = conn.cursor()

# 1. Fetch 5 questions from question_bank
cur.execute("SELECT id, question, difficulty, stage, unit, lesson FROM question_bank ORDER BY RANDOM() LIMIT 5")
rows = cur.fetchall()

if not rows:
    print("No questions found in bank!")
    exit(0)

# 2. Format exam message
token = "8821235319:AAFdp8sjIFo9G75AmDf9UXLcbVQxYjS2lac"
chat_id = "744591440"

msg_lines = [
    "📝 **نموذج اختبار تجريبي جديد للمراجعة والاعتماد**",
    "━━━━━━━━━━━━━━━━━━",
    "📚 **المرحلة:** الثانوية العامة",
    "📖 **النطاق:** بنك الأسئلة الموحد",
    "⏱ **المدة:** 15 دقيقة · **الأسئلة:** 5 أسئلة",
    "🎯 **درجة النجاح:** 60%",
    "🔒 **الحالة الحالية:** مسودة خاصة (غير ظاهر للطلاب)",
    "━━━━━━━━━━━━━━━━━━\\n"
]

opt_labels = ["أ", "ب", "ج", "د", "هـ"]
for idx, r in enumerate(rows, 1):
    q_data = r[1]
    prompt = q_data.get("prompt", "")
    options = q_data.get("options", [])
    corr_idx = q_data.get("correctIndex", 0)
    diff = r[2] or "متوسط"
    diff_tag = "🟢 سهل" if diff == "easy" else ("🔴 صعب" if diff == "hard" else "🟡 متوسط")
    
    msg_lines.append(f"**س{idx}:** {prompt} ({diff_tag})")
    for o_idx, opt in enumerate(options):
        is_corr = (o_idx == corr_idx)
        lbl = opt_labels[o_idx] if o_idx < len(opt_labels) else str(o_idx+1)
        if is_corr:
            msg_lines.append(f"  ✅ **{lbl} - {opt}** (الإجابة الصحيحة)")
        else:
            msg_lines.append(f"  ⚪ {lbl} - {opt}")
    msg_lines.append("")

msg_lines.append("👇 **للاعتماد والنشر المباشر للطلاب الآن اضغط الزر أدناه:**")
full_text = "\\n".join(msg_lines)

# 3. Inline keyboard with approval link
inline_keyboard = {
    "inline_keyboard": [
        [
            {
                "text": "✅ اعتماد ونشر الاختبار للطلاب الآن",
                "url": "https://drelmahdy.com/admin"
            }
        ],
        [
            {
                "text": "👁️ معاينة وتعديل الأسئلة في المنصة",
                "url": "https://drelmahdy.com/admin"
            }
        ]
    ]
}

payload = {
    "chat_id": chat_id,
    "text": full_text,
    "parse_mode": "Markdown",
    "reply_markup": json.dumps(inline_keyboard)
}

data = urllib.parse.urlencode(payload).encode("utf-8")
req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("EXAM SENT SUCCESSFULLY TO TELEGRAM:", res.get("ok"))
except Exception as e:
    print("SEND ERROR:", e)

conn.close()
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/send_test_exam.py", "w") as f:
    f.write(py_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("python3 /tmp/send_test_exam.py")
print("STDOUT:\n", stdout.read().decode("utf-8"))
print("STDERR:\n", stderr.read().decode("utf-8"))

ssh.close()
