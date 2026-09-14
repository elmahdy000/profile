import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Find in all quizzes
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, questions FROM quizzes;" """
stdin, stdout, stderr = c.exec_command(cmd)

found_in_quizzes = []
for line in stdout:
    parts = line.split('|', 2)
    if len(parts) == 3:
        qid, title, qjson = parts[0], parts[1], parts[2]
        if 'العلاقة بين الذكاء' in qjson or 'الحواسيب الشخصية' in qjson:
            found_in_quizzes.append((qid, title, qjson))

print(f"Found in {len(found_in_quizzes)} quizzes:")
for qid, title, qjson in found_in_quizzes:
    print(f"\nQuiz ID {qid} ({title}):")
    try:
        questions = json.loads(qjson)
        for idx, q in enumerate(questions):
            if 'العلاقة بين الذكاء' in q.get('prompt', '') or 'الحواسيب الشخصية' in q.get('prompt', ''):
                print(f"  Q#{idx+1}: {q.get('prompt')}")
                print(f"    Options: {q.get('options')}")
                print(f"    correctIndex: {q.get('correctIndex')}")
                print(f"    Explanation: {q.get('explanation')}")
    except Exception as e:
        print(f"  Error parsing json: {e}")

c.close()
