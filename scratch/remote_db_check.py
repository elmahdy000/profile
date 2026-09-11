import paramiko
import json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=40)

cmd = "sudo -u postgres psql -d profile -t -A -c \"SELECT json_build_object('id', id, 'title', title, 'questions', questions)::text FROM quizzes ORDER BY id DESC LIMIT 5;\""
stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', 'replace')

with open('scratch/db_dump.txt', 'w', encoding='utf-8') as f:
    f.write("--- LATEST QUIZZES ---\n")
    for line in out.strip().split('\n'):
        if line.strip():
            try:
                d = json.loads(line)
                f.write(f"Quiz ID: {d.get('id')} | Title: {d.get('title')}\n")
                for idx, q in enumerate(d.get('questions', [])):
                    f.write(f"  Q{idx+1}: {q.get('prompt')}\n")
                    f.write(f"    Options: {json.dumps(q.get('options'), ensure_ascii=False)}\n")
                    f.write(f"    Expl: {q.get('explanation')}\n")
            except Exception as e:
                f.write(f"Err: {e}\n")

    cmd2 = "sudo -u postgres psql -d profile -t -A -c \"SELECT json_build_object('id', id, 'lesson', lesson, 'question', question)::text FROM question_bank WHERE question::text LIKE '%فحص التحيز%' LIMIT 5;\""
    stdin2, stdout2, stderr2 = c.exec_command(cmd2)
    out2 = stdout2.read().decode('utf-8', 'replace')
    f.write("\n--- QUESTION BANK ---\n")
    for line in out2.strip().split('\n'):
        if line.strip():
            try:
                d = json.loads(line)
                f.write(f"Bank ID: {d.get('id')} | Lesson: {d.get('lesson')}\n")
                f.write(f"  Prompt: {d.get('question', {}).get('prompt')}\n")
                f.write(f"  Options: {json.dumps(d.get('question', {}).get('options'), ensure_ascii=False)}\n")
                f.write(f"  Expl: {d.get('question', {}).get('explanation')}\n")
            except Exception as e:
                f.write(f"Bank err: {e}\n")

c.close()
print("Done writing to scratch/db_dump.txt")
