import paramiko
import sys
import json

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

# فحص تفاصيل الطالب 447
st_raw = q("SELECT row_to_json(s)::text FROM students s WHERE id = 447;")
student = json.loads(st_raw.strip())

print(f"الطالب: {student['name']} (كود: {student['access_code']})")
print(f"  school_type الحالي: '{student['school_type']}'")
print(f"  grade الحالي: '{student['grade']}'")
print(f"  enrolled_course_ids: {student['enrolled_course_ids']}")

# فحص عدد الفيديوهات المطابقة لكورس 17
v_count = q("SELECT count(*) FROM videos WHERE course_id = 17 AND is_published = true;")
q_count = q("SELECT count(*) FROM quizzes WHERE course_id = 17 AND is_published = true;")
f_count = q("SELECT count(*) FROM learning_files WHERE (course_id = 17 OR 17 = ANY(course_ids)) AND is_published = true;")

print(f"\nمحتوى كورس 17 المتوفر:")
print(f"  فيديوهات: {v_count.strip()}")
print(f"  اختبارات: {q_count.strip()}")
print(f"  ملفات/مذكرات: {f_count.strip()}")
