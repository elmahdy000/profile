import paramiko, json, sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT id, question::text FROM question_bank WHERE lesson LIKE '%الدرس الثانى%' ORDER BY id ASC;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
for l in stdout.read().decode('utf-8').strip().split('\n'):
    if not l.strip(): continue
    qid, qjson = l.split('|', 1)
    qdata = json.loads(qjson)
    print(f"\nID {qid}: {qdata.get('prompt')}")
    print(f"  Options ({len(qdata.get('options', []))}): {qdata.get('options')}")
    print(f"  Answer: {qdata.get('correctIndex')}")
    print(f"  Expl: {qdata.get('explanation')}")

ssh.close()
