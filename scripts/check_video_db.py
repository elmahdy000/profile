checks = [
    # 1. DB tables count
    "SELECT 'videos' as tbl, COUNT(*) FROM videos UNION ALL SELECT 'students', COUNT(*) FROM students UNION ALL SELECT 'courses', COUNT(*) FROM courses UNION ALL SELECT 'video_progress', COUNT(*) FROM video_progress;",
    # 2. Uploads folder
    "ls -lh /var/www/profile/artifacts/api-server/public/uploads/ | tail -5",
    # 3. PM2 status
    "pm2 list",
    # 4. Nginx status
    "systemctl is-active nginx",
    # 5. API health check
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/videos",
    # 6. Frontend serving
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/",
]

import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

labels = ["📊 DB Table Counts", "📁 Uploads Folder", "⚙️  PM2 Processes", "🌐 Nginx Status", "🔗 API /videos Response", "🏠 Frontend Response"]

for i, (label, cmd) in enumerate(zip(labels, checks)):
    print(f"\n{'='*50}")
    print(f"{label}")
    print('='*50)
    if i == 0:
        full_cmd = f"cd /var/www/profile && DB=$(grep DATABASE_URL .env | head -1 | cut -d= -f2-) && psql \"$DB\" -c \"{cmd}\" 2>&1"
    elif i == 1:
        full_cmd = cmd
    else:
        full_cmd = cmd
    stdin, stdout, stderr = client.exec_command(full_cmd, get_pty=True)
    for line in stdout:
        print(line, end='')

client.close()
print("\n\n✅ Health check complete!")

