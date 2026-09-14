import os
import time
import tarfile
import json
import paramiko

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

# 1. Package frontend
local_fe_dist = os.path.abspath("artifacts/dr-mahmoud/dist/public")
fe_tar = os.path.abspath("scratch/dist_public.tar.gz")
print(f"Creating frontend archive of {local_fe_dist} -> {fe_tar}...")
with tarfile.open(fe_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(local_fe_dist):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, local_fe_dist)
            tar.add(full_p, arcname=rel_p)
print(f"Frontend archive created: {os.path.getsize(fe_tar)} bytes")

# 2. Package backend
local_api_dist = os.path.abspath("artifacts/api-server/dist")
api_tar = os.path.abspath("scratch/api_dist.tar.gz")
print(f"Creating api archive of {local_api_dist} -> {api_tar}...")
with tarfile.open(api_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(local_api_dist):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, local_api_dist)
            tar.add(full_p, arcname=rel_p)
print(f"API archive created: {os.path.getsize(api_tar)} bytes")

# 3. Connect via SSH/SFTP
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
print("Uploading frontend archive...")
sftp.put(fe_tar, "/tmp/dist_public.tar.gz")
print("Uploading api archive...")
sftp.put(api_tar, "/tmp/api_dist.tar.gz")
sftp.close()

# 4. Deploy command on VPS
deploy_cmd = """
set -e

echo "Deploying frontend..."
target_fe="/var/www/profile/artifacts/dr-mahmoud/dist/public"
backup_fe="/var/www/profile/artifacts/dr-mahmoud/dist/public.bak-$(date +%s)"
cp -r "$target_fe" "$backup_fe"
tar -xzf /tmp/dist_public.tar.gz -C "$target_fe"
rm -f /tmp/dist_public.tar.gz

echo "Deploying backend api..."
target_api="/var/www/profile/artifacts/api-server/dist"
backup_api="/var/www/profile/artifacts/api-server/dist.bak-$(date +%s)"
cp -r "$target_api" "$backup_api"
tar -xzf /tmp/api_dist.tar.gz -C "$target_api"
rm -f /tmp/api_dist.tar.gz

echo "Restarting PM2 backend..."
pm2 restart drelmahdy-backend

echo "Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "DEPLOY COMPLETED SUCCESSFULLY!"
"""

print("Executing deploy on VPS...")
stdin, stdout, stderr = ssh.exec_command(deploy_cmd)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print("STDOUT:\n", out)
if err:
    print("STDERR:\n", err)

time.sleep(2)
# Check PM2 status
stdin, stdout, stderr = ssh.exec_command("pm2 jlist")
procs = json.loads(stdout.read().decode("utf-8"))
for p in procs:
    if p["name"] == "drelmahdy-backend":
        print(f"PM2 Status for {p['name']}: {p['pm2_env']['status']} (restarts: {p['pm2_env']['restart_time']})")

ssh.close()
