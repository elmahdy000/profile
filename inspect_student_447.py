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

student_json = q("SELECT row_to_json(s)::text FROM students s WHERE id = 447;")
student = json.loads(student_json.strip())

print("بيانات الطالب محمد خالد الهادي (447):")
for k, v in student.items():
    print(f"  {k}: {v}")

print("\n--- الكورسات المسجل بها الطالب ---")
print("enrolled_course_ids:", student.get('enrolled_course_ids'))
print("enrolled_categories:", student.get('enrolled_categories'))
print("status:", student.get('status'))
print("payment_status:", student.get('payment_status'))
print("learning_mode:", student.get('learning_mode'))
print("education_grade:", student.get('education_grade'))
print("education_system:", student.get('education_system'))
print("school_type:", student.get('school_type'))
print("academic_track:", student.get('academic_track'))
print("language_track:", student.get('language_track'))
print("subscription_status:", student.get('subscription_status'))
print("subscription_end_date:", student.get('subscription_end_date'))
