"""
Eduverse - Git Commit + Remote Deploy
Server: 72.62.27.196
"""
import subprocess
import sys
import os
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ─── Config ──────────────────────────────────────────────
SERVER_HOST = "72.62.27.196"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "e#LWhcSAa6B&R8s"
EDUVERS_LOCAL = r"d:\coders\eduvers"
APP_DIR = "/root/eduverse"

# ─── Step 1: Git commit & push ───────────────────────────
def git_commit_push():
    print("=" * 55)
    print("  STEP 1: Git Commit & Push")
    print("=" * 55)

    subprocess.run(["git", "add", "-A"], cwd=EDUVERS_LOCAL, check=True)
    print("[OK] git add -A")

    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=EDUVERS_LOCAL, capture_output=True, text=True
    )

    if not status.stdout.strip():
        print("[INFO] Nothing new to commit.")
    else:
        result = subprocess.run(
            ["git", "commit", "-m",
             "fix: raise product limit to 500 (Tea visible), add Indomy varieties, fix indomy-addons category UI"],
            cwd=EDUVERS_LOCAL, capture_output=True, text=True
        )
        print(result.stdout.strip() or result.stderr.strip())

    result = subprocess.run(
        ["git", "push"],
        cwd=EDUVERS_LOCAL, capture_output=True, text=True
    )
    print("[OK] git push:", result.stdout.strip() or result.stderr.strip())


# ─── Step 2: SSH deploy ───────────────────────────────────
def ssh_deploy():
    print("\n" + "=" * 55)
    print("  STEP 2: SSH Deploy on Server")
    print("=" * 55)
    print(f"  Connecting to {SERVER_USER}@{SERVER_HOST}...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_HOST, port=SERVER_PORT, username=SERVER_USER,
                   password=SERVER_PASS, timeout=30)
    print(f"[OK] Connected to {SERVER_HOST}")

    cmd = f"cd {APP_DIR} && bash deploy.sh 2>&1"
    print(f"\n[RUN] {cmd}\n")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=600)

    for line in iter(stdout.readline, ""):
        print(line, end="", flush=True)

    exit_code = stdout.channel.recv_exit_status()
    client.close()

    if exit_code != 0:
        print(f"\n[FAIL] Deploy returned exit code {exit_code}")
        sys.exit(1)

    print("\n[OK] Deploy completed successfully!")


# ─── Main ────────────────────────────────────────────────
if __name__ == "__main__":
    git_commit_push()
    ssh_deploy()
    print("\n✅ Done! Check https://edu-vers.com/order")
