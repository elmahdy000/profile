const inlineText = "سؤال 1: ما التطور الذي أدى إلى بداية عصر معالجة المعلومات إلكترونياً؟ أ) ظهور الحواسيب الإلكترونية ب) ظهور الهواتف الذكية ج) انتشار التجارة الإلكترونية د) ظهور شبكات التواصل الاجتماعي الإجابة الصحيحة: أ التوضيح: أدى ظهور الحواسيب الإلكترونية إلى إمكانية معالجة كميات كبيرة من البيانات بسرعة ودقة. سؤال 2: ما الجهاز الذي ساعد على انتشار استخدام الحاسوب بين الأفراد والمنازل؟ أ) الحاسوب المركزي Mainframe ب) الحاسوب الشخصي Personal Computer ج) الخادم Server د) الحاسوب الكمي Quantum Computer الإجابة الصحيحة: ب";

function preprocessInlineText(rawText) {
  let cleaned = rawText
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n");

  cleaned = cleaned.replace(/([^\n])\s*(سؤال\s*\d+|س\d+|Question\s*\d+|#\d+)/gi, "$1\n$2");
  cleaned = cleaned.replace(/([^\n])\s+([A-Fa-fأابجده]|هـ|[1-6])\)\s+/g, "$1\n$2) ");
  cleaned = cleaned.replace(/([^\n])\s*(الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|correct\s*answer|answer)\s*[:：\-]?\s*/gi, "$1\nالإجابة الصحيحة: ");
  cleaned = cleaned.replace(/([^\n])\s*(التوضيح|التفسير|الشرح|تفسير|شرح|explanation|note)\s*[:：\-]?\s*/gi, "$1\nالتوضيح: ");

  return cleaned;
}

console.log("Preprocessed Inline Text:\n" + preprocessInlineText(inlineText));
