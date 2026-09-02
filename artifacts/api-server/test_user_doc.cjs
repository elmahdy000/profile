const fs = require("fs");
const mammoth = require("mammoth");

async function run() {
  const filePath = "C:\\Users\\engel\\Desktop\\profile\\1-1 mcq.docx";
  if (!fs.existsSync(filePath)) {
    console.log("File not found at:", filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  console.log("File size:", buffer.length, "bytes");

  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    console.log("=== RAW TEXT FROM MAMMOTH (Length:", rawResult.value.length, ") ===");
    console.log(rawResult.value);
  } catch (err) {
    console.error("Mammoth error:", err);
  }
}

run();
