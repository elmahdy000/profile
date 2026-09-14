import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -c "
SELECT id, stage, unit, lesson, question
FROM question_bank 
WHERE question::text LIKE '%يناسب الذكاء%';
" """

stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
with open('scratch/db_match_bank.txt', 'w', encoding='utf-8') as f:
    f.write(out)
print('Bank matches length:', len(out))

cmd2 = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -c "
SELECT id, title, questions
FROM quizzes 
WHERE questions::text LIKE '%يناسب الذكاء%';
" """

stdin, stdout, stderr = ssh.exec_command(cmd2)
out2 = stdout.read().decode('utf-8', errors='replace')
with open('scratch/db_match_quizzes.txt', 'w', encoding='utf-8') as f:
    f.write(out2)
print('Quizzes matches length:', len(out2))

ssh.close()
