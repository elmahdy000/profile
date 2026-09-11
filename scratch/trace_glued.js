const fs = require('fs');

let cleanedText = fs.readFileSync('scratch/direct_xml_text.txt', 'utf8');

function check(label) {
  const hasGlued = cleanedText.includes("الاجتماعيالإجابة");
  const hasNewline = cleanedText.includes("الاجتماعي\nالإجابة") || cleanedText.includes("الاجتماعي\r\nالإجابة");
  console.log(`${label}: hasGlued=${hasGlued}, hasNewline=${hasNewline}`);
}

check("Initial direct_xml_text");

cleanedText = cleanedText
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n")
  .replace(/[\u2028\u2029]/g, "\n")
  .replace(/\\([()[\] .\-+*_#~`>!\\])/g, "$1")
  .replace(/\*\*|__/g, "")
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/^\s*\|?\s*[-:]{2,}(?:\s*\|\s*[-:]{2,})*\s*\|?\s*$/gm, "")
  .replace(/^\s*\|(.*)\|\s*$/gm, (_, inner) =>
    inner
      .split("|")
      .map((c) => c.trim())
      .join("\t")
  );

check("After step 1 (normalization)");

const answerKeyMatch = cleanedText.match(/(?:نموذج\s+الإجاب[ةات]|نموذج\s+الاجاب[ةات]|مفتاح\s+الحل|الإجابات\s+النموذجية|Answer\s*Key)[\s\S]*$/i);
if (answerKeyMatch) {
  cleanedText = cleanedText.replace(answerKeyMatch[0], "");
}

check("After step 2 (answer key)");

cleanedText = cleanedText.replace(/(?:^|\s)((?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب|الحل|الاختيار\s+الصحيح)\s*[:：\-]?\s*[أابجدهإآA-Da-d1-6])\s*((?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-])/gi, "$1\n$2");

check("After step 3 (inline answer+explanation)");

cleanedText = cleanedText.replace(/([^\n\s]+)(?:\s*(?:[\—\–\-\|\/]|[\,\;])\s*|\s{2,}|\t)((?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*(?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\]\/]\s+)/gi, (match, p1, p2) => {
  if (/^(?:Question|سؤال|س|Q|السؤال|item|ex|no|num)$/i.test(p1.trim())) return match;
  return `${p1}\n${p2}`;
});

check("After step 4 (inline choices with punctuation)");

cleanedText = cleanedText.replace(/([^\n\s]+)\s+((?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\/]\s+)/gi, (match, p1, p2) => {
  if (/^(?:Question|سؤال|س|Q|السؤال|item|ex|no|num)$/i.test(p1.trim())) return match;
  return `${p1}\n${p2}`;
});

check("After step 5 (inline choices with single space)");

cleanedText = cleanedText.replace(/([a-zA-Z\u0600-\u06FF])([A-Fa-fأابجدهإآ]|هـ|[1-6])\)\s+/g, "$1\n$2) ");

check("After step 6 (glued choices)");

cleanedText = cleanedText.replace(/([^\n])\s+((?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\(?\d+\)|(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\d+|Question\s*[:：\-]?\s*\d+|#\d+)\s*[:：\-\.\/])/gi, "$1\n$2");

check("After step 7 (question headers)");
