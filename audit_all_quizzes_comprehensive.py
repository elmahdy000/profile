import paramiko
import sys
import json
import re
from collections import Counter

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
    err = stderr.read().decode('utf-8', errors='replace')
    if err.strip():
        print("SQL Error:", err.strip())
    return out

print("=" * 80)
print("1. جلب وتحليل جدول الاختبارات (quizzes)")
print("=" * 80)

quizzes_raw = q("""
SELECT json_build_object(
    'id', id,
    'course_id', course_id,
    'video_id', video_id,
    'title', title,
    'scope', scope,
    'stage', stage,
    'stages', stages,
    'is_published', is_published,
    'questions_to_show', questions_to_show,
    'passing_score', passing_score,
    'max_attempts', max_attempts,
    'questions', questions
)::text
FROM quizzes
ORDER BY id ASC;
""")

quizzes = [json.loads(l) for l in quizzes_raw.strip().split("\n") if l.strip()]
print(f"إجمالي عدد الاختبارات في المنصة: {len(quizzes)}")

published_count = sum(1 for qz in quizzes if qz.get('is_published'))
print(f"الاختبارات المنشورة (is_published = true): {published_count}")
print(f"الاختبارات غير المنشورة (مسودة): {len(quizzes) - published_count}")

all_quiz_questions = []
empty_quizzes = []
invalid_questions = []
duplicate_opts_list = []
semantic_mismatches = []
negative_question_check = []
image_questions = []

letter_map = {
    'أ': 0, 'ا': 0, 'a': 0, '1': 0,
    'ب': 1, 'b': 1, '2': 1,
    'ج': 2, 'c': 2, '3': 2,
    'د': 3, 'd': 3, '4': 3
}

for qz in quizzes:
    qid = qz['id']
    title = qz.get('title', '')
    questions = qz.get('questions') or []
    published = qz.get('is_published', False)
    q_to_show = qz.get('questions_to_show')

    if not questions:
        empty_quizzes.append((qid, title, published))
        continue

    if q_to_show and q_to_show > len(questions):
        print(f"⚠️ تنبيه: اختبار {qid} ({title}) محدد له عرض {q_to_show} سؤال بينما يحتوي على {len(questions)} فقط.")

    for idx, q_item in enumerate(questions):
        q_item['quiz_id'] = qid
        q_item['quiz_title'] = title
        q_item['q_index'] = idx
        all_quiz_questions.append(q_item)

        prompt = (q_item.get('prompt') or '').strip()
        opts = q_item.get('options') or []
        c_idx = q_item.get('correctIndex')
        expl = (q_item.get('explanation') or '').strip()
        img = q_item.get('imageUrl')

        if img:
            image_questions.append((qid, title, idx + 1, img))

        # أخطاء البنية الأساسية
        if not prompt or len(opts) < 2 or not isinstance(c_idx, int) or c_idx < 0 or c_idx >= len(opts):
            invalid_questions.append({
                'quiz_id': qid,
                'quiz_title': title,
                'idx': idx + 1,
                'prompt': prompt,
                'opts_count': len(opts),
                'correct_index': c_idx
            })
            continue

        # خيارات مكررة
        clean_opts = [o.strip() for o in opts if isinstance(o, str)]
        if len(clean_opts) != len(set(clean_opts)):
            duplicate_opts_list.append({
                'quiz_id': qid,
                'quiz_title': title,
                'idx': idx + 1,
                'prompt': prompt,
                'options': clean_opts
            })

        # فحص الشرح إذا كان يذكر حرفاً صريحاً (أ، ب، ج، د)
        # مثل: الإجابة هي (ب) أو الاختيار (ج)
        m = re.search(r'(?:الإجابة|الاجابة|الاختيار|الجواب|الصحيح(?:ة)?)\s*(?:هي|هو)?\s*[:\-\s]*[\(\[\"\'\s]*([أابجدABCDabcd1234])[\)\]\"\'\s]*', expl)
        if m:
            explicit_char = m.group(1).lower()
            if explicit_char in letter_map:
                expected_idx = letter_map[explicit_char]
                if expected_idx < len(opts) and expected_idx != c_idx:
                    semantic_mismatches.append({
                        'quiz_id': qid,
                        'quiz_title': title,
                        'idx': idx + 1,
                        'prompt': prompt,
                        'options': opts,
                        'current_idx': c_idx,
                        'current_opt': opts[c_idx],
                        'expected_idx': expected_idx,
                        'expected_opt': opts[expected_idx],
                        'explanation': expl,
                        'reason': f"الشرح يذكر صراحة الحرف '{m.group(1)}' المقابل للاختيار {expected_idx+1}"
                    })
                    continue

        # فحص التطابق اللفظي الشديد بين الشرح وأحد الخيارات الأخرى مع 0 تطابق للخيار الحالي
        cur_opt = opts[c_idx]
        cur_words = set(w for w in re.findall(r'[\u0600-\u06FF\w]+', cur_opt) if len(w) > 2)
        cur_match = sum(1 for w in cur_words if w in expl)

        is_negative = any(neg in prompt for neg in ['غير', 'ليس', 'ليست', 'لا ي', 'لا ت', 'لا م', 'خطأ', 'ما عدا', 'عدا', 'استثناء'])

        for o_i, other_opt in enumerate(opts):
            if o_i == c_idx:
                continue
            other_words = set(w for w in re.findall(r'[\u0600-\u06FF\w]+', other_opt) if len(w) > 2)
            other_match = sum(1 for w in other_words if w in expl)
            # إذا كان هناك خيار آخر تكررت كلماته بقوة في الشرح (مثلا 3 كلمات مميزة) والخيار الحالي كلماته 0 في الشرح
            if other_match >= 3 and cur_match == 0 and not is_negative:
                # تأكد أن الشرح لا ينفي الخيار الآخر
                if not any(f"ليس {other_opt}" in expl or f"غير {other_opt}" in expl or f"لا {other_opt}" in expl for _ in [0]):
                    semantic_mismatches.append({
                        'quiz_id': qid,
                        'quiz_title': title,
                        'idx': idx + 1,
                        'prompt': prompt,
                        'options': opts,
                        'current_idx': c_idx,
                        'current_opt': cur_opt,
                        'expected_idx': o_i,
                        'expected_opt': other_opt,
                        'explanation': expl,
                        'reason': f"تطابق لفظي قوي مع الاختيار الآخر ({other_match} كلمات) بينما الحالي (0 كلمات)"
                    })

print(f"إجمالي عدد أسئلة الاختبارات: {len(all_quiz_questions)}")
print(f"اختبارات فارغة: {len(empty_quizzes)}")
if empty_quizzes:
    for eq in empty_quizzes:
        print(f"  🔴 اختبار فارغ: ID {eq[0]} - '{eq[1]}' (منشور: {eq[2]})")

print(f"أسئلة غير صالحة (نص فارغ أو correctIndex خارج الحدود): {len(invalid_questions)}")
if invalid_questions:
    for inv in invalid_questions:
        print(f"  🔴 سؤال غير صالح: اختبار {inv['quiz_id']} س #{inv['idx']} - correctIndex: {inv['correct_index']}")

print(f"أسئلة بخيارات مكررة: {len(duplicate_opts_list)}")
for dop in duplicate_opts_list:
    print(f"  ⚠️ خيارات مكررة: اختبار {dop['quiz_id']} ({dop['quiz_title']}) - س #{dop['idx']}")
    print(f"     السؤال: {dop['prompt']}")
    print(f"     الخيارات: {dop['options']}")

print(f"\nأسئلة بها شبهة أو خطأ صريح في الاختيار الصحيح: {len(semantic_mismatches)}")
for sm in semantic_mismatches:
    print("-" * 60)
    print(f"🚨 اختبار {sm['quiz_id']} ({sm['quiz_title']}) - سؤال #{sm['idx']}")
    print(f"السبب: {sm['reason']}")
    print(f"نص السؤال: {sm['prompt']}")
    print(f"الخيارات:")
    for oi, opt in enumerate(sm['options']):
        mark = "👉 (الحالي)" if oi == sm['current_idx'] else ("⭐ (المتوقع)" if oi == sm['expected_idx'] else "  ")
        print(f"  [{oi}] {opt} {mark}")
    print(f"الشرح: {sm['explanation']}")

print("\n" + "=" * 80)
print("2. فحص بنك الأسئلة (question_bank)")
print("=" * 80)

bank_raw = q("""
SELECT json_build_object(
    'id', id,
    'unit', unit,
    'lesson', lesson,
    'question', question
)::text
FROM question_bank
ORDER BY id ASC;
""")

bank_items = [json.loads(l) for l in bank_raw.strip().split("\n") if l.strip()]
print(f"إجمالي أسئلة بنك الأسئلة: {len(bank_items)}")

bank_duplicates = []
bank_semantic_mismatches = []
bank_invalid = []

for b_item in bank_items:
    bid = b_item['id']
    unit = b_item.get('unit') or ''
    lesson = b_item.get('lesson') or ''
    qst = b_item.get('question') or {}
    prompt = (qst.get('prompt') or '').strip()
    opts = qst.get('options') or []
    c_idx = qst.get('correctIndex')
    expl = (qst.get('explanation') or '').strip()

    if not prompt or len(opts) < 2 or not isinstance(c_idx, int) or c_idx < 0 or c_idx >= len(opts):
        bank_invalid.append(bid)
        continue

    clean_opts = [o.strip() for o in opts if isinstance(o, str)]
    if len(clean_opts) != len(set(clean_opts)):
        bank_duplicates.append((bid, unit, lesson, prompt, clean_opts))

    m = re.search(r'(?:الإجابة|الاجابة|الاختيار|الجواب|الصحيح(?:ة)?)\s*(?:هي|هو)?\s*[:\-\s]*[\(\[\"\'\s]*([أابجدABCDabcd1234])[\)\]\"\'\s]*', expl)
    if m:
        explicit_char = m.group(1).lower()
        if explicit_char in letter_map:
            expected_idx = letter_map[explicit_char]
            if expected_idx < len(opts) and expected_idx != c_idx:
                bank_semantic_mismatches.append({
                    'id': bid,
                    'unit': unit,
                    'lesson': lesson,
                    'prompt': prompt,
                    'options': opts,
                    'current_idx': c_idx,
                    'expected_idx': expected_idx,
                    'explanation': expl,
                    'reason': f"الشرح يذكر صراحة '{m.group(1)}'"
                })

print(f"أسئلة بنك الأسئلة غير الصالحة: {len(bank_invalid)}")
print(f"أسئلة بنك الأسئلة بخيارات مكررة: {len(bank_duplicates)}")
for bd in bank_duplicates:
    print(f"  ⚠️ بنك الأسئلة ID {bd[0]} [{bd[1]} - {bd[2]}]: {bd[3][:60]} | خيارات: {bd[4]}")

print(f"أسئلة بنك الأسئلة بها تعارض صريح بين الحرف في الشرح و correctIndex: {len(bank_semantic_mismatches)}")
for bsm in bank_semantic_mismatches:
    print(f"  🚨 بنك الأسئلة ID {bsm['id']} [{bsm['unit']} - {bsm['lesson']}]")
    print(f"     س: {bsm['prompt']}")
    print(f"     الحالي: ({bsm['current_idx']}) {bsm['options'][bsm['current_idx']]}")
    print(f"     المتوقع من الشرح: ({bsm['expected_idx']}) {bsm['options'][bsm['expected_idx']]}")
    print(f"     الشرح: {bsm['explanation']}")

print("\n" + "=" * 80)
print("3. فحص إحصائيات محاولات الطلاب في الأسئلة (quiz_attempts)")
print("=" * 80)

attempts_stats_raw = q("""
SELECT 
    "quizId",
    d->>'questionIndex' as q_idx,
    count(*) as total_answers,
    sum(case when (d->>'isCorrect')::boolean = true or (d->>'correct')::boolean = true then 1 else 0 end) as correct_answers
FROM quiz_attempts,
jsonb_array_elements(details) as d
WHERE details IS NOT NULL
GROUP BY "quizId", d->>'questionIndex'
HAVING count(*) >= 5
ORDER BY "quizId", (d->>'questionIndex')::int;
""")

print("الأسئلة التي نسبة نجاح الطلاب فيها منخفضة جداً (أقل من 15%) أو 0%:")
zero_pass_count = 0
for line in attempts_stats_raw.strip().split("\n"):
    if not line.strip(): continue
    parts = line.split("|")
    if len(parts) < 4: continue
    qid, q_idx_str, total_str, correct_str = [p.strip() for p in parts]
    try:
        qid = int(qid)
        q_idx = int(q_idx_str)
        total = int(total_str)
        correct = int(correct_str)
        rate = (correct / total) * 100
        if rate == 0.0 and total >= 8:
            zero_pass_count += 1
            # جلب تفاصيل السؤال
            match_q = next((q for q in all_quiz_questions if q['quiz_id'] == qid and q['q_index'] == q_idx), None)
            if match_q:
                print(f"  🔴 [0% نجاح] اختبار {qid} ({match_q['quiz_title']}) - سؤال #{q_idx+1} ({total} طالب أخطأوا جميعاً!):")
                print(f"     س: {match_q.get('prompt')}")
                print(f"     الخيارات: {match_q.get('options')}")
                print(f"     الإجابة المحددة: {match_q.get('options', [])[match_q.get('correctIndex', 0)]}")
                print(f"     الشرح: {match_q.get('explanation')}")
    except Exception as e:
        continue

print(f"\nإجمالي الأسئلة بنسبة نجاح 0% (مع 8 طلاب فأكثر): {zero_pass_count}")
