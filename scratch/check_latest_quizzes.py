import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT id, title, created_at, jsonb_array_length(questions) FROM quizzes ORDER BY id DESC LIMIT 15;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Latest quizzes:\n" + stdout.read().decode('utf-8'))

cmd2 = """su - postgres -c "psql -d profile -t -A -c \\"SELECT id, lesson, created_at, question::text FROM question_bank ORDER BY id DESC LIMIT 20;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd2)
lines = stdout.read().decode('utf-8').strip().split('\n')
print("Latest 20 question_bank items:")
for l in lines:
    if not l.strip(): continue
    parts = l.split('|')
    qid = parts[0]
    lesson = parts[1]
    created = parts[2]
    qdata = json.loads(parts[3])
    print(f"ID {qid} ({lesson}): {qdata.get('prompt')[:60]}... | Options: {len(qdata.get('options', []))}")
    for idx, opt in enumerate(qdata.get('options', [])):
        if len(opt) < 3 or opt.endswith('—') or opt.endswith('-') or '\n' in opt:
            print(f"   [SUSPECT OPT {idx}]: {opt}")
    expl = qdata.get('explanation', '')
    if expl and (expl.startswith('وال') or expl.endswith('—') or expl.endswith('-')):
        print(f"   [SUSPECT EXPL]: {expl}")

ssh.close()
