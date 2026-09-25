import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(title, sql):
    print(f"=== {title} ===")
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print("ERR:", err)

q("COUNT QUESTIONS UNDER 2-3", """
SELECT count(*), stage, unit, lesson, min(id), max(id) 
FROM question_bank 
WHERE lesson LIKE '%2-3%' OR lesson LIKE '%Security Incident%'
GROUP BY stage, unit, lesson;
""")

q("VIDEOS FOR UNIT 2 IN LANGUAGES (COURSE 18)", """
SELECT id, title, course_id, unit, lesson, quiz_id 
FROM videos 
WHERE course_id = 18 
ORDER BY id;
""")

q("QUIZZES FOR LESSON 2-3", """
SELECT id, title, course_id, category, stage, video_id, created_at 
FROM quizzes 
WHERE title LIKE '%Security Incident%' OR title LIKE '%2-3%' OR id >= 68;
""")

q("CURRICULUM LESSON 2-2", """
SELECT * FROM curriculums WHERE stage LIKE '%لغات%' OR title LIKE '%لغات%';
""")

c.close()
