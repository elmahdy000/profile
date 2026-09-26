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

affected_attempts = []
for line in out.strip().split("\n"):
    if not line.strip(): continue
    parts = line.split("|")
    if len(parts) < 4: continue
    aid, sid, score, details_json = parts[0], parts[1], parts[2], parts[3]
    try:
        details = json.loads(details_json)
        # ابحث عن تفاصيل سؤال 21 (السؤال 22)
        target = next((d for d in details if d.get('questionIndex') == 21), None)
        if target:
            is_cor = target.get('isCorrect') or target.get('correct')
            if not is_cor:
                affected_attempts.append((aid, sid, int(score), details))
    except Exception as e:
        pass

print(f"إجمالي المحاولات المتضررة من خطأ السؤال 22 في اختبار 44: {len(affected_attempts)}")
for a in affected_attempts[:5]:
    print(f"  محاولة ID {a[0]} للطالب {a[1]}: الدرجة الحالية {a[2]}% -> ستصبح {a[2] + 4}%")
