import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("72.62.27.196", port=22, username="root", password="e#LWhcSAa6B&R8s", timeout=20)

cmd = "pm2 show drelmahdy-backend"
i, o, e = c.exec_command(cmd)
out = o.read().decode('utf-8', 'replace')
print("PM2 SHOW:\n", out)
c.close()
