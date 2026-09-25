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

target_prompts = [
    "أي مجموعة تضم تحولات اجتماعية وردت في الدرس؟",
    "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟",
    "ما الفكرة الأساسية للمعالجة المتوازية؟"
]

print("Checking if any quiz_attempt contains any of the 3 target prompts...")
for tp in target_prompts:
    res = query_json(f"""
    SELECT count(*) FROM quiz_attempts
    WHERE details::text LIKE '%{tp}%';
    """)
    print(f"Prompt '{tp[:30]}...': {res.strip()} attempts found")

c.close()
