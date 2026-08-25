import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=15)

def run(cmd):
    i, o, e = c.exec_command(cmd)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    return out or err

print('=== PAYMENT RECEIPTS RECENT ===')
print(run("""sudo -u postgres psql -d profile -c "SELECT id, student_id, status, created_at, snapshot_student_name FROM payment_receipts ORDER BY created_at DESC LIMIT 10;" """))

print('\n=== UNPAID STUDENTS (sample 20) ===')
print(run("""sudo -u postgres psql -d profile -c "SELECT name, phone, grade, payment_status, subscription_status FROM students WHERE status='approved' AND payment_status='unpaid' ORDER BY name LIMIT 20;" """))

print('\n=== PAID STUDENTS COUNT BY GRADE ===')
print(run("""sudo -u postgres psql -d profile -c "SELECT grade, payment_status, COUNT(*) FROM students WHERE status='approved' GROUP BY grade, payment_status ORDER BY grade, payment_status;" """))

c.close()
