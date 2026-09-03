with open(r"c:\Users\engel\Desktop\profile\artifacts\api-server\src\routes\learning.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(3999, min(4728, len(lines))):
    if "router." in lines[i]:
        print(f"Line {i+1}: {''.join(lines[i:i+3]).strip()}")
