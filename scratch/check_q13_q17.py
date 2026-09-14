import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
data = json.loads(raw.strip())

for idx in [12, 16]: # Q13, Q17
    q = data['questions'][idx]
    print(f"\nQ{idx+1}: {q['prompt']}")
    print(f"Options: {q['options']}")
    print(f"CorrectIndex: {q['correctIndex']} => {q['options'][q['correctIndex']]}")
    print(f"Explanation: {q.get('explanation')}")

c.close()
