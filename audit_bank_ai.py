import paramiko
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json
import re

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    return out

print("Fetching all question_bank rows...")
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
all_bank = []
for l in lines:
    if l.strip():
        try:
            all_bank.append(json.loads(l))
        except:
            pass

print(f"Total questions fetched: {len(all_bank)}")

def clean_txt(t):
    if not t: return ""
    t = re.sub(r'[\u064B-\u065F\u0670]', '', str(t))
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[ىي]', 'ي', t)
    t = re.sub(r'ة', 'ه', t)
    return t.strip().lower()

flagged = []
for item in all_bank:
    qid = item['id']
    qst = item['question']
    c_idx = qst.get('correctIndex', 0)
    opts = qst.get('options', [])
    expl = qst.get('explanation', '')
    prompt = qst.get('prompt', '')

    if not expl or not opts or len(opts) < 2:
        continue

    norm_expl = clean_txt(expl)
    
    # Check if the explanation explicitly mentions a letter e.g. "الإجابة الصحيحة هي ب"
    expl_letter_match = re.search(r'(?:الاجابه|الاجابة|الخيار|الاختيار)(?:\s+الصحيحه|\s+الصحيح)?\s*(?:هي|هو)?\s*[:：\-]?\s*[\(\[]?\s*([أابجدهإآA-Da-d1-6])', expl)
    
    # Check matching of each option in explanation
    scores = []
    for idx, opt in enumerate(opts):
        norm_opt = clean_txt(opt)
        # Option words with length >= 3
        words = [w for w in re.split(r'[\s\.,;:!?؟\-_]+', norm_opt) if len(w) >= 3]
        if not words:
            continue
        matched_words = [w for w in words if w in norm_expl]
        ratio = len(matched_words) / len(words)
        # Full phrase containment
        is_contained = norm_opt in norm_expl if len(norm_opt) >= 6 else False
        scores.append({
            'index': idx,
            'text': opt,
            'ratio': ratio,
            'matched_words': matched_words,
            'is_contained': is_contained
        })

    cur_opt = opts[c_idx] if 0 <= c_idx < len(opts) else ""
    cur_score = next((s for s in scores if s['index'] == c_idx), None)
    
    # Find if another option has much stronger evidence in the explanation
    # e.g., another option is completely contained in explanation (is_contained) and has >= 2 words, while cur_opt is NOT
    better_matches = []
    for s in scores:
        if s['index'] != c_idx:
            # Strong evidence: either is_contained with length >= 8, or ratio == 1.0 with 2+ words while current ratio < 0.5
            if s['is_contained'] and len(s['text']) >= 8:
                better_matches.append(s)
            elif s['ratio'] >= 0.8 and len(s['matched_words']) >= 2 and (not cur_score or cur_score['ratio'] <= 0.2):
                better_matches.append(s)

    # Exclude questions asking for "not" / "غير صحيحة" / "ليست" because explanation explains why something is right or wrong
    is_negative = bool(re.search(r'\b(غير|ليس|ليست|لا ي|لا ت|لا م|خطأ)\b', clean_txt(prompt)))

    if better_matches and not is_negative:
        flagged.append({
            'id': qid,
            'unit': item.get('unit'),
            'lesson': item.get('lesson'),
            'prompt': prompt,
            'options': opts,
            'c_idx': c_idx,
            'cur_opt': cur_opt,
            'better_matches': better_matches,
            'explanation': expl
        })

print(f"\nFound {len(flagged)} questions where explanation strongly indicates another option!")
for f in flagged[:15]:
    print(f"\n[ID {f['id']}] {f['prompt']}")
    print(f"  Current: [{f['c_idx']}] {f['cur_opt']}")
    for bm in f['better_matches']:
        print(f"  Suggest: [{bm['index']}] {bm['text']} (contained={bm['is_contained']}, ratio={bm['ratio']:.2f})")
    print(f"  Explanation: {f['explanation']}")

c.close()
