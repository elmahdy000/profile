import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

cmd = """PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -c "SELECT key, value FROM site_settings WHERE key LIKE '%auto_exam%';" """

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode("utf-8", errors="replace"))
print("STDERR:\n", stderr.read().decode("utf-8", errors="replace"))
ssh.close()
