import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

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
    'question', question
)::text
FROM question_bank
WHERE question::text LIKE '%تيار التسرب%'
LIMIT 1;
""")

try:
    data = json.loads(out.strip())
    print("QUESTION BANK (تيار التسرب):")
    print(json.dumps(data, ensure_ascii=False, indent=2))
except Exception as e:
    print("Error parsing:", e, out[:500])

out2 = q("""
SELECT json_build_object(
    'id', id,
    'question', question
)::text
FROM question_bank
WHERE question::text LIKE '%المعالجة المتوازية%'
LIMIT 1;
""")

try:
    data2 = json.loads(out2.strip())
    print("\nQUESTION BANK (المعالجة المتوازية):")
    print(json.dumps(data2, ensure_ascii=False, indent=2))
except Exception as e:
    print("Error parsing:", e, out2[:500])

c.close()
