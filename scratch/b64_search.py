import paramiko, sys, json, base64

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql = """
SELECT json_agg(t) FROM (
  SELECT id, title, prompt, correct_index, options, explanation 
  FROM question_bank 
  WHERE explanation LIKE '%تقنية ضمنه%' OR explanation LIKE '%بداية الاستخدام الشخصي%'
) t;
"""
b64 = base64.b64encode(sql.encode('utf-8')).decode('ascii')
cmd = f"echo {b64} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8').strip()
print("Bank results:")
if out and out != "":
    rows = json.loads(out)
    for r in rows:
        print(f"ID: {r['id']}")
        print(f"Prompt: {r['prompt']}")
        print(f"Options: {r['options']}")
        print(f"correct_index: {r['correct_index']}")
        print(f"explanation: {r['explanation']}")
        print("-" * 40)
else:
    print("None found in bank")

# Now check quizzes
sql2 = """
SELECT json_agg(t) FROM (
  SELECT id, title, questions 
  FROM quizzes 
  WHERE questions::text LIKE '%تقنية ضمنه%' OR questions::text LIKE '%بداية الاستخدام الشخصي%'
) t;
"""
b64_2 = base64.b64encode(sql2.encode('utf-8')).decode('ascii')
cmd2 = f"echo {b64_2} | base64 -d | sudo -u postgres psql -d profile -t -A"
stdin2, stdout2, stderr2 = c.exec_command(cmd2)
out2 = stdout2.read().decode('utf-8').strip()
print("\nQuizzes results:")
if out2 and out2 != "":
    qrows = json.loads(out2)
    for qr in qrows:
        print(f"QUIZ ID: {qr['id']} | Title: {qr['title']}")
        for idx, q in enumerate(qr.get('questions', [])):
            e = q.get('explanation', '')
            if 'تقنية ضمنه' in e or 'بداية الاستخدام الشخصي' in e:
                print(f"  Q#{idx+1}: {q.get('prompt')}")
                print(f"    Options: {q.get('options')}")
                print(f"    correctIndex: {q.get('correctIndex')}")
                print(f"    Expl: {e}")
else:
    print("None found in quizzes")

c.close()
