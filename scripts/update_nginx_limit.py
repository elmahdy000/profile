import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

cmd = (
    "sed -i 's/client_max_body_size 200M;/client_max_body_size 1000M;/g' /etc/nginx/sites-enabled/drelmahdy && "
    "nginx -t && "
    "systemctl reload nginx && "
    "echo 'NGINX_RELOAD_SUCCESS'"
)

stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode("utf-8", errors="replace"))
print(stderr.read().decode("utf-8", errors="replace"))

client.close()
