import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
SELECT qa.id, qa.student_id, s.name, qa.score, qa.created_at, qa.answers, qa.details
FROM quiz_attempts qa
JOIN students s ON s.id = qa.student_id
WHERE qa.quiz_id = 37
ORDER BY qa.id DESC;
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
lines = stdout.read().decode('utf-8').strip().split('\n')
print(f"Total attempts on Quiz 37: {len(lines)}")
for l in lines:
    parts = l.split('|')
    if len(parts) >= 7:
        aid, sid, name, score, dt = parts[0], parts[1], parts[2], parts[3], parts[4]
        dets = json.loads(parts[6])
        wrong_count = sum(1 for d in dets if not d['isCorrect'])
        print(f"Attempt #{aid} | Student {sid} ({name}) | Score: {score}% | Wrong: {wrong_count} | Date: {dt}")

c.close()
