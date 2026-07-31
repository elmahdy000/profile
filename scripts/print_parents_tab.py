import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

filepath = "artifacts/dr-mahmoud/src/components/AdminDashboard.tsx"

if not os.path.exists(filepath):
    print("File not found")
    exit()

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Let's print lines 4845 to 5068 to see exactly what ParentsTab looks like
for idx in range(4844, len(lines)):
    print(lines[idx], end="")