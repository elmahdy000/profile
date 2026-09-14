import os, tarfile, paramiko, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

local_api_dist = os.path.abspath("artifacts/api-server/dist")
api_tar = os.path.abspath("scratch/api_dist.tar.gz")
print(f"Creating api archive of {local_api_dist} -> {api_tar}...")
with tarfile.open(api_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(local_api_dist):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, local_api_dist)
            tar.add(full_p, arcname=rel_p)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
sftp.put(api_tar, "/tmp/api_dist.tar.gz")
sftp.close()

deploy_cmd = """
set -e
target_api="/var/www/profile/artifacts/api-server/dist"
tar -xzf /tmp/api_dist.tar.gz -C "$target_api"
rm -f /tmp/api_dist.tar.gz
pm2 restart drelmahdy-backend
"""
stdin, stdout, stderr = ssh.exec_command(deploy_cmd)
print("STDOUT:\n", stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("STDERR:\n", err)
ssh.close()
print("Backend deployed and PM2 restarted.")
