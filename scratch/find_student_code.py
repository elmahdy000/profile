import paramiko, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Let's search students table for code '88S9JP'
stdin, stdout, stderr = c.exec_command('sudo -u postgres psql -d profile -c "SELECT id, name, phone, code, stage, category, course_id, status FROM students WHERE code ILIKE \'%88%\' OR code ILIKE \'%9JP%\' OR code ILIKE \'%S9%\' OR code ILIKE \'%88S9JP%\';"')
print("Students matched:")
print(stdout.read().decode('utf-8'))
print("STDERR 1:", stderr.read().decode('utf-8'))

# What if it's in parents table?
stdin2, stdout2, stderr2 = c.exec_command('sudo -u postgres psql -d profile -c "SELECT id, name, phone, code FROM parents WHERE code ILIKE \'%88%\' OR code ILIKE \'%9JP%\' OR code ILIKE \'%S9%\' OR code ILIKE \'%88S9JP%\';"')
print("Parents matched:")
print(stdout2.read().decode('utf-8'))
print("STDERR 2:", stderr2.read().decode('utf-8'))

# Also let's list latest 10 students
stdin3, stdout3, stderr3 = c.exec_command('sudo -u postgres psql -d profile -c "SELECT id, name, code, stage, category FROM students ORDER BY id DESC LIMIT 10;"')
print("Latest 10 students:")
print(stdout3.read().decode('utf-8'))
print("STDERR 3:", stderr3.read().decode('utf-8'))

c.close()
