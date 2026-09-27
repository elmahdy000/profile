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

print("--- 1. البحث عن الطالب بالكود BFNGQT ---")
out_student = q("""
SELECT json_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'parentPhone', parent_phone,
    'accessCode', access_code,
    'stage', stage,
    'stages', stages,
    'learningMode', learning_mode,
    'status', status,
    'isApproved', is_approved,
    'isPaid', is_paid,
    'enrolledCourses', enrolled_courses,
    'approvedCourses', approved_courses,
    'selectedCourses', selected_courses,
    'governorate', governorate,
    'centerName', center_name,
    'createdAt', created_at
)::text
FROM students
WHERE UPPER(access_code) = 'BFNGQT';
""")

print("Student Data:\n", out_student.strip())

if not out_student.strip():
    print("لم يتم العثور على طالب بهذا الكود بالضبط! جاري البحث الجزئي:")
    search_all = q("SELECT id, name, phone, access_code, stage, status, is_approved, is_paid FROM students WHERE access_code ILIKE '%BFNGQT%';")
    print(search_all.strip())
