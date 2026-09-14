import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, title, jsonb_array_length(questions), questions FROM quizzes;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)

found = False
for line in stdout:
    parts = line.strip().split('|', 3)
    if len(parts) >= 4:
        qid, title, qcount, qjson = parts[0], parts[1], parts[2], parts[3]
        if 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي' in qjson or 'ما الأثر المجتمعي المرتبط بانتشار الحواسيب الشخصية' in qjson:
            found = True
            print(f"FOUND IN QUIZ {qid}: '{title}' ({qcount} questions)")
            try:
                qs = json.loads(qjson)
                for idx, q in enumerate(qs):
                    p = q.get('prompt', '') or (q.get('question', {}).get('prompt', ''))
                    if 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي' in p or 'ما الأثر المجتمعي المرتبط بانتشار الحواسيب الشخصية' in p:
                        print(f"  Question #{idx+1}:")
                        print(f"    Prompt: {p}")
                        print(f"    Options: {q.get('options') or q.get('question', {}).get('options')}")
                        print(f"    correctIndex: {q.get('correctIndex') if 'correctIndex' in q else q.get('question', {}).get('correctIndex')}")
                        print(f"    Explanation: {q.get('explanation') or q.get('question', {}).get('explanation')}")
            except Exception as e:
                print("JSON error:", e)

if not found:
    print("NOT FOUND IN ANY QUIZ in quizzes table!")

c.close()
