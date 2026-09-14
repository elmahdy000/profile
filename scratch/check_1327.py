import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')
sql = "SELECT id, quiz_id, student_id, score, answers, details FROM quiz_attempts WHERE id = 1327;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
raw = stdout.read().decode('utf-8').strip()
parts = raw.split('|')
print("ID:", parts[0], "Score:", parts[3])
dets = json.loads(parts[5])
for d in dets:
    if not d['isCorrect']:
        print(f"  Wrong QIndex {d['questionIndex']}: selected={d['selectedOption']}, correct={d['correctOption']}")
c.close()
