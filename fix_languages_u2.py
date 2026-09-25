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

# 1. Update Languages Unit 2
sql_fix_lang_u2 = """
UPDATE question_bank 
SET unit = 'الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)',
    lesson = 'Lesson 2-3: Security Incident (التعامل مع الحوادث الأمنية)'
WHERE (stage LIKE '%لغات%' OR stage LIKE '%Languages%')
  AND (lesson LIKE '%Security Incident%' OR unit LIKE '%تانية بكالوريا لغات%');
"""

print('Updating Languages Unit 2 in DB...')
print(run_psql(sql_fix_lang_u2))

# 2. Check question_bank distinct grouped
print('=== CURRENT STATE IN QUESTION_BANK ===')
print(run_psql("SELECT stage, unit, lesson, count(*) FROM question_bank GROUP BY stage, unit, lesson ORDER BY stage, unit, lesson;"))

c.close()
