import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'answers', answers, 'score', score, 'details', details)::text FROM quiz_attempts WHERE quiz_id = 37 ORDER BY id DESC LIMIT 2;" """
stdin, stdout, stderr = c.exec_command(cmd)

for line in stdout:
    if line.strip():
        a = json.loads(line)
        print(f"Attempt ID: {a['id']}, Score: {a['score']}")
        print(f"Answers length: {len(a.get('answers', []))}")
        print(f"Answers: {a.get('answers')}")
        details = a.get('details', [])
        print(f"Details length: {len(details)}")
        for d in details[:5]:
            print(f"  detail: {d}")

c.close()
