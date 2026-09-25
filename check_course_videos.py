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

print('=== VIDEOS FOR COURSE 17 (Arabic) & 18 (Languages) ===')
print(run_psql("SELECT id, title, course_id, quiz_id, lesson_number FROM videos WHERE course_id IN (17, 18) ORDER BY course_id, id;"))

print('=== ANY VIDEOS WITH STAGE LIKE BACCALAUREATE ===')
print(run_psql("SELECT id, title, course_id, quiz_id, stage FROM videos WHERE stage ILIKE '%بكالوريا%' ORDER BY id;"))

c.close()
