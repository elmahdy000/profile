import os
import time
import tarfile
import paramiko

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

local_dist = os.path.abspath("artifacts/dr-mahmoud/dist/public")
tar_path = os.path.abspath("scratch/dist_public.tar.gz")

print(f"Creating archive of {local_dist} -> {tar_path}...")
with tarfile.open(tar_path, "w:gz") as tar:
    for root, dirs, files in os.walk(local_dist):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, local_dist)
            tar.add(full_p, arcname=rel_p)

print(f"Archive created! Size: {os.path.getsize(tar_path)} bytes")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
remote_tar = "/tmp/dist_public.tar.gz"
print(f"Uploading {tar_path} to {remote_tar}...")
sftp.put(tar_path, remote_tar)
sftp.close()

deploy_cmd = """
set -e
backup_dir="/var/www/profile/artifacts/dr-mahmoud/dist/public.backup-$(date +%s)"
target_dir="/var/www/profile/artifacts/dr-mahmoud/dist/public"

echo "Creating backup..."
cp -r "$target_dir" "$backup_dir"

echo "Extracting new public bundle..."
mkdir -p "$target_dir"
tar -xzf /tmp/dist_public.tar.gz -C "$target_dir"
chown -R root:root "$target_dir"
rm -f /tmp/dist_public.tar.gz

echo "Nginx test & reload..."
nginx -t && systemctl reload nginx
echo "DEPLOY SUCCESSFUL!"
"""

print("Executing deploy on VPS...")
stdin, stdout, stderr = ssh.exec_command(deploy_cmd)
out = stdout.read().decode("utf-8")
err = stderr.read().decode("utf-8")
print("STDOUT:\n", out)
if err:
    print("STDERR:\n", err)

ssh.close()
print("Done!")
