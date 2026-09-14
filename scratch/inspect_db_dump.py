import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('scratch/db_dump.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'ما الأثر المجتمعي المرتبط بانتشار الحواسيب الشخصية' in line or 'العلاقة بين الذكاء الاصطناعي والتعلم الآلي' in line:
        print(f"--- Around Line {i} ---")
        start = max(0, i - 2)
        end = min(len(lines), i + 10)
        for j in range(start, end):
            print(f"{j}: {lines[j].strip()}")
