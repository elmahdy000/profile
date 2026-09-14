import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Search everywhere in database
cmd = """sudo -u postgres psql -d profile -t -A -c "
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND data_type IN ('text', 'json', 'jsonb');
" """
stdin, stdout, stderr = c.exec_command(cmd)
cols = [line.strip().split('|') for line in stdout if line.strip()]

print(f"Scanning {len(cols)} columns across all tables...")
for t, col in cols:
    q = f"""SELECT count(*) FROM "{t}" WHERE "{col}"::text LIKE '%أي عبارة تصف العلاقة بين الذكاء%';"""
    stdin2, stdout2, stderr2 = c.exec_command(f"""sudo -u postgres psql -d profile -t -A -c "{q}" """)
    cnt = stdout2.read().decode('utf-8').strip()
    if cnt and cnt != '0':
        print(f"--> FOUND in table '{t}', column '{col}': {cnt} rows!")
        # Fetch matching rows
        s_cmd = f"""sudo -u postgres psql -d profile -t -A -c "SELECT id, '{t}' FROM \\\"{t}\\\" WHERE \\\"{col}\\\"::text LIKE '%أي عبارة تصف العلاقة بين الذكاء%';" """
        s_in, s_out, s_err = c.exec_command(s_cmd)
        print(s_out.read().decode('utf-8'))

c.close()
