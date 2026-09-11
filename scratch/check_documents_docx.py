import os, sys, zipfile, re
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

docs_dir = r'C:\Users\engel\Documents'
for f in os.listdir(docs_dir):
    if f.endswith('.docx') and not f.startswith('~$'):
        p = os.path.join(docs_dir, f)
        try:
            with zipfile.ZipFile(p) as z:
                xml = z.read('word/document.xml').decode('utf-8')
                txt = re.sub(r'<[^>]+>', ' ', xml)
                print(f"=== {f} ({len(txt)} chars) ===")
                # check for keywords
                for kw in ['الهلوسة', 'الذكاء الاصطناعي', 'التشفير', 'المساءلة', 'XAI']:
                    if kw in txt:
                        print(f"  Matches: {kw}")
        except Exception as e:
            print(f"Error {f}: {e}")
