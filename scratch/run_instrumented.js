const fs = require('fs');

const fileContent = fs.readFileSync('scratch/direct_xml_text.txt', 'utf8');

// Copy optionIndex, cleanOptionString, and parseImportedQuestions exactly from learning.ts
function cleanOptionString(opt) {
  return opt
    .replace(/\s*[\r\n]+\s*[\(\[]?[A-Fa-fأابجدهإآهـ1-6][\)\.\:\-\]\/]?\s*$/g, "")
    .replace(/^[\*\•\s]+/, "")
    .trim();
}

const optionLabels = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  "أ": 0, "ا": 0, "إ": 0, "آ": 0, "ء": 0,
  "ب": 1,
  "ج": 2,
  "د": 3,
  "ه": 4, "هـ": 4,
  "ز": 6,
  "الأول": 0, "الاول": 0,
  "الثاني": 1, "الثانى": 1,
  "الثالث": 2,
  "الرابع": 3,
  "الخامس": 4,
  "السادس": 5,
};

function optionIndex(value) {
  const normalized = value.trim().toLowerCase().replace(/[.():\-\/\[\]]/g, "");
  if (normalized in optionLabels) return optionLabels[normalized];
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
}

// Let's run current parseImportedQuestions
function parseImportedQuestions(rawText) {
  let cleanedText = rawText
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

  const answerKeyMap = new Map();
  const answerKeySectionMatch = cleanedText.match(/(?:نموذج\s+الإجاب[ةات]|نموذج\s+الاجاب[ةات]|مفتاح\s+الحل|الإجابات\s+النموذجية|Answer\s*Key)[\s\S]*$/i);
  if (answerKeySectionMatch) {
    const keyBlock = answerKeySectionMatch[0];
    cleanedText = cleanedText.replace(keyBlock, "");
    const keyLines = keyBlock.split(/[\n,;]+/);
    for (const kl of keyLines) {
      const pairMatch = kl.match(/(\d+)[\s\.\:\-\)\/]+\s*([أابجدهإآA-Da-d1-6])/);
      if (pairMatch) {
        const qNum = parseInt(pairMatch[1], 10);
        const ansIdx = optionIndex(pairMatch[2]);
        if (ansIdx !== null) {
          answerKeyMap.set(qNum, ansIdx);
        }
      }
    }
  }

  cleanedText = cleanedText.replace(/(?:^|\s)((?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب|الحل|الاختيار\s+الصحيح)\s*[:：\-]?\s*[أابجدهإآA-Da-d1-6])\s*((?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-])/gi, "$1\n$2");

  cleanedText = cleanedText.replace(/([^\n\s]+)(?:\s{2,}|\t)((?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*(?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\]\/]\s+)/gi, (match, p1, p2) => {
    if (/^(?:Question|سؤال|س|Q|السؤال|item|ex|no|num)$/i.test(p1.trim())) {
      return match;
    }
    return `${p1}\n${p2}`;
  });

  cleanedText = cleanedText.replace(/([^\n])\s+((?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\(?\d+\)|(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\d+|Question\s*[:：\-]?\s*\d+|#\d+)\s*[:：\-\.\/])/gi, "$1\n$2");

  cleanedText = cleanedText.replace(/([^\n])\s+((?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|الجواب(?:\s+الصحيح)?|الحل(?:\s+الصحيح)?|الاختيار\s+الصحيح|Correct\s*Answer|Answer)\s*(?:[:：\-]|(?:هو|هي)\s*[:：\-]?)\s*.*)$/gim, "$1\n$2");

  cleanedText = cleanedText.replace(/([^\n])\s+((?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-]\s*.*)$/gim, "$1\n$2");

  const lines = cleanedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => Boolean(line) && !line.match(/^[\_\-\*]{3,}$/));

  fs.writeFileSync('scratch/dumped_lines.json', JSON.stringify(lines, null, 2));

  const questions = [];
  const warnings = [];

  let current = null;

  const finishCurrent = (qIndex) => {
    if (!current) return;
    let cleanedPrompt = current.prompt
      .replace(/^(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-.\/]?\s*/i, "")
      .replace(/^(?:السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))\s*[:：\-.\/]?\s*/i, "")
      .replace(/^\(?\d+\)?[\s\.\)\-\/:]+\s*/, "")
      .trim();

    const inlineAnsMatch = cleanedPrompt.match(/[\(\[]\s*(?:(?:الإجابة|الاجابة|الجواب|الحل|Answer)\s*[:：\-]?\s*)?([أابجدهإآA-Da-d1-6]|صواب|صح|خطأ)\s*[\)\]]\s*$/i);
    if (inlineAnsMatch) {
      if (current.correctIndex === null) {
        const token = inlineAnsMatch[1];
        if (token === "صواب" || token === "صح") current.correctIndex = 0;
        else if (token === "خطأ") current.correctIndex = 1;
        else {
          const idx = optionIndex(token);
          if (idx !== null) current.correctIndex = idx;
        }
      }
      cleanedPrompt = cleanedPrompt.replace(/[\(\[]\s*(?:(?:الإجابة|الاجابة|الجواب|الحل|Answer)\s*[:：\-]?\s*)?([أابجدهإآA-Da-d1-6]|صواب|صح|خطأ)\s*[\)\]]\s*$/i, "").trim();
    }

    if (!cleanedPrompt && current.prompt) {
      cleanedPrompt = current.prompt;
    }

    const finalPrompt = current.arabicTranslation
      ? `${cleanedPrompt}\n${current.arabicTranslation}`
      : cleanedPrompt;

    if (current.correctIndex === null && typeof qIndex === "number" && answerKeyMap.has(qIndex)) {
      current.correctIndex = answerKeyMap.get(qIndex);
    }

    if (finalPrompt && current.options.length >= 2) {
      const validIndex =
        typeof current.correctIndex === "number" &&
        current.correctIndex >= 0 &&
        current.correctIndex < current.options.length
          ? current.correctIndex
          : 0;

      questions.push({
        prompt: finalPrompt,
        options: current.options,
        correctIndex: validIndex,
        explanation: current.explanation ? current.explanation.trim() : undefined,
      });
      if (current.correctIndex === null) {
        warnings.push(`لم يتم العثور على إجابة صريحة للسؤال: «${finalPrompt.slice(0, 50)}...». تم تعيين الخيار الأول افتراضيًا.`);
      }
    } else if (current.prompt) {
      warnings.push(`تم تجاوز: «${current.prompt.slice(0, 50)}...» لأنه يحتاج اختيارين على الأقل (يحتوي على ${current.options.length}).`);
    }
    current = null;
  };

  const isArabicLine = (line) => /[\u0600-\u06FF]/.test(line);

  const CHOICE_RE = /^\s*(?:(?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\s*[\)\.\:\-\]\/]\s*)(.+)$/i;
  const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|الحل(?:\s+الصحيح)?|الاختيار\s+الصحيح)\s*(?:[:：\-]|(?:هو|هي)\s*[:：\-]?)\s*(.+)$/i;
  const EXPLANATION_HEADER_RE = /^\s*(?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-]\s*(.*)$/i;
  const EXPLICIT_QUESTION_RE = /^\s*(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?|السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|#\d+)(?:\s*[:：\-\.\)\/]\s*(.*))?$/i;
  const NUMBERED_LINE_RE = /^\s*\(?(\d+)\)?[\s\.\:\-\)\/]+\s*(.*)$/;

  let collectingExplanation = false;
  let hasFoundAnswer = false;
  let questionCounter = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const explicitQMatch = line.match(EXPLICIT_QUESTION_RE);
    if (explicitQMatch) {
      questionCounter += 1;
      finishCurrent(questionCounter);
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: explicitQMatch[1]?.trim() || "",
        options: [],
        correctIndex: null,
      };
      continue;
    }

    const numMatch = line.match(NUMBERED_LINE_RE);
    const isQuestionLike = /[\؟\?]|\b(?:ما|ماذا|من|أين|اين|متى|كيف|لماذا|علل|فسر|اذكر|قارن|اختر|هل|كم|أي|اي|وضح|بين|what|which|why|how|when|where|who|whose|whom)\b/i.test(line);
    const isNextSequentialChoice = current && numMatch && (parseInt(numMatch[1], 10) === current.options.length + 1) && !isQuestionLike && current.options.length < 6;

    if (numMatch && !isNextSequentialChoice && (!current || current.options.length >= 2 || hasFoundAnswer || isQuestionLike)) {
      const restOfLine = numMatch[2].trim();
      questionCounter += 1;
      finishCurrent(questionCounter);
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: restOfLine || line,
        options: [],
        correctIndex: null,
      };
      continue;
    }

    const choiceMatch = line.match(CHOICE_RE);
    const isLetterChoice = choiceMatch ? /^[A-Fa-fأابجدهإآهـ]$/.test(choiceMatch[1]) : false;
    const isSequentialChoice = Boolean(current && current.options.length > 0);
    const isChoice = Boolean(choiceMatch && (isLetterChoice || isSequentialChoice || !isQuestionLike));

    if (isChoice && choiceMatch) {
      const optionToken = choiceMatch[1];
      const optIdx = optionIndex(optionToken);

      if ((optIdx === 0) && current && current.options.length >= 2) {
        questionCounter += 1;
        finishCurrent(questionCounter);
        hasFoundAnswer = false;
        collectingExplanation = false;
        current = { prompt: "", options: [], correctIndex: null };
      }

      if (current && current.options.length < 8) {
        collectingExplanation = false;
        const isMarkedCorrect =
          /^\s*(?:\*|\[x\]|\[✓\]|\(✓\))\s*/i.test(line) ||
          /(?:\*|\[x\]|\[✓\]|\(✓\)|\(صح\)|\(صحيحة\)|\(الإجابة الصحيحة\)|\(الاجابة الصحيحة\))\s*$/i.test(line) ||
          /\s+\*\s*$/.test(line) ||
          /^\s*[\*\•]\s*/.test(choiceMatch[2]);

        const cleanOption = choiceMatch[2]
          .replace(/^[\*\•\s]+/, "")
          .replace(/\s*(?:\*|\[x\]|\[✓\]|\(✓\)|\(صح\)|\(صحيحة\)|\(الإجابة الصحيحة\)|\(الاجابة الصحيحة\))\s*$/i, "")
          .trim();

        current.options.push(cleanOptionString(cleanOption));
        if (isMarkedCorrect) {
          current.correctIndex = current.options.length - 1;
          hasFoundAnswer = true;
        }
        continue;
      }
    }

    const answerMatch = line.match(ANSWER_RE);
   if (line.includes("الإجابة")) {
     fs.appendFileSync('scratch/parser_trace.log', "LINE: " + JSON.stringify(line) + " MATCH: " + (answerMatch ? answerMatch[1] : "NULL") + " CURRENT_NULL: " + (!current) + "\n");
   }
    if (answerMatch && current) {
      collectingExplanation = false;
      hasFoundAnswer = true;
      const answerVal = answerMatch[1].trim();

      const normAns = answerVal.toLowerCase().replace(/[\(\)\[\]]/g, "").trim();
      if (current.options.length === 0) {
        if (normAns === "صواب" || normAns === "صح" || normAns === "صحيح" || normAns === "true" || normAns === "t") {
          current.options = ["صواب", "خطأ"];
          current.correctIndex = 0;
          continue;
        } else if (normAns === "خطأ" || normAns === "خطا" || normAns === "غير صحيح" || normAns === "false" || normAns === "f") {
          current.options = ["صواب", "خطأ"];
          current.correctIndex = 1;
          continue;
        }
      }

      const leadingToken = answerVal.match(/^[\(\[]?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)(?=[\s\)\.\:\-\]\/]|$)/i)?.[1];
      const byIndex = leadingToken ? optionIndex(leadingToken) : null;
      const byText = current.options.findIndex((o) => {
        const oNorm = o.toLowerCase().trim();
        const aNorm = answerVal.toLowerCase().trim();
        if (oNorm === aNorm) return true;
        if ((aNorm === "صح" || aNorm === "صواب" || aNorm === "صحيح") && (oNorm === "صح" || oNorm === "صواب" || oNorm === "صحيح")) return true;
        if ((aNorm === "خطأ" || aNorm === "خطا") && (oNorm === "خطأ" || oNorm === "خطا")) return true;
        return false;
      });

      if (byIndex !== null && byIndex < current.options.length) {
        current.correctIndex = byIndex;
      } else if (byText >= 0) {
        current.correctIndex = byText;
      } else {
        const afterLetter = answerVal.replace(/^[\(\[]?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\)?[.):\-\/\s]+/, "").trim();
        const byTextAfter = current.options.findIndex((o) =>
          o.toLowerCase().replace(/[()]/g, "").trim().includes(afterLetter.toLowerCase().replace(/[()]/g, "").trim())
        );
        if (byTextAfter >= 0) {
          current.correctIndex = byTextAfter;
        } else if (byIndex !== null) {
          current.correctIndex = byIndex;
        }
      }
      continue;
    }

    const explanationHeaderMatch = line.match(EXPLANATION_HEADER_RE);
    if (explanationHeaderMatch && current) {
      collectingExplanation = true;
      const inlineText = explanationHeaderMatch[1].trim();
      if (inlineText) current.explanation = inlineText;
      continue;
    }

    if (collectingExplanation && current) {
      const isNewQ =
        line.match(EXPLICIT_QUESTION_RE) ||
        line.match(ANSWER_RE) ||
        line.match(CHOICE_RE) ||
        (line.match(NUMBERED_LINE_RE) && isQuestionLike) ||
        (isQuestionLike && (current.options.length >= 2 || hasFoundAnswer));

      if (isNewQ) {
        collectingExplanation = false;
      } else {
        current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
        continue;
      }
    }

    if (!current) {
      current = { prompt: line, options: [], correctIndex: null };
      collectingExplanation = false;
      hasFoundAnswer = false;
    } else if (!current.prompt) {
      current.prompt = line;
    } else if (hasFoundAnswer && !collectingExplanation) {
      questionCounter += 1;
      finishCurrent(questionCounter);
      current = { prompt: line, options: [], correctIndex: null };
      hasFoundAnswer = false;
      collectingExplanation = false;
    } else if (current.options.length === 0 && !current.arabicTranslation) {
      if (isArabicLine(line) && !isArabicLine(current.prompt)) {
        current.arabicTranslation = line;
      } else {
        current.prompt += `\n${line}`;
      }
    } else if (current.options.length === 0) {
      current.prompt += `\n${line}`;
    } else if (collectingExplanation) {
      current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
    } else if (current.options.length > 0) {
      current.options[current.options.length - 1] += `\n${line}`;
    }
  }

  questionCounter += 1;
  finishCurrent(questionCounter);

  return { questions, warnings };
}

const res = parseImportedQuestions(fileContent);
console.log("Total parsed questions:", res.questions.length);
console.log("Warnings:", res.warnings);
fs.writeFileSync('scratch/parsed_questions.json', JSON.stringify(res, null, 2));
