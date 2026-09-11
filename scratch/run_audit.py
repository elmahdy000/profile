import sys
import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object(\'id\', id, \'lesson\', lesson, \'question\', question)::text FROM question_bank ORDER BY id;\\""')
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

issues = []
for line in lines:
    if not line.strip():
        continue
    try:
        data = json.loads(line)
        qid = data.get('id')
        lesson = data.get('lesson')
        q = data.get('question', {})
        prompt = q.get('prompt', '')
        options = q.get('options', [])
        expl = q.get('explanation', '')

        reasons = []
        if len(prompt) < 12:
            reasons.append(f"Short prompt ({len(prompt)} chars): '{prompt}'")
        if prompt.endswith('و') or prompt.endswith('A)'):
            reasons.append(f"Hanging prompt end: '{prompt}'")
        if len(options) < 2:
            reasons.append(f"Too few options: {len(options)}")
        for idx, opt in enumerate(options):
            if not isinstance(opt, str):
                reasons.append(f"Option {idx} not a string")
                continue
            if len(opt.strip()) < 2:
                reasons.append(f"Very short option {idx}: '{opt}'")
            if opt.strip().endswith(' و') or opt.strip() == 'و':
                reasons.append(f"Option {idx} ends with standalone 'و': '{opt}'")
            if '\n' in opt or '\r' in opt:
                reasons.append(f"Newline in option {idx}: {repr(opt)}")
            if any(marker in opt for marker in ['B)', 'C)', 'D)', 'ب)', 'ج)', 'د)']):
                reasons.append(f"Letter marker in option {idx}: '{opt}'")

        if reasons:
            issues.append({
                'id': qid,
                'lesson': lesson,
                'prompt': prompt,
                'options': options,
                'reasons': reasons
            })
    except Exception as e:
        pass

with open('scratch/audit_report.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total Question Bank rows audited: {len(lines)}\n")
    f.write(f"Total problematic rows found: {len(issues)}\n")
    for iss in issues:
        f.write(f"\n[ID {iss['id']}] Lesson: {iss['lesson']}\n")
        f.write(f"  Prompt: {iss['prompt']}\n")
        f.write(f"  Options: {iss['options']}\n")
        f.write(f"  Issues: {', '.join(iss['reasons'])}\n")

print(f"Report written. Total rows: {len(lines)}, Problematic: {len(issues)}")
ssh.close()
