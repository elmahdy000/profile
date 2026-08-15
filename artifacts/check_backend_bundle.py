import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("72.62.27.196", port=22, username="root", password="e#LWhcSAa6B&R8s", timeout=20)

cmd = '''
node -e '
const fs = require("fs");
const dist = fs.readFileSync("/var/www/profile/api-server/dist/index.mjs", "utf8");
console.log("dist length:", dist.length);
console.log("has school_name:", dist.includes("school_name"));
console.log("has center_name:", dist.includes("center_name"));
console.log("has parent_phone:", dist.includes("parent_phone"));
'
'''
i, o, e = c.exec_command(cmd)
out = o.read().decode('utf-8', 'replace')
err = e.read().decode('utf-8', 'replace')
print("STDOUT:\n", out)
print("STDERR:\n", err)
c.close()
