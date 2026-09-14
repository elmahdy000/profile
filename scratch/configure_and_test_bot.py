import paramiko

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

remote_script = """import os
import json
import psycopg2

db_url = os.environ.get("DATABASE_URL")
if not db_url and os.path.exists("/var/www/profile/.env"):
    with open("/var/www/profile/.env") as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
                break

if not db_url:
    print("DATABASE_URL not found!")
    exit(1)

conn = psycopg2.connect(db_url)
cur = conn.cursor()

settings = {
    "enabled": True,
    "timeOfDay": "08:00",
    "questionsCount": 10,
    "passingScore": 60,
    "durationMinutes": 20,
    "targetCourseId": None,
    "targetStage": "all",
    "difficultyDistribution": {
        "easy": 3,
        "medium": 5,
        "hard": 2
    },
    "telegram": {
        "enabled": True,
        "botToken": "8821235319:AAFdp8sjIFo9G75AmDf9UXLcbVQxYjS2lac",
        "chatId": "744591440"
    },
    "whatsapp": {
        "enabled": False,
        "phoneNumber": "",
        "webhookUrl": ""
    }
}

val_str = json.dumps(settings, ensure_ascii=False)

cur.execute("SELECT id FROM site_settings WHERE key = 'auto_exam_settings'")
row = cur.fetchone()
if row:
    cur.execute("UPDATE site_settings SET value = %s, type = 'json' WHERE key = 'auto_exam_settings'", (val_str,))
else:
    cur.execute("INSERT INTO site_settings (key, value, type) VALUES ('auto_exam_settings', %s, 'json')", (val_str,))

conn.commit()
print("SUCCESSFULLY SAVED SETTINGS IN DB!")
conn.close()
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/save_bot_settings.py", "w") as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("python3 /tmp/save_bot_settings.py")
out = stdout.read().decode("utf-8")
err = stderr.read().decode("utf-8")
print("STDOUT:\n", out)
if err:
    print("STDERR:\n", err)

ssh.close()
