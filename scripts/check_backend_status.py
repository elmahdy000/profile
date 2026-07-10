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
        
        # 1. Fetch backend error logs
        run_cmd(client, "tail -n 50 /root/.pm2/logs/drelmahdy-backend-error.log")
        
        # 2. Check Drizzle migration status
        run_cmd(client, "export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-) && cd /var/www/profile/lib/db && npx drizzle-kit push --config ./drizzle.config.ts")
        
        # 3. Check postgres tables directly
        run_cmd(client, "sudo -u postgres psql -d profile -c \"\\dt\"")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
