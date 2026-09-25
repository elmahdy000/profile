import paramiko, sys, json
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Run curl to localhost:3000/api/admin/learning/test-bank/tree using token or check backend logic
_, o, _ = c.exec_command('curl -s http://localhost:3000/api/learning/self-assessment/taxonomy')
print('=== TAXONOMY OUTPUT ===')
try:
    data = json.loads(o.read().decode('utf-8', errors='replace'))
    print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print('Error:', e)

c.close()
