import paramiko, sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def run_psql(query):
    sql = query.replace('"', '\\"')
    cmd = f'su - postgres -c "psql -d profile -c \\"{sql}\\""'
    _, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', errors='replace')

print('=== Search anywhere in quizzes for cryptography, authentication, encryption, protection ===')
print(run_psql("SELECT id, title, stage FROM quizzes WHERE title ILIKE '%crypto%' OR title ILIKE '%encrypt%' OR title ILIKE '%auth%' OR title ILIKE '%2-1%' OR title ILIKE '%2-2%';"))

print('=== Search question_bank for any english questions with encrypt/crypto ===')
print(run_psql("SELECT id, stage, unit, lesson FROM question_bank WHERE (stage ILIKE '%لغات%' OR stage ILIKE '%lang%') AND (lesson ILIKE '%encrypt%' OR lesson ILIKE '%crypto%' OR lesson ILIKE '%2-1%' OR lesson ILIKE '%2-2%');"))

c.close()
