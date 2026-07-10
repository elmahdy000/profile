import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

hostname = "72.62.27.196"
username = "root"
password = "e#LWhcSAa6B&R8s"

def sftp_upload_dir(sftp, local_dir, remote_dir):
    print(f"Syncing directory: {local_dir} -> {remote_dir}")
    # Ensure remote directory exists
    try:
        sftp.mkdir(remote_dir)
        print(f"Created remote directory: {remote_dir}")
    except IOError:
        pass # Directory already exists
        
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f"Uploaded: {local_path} -> {remote_path}")

def run_cmd(client, cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out.strip())
    if err:
        print(f"[ERR] {err.strip()}")

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname, username=username, password=password, timeout=30)
        print("Connected to server successfully!")
        
        sftp = client.open_sftp()
        
        # 1. Sync public/ directory (contains logo and favicon source files)
        local_public = r"c:\Users\engel\Desktop\profile\artifacts\dr-mahmoud\public"
        remote_public = "/var/www/profile/artifacts/dr-mahmoud/public"
        sftp_upload_dir(sftp, local_public, remote_public)
        
        # 2. Sync dist/ directory (contains compiled client files, assets, index.html)
        local_dist = r"c:\Users\engel\Desktop\profile\artifacts\dr-mahmoud\dist"
        remote_dist = "/var/www/profile/artifacts/dr-mahmoud/dist"
        sftp_upload_dir(sftp, local_dist, remote_dist)

        # Sync api-server/dist directory (contains compiled server files)
        local_api_dist = r"c:\Users\engel\Desktop\profile\artifacts\api-server\dist"
        remote_api_dist = "/var/www/profile/artifacts/api-server/dist"
        sftp_upload_dir(sftp, local_api_dist, remote_api_dist)

        # Sync db schema directory (contains schema definition changes)
        local_db_schema = r"c:\Users\engel\Desktop\profile\lib\db\src\schema"
        remote_db_schema = "/var/www/profile/lib/db/src/schema"
        sftp_upload_dir(sftp, local_db_schema, remote_db_schema)
        
        # 3. Upload source index.html
        local_index = r"c:\Users\engel\Desktop\profile\artifacts\dr-mahmoud\index.html"
        remote_index = "/var/www/profile/artifacts/dr-mahmoud/index.html"
        sftp.put(local_index, remote_index)
        print(f"Uploaded source index: {local_index} -> {remote_index}")
        
        sftp.close()
        
        # 4. Run remote migrations and reload Nginx and PM2
        run_cmd(client, "export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-) && cd /var/www/profile/lib/db && npx drizzle-kit push --config ./drizzle.config.ts")
        run_cmd(client, "sudo systemctl reload nginx")
        run_cmd(client, "pm2 restart drelmahdy-backend")
        print("\nDeployment completed successfully!")

    except Exception as e:
        print(f"Error during deployment: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
