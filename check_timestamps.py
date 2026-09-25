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

print('=== Created_at of Security Incident questions ===')
print(run_psql("SELECT min(created_at), max(created_at), count(*) FROM question_bank WHERE lesson ILIKE '%Security Incident%';"))

print('=== Are there any other questions created around that time? ===')
print(run_psql("SELECT DISTINCT unit, lesson, stage, count(*) FROM question_bank WHERE created_at >= (SELECT min(created_at) FROM question_bank WHERE lesson ILIKE '%Security Incident%') GROUP BY unit, lesson, stage;"))

c.close()
