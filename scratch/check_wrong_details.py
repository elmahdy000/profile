import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

for att_id in [1325, 1310, 1323]:
    cmd = f"""sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'quiz_id', quiz_id, 'student_id', student_id, 'score', score, 'details', details)::text FROM quiz_attempts WHERE id = {att_id};" """
    stdin, stdout, stderr = c.exec_command(cmd)
    raw = stdout.read().decode('utf-8')
    if raw.strip():
        att = json.loads(raw.strip())
        print(f"Attempt {att['id']}, Quiz {att['quiz_id']}, Student {att['student_id']}, Score: {att['score']}")
        details = att.get('details', [])
        # Also get Quiz 37 questions
        qcmd = f"""sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('questions', questions)::text FROM quizzes WHERE id = {att['quiz_id']};" """
        s_in, s_out, s_err = c.exec_command(qcmd)
        qdata = json.loads(s_out.read().decode('utf-8'))
        questions = qdata['questions']
        
        for d in details:
            q_idx = d.get('questionIndex')
            q = questions[q_idx] if q_idx < len(questions) else None
            prompt = q.get('prompt', '') if q else ''
            if not d.get('isCorrect'):
                sel_opt = q['options'][d['selectedOption']] if q and d['selectedOption'] < len(q['options']) else d['selectedOption']
                corr_opt = q['options'][d['correctOption']] if q and d['correctOption'] < len(q['options']) else d['correctOption']
                print(f"  [Q index {q_idx+1} in DB]: {prompt}")
                print(f"    Selected: {sel_opt} (opt #{d['selectedOption']})")
                print(f"    Correct: {corr_opt} (opt #{d['correctOption']})")
                print(f"    Explanation: {q.get('explanation')}")

c.close()
