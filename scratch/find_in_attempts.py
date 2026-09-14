import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Let's inspect all attempts in quiz_attempts table
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, created_at, answers, details FROM quiz_attempts ORDER BY id DESC;" """
stdin, stdout, stderr = c.exec_command(cmd)

found_attempts = []
for line in stdout:
    parts = line.strip().split('|')
    if len(parts) >= 6:
        att_id, q_id, st_id, dt = parts[0], parts[1], parts[2], parts[3]
        ans = parts[4]
        det = parts[5]
        # Let's search in det string for the exact words
        if 'الذكاء الاصطناعي مفهوم عام أوسع' in det or 'انتشار الحواسيب الشخصية إلى بداية' in det:
            print(f"FOUND IN ATTEMPT DETAILS: ID {att_id}, Quiz {q_id}, Student {st_id}, Date {dt}")
            found_attempts.append(att_id)
        elif 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي' in det:
            print(f"FOUND IN ATTEMPT DETAILS (Prompt): ID {att_id}, Quiz {q_id}, Student {st_id}, Date {dt}")
            found_attempts.append(att_id)

print(f"Total matched attempts in details: {len(found_attempts)}")

# If not found in details, what if details doesn't store the prompt/explanation, but only questionIndex?
# In learning.ts:
# details = [{ questionIndex, selectedOption, correctOption, isCorrect }]!
# Details DOES NOT store the prompt or explanation!
# In StudentPlatform.tsx:
# activeQuiz.questions[qi].prompt is rendered!
# And activeQuiz comes from:
# GET /api/learning/quizzes!

c.close()
