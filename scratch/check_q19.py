import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
stdin.write("SELECT id, lesson, question FROM question_bank WHERE question->>'prompt' LIKE '%متغير غير مناسب%';\n\\q\n")
stdin.flush()
print(stdout.read().decode())
ssh.close()
