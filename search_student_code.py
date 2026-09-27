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

print("--- أعمدة جدول students ---")
cols = q("\d students")
for l in cols.strip().split("\n"):
    print(" ", l)

print("\n--- آخر 10 طلاب مسجلين ---")
recent = q("SELECT id, name, phone, access_code, created_at FROM students ORDER BY id DESC LIMIT 10;")
print(recent.strip())

print("\n--- البحث بأي جزء من الكود 'BFNG' أو 'GQT' أو بدون حساسية حالة الأحرف ---")
match = q("SELECT id, name, phone, access_code FROM students WHERE access_code ILIKE '%BF%' OR access_code ILIKE '%NG%' OR access_code ILIKE '%QT%' LIMIT 20;")
print(match.strip())
