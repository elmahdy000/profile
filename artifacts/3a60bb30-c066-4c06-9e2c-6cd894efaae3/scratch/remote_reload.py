import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s', timeout=15)

_, o, _ = c.exec_command('pm2 restart drelmahdy-backend --update-env && nginx -t && systemctl reload nginx && echo DEPLOY_SUCCESS')
out = o.read().decode('utf-8', 'replace')
print("RESULT:", out[-300:])
c.close()
