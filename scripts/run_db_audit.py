import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

script = """
SELECT 'الطلاب غير المفعلين (في انتظار التفعيل)' as check_name, count(*) as count FROM students WHERE status != 'approved';
SELECT 'إيصالات دفع في انتظار المراجعة' as check_name, count(*) as count FROM payment_receipts WHERE status = 'pending';
SELECT 'طلبات استرجاع الكود المعلقة' as check_name, count(*) as count FROM code_recovery_requests WHERE status = 'pending';
SELECT 'فيديوهات غير مرتبطة بكورس محدد' as check_name, count(*) as count FROM videos WHERE course_id IS NULL;
SELECT 'فيديوهات مسودة غير منشورة' as check_name, count(*) as count FROM videos WHERE is_published = false;
SELECT 'ملفات تعليمية غير مرتبطة بكورس' as check_name, count(*) as count FROM learning_files WHERE course_id IS NULL;
SELECT 'اختبارات فارغة بدون أسئلة' as check_name, count(*) as count FROM quizzes WHERE questions IS NULL OR jsonb_array_length(questions) = 0;
"""

sftp = c.open_sftp()
with sftp.file('/tmp/audit.sql', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = c.exec_command('psql "postgresql://postgres:pass1234@localhost/profile" -f /tmp/audit.sql')
print("=== DATABASE DIAGNOSTIC AUDIT ===")
print(stdout.read().decode('utf-8'))

c.close()
