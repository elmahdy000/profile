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

const buf = fs.readFileSync('1-1 mcq.docx');
const xml = extractFromZip(buf, 'word/document.xml');
const xmlText = extractTextFromDocxXml(xml);
console.log('XML Extracted Text length:', xmlText.length);
fs.writeFileSync('scratch/doc_from_xml.txt', xmlText);

// Now test parse on doc_from_xml.txt
const parserCode = fs.readFileSync('scratch/test_parser_live.js', 'utf8');
eval(parserCode.replace("const fileContent = fs.readFileSync('scratch/doc_md.txt', 'utf8');", "const fileContent = xmlText;"));
