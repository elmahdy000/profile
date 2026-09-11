
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

const buf = fs.readFileSync('1-1 mcq.docx');
const xml = extractFromZip(buf, 'word/document.xml');
const text = extractTextFromDocxXml(xml);

const testParser = fs.readFileSync('scratch/test_parser_live.js', 'utf8');
// Let us log when answerMatch happens
const modified = testParser
  .replace('const fileContent = fs.readFileSync(\'scratch/doc_md.txt\', \'utf8\');', 'const fileContent = ' + JSON.stringify(text) + ';')
  .replace('if (answerMatch && current) {', 'if (answerMatch && current) { console.log(\'ANSWER_MATCH_HIT: line =\', line, \'val=\', answerMatch[1]);')
  .replace('warnings.push(لم يتم العثور على إجابة صريحة للسؤال: «...». تم تعيين الخيار الأول افتراضيًا.);', 'console.log(\'WARNING_TRIGGERED for\', finalPrompt.slice(0, 30), \'correctIndex was:\', current.correctIndex); warnings.push(\'warn\');');

fs.writeFileSync('scratch/debug_run.js', modified, 'utf8');
