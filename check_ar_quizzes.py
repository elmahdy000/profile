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

print('=== ALL QUIZZES FOR ARABIC TRACK ===')
print(run_psql("SELECT id, title, is_published, jsonb_array_length(questions) as count FROM quizzes WHERE stage ILIKE '%عربي%' OR stage IS NULL ORDER BY id;"))

c.close()
