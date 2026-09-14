import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, quiz_id, student_id, score, answers, details FROM quiz_attempts WHERE id = 1325;"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8').strip()
parts = raw.split('|')
print("ID:", parts[0])
print("Quiz ID:", parts[1])
print("Student ID:", parts[2])
print("Score:", parts[3])
answers = json.loads(parts[4])
details = json.loads(parts[5])

print("Answers (count", len(answers), "):", answers)
print("\nDetails:")
for d in details:
    print(f"  QIndex {d['questionIndex']}: selected={d['selectedOption']}, correct={d['correctOption']}, isCorrect={d['isCorrect']}")

c.close()
