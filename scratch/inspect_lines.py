with open('scratch/direct_xml_text.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect the lines of direct_xml_text.txt after line-split
lines = [l.strip() for l in text.split('\n') if l.strip()]

with open('scratch/inspected_lines.txt', 'w', encoding='utf-8') as out:
    for i, l in enumerate(lines[:30]):
        out.write(f"{i}: {l}\n")

print(f"Total lines: {len(lines)}")
