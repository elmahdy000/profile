import json
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open("batch_520_604_full.txt", "r", encoding="utf-8") as f:
    text = f.read()

entries = text.split("=" * 60)
print(f"Total entries: {len(entries)}")

# Let's inspect any entry where options and explanation can be compared
discrepancies = []
for entry in entries:
    lines = [l.strip() for l in entry.strip().split("\n") if l.strip()]
    if len(lines) < 4: continue
    
    id_line = lines[0] # ID 520: ...
    opts_line = lines[1] # Options: [...]
    c_idx_line = lines[2] # CorrectIndex=1 -> '...'
    expl_line = lines[3] # Explanation: ...
    
    qid = id_line.split(":")[0].replace("ID ", "").strip()
    prompt = id_line.split(":", 1)[1].strip()
    expl = expl_line.replace("Explanation: ", "").strip()
    
    # Parse options
    opts_str = opts_line.replace("Options: ", "")
    opts = eval(opts_str)
    
    c_idx = int(c_idx_line.split("->")[0].replace("CorrectIndex=", "").strip())
    cur_opt = opts[c_idx]
    
    # Let's check each option
    # Look for options that have more semantic or exact overlap with explanation than cur_opt
    cur_overlap = sum(1 for w in cur_opt.split() if len(w) > 2 and w in expl)
    
    other_better = []
    for i, o in enumerate(opts):
        if i == c_idx: continue
        o_words = [w for w in o.split() if len(w) > 2]
        overlap = sum(1 for w in o_words if w in expl)
        if overlap > cur_overlap and (overlap >= 2 or (len(o_words) == 1 and overlap == 1)):
            other_better.append((i, o, overlap, len(o_words)))
    
    if other_better:
        discrepancies.append({
            'qid': qid,
            'prompt': prompt,
            'opts': opts,
            'c_idx': c_idx,
            'cur_opt': cur_opt,
            'other_better': other_better,
            'expl': expl
        })

print(f"\nPotential discrepancy count: {len(discrepancies)}")
for d in discrepancies:
    print(f"\nID {d['qid']}: {d['prompt']}")
    print(f"  Current [cIdx={d['c_idx']}]: '{d['cur_opt']}'")
    for ob in d['other_better']:
        print(f"  Better? [index={ob[0]}]: '{ob[1]}' (matches {ob[2]}/{ob[3]} words)")
    print(f"  Explanation: {d['expl']}")
