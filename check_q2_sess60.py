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
    'details', details
)::text
FROM self_assessment_sessions
WHERE id = 60;
""")

data = json.loads(out.strip())
details = data['details']
print("Question #2:", details[1]['prompt'])
print("Options:", details[1]['options'])
print("Student selected:", details[1]['selectedOption'], "->", details[1]['options'][details[1]['selectedOption']])
print("System correct:", details[1]['correctOption'], "->", details[1]['options'][details[1]['correctOption']])
print("Explanation:", details[1]['explanation'])

c.close()
