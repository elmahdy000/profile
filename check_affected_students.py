import paramiko
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def query_json(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

print("=" * 70)
print("🔍 1. فحص محاولات الطلاب في الاختبارات (quiz_attempts)...")
print("=" * 70)

# Fetch students for name lookup
out_st = query_json("SELECT json_build_object('id', id, 'name', name, 'phone', phone)::text FROM students;")
students_map = {}
for l in out_st.strip().split("\n"):
    if l.strip():
        s = json.loads(l)
        students_map[s['id']] = s

# Fetch quizzes for reference
out_qz = query_json("SELECT json_build_object('id', id, 'title', title, 'passingScore', passing_score, 'questions', questions)::text FROM quizzes;")
quizzes_map = {}
for l in out_qz.strip().split("\n"):
    if l.strip():
        q = json.loads(l)
        quizzes_map[q['id']] = q

# Fetch all quiz attempts
out_att = query_json("""
SELECT json_build_object(
    'id', id,
    'quizId', quiz_id,
    'studentId', student_id,
    'score', score,
    'passed', passed,
    'answers', answers,
    'details', details,
    'createdAt', created_at
)::text
FROM quiz_attempts
ORDER BY id ASC;
""")

attempts = [json.loads(l) for l in out_att.strip().split("\n") if l.strip()]
print(f"📊 إجمالي محاولات الاختبارات المسجلة: {len(attempts)}")

affected_attempts = []

for att in attempts:
    att_id = att['id']
    quiz_id = att['quizId']
    student_id = att['studentId']
    st_info = students_map.get(student_id, {'name': f'Student #{student_id}', 'phone': 'N/A'})
    quiz = quizzes_map.get(quiz_id)
    if not quiz:
        continue
    
    questions = quiz.get('questions', [])
    details = att.get('details') or []
    recorded_score = att.get('score', 0)
    recorded_passed = att.get('passed', False)
    
    # Recalculate true score based on actual correct answers
    # Check each question
    corrected_details = []
    has_discrepancy = False
    
    for idx, d in enumerate(details):
        q_idx = d.get('questionIndex', idx)
        if q_idx >= len(questions):
            continue
        q = questions[q_idx]
        opts = q.get('options', [])
        c_idx = q.get('correctIndex', 0)
        c_ans = q.get('correctAnswer') or (opts[c_idx] if 0 <= c_idx < len(opts) else None)
        
        sel_opt_idx = d.get('selectedOption', -1)
        sel_ans_text = opts[sel_opt_idx] if 0 <= sel_opt_idx < len(opts) else None
        
        old_is_correct = d.get('isCorrect', False)
        
        # New true isCorrect check
        new_is_correct = False
        if sel_ans_text and c_ans:
            new_is_correct = (sel_ans_text.strip() == c_ans.strip())
        elif sel_opt_idx >= 0:
            new_is_correct = (sel_opt_idx == c_idx)
            
        if old_is_correct != new_is_correct:
            has_discrepancy = True
            corrected_details.append({
                'q_index': q_idx,
                'prompt': q.get('prompt'),
                'selected_option': sel_opt_idx,
                'selected_text': sel_ans_text,
                'correct_option': c_idx,
                'correct_text': c_ans,
                'old_is_correct': old_is_correct,
                'new_is_correct': new_is_correct
            })
            
    if has_discrepancy:
        true_correct_count = 0
        for idx, d in enumerate(details):
            q_idx = d.get('questionIndex', idx)
            if q_idx < len(questions):
                q = questions[q_idx]
                opts = q.get('options', [])
                sel_opt = d.get('selectedOption', -1)
                c_idx = q.get('correctIndex', 0)
                c_ans = q.get('correctAnswer') or (opts[c_idx] if 0 <= c_idx < len(opts) else None)
                sel_text = opts[sel_opt] if 0 <= sel_opt < len(opts) else None
                if sel_text and c_ans and sel_text.strip() == c_ans.strip():
                    true_correct_count += 1
                elif sel_opt == c_idx and sel_opt >= 0:
                    true_correct_count += 1
                    
        total_q = len(details) if details else len(questions)
        new_score = round((true_correct_count / total_q) * 100) if total_q > 0 else 0
        passing_score = quiz.get('passingScore', 60)
        new_passed = new_score >= passing_score
        
        affected_attempts.append({
            'attempt_id': att_id,
            'student_name': st_info.get('name'),
            'student_phone': st_info.get('phone'),
            'quiz_title': quiz.get('title'),
            'quiz_id': quiz_id,
            'created_at': att.get('createdAt'),
            'old_score': recorded_score,
            'new_score': new_score,
            'old_passed': recorded_passed,
            'new_passed': new_passed,
            'discrepancies': corrected_details
        })

print(f"⚠️  محاولات بها تضارب في التصحيح: {len(affected_attempts)}")
for aff in affected_attempts:
    print(f"\n[محاولة #{aff['attempt_id']}] الطالب: {aff['student_name']} ({aff['student_phone']})")
    print(f"  الاختبار: {aff['quiz_title']} (#{aff['quiz_id']})")
    print(f"  التاريخ: {aff['created_at']}")
    print(f"  الدرجة المسجلة: {aff['old_score']}% (ناجح: {aff['old_passed']}) -> الدرجة الصحيحة: {aff['new_score']}% (ناجح: {aff['new_passed']})")
    for disc in aff['discrepancies']:
        print(f"    - سؤال [{disc['q_index']+1}]: {disc['prompt'][:50]}...")
        print(f"      إجابة الطالب: [{disc['selected_option']}] {disc['selected_text']}")
        print(f"      الإجابة الصحيحة: [{disc['correct_option']}] {disc['correct_text']}")
        print(f"      كانت محسوبة: {'صح' if disc['old_is_correct'] else 'غلط'} -> المفروض: {'صح' if disc['new_is_correct'] else 'غلط'}")

print("\n" + "=" * 70)
print("🔍 2. فحص جلسات التقييم الذاتي (self_assessment_sessions)...")
print("=" * 70)

out_sess = query_json("""
SELECT json_build_object(
    'id', id,
    'sessionId', session_id,
    'studentName', student_name,
    'phone', phone,
    'status', status,
    'score', score,
    'percentage', percentage,
    'passed', passed,
    'questions', questions,
    'details', details,
    'createdAt', created_at
)::text
FROM self_assessment_sessions
WHERE status = 'completed'
ORDER BY id ASC;
""")

sessions = [json.loads(l) for l in out_sess.strip().split("\n") if l.strip()]
print(f"📊 إجمالي جلسات التقييم الذاتي المكتملة: {len(sessions)}")

affected_sessions = []
# Specific target prompts that were bugged in question bank
target_bugged_prompts = [
    "أي مجموعة تضم تحولات اجتماعية وردت في الدرس؟",
    "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟",
    "ما الفكرة الأساسية للمعالجة المتوازية؟"
]

for sess in sessions:
    s_id = sess['id']
    s_name = sess.get('studentName', '')
    s_phone = sess.get('phone', '')
    details = sess.get('details') or []
    questions = sess.get('questions') or []
    
    sess_discrepancies = []
    for d in details:
        p = d.get('prompt', '')
        # Check if this question was one of the bugged ones or has mismatch
        for tbp in target_bugged_prompts:
            if tbp in p:
                sel_opt = d.get('selectedOption')
                cor_opt = d.get('correctOption')
                is_cor = d.get('isCorrect')
                opts = d.get('options') or []
                sel_text = opts[sel_opt] if isinstance(sel_opt, int) and 0 <= sel_opt < len(opts) else ""
                sess_discrepancies.append({
                    'prompt': p,
                    'selected_opt': sel_opt,
                    'selected_text': sel_text,
                    'was_marked': is_cor
                })
                
    if sess_discrepancies:
        affected_sessions.append({
            'session_id': s_id,
            'student_name': s_name,
            'phone': s_phone,
            'score': sess.get('percentage'),
            'created_at': sess.get('createdAt'),
            'discrepancies': sess_discrepancies
        })

print(f"⚠️  جلسات تقييم ذاتي ظهرت فيها الأسئلة المعدلة: {len(affected_sessions)}")
for aff in affected_sessions:
    print(f"\n[جلسة #{aff['session_id']}] الطالب: {aff['student_name']} ({aff['phone']}) - النتيجة: {aff['score']}%")
    for d in aff['discrepancies']:
        print(f"  - سؤال: {d['prompt']}")
        print(f"    اختيار الطالب: [{d['selected_opt']}] {d['selected_text']} -> تم احتسابه: {d['was_marked']}")

c.close()
