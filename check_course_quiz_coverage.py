import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

out = q("""
SELECT 
    c.id as course_id,
    c.title as course_title,
    count(DISTINCT v.id) as total_lessons,
    count(DISTINCT q.id) as total_quizzes,
    count(DISTINCT case when q.video_id is not null then q.video_id end) as lessons_with_quiz
FROM courses c
LEFT JOIN videos v ON v.course_id = c.id
LEFT JOIN quizzes q ON q.course_id = c.id
GROUP BY c.id, c.title
ORDER BY c.id;
""")

print("تغطية الاختبارات لكل كورس:")
for l in out.strip().split("\n"):
    if not l.strip(): continue
    parts = l.split("|")
    print(f"كورس {parts[0]} ({parts[1]}): إجمالي الدروس = {parts[2]} | إجمالي الاختبارات = {parts[3]} | دروس بها اختبار = {parts[4]}")
