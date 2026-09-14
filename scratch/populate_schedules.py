import paramiko
import json
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

config = {
    "channels": {
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
    },
    "schedules": [
        {
            "id": "sched_stage2_arabic_ethics",
            "title": "اختبار يومي: تانية بكالوريا عربي - أخلاقيات الذكاء الاصطناعي",
            "enabled": True,
            "timeOfDay": "08:00",
            "stage": "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
            "unit": "منهج البكالوريا : دروس البكالوريا تانية عام (عربى)",
            "lesson": "الدرس الرابع : القضايا الاخلاقية المتعلقة بالذكاء الاصطناعى",
            "courseId": None,
            "questionsCount": 5,
            "durationMinutes": 15,
            "passingScore": 60,
            "difficultyDistribution": {
                "easy": 2,
                "medium": 2,
                "hard": 1
            }
        },
        {
            "id": "sched_stage2_languages_ethics",
            "title": "اختبار يومي: تانية بكالوريا لغات - AI Ethics",
            "enabled": True,
            "timeOfDay": "09:30",
            "stage": "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
            "unit": "منهج بكالوريا : تانية بكالوريا لغات",
            "lesson": "lesson 1-4 : AI Ethics",
            "courseId": None,
            "questionsCount": 5,
            "durationMinutes": 15,
            "passingScore": 60,
            "difficultyDistribution": {
                "easy": 1,
                "medium": 3,
                "hard": 1
            }
        },
        {
            "id": "sched_stage2_arabic_how_ai_works",
            "title": "اختبار يومي: تانية بكالوريا عربي - كيف يعمل الذكاء الاصطناعي",
            "enabled": True,
            "timeOfDay": "18:00",
            "stage": "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
            "unit": "منهج البكالوريا : دروس البكالوريا تانية عام (عربى)",
            "lesson": "الوحدة الاولى - الدرس الثانى : كيف يعمل الذكاء الاصطناعى",
            "courseId": None,
            "questionsCount": 5,
            "durationMinutes": 15,
            "passingScore": 60,
            "difficultyDistribution": {
                "easy": 2,
                "medium": 2,
                "hard": 1
            }
        }
    ]
}

val_json = json.dumps(config, ensure_ascii=False).replace("'", "''")

sql = f"""DELETE FROM site_settings WHERE key = 'auto_exam_schedules';
INSERT INTO site_settings (key, value, type) VALUES ('auto_exam_schedules', '{val_json}', 'json');
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/schedules.sql", "w") as f:
    f.write(sql)
sftp.close()

cmd = "PGPASSWORD=pass1234 psql -h localhost -U postgres -d profile -f /tmp/schedules.sql"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("PSQL STDOUT:\n", stdout.read().decode("utf-8"))
print("PSQL STDERR:\n", stderr.read().decode("utf-8"))

ssh.close()
