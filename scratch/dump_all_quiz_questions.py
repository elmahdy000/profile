import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Dump all quizzes
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, questions FROM quizzes;" """
stdin, stdout, stderr = c.exec_command(cmd)

all_quizzes = []
for line in stdout:
    parts = line.strip().split('|', 2)
    if len(parts) == 3:
        qid, qtitle, qjson = parts[0], parts[1], parts[2]
        try:
            questions = json.loads(qjson)
            all_quizzes.append({'id': qid, 'title': qtitle, 'questions': questions})
        except Exception as e:
            pass

print(f"Loaded {len(all_quizzes)} quizzes.")

# Check for questions matching the screenshot
for qz in all_quizzes:
    for idx, q in enumerate(qz['questions']):
        p = q.get('prompt', '')
        e = q.get('explanation', '')
        if 'العلاقة بين الذكاء' in p or 'الحواسيب الشخصية' in p or 'العلاقة بين الذكاء' in e or 'الحواسيب الشخصية' in e:
            print(f"Quiz {qz['id']} ('{qz['title']}') - Question #{idx+1}:")
            print(f"  Prompt: {p}")
            print(f"  Options: {q.get('options')}")
            print(f"  correctIndex: {q.get('correctIndex')}")
            print(f"  explanation: {e}")
            print()

c.close()
