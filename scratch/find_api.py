import os
import re

src_dir = r"c:\Users\engel\Desktop\profile\artifacts\api-server\src"
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".ts") or f.endswith(".js"):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                text = file.read()
                for match in re.finditer(r'(/api/[a-zA-Z0-9_/\-]+|videosTable|coursesTable)', text):
                    line_no = text[:match.start()].count('\n') + 1
                    print(f"{f}:{line_no} -> {match.group(0)}")
