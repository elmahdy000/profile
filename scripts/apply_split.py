import os

filepath = "artifacts/dr-mahmoud/src/components/AdminDashboard.tsx"

if not os.path.exists(filepath):
    print("File not found")
    exit()

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the exact starting mark of ParentsTab
target_comment = "/* ─────────────────────────────────────────────────────────────────────────────\n   ParentsTab – standalone component rendered inside AdminDashboard"

if target_comment in content:
    print("Found target ParentsTab comment!")
    # Cut the content from that comment to the end of file
    parts = content.split(target_comment)
    main_content = parts[0]
    
    # Let's clean trailing braces if there are any remaining from the cut
    # We want to replace or add the import at the top of the file
    import_line = 'import { ParentsTab } from "./admin/dashboard/ParentsTab";\n'
    
    # Put it near the top
    lines = main_content.splitlines()
    inserted = False
    for idx, line in enumerate(lines):
        if line.startswith("import ") and not inserted:
            lines.insert(idx, import_line)
            inserted = True
            break
            
    updated_content = "\n".join(lines) + "\n"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print("Successfully split and updated AdminDashboard.tsx!")
else:
    # Try finding with \r\n instead of \n to be platform-agnostic
    target_comment_rn = "/* ─────────────────────────────────────────────────────────────────────────────\r\n   ParentsTab – standalone component rendered inside AdminDashboard"
    if target_comment_rn in content:
        print("Found target ParentsTab comment (with windows line endings)!")
        parts = content.split(target_comment_rn)
        main_content = parts[0]
        import_line = 'import { ParentsTab } from "./admin/dashboard/ParentsTab";\n'
        lines = main_content.splitlines()
        inserted = False
        for idx, line in enumerate(lines):
            if line.startswith("import ") and not inserted:
                lines.insert(idx, import_line)
                inserted = True
                break
        updated_content = "\n".join(lines) + "\n"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print("Successfully split and updated AdminDashboard.tsx!")
    else:
        print("Target comment not found! Check the file structure.")
