import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Complete questions dictionary for the damaged IDs
REPAIRS = {
    669: {
        "prompt": "ما نوع المحتوى الذي تنتجه النماذج اللغوية؟",
        "options": ["النصوص", "قطع الغيار", "الكهرباء", "الأجهزة"],
        "correctIndex": 0,
        "explanation": "تنتج النماذج اللغوية الكبيرة النصوص والإجابات والاستجابات المكتوبة."
    },
    675: {
        "prompt": "أي مجال يمثل المرحلة الأخيرة في التسلسل التعليمي من الأوسع إلى الأكثر تخصصًا؟",
        "options": ["الذكاء الاصطناعي", "التعلم الآلي", "الذكاء الاصطناعي التوليدي", "قواعد البرمجة"],
        "correctIndex": 2,
        "explanation": "يعرض الدرس الذكاء الاصطناعي التوليدي في نهاية التسلسل التعليمي من الأوسع إلى الأكثر تخصصًا."
    },
    686: {
        "prompt": "ما أول تصرف مناسب لتجنب الاعتماد على معلومات غير دقيقة من الذكاء الاصطناعي؟",
        "options": ["قبول الحل دون مراجعة", "التحقق من المصادر الموثوقة", "عدم مراجعة المعلومات", "نشر الإجابة فورًا"],
        "correctIndex": 1,
        "explanation": "يوصي الدرس بالتحقق من المعلومات باستخدام مصادر موثوقة."
    },
    688: {
        "prompt": "أي سلوك لا يساعد على تجنب الهلوسة؟",
        "options": ["مقارنة الإجابات بمصادر متعددة", "طلب أمثلة وتوضيحات", "التحقق من المعلومات", "الاعتماد الأعمى على الإجابات"],
        "correctIndex": 3,
        "explanation": "الاعتماد الأعمى على الإجابات دون تحقق يوقع في فخ الهلوسة."
    },
    690: {
        "prompt": "كيف يمكن زيادة الثقة في إجابات الذكاء الاصطناعي؟",
        "options": ["عدم قراءتها", "مقارنتها بأكثر من مصدر موثوق", "الاعتماد على مصدر واحد غير موثوق", "عدم طلب أي توضيح"],
        "correctIndex": 1,
        "explanation": "مقارنة الإجابات بمصادر خارجية موثوقة تزيد من دقتها وصحتها."
    },
    691: {
        "prompt": "ماذا يمكن أن يطلب المستخدم عند الحاجة للتحقق من صحة الإجابة؟",
        "options": ["حذف السؤال", "إغلاق النظام", "أمثلة أو أدلة ومصادر", "عدم تقديم أي تفاصيل"],
        "correctIndex": 2,
        "explanation": "من إرشادات الدرس طلب أمثلة أو أدلة ومصادر عند الحاجة للتحقق من المعلومة."
    },
    694: {
        "prompt": "أي خطوة تساعد على تقليل خطر الهلوسة؟",
        "options": ["تجاهل المصادر", "طرح السؤال بوضوح", "قبول أول إجابة دون تدقيق", "عدم مقارنة المعلومات"],
        "correctIndex": 1,
        "explanation": "السؤال الواضح والمحدد يساعد على الحصول على إجابة دقيقة وتقليل الهلوسة."
    },
    695: {
        "prompt": "أي سلوك مناسب عند استخدام أدوات الذكاء الاصطناعي التوليدي؟",
        "options": ["اعتبار كل الإجابات صحيحة", "عدم مراجعتها", "التحقق منها قبل الاعتماد عليها", "الاعتماد عليها بشكل أعمى"],
        "correctIndex": 2,
        "explanation": "يجب التحقق من المعلومات المهمة قبل استخدامها أو الاعتماد عليها."
    },
    696: {
        "prompt": "أي مما يلي لا يتفق مع إرشادات تجنب الهلوسة؟",
        "options": ["التحقق من المصادر", "مقارنة الإجابات", "طلب الأدلة عند الحاجة", "عدم مراجعة الإجابات"],
        "correctIndex": 3,
        "explanation": "عدم مراجعة الإجابات يتعارض مع إرشادات الاستخدام الآمن والدقيق للذكاء الاصطناعي."
    },
    700: {
        "prompt": "أي مثال يمثل التعلم العميق بصورة أوضح؟",
        "options": ["تصنيف بسيط يدوي", "كتابة قاعدة برمجية", "تخزين صورة", "التعرف على الصور باستخدام شبكة عصبية متعددة الطبقات"],
        "correctIndex": 3,
        "explanation": "استخدام شبكة عصبية متعددة الطبقات للتعرف على الأنماط والصور يمثل التعلم العميق."
    },
    703: {
        "prompt": "أي ترتيب صحيح لمراحل معالجة البيانات في الشبكة العصبية؟",
        "options": ["إخراج ← مخفية ← إدخال", "مخفية ← إدخال ← إخراج", "إدخال ← طبقات مخفية ← إخراج", "إخراج ← إدخال ← مخفية"],
        "correctIndex": 2,
        "explanation": "تدخل البيانات عبر طبقة الإدخال، ثم تمر بالطبقات المخفية، ثم تظهر النتيجة من طبقة الإخراج."
    },
    893: {
        "prompt": "لماذا لا يكفي أن تكون نتيجة النظام صحيحة فقط؟",
        "options": ["لأن السرعة أهم دائمًا", "لأن طريقة الوصول إلى النتيجة والعدالة والمسؤولية قد تكون مهمة أيضًا", "لأن البيانات لا قيمة لها", "لأن كل قرار يجب أن يكون سريًا"],
        "correctIndex": 1,
        "explanation": "لا يكفي أن تكون النتيجة صحيحة، بل يجب مراعاة العدالة والشفافية والخصوصية والمسؤولية."
    },
    894: {
        "prompt": "نظام يصدر قرارًا صحيحًا لكن لا يمكن فهم كيفية وصوله إليه. ما المشكلة؟",
        "options": ["العدالة", "الخصوصية", "غموض عملية اتخاذ القرار", "جمع البيانات"],
        "correctIndex": 2,
        "explanation": "عدم وضوح آلية اتخاذ القرار يتعارض مع مبدأ الشفافية حتى لو كانت النتيجة صحيحة."
    },
    899: {
        "prompt": "أي خيار يجمع بين المفهوم والمثال بصورة غير صحيحة؟",
        "options": [
            "XAI — تفسير القرارات ومساعدة البشر على فهمها",
            "العدالة — عدم التمييز ظلمًا",
            "المساءلة — تحديد الجهة القابلة للمحاسبة",
            "الشفافية — جمع البيانات الشخصية دون موافقة"
        ],
        "correctIndex": 3,
        "explanation": "جمع البيانات دون موافقة يمثل قضية خصوصية ولا يعبر عن الشفافية."
    }
}

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# 1. Update question_bank table
for qid, qdata in REPAIRS.items():
    clean_json = json.dumps(qdata, ensure_ascii=False)
    # Use python on the remote server via stdin to safely update postgres without shell escaping issues
    script = f"""
import psycopg2, json
conn = psycopg2.connect(dbname='profile', user='postgres')
cur = conn.cursor()
q_json = {json.dumps(clean_json)}
cur.execute("UPDATE question_bank SET question = %s::jsonb WHERE id = %s", (q_json, {qid}))
conn.commit()
conn.close()
print("Updated question_bank ID {qid}")
"""
    cmd = f"python3 -c {json.dumps(script)}"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print(f"Error on {qid}: {err}")
    else:
        print(out)

# 2. Update existing quizzes (32, 33, 34, 35) to propagate full text
quiz_script = """
import psycopg2, json

conn = psycopg2.connect(dbname='profile', user='postgres')
cur = conn.cursor()

cur.execute("SELECT id, questions FROM quizzes WHERE id IN (32, 33, 34, 35);")
rows = cur.fetchall()

repairs_map = {}
"""
for qid, qdata in REPAIRS.items():
    quiz_script += f"\nrepairs_map['{qdata['prompt'][:15]}'] = {json.dumps(qdata, ensure_ascii=False)}"

quiz_script += """
for qid, questions in rows:
    if not questions: continue
    modified = False
    new_questions = []
    for q in questions:
        p = q.get('prompt', '')
        matched = False
        for prefix, rep in repairs_map.items():
            if p.startswith(prefix) or prefix.startswith(p[:15]):
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
        cur.execute("UPDATE quizzes SET questions = %s::jsonb WHERE id = %s", (json.dumps(new_questions, ensure_ascii=False), qid))
        print(f"Updated Quiz {qid} questions with complete repairs.")

conn.commit()
conn.close()
"""

cmd = f"python3 -c {json.dumps(quiz_script)}"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8').strip()
print("\nQuiz update output:")
print(out)

ssh.close()
print("\nAll database questions repaired successfully!")
