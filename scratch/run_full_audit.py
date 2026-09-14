import paramiko, base64, json, sys, re

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Dump all question_bank
sql1 = "SELECT json_agg(json_build_object('id', id, 'lesson', lesson, 'question', question)) FROM question_bank;"
b64_1 = base64.b64encode(sql1.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64_1} | base64 -d | sudo -u postgres psql -d profile -t -A')
bank_raw = stdout.read().decode('utf-8').strip()
bank = json.loads(bank_raw) if bank_raw else []

# Dump all quizzes
sql2 = "SELECT json_agg(json_build_object('id', id, 'title', title, 'questions', questions)) FROM quizzes;"
b64_2 = base64.b64encode(sql2.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64_2} | base64 -d | sudo -u postgres psql -d profile -t -A')
quizzes_raw = stdout.read().decode('utf-8').strip()
quizzes = json.loads(quizzes_raw) if quizzes_raw else []

c.close()

def normalize(text):
    if not text: return ""
    return re.sub(r'[\s\u064B-\u0652\u0640.,:;()\\"-]+', ' ', text).strip()

def check_mismatch(prompt, options, correct_index, explanation):
    if not options or correct_index is None:
        return "MISSING_OPTIONS_OR_KEY"
    if correct_index < 0 or correct_index >= len(options):
        return f"OUT_OF_BOUNDS (ci={correct_index}, len={len(options)})"
    if not explanation or len(explanation.strip()) < 5:
        return None
    
    norm_expl = normalize(explanation)
    corr_opt = normalize(options[correct_index])
    
    matches_other = []
    for idx, opt in enumerate(options):
        if idx == correct_index: continue
        norm_opt = normalize(opt)
        # Check if the other option is long enough and appears in explanation while marked correct option does NOT
        if len(norm_opt) >= 8 and norm_opt in norm_expl and corr_opt not in norm_expl:
            matches_other.append((idx, opt))
            
    if matches_other:
        return f"EXPLANATION_MISMATCH: Marked opt [{correct_index}] '{options[correct_index][:30]}' but explanation contains opt [{matches_other[0][0]}] '{matches_other[0][1][:30]}'"
    return None

print(f"Loaded {len(bank)} bank items, {len(quizzes)} quizzes.")

print("\n=== 1. AUDITING QUESTION BANK ===")
bank_issues = []
for b in bank:
    bid = b['id']
    lesson = b.get('lesson', '')
    qdata = b.get('question', {})
    p = qdata.get('prompt', '')
    opts = qdata.get('options', [])
    ci = qdata.get('correctIndex')
    expl = qdata.get('explanation', '')
    res = check_mismatch(p, opts, ci, expl)
    if res:
        bank_issues.append((bid, lesson, p[:60], res, opts, ci, expl))

print(f"Question Bank issues found: {len(bank_issues)} / {len(bank)}")
for b in bank_issues:
    print(f"\nBank #{b[0]} ({b[1]}):")
    print(f"  Prompt: {b[2]}")
    print(f"  Issue: {b[3]}")
    print(f"  Options: {b[4]}")
    print(f"  correctIndex: {b[5]}")
    print(f"  Expl: {b[6]}")

print("\n=== 2. AUDITING QUIZZES ===")
quiz_issues = []
for qz in quizzes:
    qid = qz['id']
    title = qz.get('title', '')
    questions = qz.get('questions', [])
    if not isinstance(questions, list): continue
    for qidx, q in enumerate(questions):
        p = q.get('prompt', '') or q.get('question', {}).get('prompt', '')
        opts = q.get('options', []) or q.get('question', {}).get('options', [])
        ci = q.get('correctIndex') if 'correctIndex' in q else q.get('question', {}).get('correctIndex')
        expl = q.get('explanation', '') or q.get('question', {}).get('explanation', '')
        res = check_mismatch(p, opts, ci, expl)
        if res:
            quiz_issues.append((qid, title, qidx + 1, p[:50], res, opts, ci, expl))

print(f"Quizzes issues found: {len(quiz_issues)}")
for q in quiz_issues:
    print(f"\nQuiz #{q[0]} '{q[1]}' Q#{q[2]}:")
    print(f"  Prompt: {q[3]}")
    print(f"  Issue: {q[4]}")
    print(f"  Options: {q[5]}")
    print(f"  correctIndex: {q[6]}")
    print(f"  Expl: {q[7]}")
