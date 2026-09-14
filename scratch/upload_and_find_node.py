import paramiko, sys

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

remote_js = """
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/profile'
});

async function run() {
  await client.connect();
  
  const bRes = await client.query(`
    SELECT id, title, prompt, correct_index, options, explanation 
    FROM question_bank 
    WHERE explanation LIKE '%تقنية ضمنه%' OR explanation LIKE '%بداية الاستخدام الشخصي%'
  `);
  console.log('Bank matches:', bRes.rows.length);
  for (const r of bRes.rows) {
    console.log('BANK ID:', r.id, 'Prompt:', r.prompt);
    console.log('  Options:', r.options);
    console.log('  correctIndex:', r.correct_index);
    console.log('  Explanation:', r.explanation);
  }

  const qRes = await client.query(`
    SELECT id, title, questions 
    FROM quizzes 
    WHERE questions::text LIKE '%تقنية ضمنه%' OR questions::text LIKE '%بداية الاستخدام الشخصي%'
  `);
  console.log('Quizzes matches:', qRes.rows.length);
  for (const qr of qRes.rows) {
    console.log('QUIZ ID:', qr.id, 'Title:', qr.title);
    const questions = qr.questions || [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const e = q.explanation || '';
      if (e.includes('تقنية ضمنه') || e.includes('بداية الاستخدام الشخصي')) {
        console.log(`  Q#${i+1}: ${q.prompt}`);
        console.log(`    Options:`, q.options);
        console.log(`    correctIndex:`, q.correctIndex);
        console.log(`    Expl:`, e);
      }
    }
  }

  await client.end();
}

run().catch(console.error);
"""

sftp = c.open_sftp()
with sftp.file('/tmp/find_script.js', 'w') as f:
    f.write(remote_js)
sftp.close()

stdin, stdout, stderr = c.exec_command("NODE_PATH=/var/www/profile/artifacts/api-server/node_modules node /tmp/find_script.js")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

c.close()
