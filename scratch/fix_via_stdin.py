import sys
import paramiko
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Fetch rows to clean
target_ids = [518, 807, 810, 819, 824, 844, 848, 851, 859, 863, 883]
cmd = f"""su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object('id', id, 'question', question)::text FROM question_bank WHERE id IN ({','.join(str(i) for i in target_ids)});\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

sql_statements = ["BEGIN;"]
for line in lines:
    if not line.strip(): continue
    d = json.loads(line)
    qid = d['id']
    q = d['question']
    opts = q.get('options', [])
    new_opts = []
    for opt in opts:
        if isinstance(opt, str):
            c = re.sub(r'\s*[\r\n]+\s*[A-Da-dأابجدهإآهـ1-6]\)?\s*$', '', opt).strip()
            new_opts.append(c)
        else:
            new_opts.append(opt)
    q['options'] = new_opts
    clean_json = json.dumps(q, ensure_ascii=False).replace("'", "''")
    sql_statements.append(f"UPDATE question_bank SET question = '{clean_json}'::jsonb WHERE id = {qid};")

# Also clean quizzes
cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object('id', id, 'questions', questions)::text FROM quizzes WHERE questions::text ~ '[\\\\r\\\\n]+[A-Da-dأابجدهإآهـ1-6]\\\\)?';\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
quiz_lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')
for line in quiz_lines:
    if not line.strip(): continue
    d = json.loads(line)
    quiz_id = d['id']
    questions = d.get('questions', [])
    for q in questions:
        opts = q.get('options', [])
        new_opts = []
        for opt in opts:
            if isinstance(opt, str):
                c = re.sub(r'\s*[\r\n]+\s*[A-Da-dأابجدهإآهـ1-6]\)?\s*$', '', opt).strip()
                new_opts.append(c)
            else:
                new_opts.append(opt)
        q['options'] = new_opts
    clean_quiz_json = json.dumps(questions, ensure_ascii=False).replace("'", "''")
    sql_statements.append(f"UPDATE quizzes SET questions = '{clean_quiz_json}'::jsonb WHERE id = {quiz_id};")

sql_statements.append("COMMIT;")
full_sql = "\n".join(sql_statements) + "\n\\q\n"

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
stdin.write(full_sql)
stdin.flush()

print("Execution output:")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
