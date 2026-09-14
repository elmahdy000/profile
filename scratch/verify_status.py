import sys
import json
import paramiko
import urllib.request

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

stdin, stdout, stderr = ssh.exec_command("pm2 jlist")
procs = json.loads(stdout.read().decode("utf-8"))
for p in procs:
    if p["name"] == "drelmahdy-backend":
        print(f"Backend Name: {p['name']}")
        print(f"Status: {p['pm2_env']['status']}")
        print(f"Restarts: {p['pm2_env']['restart_time']}")

# Read last 25 lines of PM2 logs for drelmahdy-backend
stdin, stdout, stderr = ssh.exec_command("pm2 logs drelmahdy-backend --lines 25 --nostream")
logs = stdout.read().decode("utf-8", errors="replace")
print("\n--- Recent Logs ---")
print(logs)

ssh.close()

# Test live website
req = urllib.request.Request(
    "https://drelmahdy.com/",
    headers={"User-Agent": "Mozilla/5.0"}
)
with urllib.request.urlopen(req) as resp:
    print(f"\nLive Site drelmahdy.com HTTP Status: {resp.status}")
