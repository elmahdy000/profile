import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT id, lesson, question::text FROM question_bank ORDER BY id ASC;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8').strip().split('\n')

print(f"Total question_bank rows: {len(lines)}")

issues = []

for l in lines:
    if not l.strip(): continue
    parts = l.split('|', 2)
    if len(parts) < 3: continue
    qid, lesson, qjson = parts[0], parts[1], parts[2]
    try:
        qdata = json.loads(qjson)
    except Exception as e:
        issues.append((qid, lesson, f"Invalid JSON: {e}", None))
        continue
    
    prompt = qdata.get('prompt', '').strip()
    opts = qdata.get('options', [])
    expl = (qdata.get('explanation') or '').strip()

    row_issues = []
    if not prompt or len(prompt) < 10:
        row_issues.append(f"Prompt too short: '{prompt}'")
    if prompt.endswith('و') or prompt.endswith('—') or prompt.endswith('-') or prompt.endswith(':'):
        row_issues.append(f"Prompt ends abruptly: '{prompt}'")

    if len(opts) < 2:
        row_issues.append(f"Only {len(opts)} options")
    for oi, opt in enumerate(opts):
        opt = opt.strip()
        if len(opt) < 2:
            row_issues.append(f"Option {oi} very short: '{opt}'")
        elif opt.endswith('—') or opt.endswith('-') or opt.endswith(':'):
            row_issues.append(f"Option {oi} ends abruptly: '{opt}'")
        elif '\n' in opt:
            row_issues.append(f"Option {oi} contains newline: '{opt}'")

    if expl:
        if expl.startswith('وال') or expl.startswith('و '):
            row_issues.append(f"Explanation starts with 'و': '{expl}'")
        elif expl.endswith('—') or expl.endswith('-') or expl.endswith(':'):
            row_issues.append(f"Explanation ends abruptly: '{expl}'")

    if row_issues:
        issues.append((qid, lesson, row_issues, qdata))

print(f"\nFound {len(issues)} items with issues in question_bank:")
for qid, lesson, r_issues, qdata in issues:
    print(f"\nID {qid} ({lesson}):")
    for iss in r_issues:
        print(f"  - {iss}")
    if qdata:
        print(f"    Prompt: {qdata.get('prompt')}")
        print(f"    Options: {qdata.get('options')}")
        print(f"    Explanation: {qdata.get('explanation')}")

ssh.close()
