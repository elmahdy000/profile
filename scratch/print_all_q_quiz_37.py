import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
data = json.loads(raw.strip())

for idx, q in enumerate(data['questions']):
    p = q['prompt']
    exp = q.get('explanation', '')
    opts = q.get('options', [])
    c_idx = q.get('correctIndex')
    # Print if it has any relevant keywords
    print(f"\n--- Q#{idx+1} ---")
    print(f"Prompt: {p}")
    print(f"Options: {opts}")
    print(f"correctIndex: {c_idx} => {opts[c_idx] if c_idx is not None and c_idx < len(opts) else 'ERR'}")
    print(f"Explanation: {exp}")

c.close()
