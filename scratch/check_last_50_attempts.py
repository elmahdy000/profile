import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, score, created_at, answers, details FROM quiz_attempts ORDER BY id DESC LIMIT 50;" """
stdin, stdout, stderr = c.exec_command(cmd)

# Let's inspect the last 50 attempts
print("Checking last 50 attempts...")
for line in stdout:
    parts = line.strip().split('|')
    if len(parts) >= 5:
        att_id, quiz_id, st_id, score, dt = parts[0], parts[1], parts[2], parts[3], parts[4]
        print(f"Attempt #{att_id}: quiz_id={quiz_id}, student_id={st_id}, score={score}, time={dt}")

c.close()
