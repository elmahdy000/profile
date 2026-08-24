import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=10)

def run(cmd):
    full_cmd = "export PATH=$PATH:/usr/local/bin:~/.nvm/versions/node/v20.18.0/bin:~/.nvm/versions/node/v18.0.0/bin; " + cmd
    i, o, e = c.exec_command(full_cmd)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    return out, err

print("=== 1. SYSTEM RESOURCES ===")
out, _ = run("free -h; echo '---'; df -h /")
print(out)

print("\n=== 2. PM2 PROCESSES ===")
out, _ = run("pm2 status --no-color")
print(out if out else "pm2 not in path or empty")

print("\n=== 3. BACKEND ERROR LOGS ===")
out, _ = run("tail -n 20 ~/.pm2/logs/drelmahdy-backend-error.log")
print(out if out else "No errors in log.")

print("\n=== 4. INDEX.HTML IN DIST ===")
out, _ = run("cat /var/www/profile/artifacts/dr-mahmoud/dist/public/index.html")
print(out[:500] if out else "Empty index.html")

print("\n=== 5. CHECK ASSETS DIR FILES ===")
out, _ = run("ls -l /var/www/profile/artifacts/dr-mahmoud/dist/public/assets/ | wc -l")
print(f"Total files in assets: {out}")

out, _ = run("ls /var/www/profile/artifacts/dr-mahmoud/dist/public/assets/ | grep -i 'PlatformPage'")
print("PlatformPage files:", out if out else "None")

out, _ = run("ls /var/www/profile/artifacts/dr-mahmoud/dist/public/assets/ | grep -i 'StudentCard'")
print("StudentCard files:", out if out else "None")

c.close()
