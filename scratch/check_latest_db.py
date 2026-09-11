import sys
import paramiko
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Check last 10 rows in question_bank
cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object('id', id, 'lesson', lesson, 'created_at', created_at, 'question', question)::text FROM question_bank ORDER BY id DESC LIMIT 15;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')

print("=== LAST 15 ROWS IN QUESTION_BANK ===")
for line in lines:
    if not line.strip(): continue
    d = json.loads(line)
    q = d['question']
    print(f"\n[ID {d['id']}] Created: {d.get('created_at')} | Lesson: {d.get('lesson')}")
    print(f"  Prompt: {q.get('prompt')}")
    print(f"  Options: {q.get('options')}")
    print(f"  Explanation: {q.get('explanation')}")

# Check last 5 quizzes
cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT json_build_object('id', id, 'title', title, 'created_at', created_at, 'q_count', jsonb_array_length(questions))::text FROM quizzes ORDER BY id DESC LIMIT 5;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8', 'replace').strip().split('\n')
print("\n=== LAST 5 QUIZZES ===")
for line in lines:
    if not line.strip(): continue
    d = json.loads(line)
    print(d)

ssh.close()
