import json
import re

with open("unit1_questions.json", "r", encoding="utf-8") as f:
    rows = json.load(f)

def clean_opt(o):
    return str(o).strip()

def normalize_prompt(p):
    if not p: return ""
    p = str(p).strip().lower()
    p = re.sub(r'[\s\r\n\t]+', ' ', p)
    p = re.sub(r'[؟?.,!،:;ـ_—\-\(\)\[\]\{\}«»"\']', '', p)
    return p

seen = set()
valid = []
for r in rows:
    q = r['question']
    prompt = q.get('prompt', '')
    opts = q.get('options', [])
    if not prompt or len(opts) < 2: continue
    
    pKey = normalize_prompt(prompt)
    if pKey in seen: continue
    seen.add(pKey)

    cIdx = q.get('correctIndex', 0)
    cleaned_opts = [clean_opt(o) for o in opts]
    cAns = cleaned_opts[cIdx] if 0 <= cIdx < len(cleaned_opts) else ""
    if not cAns: continue

    valid.append({
        'id': r['id'],
        'lesson': r.get('lesson'),
        'prompt': prompt.strip(),
        'options': cleaned_opts,
        'correctIndex': cIdx,
        'correctAnswer': cAns,
        'explanation': q.get('explanation', '')
    })

# In learning.ts: validQuestions.sort((a, b) => a.prompt.localeCompare(b.prompt)); pickedQuestions = validQuestions.slice(0, 50);
# Let's sort alphabetically
valid.sort(key=lambda x: x['prompt'])
fifty = valid[:50]

print(f"Extracted the 50 self-assessment questions.")

# Let's check Question 36 and Question 2 in this 50!
for idx, q in enumerate(fifty):
    # In student screenshot:
    # #2 was "ما الفكرة الأساسية للمعالجة المتوازية؟"
    # #36 was "ما أثر تيار التسرب الذي قد يظهر مع تصغير المكونات؟"
    print(f"#{idx+1} [ID {q['id']}] {q['prompt']}")
    print(f"   CorrectIndex: {q['correctIndex']} -> '{q['options'][q['correctIndex']]}'")
    print(f"   Options: {q['options']}")
    print(f"   Explanation: {q['explanation']}")
    print("=" * 60)
