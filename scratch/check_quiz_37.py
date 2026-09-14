import sys
import paramiko
import json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'shuffle_questions', shuffle_questions, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')

data = json.loads(raw.strip())
print(f"Quiz ID: {data['id']}, Title: {data['title']}, Shuffle: {data.get('shuffle_questions')}")
qs = data['questions']
for i, q in enumerate(qs):
    prompt = q.get('prompt', '')
    if 'الذكاء الاصطناعي والتعلم الآلي' in prompt or 'الحواسيب الشخصية' in prompt or i in [14, 24]:
        print(f"\n--- Question Index {i+1} ---")
        print(f"Prompt: {prompt}")
        print(f"Options: {q.get('options')}")
        print(f"CorrectIndex: {q.get('correctIndex')}")
        print(f"Explanation: {q.get('explanation')}")

c.close()
