import paramiko, sys, json
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def run_psql(query):
    sql = query.replace('"', '\\"')
    cmd = f'su - postgres -c "psql -d profile -c \\"{sql}\\""'
    _, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', errors='replace')

print('=== Quiz 21 Details ===')
print(run_psql("SELECT id, title, category, passing_score, is_published, stage, course_id, video_id, scope, stages, max_attempts, required_progress, duration_minutes, shuffle_questions, show_explanations FROM quizzes WHERE id IN (21, 22);"))

c.close()
