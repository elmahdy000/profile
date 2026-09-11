with open('scratch/test_parser_live.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("scratch/doc_md.txt", "scratch/direct_xml_text.txt")
target = "if (current.correctIndex === null) {"
replacement = """console.log('Q:', finalPrompt.slice(0, 30), 'correctIndex:', current.correctIndex);
      if (current.correctIndex === null) {"""
code = code.replace(target, replacement, 1)

with open('scratch/debug_eval.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Created scratch/debug_eval.js")
