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
print(f"Session 60 has {len(details)} questions.")

with open("session_60_all_details.json", "w", encoding="utf-8") as f:
    json.dump(details, f, ensure_ascii=False, indent=2)

print("Saved to session_60_all_details.json")
c.close()
