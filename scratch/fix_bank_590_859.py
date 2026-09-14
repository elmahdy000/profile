import paramiko, base64, json, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Fix Bank 590 (correctIndex should be 0: قانون مور)
# Fix Bank 859 (correctIndex should be 2: التمييز بين الأفراد)
sql = """
UPDATE question_bank 
SET question = jsonb_set(question, '{correctIndex}', '0'::jsonb) 
WHERE id = 590;

UPDATE question_bank 
SET question = jsonb_set(question, '{correctIndex}', '2'::jsonb) 
WHERE id = 859;

SELECT id, question->>'prompt' as prompt, question->'correctIndex' as correct_index, question->'options' as options 
FROM question_bank 
WHERE id IN (590, 859);
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
stdin, stdout, stderr = c.exec_command(f'echo {b64} | base64 -d | sudo -u postgres psql -d profile')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

c.close()
