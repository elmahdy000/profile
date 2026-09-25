import paramiko
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

out = q("""
SELECT id, session_id, student_name, stage, unit, questions_count, score, percentage, created_at
FROM self_assessment_sessions
ORDER BY id DESC
LIMIT 5;
""")

print("RECENT SESSIONS:")
print(out)

# Let's inspect the latest completed session questions:
out2 = q("""
SELECT json_build_object(
    'id', id,
    'questions', questions
)::text
FROM self_assessment_sessions
WHERE status = 'completed'
ORDER BY id DESC
LIMIT 1;
""")

try:
    sess = json.loads(out2.strip())
    print(f"\nLatest Completed Session ID: {sess['id']}")
    qs = sess['questions']
    print(f"Total questions in session: {len(qs)}")
    for i, q in enumerate(qs):
        if 'تيار التسرب' in q.get('prompt', '') or 'المعالجة المتوازية' in q.get('prompt', ''):
            print(f"\n#{i+1}: {q.get('prompt')}")
            print(f"  Options: {q.get('options')}")
            print(f"  correctIndex: {q.get('correctIndex')} -> '{q.get('options')[q.get('correctIndex')]}'")
            print(f"  Explanation: {q.get('explanation')}")
except Exception as e:
    print("Error:", e)

c.close()
