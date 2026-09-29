import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=10)

def run(cmd):
    i, o, e = c.exec_command(cmd, timeout=10)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    return out or err

print('=== RECENT AUDIT LOGS ===')
print(run("""sudo -u postgres psql -d profile -c "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20;" """))

print('\n=== CHECK UPDATED_AT OF STUDENTS ===')
print(run("""sudo -u postgres psql -d profile -c "SELECT date_trunc('minute', updated_at) as updated_minute, count(*) FROM students GROUP BY 1 ORDER BY 1 DESC LIMIT 10;" """))

c.close()
