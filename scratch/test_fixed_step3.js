const fs = require('fs');

let cleanedText = fs.readFileSync('scratch/direct_xml_text.txt', 'utf8');

console.log("Before:", cleanedText.includes("الاجتماعيالإجابة"), cleanedText.includes("الاجتماعي\nالإجابة"));

// Fixed regex without (?:^|\s) eating preceding newline:
cleanedText = cleanedText.replace(/((?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب|الحل|الاختيار\s+الصحيح)\s*[:：\-]?\s*[أابجدهإآA-Da-d1-6])\s+((?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-])/gi, "$1\n$2");

console.log("After:", cleanedText.includes("الاجتماعيالإجابة"), cleanedText.includes("الاجتماعي\nالإجابة"));
