import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, prompt, correct_index, options, explanation FROM question_bank WHERE prompt LIKE '%الحواسيب الشخصية%' OR prompt LIKE '%العلاقة بين الذكاء الاصطناعي%';" """
stdin, stdout, stderr = c.exec_command(cmd)
for line in stdout:
    parts = line.strip().split('|')
    if len(parts) >= 5:
        print(f"ID: {parts[0]}")
        print(f"Prompt: {parts[1]}")
        print(f"CorrectIndex: {parts[2]}")
        print(f"Options: {parts[3]}")
        print(f"Explanation: {parts[4]}")
        print("-" * 50)

c.close()
