const fs = require('fs');
const zlib = require('zlib');

function extractFromZip(buffer, targetName) {
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compression = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      if (name === targetName || name.endsWith('/' + targetName)) {
        const compData = buffer.subarray(dataStart, dataStart + compSize);
        if (compression === 8) {
          return zlib.inflateRawSync(compData).toString('utf8');
        } else if (compression === 0) {
          return compData.toString('utf8');
        }
      }
      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return null;
}

function extractTextFromDocxXml(xml) {
  return xml
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:p\b[^>]*>/g, '\n')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
}

const optionLabels = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  'أ': 0, 'ا': 0, 'إ': 0, 'آ': 0, 'ء': 0,
  'ب': 1, 'ج': 2, 'د': 3, 'ه': 4, 'هـ': 4, 'ز': 6,
  'الأول': 0, 'الاول': 0, 'الثاني': 1, 'الثانى': 1,
  'الثالث': 2, 'الرابع': 3, 'الخامس': 4, 'السادس': 5,
};

function optionIndex(value) {
  const normalized = value.trim().toLowerCase().replace(/[.():\-\/\[\]]/g, '');
  if (normalized in optionLabels) return optionLabels[normalized];
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
}

function cleanOptionString(opt) {
  return opt.replace(/\s*[\r\n]+\s*[\(\[]?[A-Fa-fأابجدهإآهـ1-6][\)\.\:\-\]\/]?\s*$/g, '').replace(/^[\*\•\s]+/, '').trim();
}

function normalizeQuestionPrompt(prompt) {
  if (!prompt) return '';
  return prompt.replace(/^(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-.\/]?\s*/i, '')
    .replace(/^(?:السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))\s*[:：\-.\/]?\s*/i, '')
    .replace(/^(?:\(\d+\)|\d+\s*[\.\)\-\/:\—\–])\s*/, '')
    .replace(/[\s\.\:\-\_،,؛;؟?]+/g, '')
    .toLowerCase().trim();
}

const learningCode = fs.readFileSync('artifacts/api-server/src/routes/learning.ts', 'utf8');
const start = learningCode.indexOf('function parseImportedQuestions(');
const end = learningCode.indexOf('function normalizeStringList(');
// strip typescript type annotations from parseImportedQuestions
let funcCode = learningCode.slice(start, end);
funcCode = funcCode.replace(/: { questions: QuizQuestion\[\]; warnings: string\[\] }/g, '');
funcCode = funcCode.replace(/: string/g, '');
funcCode = funcCode.replace(/: number \| null/g, '');
funcCode = funcCode.replace(/: number/g, '');
funcCode = funcCode.replace(/: QuizQuestion\[\]/g, '');
funcCode = funcCode.replace(/: string\[\]/g, '');
funcCode = funcCode.replace(/: DraftQuestion \| null/g, '');
funcCode = funcCode.replace(/type DraftQuestion = [^;]+;/g, '');
funcCode = funcCode.replace(/as DraftQuestion/g, '');
funcCode = funcCode.replace(/!/g, '');

const fullScript = funcCode + `
const buf = fs.readFileSync('1-1 mcq.docx');
const xml = extractFromZip(buf, 'word/document.xml');
const text = extractTextFromDocxXml(xml);
const result = parseImportedQuestions(text);
console.log('Total questions:', result.questions.length);
console.log('Warnings count:', result.warnings.length);
console.log('First question:', JSON.stringify(result.questions[0], null, 2));
console.log('Last question:', JSON.stringify(result.questions[result.questions.length - 1], null, 2));
`;

fs.writeFileSync('scratch/run_actual_parser.js', fullScript, 'utf8');
