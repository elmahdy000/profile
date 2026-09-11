const fs = require('fs');

const parserFile = fs.readFileSync('scratch/test_full_fixed_parser.js', 'utf8');
const modified = parserFile.replace(
  'warnings.push(`تم تجاوز:',
  'console.log("SKIPPED PROMPT:", JSON.stringify(current.prompt)); warnings.push(`تم تجاوز:'
);

const start = modified.indexOf('function cleanOptionString(');
const end = modified.indexOf('// TEST 1:');
eval(modified.slice(start, end));

const rawUserText = fs.readFileSync('scratch/user_questions.txt', 'utf8');
parseImportedQuestions(rawUserText);
