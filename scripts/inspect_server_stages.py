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

    try:
        client.connect(SERVER_HOST, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASS, timeout=30)
        
        cmd = """export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-)
psql "$DATABASE_URL" -c "SELECT DISTINCT stage FROM videos;"
psql "$DATABASE_URL" -c "SELECT DISTINCT stages FROM videos;"
psql "$DATABASE_URL" -c "SELECT DISTINCT grade FROM students;"
psql "$DATABASE_URL" -c "SELECT id, title, category, age FROM courses;"
"""
        stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
        print(stdout.read().decode('utf-8', 'ignore'))
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
