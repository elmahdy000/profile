import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

sql_commands = """
-- 1. Fix Question 892 in question_bank
UPDATE question_bank
SET question = jsonb_set(
  question,
  '{options,0}',
  '"فحص التحيز وقابلية التفسير والعدالة"'
)
WHERE id = 892 OR (question->>'prompt' LIKE '%الاستخدام المسؤول للذكاء الاصطناعي%' AND question->'options'->>0 = 'فحص التحيز و');

-- 2. Fix Question 890 in question_bank
UPDATE question_bank
SET question = jsonb_set(
  question,
  '{prompt}',
  '"ما فائدة الذكاء الاصطناعي القابل للتفسير (XAI)؟"'
)
WHERE id = 890 OR question->>'prompt' = 'ما فائدة';

-- 3. Fix Question 875 in question_bank
UPDATE question_bank
SET question = jsonb_set(
  question,
  '{prompt}',
  '"نظام يوضح للمستخدمين ما الذي يستطيع فعله وما حدوده، دون شرح التفاصيل التقنية المعقدة"'
)
WHERE id = 875 OR question->>'prompt' LIKE 'نظام يوضح للمستخدمين ما الذي يستطيع فعله وما حدوده، دون';

-- 4. Clean trailing '\\n A)' from prompts in question_bank
UPDATE question_bank
SET question = jsonb_set(
  question,
  '{prompt}',
  to_jsonb(regexp_replace(question->>'prompt', '\\s*\\n\\s*A\\)\\s*$', ''))
)
WHERE question->>'prompt' ~ '\\s*\\n\\s*A\\)\\s*$';

-- 5. Fix Quiz 34 and other existing quizzes in quizzes table
-- Fix Option A in quizzes where prompt matches 'الاستخدام المسؤول للذكاء الاصطناعي'
UPDATE quizzes
SET questions = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'prompt' LIKE '%الاستخدام المسؤول للذكاء الاصطناعي%' AND elem->'options'->>0 = 'فحص التحيز و'
      THEN jsonb_set(elem, '{options,0}', '"فحص التحيز وقابلية التفسير والعدالة"')
      WHEN elem->>'prompt' = 'ما فائدة'
      THEN jsonb_set(elem, '{prompt}', '"ما فائدة الذكاء الاصطناعي القابل للتفسير (XAI)؟"')
      WHEN elem->>'prompt' ~ '\\s*\\n\\s*A\\)\\s*$'
      THEN jsonb_set(elem, '{prompt}', to_jsonb(regexp_replace(elem->>'prompt', '\\s*\\n\\s*A\\)\\s*$', '')))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(questions) AS elem
)
WHERE questions::text LIKE '%الاستخدام المسؤول للذكاء الاصطناعي%' 
   OR questions::text LIKE '%ما فائدة%'
   OR questions::text LIKE '%A)%';

SELECT id, title, jsonb_array_length(questions) as q_count FROM quizzes ORDER BY id DESC LIMIT 5;
\\q
"""

stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile"')
stdin.write(sql_commands)
stdin.flush()
print("SQL Execution Output:")
print(stdout.read().decode())
print(stderr.read().decode())

# Check Quiz 34 Question 3 after update
stdin, stdout, stderr = ssh.exec_command('su - postgres -c "psql -d profile -c \\"SELECT id, questions->2->\'prompt\' as q3_prompt, questions->2->\'options\' as q3_options FROM quizzes WHERE id = 34;\\""')
print("Quiz 34 Question 3:")
print(stdout.read().decode())

ssh.close()
