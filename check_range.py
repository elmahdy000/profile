import paramiko, sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def run_psql(query):
    sql = query.replace('"', '\\"')
    cmd = f'su - postgres -c "psql -d profile -c \\"{sql}\\""'
    _, o, e = c.exec_command(cmd)
    return o.read().decode('utf-8', errors='replace')

print('min, max, count in question_bank:', run_psql('SELECT min(id), max(id), count(*) FROM question_bank;'))

# Check if there are any files or docs or uploads on server in /var/www or /tmp
_, o_ls, _ = c.exec_command('ls -la /tmp/*.sql /tmp/*.json /var/www/ 2>/dev/null')
print('files:', o_ls.read().decode('utf-8', errors='replace'))

c.close()
