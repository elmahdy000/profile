import paramiko, json, sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = 'su - postgres -c "psql -d profile -t -A -c \\"SELECT questions FROM quizzes WHERE id = 33;\\""'
stdin, stdout, stderr = ssh.exec_command(cmd)
qs = json.loads(stdout.read().decode('utf-8'))
for idx, q in enumerate(qs, 1):
    if 'يناسب الذكاء' in q.get('prompt', ''):
        print(f"Quiz 33 Question {idx}:")
        print(json.dumps(q, ensure_ascii=False, indent=2))

ssh.close()
