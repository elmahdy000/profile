import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Search question bank
sql = """SELECT json_agg(t) FROM (
    SELECT id, title, prompt, correct_index, options, explanation 
    FROM question_bank 
    WHERE prompt LIKE '%الحواسيب%' OR prompt LIKE '%التعلم الآلي%' OR prompt LIKE '%التعلم الالي%'
) t;"""
cmd = f"""sudo -u postgres psql -d profile -t -A -c "{sql}" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8').strip()
if raw:
    rows = json.loads(raw)
    print(f"Found {len(rows)} matching rows in question_bank:")
    for r in rows:
        print(f"\nBank ID {r['id']}: {r['prompt']}")
        print(f"  Options: {r['options']}")
        ci = r['correct_index']
        print(f"  Correct Index: {ci} -> {r['options'][ci] if ci < len(r['options']) else 'OUT OF RANGE'}")
        print(f"  Explanation: {r.get('explanation')}")
else:
    print("No bank rows found")

# Search all quizzes
sql2 = """SELECT id, title, questions FROM quizzes;"""
cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT json_agg(t) FROM (SELECT id, title, questions FROM quizzes) t;" """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
raw2 = stdout2.read().decode('utf-8').strip()
if raw2:
    quizzes = json.loads(raw2)
    print(f"\nTotal quizzes in db: {len(quizzes)}")
    for q in quizzes:
        questions = q.get('questions') or []
        for idx, ques in enumerate(questions):
            prompt = ques.get('prompt', '')
            if 'الحواسيب' in prompt or 'التعلم الآلي' in prompt or 'التعلم الالي' in prompt:
                print(f"\nFound in Quiz {q['id']} ('{q['title']}'), Question #{idx+1}:")
                print(f"  Prompt: {prompt}")
                print(f"  Options: {ques.get('options')}")
                ci = ques.get('correctIndex')
                opts = ques.get('options', [])
                print(f"  correctIndex: {ci} -> {opts[ci] if ci is not None and ci < len(opts) else 'OUT OF RANGE'}")
                print(f"  Explanation: {ques.get('explanation')}")

c.close()
