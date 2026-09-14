import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, title, questions FROM quizzes WHERE id IN (32, 33, 34, 35);"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')

for line in stdout:
    parts = line.strip().split('|', 2)
    if len(parts) >= 3:
        qid, title, qjson = parts[0], parts[1], parts[2]
        qs = json.loads(qjson)
        for idx, q in enumerate(qs):
            p = q.get('prompt', '')
            if 'الحواسيب الشخصية' in p or 'الذكاء الاصطناعي والتعلم الآلي' in p:
                print(f"Quiz {qid} ({title}) - Q#{idx+1}:")
                print(f"  Prompt: {p}")
                print(f"  Options: {q.get('options')}")
                print(f"  correctIndex: {q.get('correctIndex')}")
                print(f"  Explanation: {q.get('explanation')}")
                print()

c.close()
