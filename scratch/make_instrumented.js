const fs = require('fs');

const parserSource = fs.readFileSync('scratch/test_parser_live.js', 'utf8');

// Let's modify the line where ANSWER_RE matches:
let instrumented = parserSource.replace(
  "const answerMatch = line.match(ANSWER_RE);",
  `const answerMatch = line.match(ANSWER_RE);
   if (line.includes("الإجابة")) {
     fs.appendFileSync('scratch/parser_trace.log', "LINE: " + JSON.stringify(line) + " MATCH: " + (answerMatch ? answerMatch[1] : "NULL") + " CURRENT_NULL: " + (!current) + "\\n");
   }`
);

instrumented = instrumented.replace(
  "scratch/doc_md.txt",
  "scratch/direct_xml_text.txt"
);

fs.writeFileSync('scratch/run_instrumented.js', instrumented, 'utf8');
