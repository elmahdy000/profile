import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql_fix = """
-- 1. Fix Question 657 option in question_bank
UPDATE question_bank
SET question = jsonb_set(
  question,
  '{options,0}',
  '"تولد نصوصًا مثل المقالات والقصص"'
)
WHERE id = 657;

-- 2. Delete corrupt legacy rows with single-letter 'ت' or truncated prompt
DELETE FROM question_bank
WHERE id IN (529, 531, 602, 633, 714, 734, 736, 737, 739, 742, 782)
   OR question->>'prompt' IN ('أي مر', 'ما المر', 'مصنع ي', 'شركة شحن تريد')
   OR question->'options' ? 'ت';

-- 3. Clean options with trailing newline markers e.g. \\nC) or \\nD) in question_bank
UPDATE question_bank
SET question = (
  SELECT jsonb_build_object(
    'prompt', question->>'prompt',
    'points', COALESCE((question->>'points')::int, 1),
    'options', (
      SELECT jsonb_agg(
        to_jsonb(regexp_replace(opt_elem, '\\s*[\\r\\n]+\\s*[A-Da-dأابجدهإآهـ1-6]\\)?\\s*$', ''))
      )
      FROM jsonb_array_elements_text(question->'options') AS opt_elem
    ),
    'correctIndex', COALESCE((question->>'correctIndex')::int, 0),
    'explanation', question->>'explanation'
  )
)
WHERE question::text ~ '[\\r\\n]+[A-Da-dأابجدهإآهـ1-6]\\)?';

-- 4. Also clean in existing quizzes
UPDATE quizzes
SET questions = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'prompt', elem->>'prompt',
      'points', COALESCE((elem->>'points')::int, 1),
      'options', (
        SELECT jsonb_agg(
          to_jsonb(regexp_replace(opt_elem, '\\s*[\\r\\n]+\\s*[A-Da-dأابجدهإآهـ1-6]\\)?\\s*$', ''))
        )
        FROM jsonb_array_elements_text(elem->'options') AS opt_elem
      ),
      'correctIndex', COALESCE((elem->>'correctIndex')::int, 0),
      'explanation', elem->>'explanation'
    )
  )
  FROM jsonb_array_elements(questions) AS elem
)
WHERE questions::text ~ '[\\r\\n]+[A-Da-dأابجدهإآهـ1-6]\\)?';

SELECT count(*) as bank_total FROM question_bank;
\\q
"""

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
stdin.write(sql_fix)
stdin.flush()
print("SQL Execution Result:")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
