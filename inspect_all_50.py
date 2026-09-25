import json

with open("session_60_all_details.json", "r", encoding="utf-8") as f:
    details = json.load(f)

with open("session_60_review.txt", "w", encoding="utf-8") as out:
    for i, d in enumerate(details):
        opts = d['options']
        c_idx = d['correctOption']
        correct_text = opts[c_idx] if 0 <= c_idx < len(opts) else "INVALID"
        out.write(f"[{i+1}] {d['prompt']}\n")
        out.write(f"    Options: {opts}\n")
        out.write(f"    CorrectIndex={c_idx} -> '{correct_text}'\n")
        out.write(f"    Explanation: {d['explanation']}\n")
        out.write("-" * 60 + "\n")

print("Done writing session_60_review.txt")
