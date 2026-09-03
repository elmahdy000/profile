import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

def run_query(sql_query):
    cmd = f'cd /var/www/profile && DB=$(grep DATABASE_URL .env | head -1 | cut -d= -f2-) && psql "$DB" -c \'{sql_query}\''
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', 'replace')
    print(out)

print("=== UPDATING VIDEO ORDERS FOR COURSE 17 (بكالوريا عربي) ===")
run_query("UPDATE videos SET \"order\" = 1 WHERE id = 29;")
run_query("UPDATE videos SET \"order\" = 2 WHERE id = 24;")
run_query("UPDATE videos SET \"order\" = 3 WHERE id = 27;")
run_query("UPDATE videos SET \"order\" = 4 WHERE id = 28;")

print("=== VERIFYING NEW VIDEO ORDERS FOR COURSE 17 ===")
run_query('SELECT id, title, "order", is_published, course_id FROM videos WHERE course_id = 17 ORDER BY "order" ASC;')

client.close()
