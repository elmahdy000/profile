import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("72.62.27.196", port=22, username="root", password="e#LWhcSAa6B&R8s", timeout=20)

cmd = '''
export DATABASE_URL=$(grep DATABASE_URL /var/www/profile/.env | cut -d "=" -f2-);
node -e '
const { Client } = require("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT id, name, phone, school_name, parent_phone, center_name, appointment_slot, learning_mode FROM students WHERE id = 216");
  console.log(JSON.stringify(res.rows[0], null, 2));
  await client.end();
});
'
'''
i, o, e = c.exec_command(cmd)
out = o.read().decode('utf-8', 'replace')
err = e.read().decode('utf-8', 'replace')
print("STDOUT:\n", out)
print("STDERR:\n", err)
c.close()
