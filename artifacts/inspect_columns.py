import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("72.62.27.196", port=22, username="root", password="e#LWhcSAa6B&R8s", timeout=20)

cmd = '''
export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d "=" -f2-);
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
"
'''
i, o, e = c.exec_command(cmd)
out = o.read().decode('utf-8', 'replace')
err = e.read().decode('utf-8', 'replace')
print("STDOUT:\n", out)
print("STDERR:\n", err)
c.close()
