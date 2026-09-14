import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Let's check Quiz 33, 35, 37 questions that match
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, questions FROM quizzes WHERE id IN (33, 35, 37);" """
stdin, stdout, stderr = c.exec_command(cmd)

for line in stdout:
    parts = line.strip().split('|', 2)
    if len(parts) == 3:
        qid, qtitle, qjson = parts[0], parts[1], parts[2]
        questions = json.loads(qjson)
        print(f"=== Quiz {qid}: {qtitle} (Total questions: {len(questions)}) ===")
        for idx, q in enumerate(questions):
            p = q.get('prompt', '')
            if 'الحواسيب الشخصية' in p or 'العلاقة بين الذكاء' in p or 'انتشار الحواسيب' in p:
                ci = q.get('correctIndex')
                opts = q.get('options', [])
                print(f"  Q#{idx+1}: {p}")
                print(f"    Options: {opts}")
                print(f"    correctIndex: {ci} -> {opts[ci] if ci is not None and ci < len(opts) else 'INVALID'}")
                print(f"    Explanation: {q.get('explanation')}")

c.close()
