import sys
import paramiko
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT questions::text FROM quizzes WHERE id = 35;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
raw_json = stdout.read().decode('utf-8', 'replace').strip()

questions = json.loads(raw_json)
print(f"Quiz 35 has {len(questions)} questions.\n")

with open('scratch/quiz35_questions.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

cut_off = []
for idx, q in enumerate(questions):
    prompt = q.get('prompt', '')
    opts = q.get('options', [])
    expl = q.get('explanation', '')

    issues = []
    if prompt.endswith('و') or prompt.endswith('—') or prompt.endswith('-') or prompt.endswith('في') or prompt.endswith('من') or prompt.endswith('إلى') or len(prompt) < 15:
        issues.append(f"Prompt cut off? '{prompt}'")
    for oi, opt in enumerate(opts):
        if opt.endswith('و') or opt.endswith('—') or opt.endswith('-') or len(opt) < 3:
            issues.append(f"Option {oi} cut off? '{opt}'")
    if expl and (expl.endswith('و') or expl.endswith('—') or expl.startswith('وال') or expl.startswith('و')):
        issues.append(f"Explanation cut off? '{expl}'")

    if issues:
        cut_off.append((idx + 1, issues, q))

print(f"Found {len(cut_off)} potentially cut off questions in Quiz 35:\n")
for qnum, issues, q in cut_off:
    print(f"--- Question {qnum} ---")
    print(f"  Prompt: {q.get('prompt')}")
    print(f"  Options: {q.get('options')}")
    print(f"  Explanation: {q.get('explanation')}")
    print(f"  Issues: {issues}\n")

ssh.close()
