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
SELECT json_build_object(
    'id', id,
    'student_name', student_name,
    'details', details
)::text
FROM self_assessment_sessions
WHERE id = 60;
""")

data = json.loads(out.strip())
print("Student:", data['student_name'])
details = data['details']
for d in details:
    if 'تيار التسرب' in d['prompt'] or 'المعالجة المتوازية' in d['prompt']:
        print(f"\nQuestion #{d['questionIndex']+1}: {d['prompt']}")
        print(f"  Options: {d['options']}")
        print(f"  Student selected: {d['selectedOption']} -> '{d['options'][d['selectedOption']]}'")
        print(f"  System correct: {d['correctOption']} -> '{d['options'][d['correctOption']]}'")
        print(f"  isCorrect: {d['isCorrect']}")
        print(f"  Explanation: {d['explanation']}")

c.close()
