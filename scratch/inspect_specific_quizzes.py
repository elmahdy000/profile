import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Find in Quiz 37, 39, 35, 33, 21
for qid in [37, 35, 33, 39, 21]:
    cmd = f"""sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = {qid};" """
    stdin, stdout, stderr = c.exec_command(cmd)
    raw = stdout.read().decode('utf-8')
    if raw.strip():
        data = json.loads(raw.strip())
        print(f"\n=======================================================")
        print(f"Quiz ID {data['id']}: {data['title']}")
        for idx, q in enumerate(data.get('questions', [])):
            prompt = q.get('prompt', '')
            if 'العلاقة بين الذكاء' in prompt or 'الحواسيب الشخصية' in prompt:
                print(f"  --- Q#{idx+1} in DB ---")
                print(f"  Prompt: {prompt}")
                print(f"  Options: {q.get('options')}")
                print(f"  CorrectIndex: {q.get('correctIndex')} => {q.get('options')[q.get('correctIndex')] if q.get('correctIndex') is not None and q.get('correctIndex') < len(q.get('options')) else 'INVALID'}")
                print(f"  Explanation: {q.get('explanation')}")

c.close()
