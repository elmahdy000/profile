import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = "SELECT id, lesson, question FROM question_bank WHERE id IN (678, 523);"
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)

for line in stdout:
    parts = line.strip().split('|', 2)
    if len(parts) >= 3:
        qid, lesson, qdata_str = parts[0], parts[1], parts[2]
        q = json.loads(qdata_str)
        print(f"=== Question Bank ID {qid} ({lesson}) ===")
        print(f"Prompt: {q.get('prompt')}")
        print(f"Options: {q.get('options')}")
        print(f"correctIndex: {q.get('correctIndex')}")
        print(f"Explanation: {q.get('explanation')}")
        print()

c.close()
