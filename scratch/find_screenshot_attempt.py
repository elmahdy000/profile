import sys, paramiko, json

sys.stdout.reconfigure(encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Find attempts on Quiz 37 where question 14 is false or question 24 is false
cmd = """sudo -u postgres psql -d profile -t -A -c "SELECT id, quiz_id, student_id, score, answers, details FROM quiz_attempts WHERE quiz_id = 37;" """
stdin, stdout, stderr = c.exec_command(cmd)

matching_attempts = []
for line in stdout:
    parts = line.strip().split('|')
    if len(parts) >= 6:
        att_id, quiz_id, st_id, score, ans_str, det_str = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
        try:
            dets = json.loads(det_str)
            # check if det has selectedOption = 1 and correctOption = 0 or similar
            matching_attempts.append((att_id, st_id, score, dets))
        except:
            pass

print(f"Total attempts on Quiz 37: {len(matching_attempts)}")
for att_id, st_id, score, dets in matching_attempts:
    # In screenshot:
    # Q15: selectedOption is 1 (ب), correctOption is 0 (أ)
    # Q25: selectedOption is 2 (ج), correctOption is 3 (د)
    # Let's check which attempt has these!
    has_q15_match = any(d.get('selectedOption') == 1 and d.get('correctOption') == 0 for d in dets)
    has_q25_match = any(d.get('selectedOption') == 2 and d.get('correctOption') == 3 for d in dets)
    if has_q15_match and has_q25_match:
        print(f"--> EXACT MATCH: Attempt ID {att_id}, Student ID {st_id}, Score {score}")
        for idx, d in enumerate(dets):
            if not d.get('isCorrect'):
                print(f"    Index {idx}: selected={d.get('selectedOption')}, correct={d.get('correctOption')}")

c.close()
