import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -c "
SELECT id, tags, created_at, question
FROM question_bank 
WHERE lesson LIKE '%الذكاء الاصطناعى فى حياتنا اليومية%'
ORDER BY id;
" """

stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8', errors='replace').split('\n')
with open('scratch/lesson3_questions.txt', 'w', encoding='utf-8') as f:
    for line in lines:
        if line.strip():
            f.write(line + '\n')
print(f'Total questions found: {len(lines)}')

# Also check audit logs
cmd_audit = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -t -A -c "
SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20;
" """
stdin, stdout, stderr = ssh.exec_command(cmd_audit)
with open('scratch/audit_recent.txt', 'w', encoding='utf-8') as f:
    f.write(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
