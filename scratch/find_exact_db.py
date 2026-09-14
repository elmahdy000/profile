import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Search all tables in profile database for 'التعلم الآلي تقنية ضمنه'
script = """
import psycopg2, json

conn = psycopg2.connect("dbname=profile user=postgres")
cur = conn.cursor()

# Search question_bank
cur.execute("SELECT id, title, prompt, correct_index, options, explanation FROM question_bank WHERE explanation LIKE '%تقنية ضمنه%' OR explanation LIKE '%بداية الاستخدام الشخصي%';")
rows = cur.fetchall()
print(f"question_bank matches: {len(rows)}")
for r in rows:
    print("BANK ID:", r[0], "Prompt:", r[2])
    print("  Options:", r[4])
    print("  correctIndex:", r[3])
    print("  Explanation:", r[5])

# Search quizzes
cur.execute("SELECT id, title, questions FROM quizzes WHERE questions::text LIKE '%تقنية ضمنه%' OR questions::text LIKE '%بداية الاستخدام الشخصي%';")
qrows = cur.fetchall()
print(f"quizzes matches: {len(qrows)}")
for qr in qrows:
    print("QUIZ ID:", qr[0], "Title:", qr[1])
    for idx, q in enumerate(qr[2]):
        e = q.get('explanation', '')
        if 'تقنية ضمنه' in e or 'بداية الاستخدام الشخصي' in e:
            print(f"  Q#{idx+1}: {q.get('prompt')}")
            print(f"    Options: {q.get('options')}")
            print(f"    correctIndex: {q.get('correctIndex')}")
            print(f"    Expl: {e}")

conn.close()
"""

cmd = f"""python3 -c '{script}' """
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

c.close()
