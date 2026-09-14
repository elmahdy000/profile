import paramiko
import json

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

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

val_json = json.dumps(settings, ensure_ascii=False).replace("'", "''")

sql = f"""DELETE FROM site_settings WHERE key = 'auto_exam_settings';
INSERT INTO site_settings (key, value, type) VALUES ('auto_exam_settings', '{val_json}', 'json');
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/settings.sql", "w") as f:
    f.write(sql)
sftp.close()

cmd = "PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -f /tmp/settings.sql"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("PSQL STDOUT:\n", stdout.read().decode("utf-8"))
print("PSQL STDERR:\n", stderr.read().decode("utf-8"))

# Verify saved value
stdin, stdout, stderr = ssh.exec_command("PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -c \"SELECT key, value FROM site_settings WHERE key = 'auto_exam_settings'\"")
print("VERIFY:\n", stdout.read().decode("utf-8"))

ssh.close()
