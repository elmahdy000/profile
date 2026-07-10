import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

hostname = "72.62.27.196"
username = "root"
password = "e#LWhcSAa6B&R8s"

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
        client.connect(hostname, username=username, password=password, timeout=15)
        print("Connected!")
        
        # Check files in uploads
        run_cmd(client, "ls -la /var/www/profile/artifacts/api-server/public/uploads/")
        # Check files in public
        run_cmd(client, "ls -la /var/www/profile/artifacts/dr-mahmoud/public/")
        # Check files in dist/public
        run_cmd(client, "ls -la /var/www/profile/artifacts/dr-mahmoud/dist/public/")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
