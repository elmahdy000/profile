import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Fetch all quizzes as a single json array
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_agg(json_build_object('id', id, 'title', title, 'questions', questions)) FROM quizzes;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
quizzes = json.loads(raw)
print(f"Loaded {len(quizzes)} quizzes.")

for q in quizzes:
    for idx, item in enumerate(q.get('questions', [])):
        prompt = item.get('prompt', '')
        if 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي' in prompt or 'الأثر المجتمعي المرتبط بانتشار الحواسيب' in prompt or 'الذكاء الاصطناعي مفهوم عام أوسع' in item.get('explanation', ''):
            print(f"\nFOUND IN Quiz {q['id']} ({q['title']}) at Question #{idx+1}:")
            print(f"Prompt: {prompt}")
            print(f"Options: {item.get('options')}")
            print(f"correctIndex: {item.get('correctIndex')}")
            print(f"Explanation: {item.get('explanation')}")

c.close()
