import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

check_sql = """
mysql -u profile -pe#LWhcSAa6B&R8s profile -e "
SELECT id, lesson, COUNT(*) as cnt FROM question_bank WHERE lesson LIKE '%2-%' OR lesson LIKE '%Security%' OR lesson LIKE '%Encryption%' GROUP BY lesson;
SELECT id, title, video_id, JSON_LENGTH(questions) as q_count FROM quizzes WHERE title LIKE '%Unit 2%' OR title LIKE '%Lesson 2%' OR title LIKE '%Lesson 3%';
"
"""

stdin, stdout, stderr = ssh.exec_command(check_sql)
print("=== CURRENT STATE ===")
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
