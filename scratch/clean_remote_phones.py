import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
UPDATE parents SET phone = translate(phone, '٠١٢٣٤٥٦٧٨٩', '0123456789') WHERE phone ~ '[٠-٩]';
UPDATE students SET phone = translate(phone, '٠١٢٣٤٥٦٧٨٩', '0123456789') WHERE phone ~ '[٠-٩]';
UPDATE students SET parent_phone = translate(parent_phone, '٠١٢٣٤٥٦٧٨٩', '0123456789') WHERE parent_phone ~ '[٠-٩]';
SELECT id, name, phone, parent_code FROM parents WHERE id = 15;
"""

cmd = f'export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d= -f2-) && psql "$DATABASE_URL" -c "{sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("STDOUT:\n", out)
if err:
    print("STDERR:\n", err)

ssh.close()
