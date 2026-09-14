import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Audit script on VPS to check all quizzes and question_bank for explanation vs correctIndex contradictions
remote_script = """
import psycopg2, json, sys, re

conn = psycopg2.connect("dbname=profile user=postgres")
cur = conn.cursor()

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
    
    # Check if explanation contains or strongly matches another option while NOT matching the marked correct option
    norm_expl = normalize(explanation)
    corr_opt = normalize(options[correct_index])
    
    matches_other = []
    for idx, opt in enumerate(options):
        if idx == correct_index: continue
        norm_opt = normalize(opt)
        # If the other option is long enough and appears in explanation
        if len(norm_opt) >= 10 and norm_opt in norm_expl and corr_opt not in norm_expl:
            matches_other.append((idx, opt))
    
    if matches_other:
        return f"EXPLANATION_MISMATCH: Marked opt [{correct_index}] '{options[correct_index][:30]}' but explanation contains opt [{matches_other[0][0]}] '{matches_other[0][1][:30]}'"
    return None

print("=== 1. AUDITING QUESTION BANK ===")
cur.execute("SELECT id, lesson, question FROM question_bank ORDER BY id ASC;")
bank_rows = cur.fetchall()
bank_issues = []
for bid, lesson, qdata in bank_rows:
    p = qdata.get('prompt', '')
    opts = qdata.get('options', [])
    ci = qdata.get('correctIndex')
    expl = qdata.get('explanation', '')
    res = check_mismatch(p, opts, ci, expl)
    if res:
        bank_issues.append((bid, lesson, p[:60], res))

print(f"Total question_bank scanned: {len(bank_rows)} | Issues found: {len(bank_issues)}")
for b in bank_issues[:20]:
    print(f"  Bank #{b[0]} ({b[1]}): {b[2]} -> {b[3]}")

print("\n=== 2. AUDITING QUIZZES ===")
cur.execute("SELECT id, title, questions FROM quizzes ORDER BY id ASC;")
quiz_rows = cur.fetchall()
quiz_issues = []
for qid, title, questions in quiz_rows:
    if not isinstance(questions, list): continue
    for qidx, q in enumerate(questions):
        p = q.get('prompt', '') or q.get('question', {}).get('prompt', '')
        opts = q.get('options', []) or q.get('question', {}).get('options', [])
        ci = q.get('correctIndex') if 'correctIndex' in q else q.get('question', {}).get('correctIndex')
        expl = q.get('explanation', '') or q.get('question', {}).get('explanation', '')
        res = check_mismatch(p, opts, ci, expl)
        if res:
            quiz_issues.append((qid, title, qidx + 1, p[:50], res))

print(f"Total quizzes scanned: {len(quiz_rows)} | Issues found: {len(quiz_issues)}")
for q in quiz_issues[:20]:
    print(f"  Quiz #{q[0]} '{q[1]}' Q#{q[2]}: {q[3]} -> {q[4]}")

conn.close()
"""

sftp = c.open_sftp()
with sftp.file('/tmp/audit_mismatches.py', 'w') as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = c.exec_command("python3 /tmp/audit_mismatches.py")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

c.close()
