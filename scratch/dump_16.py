import paramiko, json, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

ids = [577, 578, 594, 637, 682, 705, 725, 729, 741, 749, 781, 788, 792, 802, 803, 816]
cmd = f"""su - postgres -c "psql -d profile -t -A -c \\"SELECT id, lesson, question::text FROM question_bank WHERE id IN ({','.join(map(str, ids))}) ORDER BY id;\\"" """

stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8').strip().split('\n')

res = {}
for l in lines:
    if not l.strip(): continue
    parts = l.split('|', 2)
    res[int(parts[0])] = {"lesson": parts[1], "question": json.loads(parts[2])}

with open('scratch/16_damaged_questions.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=2)

print("Saved 16 questions to scratch/16_damaged_questions.json")
ssh.close()
