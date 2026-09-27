import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

print("--- القيم المختلفة لـ school_type في جدول students ---")
print(q("SELECT school_type, count(*) FROM students GROUP BY school_type;"))

print("\n--- بيانات طلاب مسجلين في كورس 17 ---")
print(q("SELECT id, name, access_code, school_type, grade FROM students WHERE 17 = ANY(enrolled_course_ids) LIMIT 10;"))
