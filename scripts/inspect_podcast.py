import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

filepath = "artifacts/dr-mahmoud/src/components/AdminDashboard.tsx"

if not os.path.exists(filepath):
    print("File not found")
    exit()

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Searching for handlePodcastDelete ===")
for i, line in enumerate(lines):
    if "handlePodcastDelete" in line:
        for j in range(max(0, i-2), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j]}", end="")
        break
