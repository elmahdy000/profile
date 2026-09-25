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
    'lesson', lesson,
    'question', question
)::text
FROM question_bank
WHERE unit LIKE '%الأولى%' OR unit LIKE '%الاولى%'
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
rows = [json.loads(l) for l in lines if l.strip()]
print(f"Total questions in Unit 1: {len(rows)}")

# Print all prompts and their options & correct index
with open("unit1_questions.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print("Saved to unit1_questions.json")
c.close()
