import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://drelmahdy.com/api/admin/learning/test-bank/tree"
# We can also check local port on server via ssh or check health
import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')
_, o, _ = c.exec_command('curl -s http://127.0.0.1:3000/api/health')
print("HEALTH:", o.read().decode())
c.close()
