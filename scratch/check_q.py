import sys
import paramiko
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# stdin, stdout, stderr = ssh.exec_command('find /root /var/www -name "*.docx" -o -name "*.pdf" -o -name "*.txt"')

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
query = """
SELECT id, lesson, question->>'prompt' as prompt, question->'options' as options, question->>'explanation' as expl
FROM question_bank
WHERE question->>'prompt' LIKE '%و'
   OR question->>'prompt' LIKE '%A)'
   OR question->>'prompt' LIKE '%ما فائدة'
   OR jsonb_path_exists(question, '$.options[*] ? (@ like_regex "(^.{1,3}$|\\\\sو$|\\\\n[B-D]\\\\))")')
ORDER BY id;
\q
"""
stdin.write(query)
stdin.flush()
print("Suspicious Questions:")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
