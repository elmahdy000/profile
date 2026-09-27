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

out = q("SELECT id, name, access_code, school_type, grade, enrolled_course_ids::text FROM students WHERE school_type = 'general' OR school_type NOT IN ('arabic', 'languages');")
print("الطلاب الذين لديهم school_type غير قياسي:")
for l in out.strip().split("\n"):
    print(" ", l)
