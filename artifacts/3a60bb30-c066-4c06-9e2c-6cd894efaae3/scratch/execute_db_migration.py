import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=40)

def run_query(sql):
    escaped_sql = sql.replace('"', '\\"')
    stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d profile -c "{escaped_sql}"')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if err and "NOTICE" not in err:
        print("ERR:", err)
    return out

print("=== 1. ADD COLUMNS CENTER_CONFIRMED & CENTER_CONFIRMED_AT ===")
print(run_query("""
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS center_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS center_confirmed_at timestamp;
"""))

print("=== 2. CONFIRM EXISTING STUDENTS WHO ALREADY HAVE A CENTER (263 STUDENTS) ===")
print(run_query("""
UPDATE students 
SET center_confirmed = true, 
    center_confirmed_at = COALESCE(approved_at, created_at, NOW())
WHERE center_name IS NOT NULL AND TRIM(center_name) != '';
"""))

print("=== 3. VERIFY CONFIRMED VS UNCONFIRMED BY LEARNING MODE ===")
print(run_query("""
SELECT 
    COALESCE(learning_mode, 'غير محدد') as mode,
    center_confirmed,
    count(*)
FROM students
GROUP BY 1, 2
ORDER BY 1, 2;
"""))

print("=== 4. SEND URGENT IN-APP NOTIFICATION TO THE 50 OFFLINE UNCONFIRMED STUDENTS ===")
# Send notification to offline students where center_confirmed is false
notif_sql = """
INSERT INTO student_notifications (student_id, title, message, type, created_at)
SELECT 
    id,
    '⚠️ إنذار هام وإلزامي: تأكيد السنتر والميعاد الحضوري',
    'عزيزي الطالب، نظراً لتسجيلك بالنظام الحضوري (أوفلاين) دون تحديد السنتر، يرجى الدخول لصفحة حسابك وتأكيد السنتر والميعاد النهائي الخاص بك لاستخراج كارت الـ ID وتثبيت مقعدك. تنبيه: يتم الاختيار لمرة واحدة فقط وفي حال عدم التأكيد سيتم إلغاء القيد من المنصة.',
    'warning',
    NOW()
FROM students
WHERE learning_mode = 'offline' AND center_confirmed = false;
"""
print(run_query(notif_sql))

print("=== 5. CHECK INSERTED NOTIFICATIONS FOR UNCONFIRMED STUDENTS ===")
print(run_query("""
SELECT count(*) 
FROM student_notifications 
WHERE title LIKE '%تأكيد السنتر والميعاد الحضوري%';
"""))

ssh.close()
