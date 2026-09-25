import paramiko, sys, json
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

query_sql = """
SELECT json_agg(question) FROM question_bank 
WHERE stage LIKE '%عربي%' AND lesson LIKE '%الدرس الثالث%' AND unit LIKE '%الوحدة الأولى%';
"""
sftp = c.open_sftp()
with sftp.file('/tmp/get_q3.sql', 'w') as f:
    f.write(query_sql)
sftp.close()

_, o, _ = c.exec_command('su - postgres -c "psql -d profile -t -f /tmp/get_q3.sql"')
raw_json = o.read().decode('utf-8', errors='replace').strip()

try:
    questions = json.loads(raw_json)
    print(f'Retrieved {len(questions)} questions for Lesson 3.')
    
    insert_sql = """
INSERT INTO quizzes (
    title, description, category, passing_score, is_published, stage, course_id, scope, stages, max_attempts, required_progress, shuffle_questions, show_explanations, questions
) VALUES (
    'اختبار على الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية',
    'اختبار تقييم شامل على الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية من الوحدة الأولى',
    'منهج البكالوريا : دروس البكالوريا تانية عام (عربى)',
    90,
    true,
    'البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي',
    17,
    'course',
    '["البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي"]'::jsonb,
    3,
    0,
    false,
    true,
    $Q$%s$Q$::jsonb
);
""" % json.dumps(questions, ensure_ascii=False)
    
    sftp = c.open_sftp()
    with sftp.file('/tmp/insert_quiz3.sql', 'wb') as f:
        f.write(insert_sql.encode('utf-8'))
    sftp.close()

    _, o_ins, e_ins = c.exec_command('su - postgres -c "psql -d profile -f /tmp/insert_quiz3.sql"')
    print('INSERT OUT:', o_ins.read().decode('utf-8', errors='replace'))
    print('INSERT ERR:', e_ins.read().decode('utf-8', errors='replace'))

except Exception as err:
    print('Error:', err)

# Verify
_, o_ver, _ = c.exec_command('su - postgres -c "psql -d profile -c \\"SELECT id, title, is_published, jsonb_array_length(questions) FROM quizzes WHERE title LIKE \'%الدرس الثالث%\';\\""')
print('VERIFY:')
print(o_ver.read().decode('utf-8', errors='replace'))

c.close()
