with open('scratch/direct_xml_text.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
with open('scratch/lines_analysis.txt', 'w', encoding='utf-8') as out:
    for i, l in enumerate(lines[:20]):
        out.write(f"Line {i} length {len(l)}:\n")
        out.write(f"  repr: {repr(l)}\n")
        chars = " ".join([f"{c}({hex(ord(c))})" for c in l])
        out.write(f"  chars: {chars}\n\n")

print("Wrote analysis to scratch/lines_analysis.txt")
