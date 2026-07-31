import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

filepath = "artifacts/dr-mahmoud/src/components/AdminDashboard.tsx"

if not os.path.exists(filepath):
    print("File not found")
    exit()

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Let's inspect function/const definitions or major comments between line 3290 and 4890
print("=== Inspecting between 3290 and 4890 ===")
for i in range(3290, 4890):
    if i < len(lines):
        line = lines[i]
        if "function " in line or "const " in line or "/* " in line or "interface " in line or "type " in line:
            # Print only if it defines a component or a helper of interest
            if len(line.strip()) > 0:
                print(f"Line {i+1}: {line.strip()}")