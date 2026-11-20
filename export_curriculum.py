import urllib.request
import json
import os
import re

output_dir = 'curriculum_export'
by_lesson_dir = os.path.join(output_dir, 'by_lesson')
os.makedirs(by_lesson_dir, exist_ok=True)

# 1. Fetch materials from backend API
url = 'https://drelmahdy.com/api/learning/kholasa/materials'
req = urllib.request.Request(url, headers={'x-student-code': 'LD824C', 'Accept': 'application/json'})
mats_data = []
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        mats_data = json.loads(resp.read().decode('utf-8')).get('materials', [])
except Exception as e:
    print('Failed to fetch materials from API:', e)

materials_by_lesson = {}
for m in mats_data:
    les = m.get('lesson', '').strip()
    if les:
        materials_by_lesson[les] = m

# 2. Read curriculum bank questions
with open('student_app/assets/data/curriculum_bank.json', 'r', encoding='utf-8') as f:
    bank_questions = json.load(f)

# Group questions by unit and lesson
lessons_map = {}
for q in bank_questions:
    u = q.get('unit', 'عام').strip()
    l = q.get('lesson', 'عام').strip()
    key = (u, l)
    if key not in lessons_map:
        lessons_map[key] = {
            'unit': u,
            'lesson': l,
            'definitions': [],
            'essay_questions': [],
            'mcq_questions': [],
            'true_false_questions': []
        }
    
    q_type = q.get('type')
    item = {
        'id': q.get('id'),
        'prompt': q.get('prompt'),
        'type': q_type,
        'difficulty': q.get('difficulty'),
        'explanation': q.get('explanation') or '',
    }
    if q_type == 'mcq':
        item['options'] = q.get('options', [])
        item['correctIndex'] = q.get('correctIndex')
        if item['correctIndex'] is not None and 0 <= item['correctIndex'] < len(item['options']):
            item['correctAnswer'] = item['options'][item['correctIndex']]
        else:
            item['correctAnswer'] = ''
        lessons_map[key]['mcq_questions'].append(item)
    elif q_type == 'true_false':
        item['options'] = q.get('options', ['صواب', 'خطأ'])
        item['correctIndex'] = q.get('correctIndex')
        if item['correctIndex'] is not None and 0 <= item['correctIndex'] < len(item['options']):
            item['correctAnswer'] = item['options'][item['correctIndex']]
        else:
            item['correctAnswer'] = ''
        lessons_map[key]['true_false_questions'].append(item)
    elif q_type == 'essay':
        item['model_answer'] = q.get('explanation') or ''
        lessons_map[key]['essay_questions'].append(item)

# Add definitions from materials
for (u, l), data in lessons_map.items():
    matched_mat = None
    for mat_les, mat in materials_by_lesson.items():
        if l in mat_les or mat_les in l:
            matched_mat = mat
            break
    if matched_mat:
        defs = matched_mat.get('definitions') or []
        for d in defs:
            data['definitions'].append({
                'term': d.get('term'),
                'definition': d.get('definition'),
                'source': 'kholasa_definitions'
            })
        fcs = matched_mat.get('flashcards') or []
        for fc in fcs:
            data['definitions'].append({
                'term': fc.get('front'),
                'definition': fc.get('back'),
                'source': 'kholasa_flashcards'
            })

# 3. Export definitions and essay questions master file (for quick admin review)
definitions_and_essays_export = []
for (u, l), data in lessons_map.items():
    lesson_entry = {
        'unit': u,
        'lesson': l,
        'definitions_count': len(data['definitions']),
        'essay_questions_count': len(data['essay_questions']),
        'definitions': data['definitions'],
        'essay_questions': [
            {
                'id': q['id'],
                'question_prompt': q['prompt'],
                'current_model_answer': q['model_answer'],
                'updated_model_answer': ''  # Admin can fill this
            }
            for q in data['essay_questions']
        ]
    }
    definitions_and_essays_export.append(lesson_entry)

master_defs_path = os.path.join(output_dir, 'definitions_and_essay_questions_review.json')
with open(master_defs_path, 'w', encoding='utf-8') as f:
    json.dump(definitions_and_essays_export, f, ensure_ascii=False, indent=2)

# 4. Export individual lesson files
lesson_idx = 1
for (u, l), data in lessons_map.items():
    safe_name = re.sub(r'[\s:/\\]+', '_', l)[:45]
    filename = f'{lesson_idx:02d}_{safe_name}.json'
    filepath = os.path.join(by_lesson_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    lesson_idx += 1

# 5. Export comprehensive full bank file
all_lessons_list = list(lessons_map.values())
master_bank_path = os.path.join(output_dir, 'curriculum_full_bank_all_lessons.json')
with open(master_bank_path, 'w', encoding='utf-8') as f:
    json.dump(all_lessons_list, f, ensure_ascii=False, indent=2)

# 6. Summary manifest
summary = {
    'total_questions': len(bank_questions),
    'total_lessons': len(lessons_map),
    'total_essay_questions': sum(len(d['essay_questions']) for d in lessons_map.values()),
    'total_mcq_questions': sum(len(d['mcq_questions']) for d in lessons_map.values()),
    'total_true_false_questions': sum(len(d['true_false_questions']) for d in lessons_map.values()),
    'total_definitions': sum(len(d['definitions']) for d in lessons_map.values()),
    'lessons': [
        {
            'unit': d['unit'],
            'lesson': d['lesson'],
            'definitions_count': len(d['definitions']),
            'essay_count': len(d['essay_questions']),
            'mcq_count': len(d['mcq_questions']),
            'true_false_count': len(d['true_false_questions']),
            'total_questions': len(d['essay_questions']) + len(d['mcq_questions']) + len(d['true_false_count'] if 'true_false_count' in d else d['true_false_questions']),
            'file': f'{idx+1:02d}_{re.sub(r"[\\s:/\\\\]+", "_", d["lesson"])[:45]}.json'
        }
        for idx, d in enumerate(lessons_map.values())
    ]
}
with open(os.path.join(output_dir, 'summary.json'), 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print('Export complete!')
print(f'Total questions: {summary["total_questions"]}')
print(f'Total essay: {summary["total_essay_questions"]}')
print(f'Total MCQ: {summary["total_mcq_questions"]}')
print(f'Total TF: {summary["total_true_false_questions"]}')
print(f'Total definitions: {summary["total_definitions"]}')
