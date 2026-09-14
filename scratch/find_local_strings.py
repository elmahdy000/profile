import os, glob

for root, dirs, files in os.walk('.'):
    # skip node_modules and .git
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', '.gemini')]
    for f in files:
        if f.endswith(('.json', '.txt', '.py', '.ts', '.tsx', '.sql', '.docx')):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as fl:
                    content = fl.read()
                    if 'بداية استخدام الأفراد للحاسب' in content or 'الذكاء الاصطناعي مجال أوسع والتعلم الآلي أحد أساليبه' in content:
                        print('Found in file:', p)
            except:
                pass
