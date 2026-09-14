import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -c "
SELECT difficulty, count(*) 
FROM question_bank 
WHERE stage LIKE '%الصف الثاني%' AND unit LIKE '%دروس البكالوريا%'
GROUP BY difficulty;
" """

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8', errors='replace'))
print("STDERR:", stderr.read().decode('utf-8', errors='replace'))
ssh.close()
