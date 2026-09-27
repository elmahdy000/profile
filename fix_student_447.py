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

# 1. تصحيح school_type للطلاب الذين في مدارس عربي ولكن لديهم school_type = 'general'
update_sql = """
UPDATE students
SET school_type = 'arabic',
    updated_at = NOW()
WHERE id IN (447, 424, 532) AND (school_type = 'general' OR school_type IS NULL);
"""

res = q(update_sql)
print("نتيجة التحديث:", res.strip())

# 2. التحقق من بيانات الطالب 447 بعد التحديث
verify_st = q("SELECT id, name, access_code, school_type, grade, enrolled_course_ids::text FROM students WHERE id = 447;")
print("بيانات الطالب بعد التحديث:", verify_st.strip())
