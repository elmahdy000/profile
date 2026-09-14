import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'quiz_id', quiz_id, 'student_id', student_id, 'score', score, 'answers', answers, 'details', details)::text FROM quiz_attempts WHERE id = 1325;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
att = json.loads(raw.strip())

cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
qdata = json.loads(stdout2.read().decode('utf-8'))
questions = qdata['questions']

print(f"Attempt 1325 Details (Total details: {len(att['details'])}):")
for d in att['details']:
    q_idx = d['questionIndex']
    q = questions[q_idx]
    # Check if this question matches the screenshot
    if not d['isCorrect']:
        print(f"\n--- WRONG: Question #{q_idx+1} in DB ---")
        print(f"Prompt: {q['prompt']}")
        print(f"Options: {q['options']}")
        print(f"Selected: {d['selectedOption']} => {q['options'][d['selectedOption']] if d['selectedOption'] < len(q['options']) else 'INVALID'}")
        print(f"Correct: {d['correctOption']} => {q['options'][d['correctOption']] if d['correctOption'] < len(q['options']) else 'INVALID'}")
        print(f"Explanation: {q.get('explanation')}")

c.close()
