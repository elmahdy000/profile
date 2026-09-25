import paramiko
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

out = q("""
SELECT id, title
FROM quizzes
WHERE questions::text LIKE '%ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات%'
   OR questions::text LIKE '%ما الفكرة الأساسية للمعالجة المتوازية%'
   OR questions::text LIKE '%أي مجموعة تضم تحولات اجتماعية وردت في الدرس%';
""")

print("QUIZZES CONTAINING THESE QUESTIONS:")
print(out)

c.close()
