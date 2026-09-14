import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
data = json.loads(raw.strip())
print(f"Quiz {data['id']}: {data['title']}")
for idx, q in enumerate(data['questions']):
    print(f"[{idx+1}] {repr(q['prompt'][:50])} | correctIndex={q.get('correctIndex')}")

c.close()
