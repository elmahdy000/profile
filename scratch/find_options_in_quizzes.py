import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, title, questions FROM quizzes;" """
stdin, stdout, stderr = c.exec_command(cmd)

raw = stdout.read().decode('utf-8')
for line in raw.strip().split('\n'):
    parts = line.split('|', 2)
    if len(parts) == 3:
        qid, title, qjson = parts[0], parts[1], parts[2]
        try:
            qs = json.loads(qjson)
            for idx, q in enumerate(qs):
                prompt = q.get('prompt', '')
                opts = q.get('options', [])
                exp = q.get('explanation', '')
                if 'الواقع الافتراضي' in str(opts) or 'كلاهما غير مرتبط' in str(opts) or 'التعلم الآلي أحد أساليبه' in str(opts):
                    print(f"\n===> FOUND IN QUIZ {qid} ({title}) - Q#{idx+1}")
                    print(f"Prompt: {prompt}")
                    print(f"Options: {opts}")
                    print(f"correctIndex: {q.get('correctIndex')} => {opts[q.get('correctIndex')] if q.get('correctIndex') is not None and q.get('correctIndex') < len(opts) else 'INVALID'}")
                    print(f"Explanation: {exp}")
        except Exception as e:
            pass

c.close()
