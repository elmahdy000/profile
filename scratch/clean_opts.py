import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql_clean = """
-- Clean any options ending with \n[B-D]) in question_bank
UPDATE question_bank
SET question = (
  SELECT jsonb_build_object(
    'prompt', question->>'prompt',
    'points', COALESCE((question->>'points')::int, 1),
    'options', (
      SELECT jsonb_agg(
        to_jsonb(regexp_replace(opt_elem, '\\s*\\n\\s*[B-Db-dب-د]\\)\\s*$', ''))
      )
      FROM jsonb_array_elements_text(question->'options') AS opt_elem
    ),
    'correctIndex', COALESCE((question->>'correctIndex')::int, 0),
    'explanation', question->>'explanation'
  )
)
WHERE question::text ~ '\\n[B-Db-dب-د]\\)';

-- Clean in quizzes as well
UPDATE quizzes
SET questions = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'prompt', elem->>'prompt',
      'points', COALESCE((elem->>'points')::int, 1),
      'options', (
        SELECT jsonb_agg(
          to_jsonb(regexp_replace(opt_elem, '\\s*\\n\\s*[B-Db-dب-د]\\)\\s*$', ''))
        )
        FROM jsonb_array_elements_text(elem->'options') AS opt_elem
      ),
      'correctIndex', COALESCE((elem->>'correctIndex')::int, 0),
      'explanation', elem->>'explanation'
    )
  )
  FROM jsonb_array_elements(questions) AS elem
)
WHERE questions::text ~ '\\n[B-Db-dب-د]\\)';

SELECT count(*) as cleaned_bank_count FROM question_bank WHERE question::text ~ '\\n[B-Db-dب-د]\\)';
SELECT count(*) as cleaned_quiz_count FROM quizzes WHERE questions::text ~ '\\n[B-Db-dب-د]\\)';
\\q
"""

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
stdin.write(sql_clean)
stdin.flush()
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
