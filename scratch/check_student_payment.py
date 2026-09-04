import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

def run_query(sql_query):
    cmd = f'cd /var/www/profile && DB=$(grep DATABASE_URL .env | head -1 | cut -d= -f2-) && psql "$DB" -c "{sql_query}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', 'replace')
    print(out)

print("=== ALL RECENT APPROVED STUDENTS STATUS & PAYMENT STATUS ===")
run_query('SELECT id, name, status, payment_status, grade, enrolled_course_ids FROM students WHERE status = \'approved\' ORDER BY id DESC LIMIT 30;')

client.close()
