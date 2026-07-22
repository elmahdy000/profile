import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

cmd = "tail -n 50 /root/.pm2/logs/drelmahdy-backend-out.log"
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode("utf-8", errors="replace"))

print("\n--- ERROR LOGS ---")
cmd2 = "tail -n 50 /root/.pm2/logs/drelmahdy-backend-error.log"
stdin2, stdout2, stderr2 = client.exec_command(cmd2)
print(stdout2.read().decode("utf-8", errors="replace"))

client.close()
