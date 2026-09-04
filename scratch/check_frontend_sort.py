import os
import re

src_dir = r"c:\Users\engel\Desktop\profile\artifacts\dr-mahmoud\src"
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".ts"):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                text = file.read()
                if "videos" in text and "sort" in text:
                    for line_no, line in enumerate(text.split("\n"), 1):
                        if "sort" in line and ("video" in line or "order" in line or "a." in line):
                            print(f"{f}:{line_no} -> {line.strip()}")
