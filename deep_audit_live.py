import paramiko
import sys
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

print("=" * 70)
print("1. فحص بنك الأسئلة (question_bank)...")
print("=" * 70)

out = q("""
SELECT json_build_object(
    'id', id,
    'unit', unit,
    'lesson', lesson,
    'question', question
)::text
FROM question_bank
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
bank_items = [json.loads(l) for l in lines if l.strip()]
print(f"إجمالي أسئلة بنك الأسئلة: {len(bank_items)}")

letter_map = {
    'أ': 0, 'ا': 0, 'a': 0, '1': 0,
    'ب': 1, 'b': 1, '2': 1,
    'ج': 2, 'c': 2, '3': 2,
    'د': 3, 'd': 3, '4': 3
}

bank_boundary_errors = []
bank_explicit_letter_mismatches = []
bank_missing_correct_answer = []

for item in bank_items:
    qid = item['id']
    qst = item.get('question', {})
    opts = qst.get('options', [])
    c_idx = qst.get('correctIndex')
    ca = qst.get('correctAnswer')
    expl = qst.get('explanation', '') or ''
    prompt = qst.get('prompt', '') or ''

    # 1. Boundary check
    if not isinstance(c_idx, int) or c_idx < 0 or c_idx >= len(opts):
        bank_boundary_errors.append((qid, prompt, c_idx, len(opts)))
        continue

    # 2. Missing correctAnswer
    if not ca or ca.strip() != opts[c_idx].strip():
        bank_missing_correct_answer.append((qid, c_idx, opts[c_idx] if 0 <= c_idx < len(opts) else "", ca))

    # 3. Explicit letter in explanation (e.g. "الإجابة الصحيحة هي (ب)")
    # Patterns:
    # "الإجابة الصحيحة هي: أ"
    # "الخيار الصحيح هو ب"
    # "الحل هو (ج)"
    m = re.search(r'(?:الاجابه|الاجابة|الخيار|الاختيار|الحل)(?:\s+الصحيحه|\s+الصحيح)?\s*(?:هي|هو)?\s*[:：\-]?\s*[\(\[\"\'\s]*([أابجدهإآA-Da-d1-4])[\)\]\"\'\s\.]', expl)
    if m:
        letter = m.group(1).lower()
        if letter in letter_map:
            expected_idx = letter_map[letter]
            if expected_idx < len(opts) and expected_idx != c_idx:
                bank_explicit_letter_mismatches.append({
                    'id': qid,
                    'prompt': prompt,
                    'c_idx': c_idx,
                    'current_opt': opts[c_idx],
                    'expected_idx': expected_idx,
                    'expected_opt': opts[expected_idx],
                    'letter_found': letter,
                    'explanation': expl
                })

print(f"❌ أخطاء حدود correctIndex (boundary errors): {len(bank_boundary_errors)}")
for b in bank_boundary_errors:
    print(f"   ID {b[0]}: c_idx={b[2]}, options_len={b[3]}, prompt={b[1][:40]}")

print(f"⚠️  أسئلة ينقصها correctAnswer بالنص أو يحتاج تحديث: {len(bank_missing_correct_answer)}")
print(f"🚨 أسئلة فيها تعارض صريح بين الحرف في الشرح و correctIndex: {len(bank_explicit_letter_mismatches)}")
for m in bank_explicit_letter_mismatches:
    print(f"\n[ID {m['id']}] {m['prompt']}")
    print(f"  الحالي (c_idx={m['c_idx']}): {m['current_opt']}")
    print(f"  المتوقع من الشرح (letter={m['letter_found']} -> idx={m['expected_idx']}): {m['expected_opt']}")
    print(f"  الشرح: {m['explanation']}")

print("\n" + "=" * 70)
print("2. فحص جدول الاختبارات (quizzes)...")
print("=" * 70)

out = q("""
SELECT json_build_object(
    'id', id,
    'title', title,
    'questions', questions
)::text
FROM quizzes
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
quizzes = [json.loads(l) for l in lines if l.strip()]
print(f"إجمالي الاختبارات: {len(quizzes)}")

quiz_boundary_errors = []
quiz_missing_ca = 0
quiz_explicit_letter_mismatches = []

for qz in quizzes:
    qzid = qz['id']
    title = qz.get('title', '')
    questions = qz.get('questions', [])
    for idx, qst in enumerate(questions):
        opts = qst.get('options', [])
        c_idx = qst.get('correctIndex')
        ca = qst.get('correctAnswer')
        expl = qst.get('explanation', '') or ''
        prompt = qst.get('prompt', '') or ''

        if not isinstance(c_idx, int) or c_idx < 0 or c_idx >= len(opts):
            quiz_boundary_errors.append((qzid, title, idx, prompt, c_idx, len(opts)))
            continue

        if not ca or ca.strip() != opts[c_idx].strip():
            quiz_missing_ca += 1

        m = re.search(r'(?:الاجابه|الاجابة|الخيار|الاختيار|الحل)(?:\s+الصحيحه|\s+الصحيح)?\s*(?:هي|هو)?\s*[:：\-]?\s*[\(\[\"\'\s]*([أابجدهإآA-Da-d1-4])[\)\]\"\'\s\.]', expl)
        if m:
            letter = m.group(1).lower()
            if letter in letter_map:
                expected_idx = letter_map[letter]
                if expected_idx < len(opts) and expected_idx != c_idx:
                    quiz_explicit_letter_mismatches.append({
                        'quiz_id': qzid,
                        'quiz_title': title,
                        'q_idx': idx,
                        'prompt': prompt,
                        'c_idx': c_idx,
                        'current_opt': opts[c_idx],
                        'expected_idx': expected_idx,
                        'expected_opt': opts[expected_idx],
                        'letter_found': letter,
                        'explanation': expl
                    })

print(f"❌ أخطاء حدود correctIndex في الاختبارات: {len(quiz_boundary_errors)}")
for b in quiz_boundary_errors:
    print(f"   Quiz #{b[0]} ({b[1]}) Q[{b[2]+1}]: c_idx={b[4]}, options_len={b[5]}")

print(f"⚠️  أسئلة في الاختبارات تحتاج تحديث correctAnswer بالنص: {quiz_missing_ca}")
print(f"🚨 أسئلة في الاختبارات بها تعارض صريح بين الحرف في الشرح و correctIndex: {len(quiz_explicit_letter_mismatches)}")
for m in quiz_explicit_letter_mismatches:
    print(f"\nQuiz #{m['quiz_id']} ({m['quiz_title']}) - Q[{m['q_idx']+1}]: {m['prompt']}")
    print(f"  الحالي (c_idx={m['c_idx']}): {m['current_opt']}")
    print(f"  المتوقع من الشرح (letter={m['letter_found']} -> idx={m['expected_idx']}): {m['expected_opt']}")
    print(f"  الشرح: {m['explanation']}")

c.close()
