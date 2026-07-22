import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

checks = [
    # Check the actual videos table columns in DB
    ("Videos table schema on server",
     "cd /var/www/profile && DB=$(grep DATABASE_URL .env | head -1 | cut -d= -f2-) && psql \"$DB\" -c \"\\d videos\" 2>&1"),
    # Check what the dist code expects
    ("Dist build timestamp",
     "ls -lh /var/www/profile/artifacts/api-server/dist/index.mjs"),
    # Check full error log
    ("Full error log (last 20 lines)",
     "tail -20 /root/.pm2/logs/drelmahdy-backend-error.log 2>&1"),
    # Quick API test with auth
    ("API /api/videos with student cookie (expect 401)",
     "curl -s http://localhost:5000/api/videos | head -c 200"),
    # Run migrations
    ("Check if migrations needed",
     "cd /var/www/profile && ls artifacts/api-server/src/db/migrations/ 2>&1 | head -10"),
]

for label, cmd in checks:
    print(f"\n{'='*60}")
    print(f"  {label}")
    print('='*60)
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print(out or '(no output)')

client.close()
