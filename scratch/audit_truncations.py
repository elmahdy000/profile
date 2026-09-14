import paramiko, json, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

# Fetch all questions from question_bank
cmd = """su - postgres -c "psql -d profile -t -A -c \\"SELECT id, stage, unit, lesson, question::text FROM question_bank ORDER BY id ASC;\\"" """
stdin, stdout, stderr = ssh.exec_command(cmd)
lines = stdout.read().decode('utf-8').strip().split('\n')

print(f"Total question_bank rows: {len(lines)}")

truncated_questions = []

# Punctuation that normally ends a question in Arabic:
# ؟, ?, ., :, !, ")", "»", "”", '"'
VALID_ENDINGS = ('؟', '?', '!', '.', ':', '؛', '»', '”', '"', ')', ']', '}')

for l in lines:
    if not l.strip(): continue
    parts = l.split('|', 4)
    if len(parts) < 5: continue
    qid, stage, unit, lesson, qjson = parts[0], parts[1], parts[2], parts[3], parts[4]
    try:
        qdata = json.loads(qjson)
    except Exception as e:
        truncated_questions.append((qid, lesson, f"Invalid JSON: {e}", None))
        continue
    
    prompt = (qdata.get('prompt') or '').strip()
    opts = qdata.get('options') or []
    expl = (qdata.get('explanation') or '').strip()

    reasons = []
    # Check if prompt ends abruptly
    # For instance, ending in a single isolated letter or preposition like 'ت', 'ي', 'لت', 'في', 'من', 'عن', 'إلى', 'مع'
    # Or prompt not ending in question mark when it starts with interrogative word
    # Or prompt ending with a letter that looks like a truncated word
    last_word = prompt.split()[-1] if prompt.split() else ''
    
    if last_word in ['ت', 'لت', 'ي', 'و', 'ف', 'ب', 'ك', 'ل', 'ال']:
        reasons.append(f"Prompt ends in truncated fragment '{last_word}': {prompt}")
    elif prompt.endswith('ت') or prompt.endswith('لت') or prompt.endswith('—') or prompt.endswith('-'):
        reasons.append(f"Prompt ends abruptly: {prompt}")

    # Check if explanation ends in 'ت' or 'لت' or single letter
    last_expl_word = expl.split()[-1] if expl.split() else ''
    if last_expl_word in ['ت', 'لت', 'ي', 'ال']:
        reasons.append(f"Explanation ends in fragment '{last_expl_word}': {expl}")

    # Check options
    for oi, opt in enumerate(opts):
        opt_s = str(opt).strip()
        last_opt_word = opt_s.split()[-1] if opt_s.split() else ''
        if last_opt_word in ['ت', 'لت', '—', '-']:
            reasons.append(f"Option {oi} ends abruptly: {opt_s}")

    if reasons:
        truncated_questions.append((qid, lesson, reasons, qdata))

print(f"\nFound {len(truncated_questions)} truncated questions in question_bank:")
for qid, lesson, r_list, qdata in truncated_questions:
    print(f"\n[ID {qid}] ({lesson})")
    for r in r_list:
        print(f"  * {r}")

ssh.close()
