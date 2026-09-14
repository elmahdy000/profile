import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
SELECT q.questions, qa.answers, qa.details 
FROM quiz_attempts qa 
JOIN quizzes q ON q.id = qa.quiz_id 
WHERE qa.id = 1325;
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
raw = stdout.read().decode('utf-8').strip()
parts = raw.split('|', 2)
questions = json.loads(parts[0])
answers = json.loads(parts[1])
details = json.loads(parts[2])

print(f"Comparing Attempt 1325 (30 questions):")
for idx in range(len(questions)):
    q = questions[idx]
    ans = answers[idx]
    ci = q.get('correctIndex')
    opts = q.get('options', [])
    d = details[idx]
    is_corr = (ans == ci)
    status = "OK" if is_corr else "WRONG"
    if not is_corr:
        print(f"\n[{status}] Q#{idx+1} (DB Index {idx}):")
        print(f"  Prompt: {q.get('prompt')}")
        print(f"  Options: {opts}")
        print(f"  Student Ans: {ans} => {opts[ans] if ans < len(opts) else '??'}")
        print(f"  DB correctIndex: {ci} => {opts[ci] if ci is not None and ci < len(opts) else '??'}")
        print(f"  Detail says: selected={d['selectedOption']}, correct={d['correctOption']}, isCorrect={d['isCorrect']}")
        print(f"  Explanation: {q.get('explanation')}")

c.close()
