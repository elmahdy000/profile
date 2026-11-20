import json
import os

base_dir = r'd:\profile\curriculum_mcq_questions'
by_lesson_dir = os.path.join(base_dir, 'by_lesson')
os.makedirs(by_lesson_dir, exist_ok=True)

# Load curriculum bank questions
with open(r'd:\profile\student_app\assets\data\curriculum_bank.json', 'r', encoding='utf-8') as f:
    raw_questions = json.load(f)

# Filter only MCQ questions
mcq_questions = [q for q in raw_questions if q.get('type') == 'mcq']

# Define canonical unit ordering and mapping
unit_configs = [
    {
        'unit_id': 1,
        'unit_title': 'الوحدة الأولى: الذكاء الاصطناعي والمجتمع',
        'file_name': 'unit_1_mcq_questions.json',
        'lessons': [
            {
                'lesson_id': '1_1',
                'order': 1,
                'lesson_title': 'الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي',
                'file_name': '01_Unit1_Lesson1_Development_of_Information_Technology.json'
            },
            {
                'lesson_id': '1_2',
                'order': 2,
                'lesson_title': 'الدرس الثاني: كيف يعمل الذكاء الاصطناعي',
                'file_name': '02_Unit1_Lesson2_How_AI_Works.json'
            },
            {
                'lesson_id': '1_3',
                'order': 3,
                'lesson_title': 'الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية',
                'file_name': '03_Unit1_Lesson3_AI_in_Daily_Life.json'
            },
            {
                'lesson_id': '1_4',
                'order': 4,
                'lesson_title': 'الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي',
                'file_name': '04_Unit1_Lesson4_Ethical_Issues_with_AI.json'
            },
            {
                'lesson_id': '1_review',
                'order': 5,
                'lesson_title': 'شامل الوحدة الأولى',
                'file_name': '05_Unit1_Comprehensive_Review.json'
            }
        ]
    },
    {
        'unit_id': 2,
        'unit_title': 'الوحدة الثانية: الأمن السيبراني والتشفير',
        'file_name': 'unit_2_mcq_questions.json',
        'lessons': [
            {
                'lesson_id': '2_1',
                'order': 6,
                'lesson_title': 'الدرس الأول: التشفير والمصادقة',
                'file_name': '06_Unit2_Lesson1_Cryptography_and_Authentication.json'
            },
            {
                'lesson_id': '2_2',
                'order': 7,
                'lesson_title': 'الدرس الثاني: حماية البيانات والمعلومات',
                'file_name': '07_Unit2_Lesson2_Data_and_Information_Protection.json'
            },
            {
                'lesson_id': '2_3',
                'order': 8,
                'lesson_title': 'الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر',
                'file_name': '08_Unit2_Lesson3_Incident_Response_and_Risk_Management.json'
            }
        ]
    },
    {
        'unit_id': 3,
        'unit_title': 'الوحدة الثالثة: تطبيقات الويب',
        'file_name': 'unit_3_mcq_questions.json',
        'lessons': [
            {
                'lesson_id': '3_1',
                'order': 9,
                'lesson_title': 'الدرس الأول: البنية العامة لتطبيقات الويب',
                'file_name': '09_Unit3_Lesson1_Overall_Structure_of_Web_Applications.json'
            },
            {
                'lesson_id': '3_2',
                'order': 10,
                'lesson_title': 'الدرس الثاني: طرق الاتصال في تطبيقات الويب',
                'file_name': '10_Unit3_Lesson2_Communication_Methods_in_Web_Applications.json'
            },
            {
                'lesson_id': '3_3',
                'order': 11,
                'lesson_title': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
                'file_name': '11_Unit3_Lesson3_Fundamentals_of_Frontend_Technology.json'
            }
        ]
    }
]

# Group questions by unit and lesson
questions_by_unit_and_lesson = {}
for q in mcq_questions:
    u = q.get('unit', '').strip()
    l = q.get('lesson', '').strip()
    questions_by_unit_and_lesson.setdefault(u, {}).setdefault(l, []).append(q)

master_output = {
    'metadata': {
        'title': 'بنك أسئلة الاختيار من متعدد (MCQ) - الصف الثاني الثانوي - منصة د. محمود المهدي',
        'curriculum': 'وزارة التربية والتعليم - المنهج الرسمي المعتمد',
        'question_type': 'mcq',
        'total_units': 3,
        'total_lessons': 11,
        'total_mcq_questions': len(mcq_questions)
    },
    'units': []
}

summary_stats = []

for u_cfg in unit_configs:
    u_title = u_cfg['unit_title']
    unit_lessons_data = questions_by_unit_and_lesson.get(u_title, {})
    
    unit_obj = {
        'unit_id': u_cfg['unit_id'],
        'unit_title': u_title,
        'total_lessons': len(u_cfg['lessons']),
        'total_unit_questions': 0,
        'lessons': []
    }
    
    unit_flat_questions = []

    for l_cfg in u_cfg['lessons']:
        l_title = l_cfg['lesson_title']
        raw_qs = unit_lessons_data.get(l_title, [])
        
        formatted_qs = []
        for idx, q in enumerate(raw_qs, 1):
            opts = q.get('options', [])
            correct_idx = q.get('correctIndex')
            correct_ans = ''
            if correct_idx is not None and 0 <= correct_idx < len(opts):
                correct_ans = opts[correct_idx]
                
            formatted_q = {
                'id': q.get('id'),
                'question_number': idx,
                'unit': u_title,
                'lesson': l_title,
                'prompt': (q.get('prompt') or '').strip(),
                'options': [str(opt).strip() for opt in opts],
                'correct_index': correct_idx,
                'correct_answer': correct_ans,
                'explanation': (q.get('explanation') or '').strip(),
                'difficulty': q.get('difficulty', 'medium'),
                'points': q.get('points', 1),
                'is_official_assessment': q.get('is_official_assessment', False),
                'source_type': q.get('source_type', 'PRACTICE'),
                'assessment_citation': q.get('assessment_citation'),
                'is_import_enabled': q.get('is_import_enabled', True)
            }
            formatted_qs.append(formatted_q)
            unit_flat_questions.append(formatted_q)

        # Save individual lesson file
        lesson_file_path = os.path.join(by_lesson_dir, l_cfg['file_name'])
        lesson_file_data = {
            'unit_id': u_cfg['unit_id'],
            'unit_title': u_title,
            'lesson_id': l_cfg['lesson_id'],
            'lesson_title': l_title,
            'total_questions': len(formatted_qs),
            'questions': formatted_qs
        }
        with open(lesson_file_path, 'w', encoding='utf-8') as lf:
            json.dump(lesson_file_data, lf, ensure_ascii=False, indent=2)
            
        unit_obj['lessons'].append({
            'lesson_id': l_cfg['lesson_id'],
            'lesson_title': l_title,
            'file_name': l_cfg['file_name'],
            'total_questions': len(formatted_qs),
            'questions': formatted_qs
        })
        
        summary_stats.append({
            'unit': u_title,
            'lesson': l_title,
            'file': l_cfg['file_name'],
            'count': len(formatted_qs)
        })

    unit_obj['total_unit_questions'] = len(unit_flat_questions)
    master_output['units'].append(unit_obj)

    # Save per-unit file
    unit_file_path = os.path.join(base_dir, u_cfg['file_name'])
    with open(unit_file_path, 'w', encoding='utf-8') as uf:
        json.dump(unit_obj, uf, ensure_ascii=False, indent=2)

# Save Master File
master_file_path = os.path.join(base_dir, 'all_mcq_questions.json')
with open(master_file_path, 'w', encoding='utf-8') as mf:
    json.dump(master_output, mf, ensure_ascii=False, indent=2)

# Save Summary Table File
summary_path = os.path.join(base_dir, 'summary.json')
with open(summary_path, 'w', encoding='utf-8') as sf:
    json.dump({
        'total_questions': len(mcq_questions),
        'total_units': 3,
        'total_lessons': 11,
        'lessons': summary_stats
    }, sf, ensure_ascii=False, indent=2)

print('Successfully exported all MCQ questions:')
print(f'Master File: {master_file_path}')
print(f'Total Questions: {len(mcq_questions)}')
for s in summary_stats:
    print(f"  [{s['unit']}] {s['lesson']}: {s['count']} MCQs -> {s['file']}")
