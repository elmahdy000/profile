import json, sys

sys.stdout.reconfigure(encoding='utf-8')

print("--- Checking quiz35_questions.json ---")
with open('scratch/quiz35_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

for idx, q in enumerate(questions):
    prompt = q.get('prompt', '')
    if 'العلاقة بين الذكاء' in prompt or 'الحواسيب' in prompt or 'بداية استخدام الأفراد' in str(q):
        print(f"Index {idx+1}: {prompt}")
        print("  Options:", q.get('options'))
        print("  correctIndex:", q.get('correctIndex'))
        print("  explanation:", q.get('explanation'))
        print()

print("--- Checking db_dump.txt ---")
with open('scratch/db_dump.txt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for line in lines:
    if 'العلاقة بين الذكاء' in line or 'الحواسيب الشخصية' in line or 'بداية استخدام الأفراد' in line:
        print(line[:200])
