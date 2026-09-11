import sys
import paramiko
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

ids = [529, 531, 602, 633, 734, 737, 739, 742, 807, 810]
cmd = f"""su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object('id', id, 'lesson', lesson, 'question', question)::text FROM question_bank WHERE id IN ({','.join(str(i) for i in ids)});\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

for l in lines:
    if not l.strip(): continue
    d = json.loads(l)
    print(f"\n--- ID {d['id']} ({d['lesson']}) ---")
    print(json.dumps(d['question'], ensure_ascii=False, indent=2))

ssh.close()
