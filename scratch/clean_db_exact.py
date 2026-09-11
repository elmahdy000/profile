import sys
import paramiko
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Fetch all questions from question_bank
stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object(\'id\', id, \'question\', question)::text FROM question_bank;\\""')
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

cleaned_count = 0
for line in lines:
    if not line.strip(): continue
    data = json.loads(line)
    qid = data['id']
    q = data['question']
    options = q.get('options', [])

    changed = False
    new_options = []
    for opt in options:
        if not isinstance(opt, str):
            new_options.append(opt)
            continue
        cleaned = re.sub(r'\s*[\r\n]+\s*[A-Da-dأابجدهإآهـ1-6]\)?\s*$', '', opt).strip()
        if cleaned != opt:
            changed = True
            new_options.append(cleaned)
        else:
            new_options.append(opt)

    if changed:
        q['options'] = new_options
        q_json_str = json.dumps(q, ensure_ascii=False).replace("'", "''")
        update_cmd = f"""su - postgres -c "psql -d profile -c \\"UPDATE question_bank SET question = '{q_json_str}'::jsonb WHERE id = {qid};\\"" """
        u_in, u_out, u_err = ssh.exec_command(update_cmd)
        u_out.read()
        cleaned_count += 1

print(f"Cleaned {cleaned_count} question bank rows in DB!")

# Now do the same for quizzes
stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object(\'id\', id, \'questions\', questions)::text FROM quizzes;\\""')
quiz_lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

quiz_cleaned = 0
for line in quiz_lines:
    if not line.strip(): continue
    data = json.loads(line)
    quiz_id = data['id']
    questions = data.get('questions', [])

    changed = False
    for q in questions:
        options = q.get('options', [])
        new_opts = []
        for opt in options:
            if not isinstance(opt, str):
                new_opts.append(opt)
                continue
            cleaned = re.sub(r'\s*[\r\n]+\s*[A-Da-dأابجدهإآهـ1-6]\)?\s*$', '', opt).strip()
            if cleaned != opt:
                changed = True
                new_opts.append(cleaned)
            else:
                new_opts.append(opt)
        q['options'] = new_opts

    if changed:
        q_json_str = json.dumps(questions, ensure_ascii=False).replace("'", "''")
        update_cmd = f"""su - postgres -c "psql -d profile -c \\"UPDATE quizzes SET questions = '{q_json_str}'::jsonb WHERE id = {quiz_id};\\"" """
        u_in, u_out, u_err = ssh.exec_command(update_cmd)
        u_out.read()
        quiz_cleaned += 1

print(f"Cleaned {quiz_cleaned} quizzes in DB!")
ssh.close()
