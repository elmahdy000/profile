const fs = require('fs');

const line = "الإجابة الصحيحة: أ";

const EXPLICIT_QUESTION_RE = /^\s*(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?|السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|#\d+)(?:\s*[:：\-\.\)\/]\s*(.*))?$/i;
const NUMBERED_LINE_RE = /^\s*\(?(\d+)\)?[\s\.\:\-\)\/]+\s*(.*)$/;
const CHOICE_RE = /^\s*(?:(?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\s*[\)\.\:\-\]\/]\s*)(.+)$/i;
const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|الحل(?:\s+الصحيح)?|الاختيار\s+الصحيح)\s*(?:[:：\-]|(?:هو|هي)\s*[:：\-]?)\s*(.+)$/i;

const res = {
  EXPLICIT_QUESTION: Boolean(line.match(EXPLICIT_QUESTION_RE)),
  NUMBERED_LINE: Boolean(line.match(NUMBERED_LINE_RE)),
  CHOICE: Boolean(line.match(CHOICE_RE)),
  ANSWER: Boolean(line.match(ANSWER_RE)),
  ANSWER_MATCH: line.match(ANSWER_RE)?.[1]
};

fs.writeFileSync('scratch/match_test.json', JSON.stringify(res, null, 2), 'utf8');
