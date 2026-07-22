import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SERVER_HOST = "72.62.27.196"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASS = "e#LWhcSAa6B&R8s"

def main():
    print("=" * 60)
    print("🚀 Connecting to Production Server VPS (72.62.27.196)...")
    print("=" * 60)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(SERVER_HOST, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASS, timeout=30)
        print("✅ SSH Connected Successfully!")

        remote_commands = [
            "cd /var/www/profile",
            "git fetch origin",
            "git reset --hard origin/main",
            "git clean -fd",
            "pnpm run build",
            "export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-)",
            "cd /var/www/profile/lib/db && npx drizzle-kit push --config ./drizzle.config.ts",
            "cd /var/www/profile && export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d '=' -f2-) && npx -y tsx scripts/migrate_educational_stages.ts",
            "pm2 restart drelmahdy-backend",
            "systemctl reload nginx"
        ]

        full_cmd = " && ".join(remote_commands) + " 2>&1"
        print(f"\n📡 Executing Remote Deploy Command:\n{full_cmd}\n")

        stdin, stdout, stderr = client.exec_command(full_cmd, get_pty=True)
        
        for line in iter(stdout.readline, ""):
            print(line, end="", flush=True)

        exit_status = stdout.channel.recv_exit_status()
        if exit_status == 0:
            print("\n🎉 LIVE PRODUCTION DEPLOYMENT & STAGE MIGRATION COMPLETED SUCCESSFULLY!")
        else:
            print(f"\n⚠️ Deployment finished with exit status {exit_status}")

    except Exception as e:
        print(f"❌ Error during remote deploy: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
