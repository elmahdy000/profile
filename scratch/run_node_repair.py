import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

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

node_script = f"""
const {{ Client }} = require('/var/www/profile/node_modules/pg');

const repairs = {json.dumps(REPAIRS, ensure_ascii=False, indent=2)};

async function run() {{
  const client = new Client({{
    host: 'localhost',
    user: 'postgres',
    database: 'profile',
    port: 5432
  }});

  await client.connect();

  // 1. Update question_bank
  for (const [qidStr, qdata] of Object.entries(repairs)) {{
    const qid = parseInt(qidStr, 10);
    await client.query("UPDATE question_bank SET question = $1::jsonb WHERE id = $2", [JSON.stringify(qdata), qid]);
    console.log(`Repaired question_bank ID ${{qid}}`);
  }}

  // 2. Update Quizzes
  const res = await client.query("SELECT id, questions FROM quizzes WHERE id IN (32, 33, 34, 35)");
  for (const row of res.rows) {{
    const qid = row.id;
    let questions = row.questions;
    if (!Array.isArray(questions)) continue;

    let modified = false;
    const newQuestions = questions.map((q) => {{
      const p = (q.prompt || '').trim();
      for (const [repId, rep] of Object.entries(repairs)) {{
        const repP = rep.prompt.trim();
        if (p.startsWith(repP.slice(0, 12)) || repP.startsWith(p.slice(0, 12))) {{
          modified = true;
          return {{
            ...q,
            prompt: rep.prompt,
            options: rep.options,
            correctIndex: rep.correctIndex,
            explanation: rep.explanation
          }};
        }}
      }}
      return q;
    }});

    if (modified) {{
      await client.query("UPDATE quizzes SET questions = $1::jsonb WHERE id = $2", [JSON.stringify(newQuestions), qid]);
      console.log(`Updated Quiz ${{qid}} with repaired questions`);
    }}
  }}

  await client.end();
  console.log("All updates completed successfully in database!");
}}

run().catch(console.error);
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sftp = ssh.open_sftp()
with sftp.file('/tmp/repair_db.js', 'w') as f:
    f.write(node_script.encode('utf-8'))
sftp.close()

stdin, stdout, stderr = ssh.exec_command('node /tmp/repair_db.js')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

ssh.close()
