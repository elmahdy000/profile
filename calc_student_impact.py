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

out_sess = query_json("""
SELECT json_build_object(
    'id', id,
    'sessionId', session_id,
    'studentName', student_name,
    'phone', phone,
    'score', score,
    'totalPoints', total_points,
    'percentage', percentage,
    'passed', passed,
    'questions', questions,
    'answers', answers,
    'details', details,
    'createdAt', created_at
)::text
FROM self_assessment_sessions
WHERE status = 'completed'
ORDER BY id ASC;
""")

sessions = [json.loads(l) for l in out_sess.strip().split("\n") if l.strip()]

# Correct answer mapping for the 3 bugged questions:
correct_answers_map = {
    "أي مجموعة تضم تحولات اجتماعية وردت في الدرس؟": "SNS والتجارة الإلكترونية والعمل عن بُعد",
    "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟": "زيادة استهلاك الطاقة والحرارة",
    "ما الفكرة الأساسية للمعالجة المتوازية؟": "تنفيذ عدة عمليات أو أجزاء من العمل في الوقت نفسه"
}

impacted_students = []

for sess in sessions:
    sid = sess['id']
    s_name = sess.get('studentName')
    s_phone = sess.get('phone')
    old_percentage = sess.get('percentage') or 0
    old_score = sess.get('score') or 0
    details = sess.get('details') or []
    
    score_change = 0
    fixed_details = []
    has_change = False
    
    for d in details:
        p = d.get('prompt', '').strip()
        opts = d.get('options') or []
        sel_idx = d.get('selectedOption')
        sel_text = opts[sel_idx] if isinstance(sel_idx, int) and 0 <= sel_idx < len(opts) else ""
        was_correct = d.get('isCorrect', False)
        
        now_correct = was_correct
        if p in correct_answers_map:
            true_ans = correct_answers_map[p]
            now_correct = (sel_text.strip() == true_ans.strip())
            if now_correct != was_correct:
                has_change = True
                if now_correct and not was_correct:
                    score_change += 1
                elif not now_correct and was_correct:
                    score_change -= 1
                    
        fixed_d = dict(d)
        fixed_d['isCorrect'] = now_correct
        fixed_details.append(fixed_d)
        
    if has_change:
        total_questions = len(details) if details else (sess.get('totalPoints') or 10)
        new_score = old_score + score_change
        new_percentage = round((new_score / total_questions) * 100) if total_questions > 0 else 0
        new_passed = new_percentage >= 60
        
        impacted_students.append({
            'id': sid,
            'name': s_name,
            'phone': s_phone,
            'created_at': sess.get('createdAt'),
            'old_score': old_score,
            'new_score': new_score,
            'total': total_questions,
            'old_percentage': old_percentage,
            'new_percentage': new_percentage,
            'diff': new_percentage - old_percentage,
            'new_passed': new_passed,
            'fixed_details': fixed_details
        })

print(f"إجمالي الطلاب المتضررين في التقييم الذاتي: {len(impacted_students)} طالب/جلسة\n")
print(f"{'الاسم':<25} | {'الموبايل':<12} | {'الدرجة السابقة':<12} | {'الدرجة الصحيحة':<12} | {'الزيادة المستحقة'}")
print("-" * 80)
for st in impacted_students:
    print(f"{st['name']:<25} | {st['phone']:<12} | {st['old_percentage']}% ({st['old_score']}/{st['total']})   | {st['new_percentage']}% ({st['new_score']}/{st['total']})    | +{st['diff']}%")

c.close()
