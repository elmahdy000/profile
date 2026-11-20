import urllib.request
import json
import os

url = 'https://drelmahdy.com/api/learning/kholasa/materials'
req = urllib.request.Request(url, headers={'x-student-code': 'LD824C', 'Accept': 'application/json'})
with urllib.request.urlopen(req, timeout=10) as resp:
    mats_data = json.loads(resp.read().decode('utf-8')).get('materials', [])

units_dict = {}
def_global_id = 1
flat_list = []

for m in mats_data:
    u = m.get('unit', '').strip()
    l = m.get('lesson', '').strip()
    if not u or not l:
        continue
    
    if u not in units_dict:
        units_dict[u] = {
            'unit_title': u,
            'lessons': []
        }
    
    defs_list = []
    # Collect definitions from flashcards
    for fc in (m.get('flashcards') or []):
        term = fc.get('front', '').strip()
        defn = fc.get('back', '').strip()
        if term and defn:
            item = {
                'id': f'DEF-{def_global_id:03d}',
                'term': term,
                'current_definition': defn,
                'updated_definition': ''
            }
            defs_list.append(item)
            flat_list.append({
                'id': f'DEF-{def_global_id:03d}',
                'unit': u,
                'lesson': l,
                'term': term,
                'current_definition': defn,
                'updated_definition': ''
            })
            def_global_id += 1

    # Also check if explicit definitions array exists
    for d in (m.get('definitions') or []):
        term = d.get('term', '').strip()
        defn = d.get('definition', '').strip()
        if term and defn and not any(x['term'] == term for x in defs_list):
            item = {
                'id': f'DEF-{def_global_id:03d}',
                'term': term,
                'current_definition': defn,
                'updated_definition': ''
            }
            defs_list.append(item)
            flat_list.append({
                'id': f'DEF-{def_global_id:03d}',
                'unit': u,
                'lesson': l,
                'term': term,
                'current_definition': defn,
                'updated_definition': ''
            })
            def_global_id += 1

    units_dict[u]['lessons'].append({
        'lesson_title': l,
        'total_definitions': len(defs_list),
        'definitions': defs_list
    })

units_structured = []
unit_num = 1
for u_title, u_data in units_dict.items():
    total_u_defs = sum(len(les['definitions']) for les in u_data['lessons'])
    units_structured.append({
        'unit_number': unit_num,
        'unit_title': u_title,
        'total_definitions': total_u_defs,
        'lessons': u_data['lessons']
    })
    unit_num += 1

export_data = {
    'metadata': {
        'title': 'سجل التعريفات والمفاهيم المنهجية الكامل (الوحدة الأولى إلى الوحدة الثالثة)',
        'academic_year': 'الصف الثاني الثانوي - منهج الحاسب والذكاء الاصطناعي',
        'total_units': len(units_structured),
        'total_lessons': sum(len(u['lessons']) for u in units_structured),
        'total_definitions': len(flat_list),
        'instructions': 'هذا الملف مخصص للمراجعة الأكاديمية للتعريفات. ضع الإجابة النموذجية المعتمدة في حقل updated_definition ثم أعد إرساله ليتم اعتماده مباشرة للطالب.'
    },
    'units': units_structured,
    'all_definitions_flat': flat_list
}

os.makedirs('curriculum_export', exist_ok=True)
out_path = os.path.join('curriculum_export', 'curriculum_definitions_only.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(export_data, f, ensure_ascii=False, indent=2)

print('Successfully exported definitions to:', out_path)
print(f'Total units: {len(units_structured)}')
print(f'Total definitions: {len(flat_list)}')
for u in units_structured:
    print(f"{u['unit_title']} (إجمالي: {u['total_definitions']} تعريف):")
    for les in u['lessons']:
        print(f"   - {les['lesson_title']}: {les['total_definitions']} تعريف")

# Export per unit files
unit_dir = os.path.join('curriculum_export', 'definitions_by_unit')
os.makedirs(unit_dir, exist_ok=True)
for u in units_structured:
    unum = u['unit_number']
    p = os.path.join(unit_dir, f'unit_{unum}_definitions.json')
    with open(p, 'w', encoding='utf-8') as out:
        json.dump(u, out, ensure_ascii=False, indent=2)
    print(f"Exported unit {unum} to {p}")
