import paramiko, sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def run_psql(query):
    sql = query.replace('"', '\\"')
    cmd = f'su - postgres -c "psql -d profile -c \\"{sql}\\""'
    _, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', errors='replace')

print('=== 1. Check all questions with unit or lesson containing "Security" or "Incident" or "Cyber" or "Encryption" or "الدرس الثالث" ===')
print(run_psql("SELECT id, stage, unit, lesson, substring((question->>'prompt') from 1 for 60) as prompt FROM question_bank WHERE lesson ILIKE '%security%' OR lesson ILIKE '%cyber%' OR unit ILIKE '%security%' OR unit ILIKE '%cyber%' OR lesson ILIKE '%الثالث%' LIMIT 10;"))

print('=== 2. Check if there are questions in quizzes table for Unit 2 Languages ===')
print(run_psql("SELECT id, title, stage, jsonb_array_length(questions) FROM quizzes WHERE stage ILIKE '%لغات%' OR stage ILIKE '%lang%' OR title ILIKE '%security%' OR title ILIKE '%لغات%';"))

print('=== 3. Check all videos to see what lessons exist for Languages Unit 1 & Unit 2 ===')
print(run_psql("SELECT id, title, course_id, stage, lesson_number FROM videos WHERE stage ILIKE '%لغات%' OR stage ILIKE '%lang%' OR title ILIKE '%security%' OR title ILIKE '%cyber%' ORDER BY id;"))

print('=== 4. Check all courses to see what courses exist for Languages ===')
print(run_psql("SELECT id, title, category, stages FROM courses WHERE title ILIKE '%لغات%' OR title ILIKE '%lang%' OR title ILIKE '%بكالوريا%';"))

c.close()
