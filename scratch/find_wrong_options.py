import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'title', title, 'shuffle_questions', shuffle_questions, 'questions', questions)::text FROM quizzes WHERE id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)
raw = stdout.read().decode('utf-8')
data = json.loads(raw.strip())
qs = data['questions']

for i, q in enumerate(qs):
    prompt = q.get('prompt', '')
    if 'العلاقة بين الذكاء' in prompt or 'الأثر المجتمعي' in prompt:
        print(f"\nFound in Quiz 37 at Index {i}:")
        print(f"Prompt: {prompt}")
        print(f"Options: {q.get('options')}")
        print(f"CorrectIndex: {q.get('correctIndex')} -> Option: {q.get('options')[q.get('correctIndex')] if q.get('correctIndex') is not None and q.get('correctIndex') < len(q.get('options')) else 'OUT OF RANGE'}")
        print(f"Explanation: {q.get('explanation')}")

# Also check question_bank for these two prompts
cmd2 = """sudo -u postgres psql -d profile -t -A -c "SELECT json_build_object('id', id, 'lesson', lesson, 'question', question)::text FROM question_bank WHERE question::text LIKE '%العلاقة بين الذكاء%' OR question::text LIKE '%الأثر المجتمعي%'; " """
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
raw2 = stdout2.read().decode('utf-8')
print("\n=== In Question Bank ===")
for line in raw2.strip().split('\n'):
    if line.strip():
        b = json.loads(line)
        bq = b.get('question', {})
        print(f"Bank ID {b.get('id')} ({b.get('lesson')}):")
        print(f"  Prompt: {bq.get('prompt')}")
        print(f"  Options: {bq.get('options')}")
        print(f"  CorrectIndex: {bq.get('correctIndex')} -> Option: {bq.get('options')[bq.get('correctIndex')] if bq.get('correctIndex') is not None and bq.get('correctIndex') < len(bq.get('options')) else 'OUT OF RANGE'}")
        print(f"  Explanation: {bq.get('explanation')}")

c.close()
