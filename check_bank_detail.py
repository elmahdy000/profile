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

print('=== Rows in منهج بكالوريا : تانية بكالوريا لغات ===')
print(run_psql("SELECT id, stage, unit, lesson, substring((question->>'prompt') from 1 for 60) as prompt FROM question_bank WHERE unit ILIKE '%تانية بكالوريا لغات%' LIMIT 10;"))

print('=== Check ALL distinct lessons across the ENTIRE question_bank ===')
print(run_psql("SELECT stage, unit, lesson, count(*) FROM question_bank GROUP BY stage, unit, lesson ORDER BY stage, unit, lesson;"))

c.close()
