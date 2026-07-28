import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', 22, 'root', 'e#LWhcSAa6B&R8s')

sql = """
UPDATE courses SET stages = '["البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي", "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)", "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي", "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)"]'::jsonb WHERE id = 6;
UPDATE students SET enrolled_course_ids = '[6, 14]'::jsonb, enrolled_categories = '["C++ Programming", "مهارات الكمبيوتر (computer skills)"]'::jsonb, updated_at = NOW() WHERE payment_status = 'paid' AND (enrolled_course_ids IS NULL OR enrolled_course_ids = '[]'::jsonb);
"""

sftp = c.open_sftp()
with sftp.file('/tmp/fix.sql', 'w') as f:
    f.write(sql)
sftp.close()

stdin, stdout, stderr = c.exec_command('psql "postgresql://postgres:pass1234@localhost/profile" -f /tmp/fix.sql')
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

c.close()
