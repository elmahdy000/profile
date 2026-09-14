import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
line = stdout.read().decode('utf-8')
q = json.loads(line)
print(f"Quiz 37 title: {q['title']}, num questions: {len(q['questions'])}")
for idx, item in enumerate(q['questions']):
    print(f"Q{idx+1}: {item.get('prompt')[:60]}")

c.close()
