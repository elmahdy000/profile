import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

hostname = os.environ.get("DEPLOY_HOST")
username = os.environ.get("DEPLOY_USER")
password = os.environ.get("DEPLOY_PASSWORD")
if not all((hostname, username, password)):
    raise RuntimeError("DEPLOY_HOST, DEPLOY_USER and DEPLOY_PASSWORD are required")

def run_cmd(client, cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out)
    if err:
        print(f"[ERR] {err}")

def main():
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    try:
        client.connect(hostname, username=username, password=password, timeout=15)
        print("Connected!")

        # Verify logo URL response
        run_cmd(client, "curl -I https://drelmahdy.com/uploads/logo.jpg")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
