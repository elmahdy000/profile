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
    .replace(/<w:p[ >]/g, '\n')
    .replace(/<w:tab\s*\/?>/g, '\t')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function check(filePath) {
  console.log("Checking:", filePath);
  const buf = fs.readFileSync(filePath);
  const xml = extractFromZip(buf, 'word/document.xml');
  const xmlText = extractTextFromDocxXml(xml);
  const lines = xmlText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('النماذج اللغوية') || lines[i].includes('ما نوع المحتوى') || lines[i].includes('تفسير') || lines[i].includes('XAI')) {
      console.log(`[${i}] ${lines[i]}`);
    }
  }
}

if (fs.existsSync('test/2-1 mcq.docx')) {
  check('test/2-1 mcq.docx');
}
if (fs.existsSync('1-1 mcq.docx')) {
  check('1-1 mcq.docx');
}
