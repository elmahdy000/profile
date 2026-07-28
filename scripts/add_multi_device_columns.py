import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SERVER_HOST = "72.62.27.196"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "e#LWhcSAa6B&R8s"

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_HOST, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASS, timeout=30)
    print("SSH Connected!")

    stdin, stdout, stderr = client.exec_command("grep DATABASE_URL /var/www/profile/.env | head -1 | cut -d= -f2-")
    db_url = stdout.read().decode().strip()
    if not db_url:
        print("ERROR: Could not read DATABASE_URL from .env")
        client.close()
        return

    print(f"DATABASE_URL found: {db_url[:40]}...")

    sql = """
    ALTER TABLE students ADD COLUMN IF NOT EXISTS max_devices INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS bound_devices JSONB NOT NULL DEFAULT '[]'::jsonb;
    """
    cmd = f'psql "{db_url}" -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print("STDOUT:", out)
    if err:
        print("STDERR:", err)

    stdin, stdout, stderr = client.exec_command("pm2 restart drelmahdy-backend")
    print(stdout.read().decode().strip())
    client.close()

if __name__ == "__main__":
    main()
