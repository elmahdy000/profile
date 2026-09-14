import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
SELECT id, name, phone, code, stage, category, course_id FROM students WHERE code ILIKE '%88%' OR code ILIKE '%S9%' OR code ILIKE '%9JP%';
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A')
print("Students matched:")
for line in stdout:
    print(line.strip())

# Check parents
sql2 = """
SELECT id, name, phone, code FROM parents WHERE code ILIKE '%88%' OR code ILIKE '%S9%' OR code ILIKE '%9JP%';
"""
b64_2 = base64.b64encode(sql2.encode('utf-8')).decode('ascii')
stdin2, stdout2, stderr2 = c.exec_command(f'echo {b64_2} | base64 -d | sudo -u postgres psql -d profile -t -A')
print("\nParents matched:")
for line in stdout2:
    print(line.strip())

c.close()
