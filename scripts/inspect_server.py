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
        print("Connected successfully!")

        # Find the target directory
        print("\n--- Finding target directory ---")
        find_cmd = "find /var/www -maxdepth 2 -type d -name \".git\" -exec grep -l \"elmahdy000/profile\" {}/config \\; | sed 's|/.git/config||' | head -n 1"
        stdin, stdout, stderr = client.exec_command(find_cmd)
        target_dir = stdout.read().decode('utf-8').strip()
        print(f"Target Directory: {target_dir}")

        if target_dir:
            # Check git status on the server
            run_cmd(client, f"cd {target_dir} && git status")
            run_cmd(client, f"cd {target_dir} && git log -n 3 --oneline")
            # Check PM2 processes
            run_cmd(client, "pm2 list")
            # Query PostgreSQL database for all settings
            run_cmd(client, "sudo -u postgres psql -d profile -c \"SELECT key, SUBSTRING(value from 1 for 60) as value FROM site_settings ORDER BY key;\"")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
