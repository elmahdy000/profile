import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes;" """
stdin, stdout, stderr = c.exec_command(cmd)

for line in stdout:
    if line.strip():
        q = json.loads(line)
        for idx, item in enumerate(q.get('questions', [])):
            prompt = item.get('prompt', '')
            if 'العلاقة بين الذكاء' in prompt or 'الحواسيب الشخصية' in prompt:
                print(f"Quiz ID: {q['id']} ({q['title']}) - Question #{idx+1}:")
                print(f"  Prompt: {prompt}")
                print(f"  Options: {item.get('options')}")
                print(f"  CorrectIndex: {item.get('correctIndex')}")
                print(f"  Explanation: {item.get('explanation')}")

c.close()
