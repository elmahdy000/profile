import paramiko
import sys
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

out = q("""
SELECT json_build_object(
    'id', id,
    'unit', unit,
    'lesson', lesson,
    'question', question
)::text
FROM question_bank
ORDER BY id ASC;
""")

lines = out.strip().split("\n")
bank_items = [json.loads(l) for l in lines if l.strip()]

def norm(t):
    if not t: return ""
    t = re.sub(r'[\u064B-\u065F\u0670]', '', str(t))
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[ىي]', 'ي', t)
    t = re.sub(r'ة', 'ه', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    return ' '.join(t.lower().split())

stopwords = set(["من", "في", "على", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "هو", "هي", "ان", "انها", "انه", "كان", "كانت", "يكون", "تكون", "ما", "لا", "لم", "لن", "قد", "كل", "او", "ام"])

candidates = []

for item in bank_items:
    qid = item['id']
    qst = item.get('question', {})
    opts = qst.get('options', [])
    c_idx = qst.get('correctIndex', 0)
    expl = qst.get('explanation', '') or ''
    prompt = qst.get('prompt', '') or ''

    if not expl or not opts or len(opts) < 2:
        continue

    norm_expl = norm(expl)
    expl_words = set(w for w in norm_expl.split() if w not in stopwords and len(w) >= 3)
    
    # Calculate score for each option against explanation
    opt_scores = []
    for idx, opt in enumerate(opts):
        n_opt = norm(opt)
        words = [w for w in n_opt.split() if w not in stopwords and len(w) >= 3]
        if not words:
            overlap = 0
            ratio = 0
        else:
            matches = [w for w in words if w in expl_words]
            overlap = len(matches)
            ratio = overlap / len(words)
        
        # Check phrase match (2 consecutive words)
        phrase_match = False
        words_all = n_opt.split()
        for i in range(len(words_all) - 1):
            pair = f"{words_all[i]} {words_all[i+1]}"
            if len(pair) >= 7 and pair in norm_expl:
                phrase_match = True
                break

        opt_scores.append({
            'idx': idx,
            'text': opt,
            'words': len(words),
            'overlap': overlap,
            'ratio': ratio,
            'phrase': phrase_match
        })

    cur_score = opt_scores[c_idx] if 0 <= c_idx < len(opt_scores) else {'ratio': 0, 'overlap': 0, 'phrase': False}
    
    # Check if a negative question (asking for "not", "ليس", "غير", "خطأ")
    is_neg = bool(re.search(r'\b(ليس|ليست|غير|خطا|لا يعد|لا تعتبر|لا يعتبر|باستثناء|ما عدا)\b', norm(prompt)))

    # Find candidate alternative options
    # An alternative is strongly favored if:
    # 1. (phrase match OR high word overlap >= 2) AND
    # 2. current option has 0 phrase match and 0 or low overlap AND
    # 3. not a negative question
    for s in opt_scores:
        if s['idx'] == c_idx:
            continue
        
        # If alternative has strong phrase or >= 2 words match while current has ZERO match
        condition1 = s['phrase'] and not cur_score['phrase'] and cur_score['overlap'] == 0
        condition2 = s['overlap'] >= 2 and s['ratio'] >= 0.6 and cur_score['overlap'] == 0 and not cur_score['phrase']
        
        if (condition1 or condition2) and not is_neg:
            candidates.append({
                'id': qid,
                'prompt': prompt,
                'c_idx': c_idx,
                'cur_opt': opts[c_idx],
                'suggest_idx': s['idx'],
                'suggest_opt': s['text'],
                's_stat': f"overlap={s['overlap']}/{s['words']}, phrase={s['phrase']}",
                'cur_stat': f"overlap={cur_score['overlap']}/{cur_score['words']}, phrase={cur_score['phrase']}",
                'explanation': expl
            })
            break

print(f"Total potential mismatches in question_bank: {len(candidates)}")
for c_item in candidates:
    print(f"\n[ID {c_item['id']}] {c_item['prompt']}")
    print(f"  ❌ Current: [{c_item['c_idx']}] {c_item['cur_opt']} ({c_item['cur_stat']})")
    print(f"  👉 Suggest: [{c_item['suggest_idx']}] {c_item['suggest_opt']} ({c_item['s_stat']})")
    print(f"  📝 Explanation: {c_item['explanation']}")

c.close()
