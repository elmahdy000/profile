const testRTL = "\u200Fأ) ظهور الحواسيب الإلكترونية";
const CHOICE_RE = /^(?:\(?([A-Fa-fأابجده]|هـ|[1-6])\)?[.):\-\s]\s*)(.+)$/;

console.log("Without cleanup:", testRTL.match(CHOICE_RE));

const cleaned = testRTL.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "").trim();
console.log("With cleanup:", cleaned.match(CHOICE_RE));
