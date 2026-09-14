import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
SELECT id, title, questions 
FROM quizzes 
WHERE questions::text LIKE '%ماذا تفعل النماذج اللغوية%';
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
lines = stdout.read().decode('utf-8').strip().split('\n')
print(f"Quizzes matching 'ماذا تفعل النماذج اللغوية': {len(lines)}")
for l in lines:
    if l.strip():
        parts = l.split('|', 2)
        if len(parts) >= 2:
            print("QUIZ ID:", parts[0], "Title:", parts[1])
            qs = json.loads(parts[2])
            for idx, q in enumerate(qs):
                p = q.get('prompt', '') or q.get('question', {}).get('prompt', '')
                if 'ماذا تفعل النماذج اللغوية' in p:
                    print(f"   -> Question #{idx+1} (index {idx}): {p}")

c.close()
