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
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

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

function normalizeQuestionPrompt(prompt) {
  if (!prompt) return "";
  return prompt
    .replace(/^(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-.\/]?\s*/i, "")
    .replace(/^(?:السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))\s*[:：\-.\/]?\s*/i, "")
    .replace(/^(?:\(\d+\)|\d+\s*[\.\)\-\/:\—\–])\s*/, "")
    .replace(/[\s\.\:\-\_،,؛;؟?]+/g, "")
    .toLowerCase()
    .trim();
}

function parseImportedQuestions(rawText) {
  // 1. Clean invisible RTL markers, normalize Arabic digits, normalize newlines, & strip markdown artifacts
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
    // Normalize markdown tables (from Mammoth / Word)
    .replace(/^\s*\|?\s*[-:]{2,}(?:\s*\|\s*[-:]{2,})*\s*\|?\s*$/gm, "")
    .replace(/^\s*\|(.*)\|\s*$/gm, (_, inner) =>
      inner
        .split("|")
        .map((c) => c.trim())
        .join("\t")
    );

  // Check for Table rows (lines with \t that have 3+ cells)
  const rawLines = cleanedText.split("\n");
  const isEntireTable = rawLines.filter((l) => l.trim()).length > 0 && rawLines.filter((l) => l.trim()).every((l) => l.split("\t").length >= 3);
  if (isEntireTable) {
    const tableQuestions = [];
    for (const l of rawLines) {
      const cells = l.split("\t").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const prompt = cells[0];
        let options = [];
        let correctIndex = 0;
        const lastCell = cells[cells.length - 1];
        const lastIdx = optionIndex(lastCell);
        if (lastIdx !== null && lastIdx < cells.length - 2) {
          options = cells.slice(1, -1);
          correctIndex = lastIdx;
        } else {
          const matchIdx = cells.slice(1, -1).findIndex((c) => c.toLowerCase() === lastCell.toLowerCase());
          if (matchIdx >= 0) {
            options = cells.slice(1, -1);
            correctIndex = matchIdx;
          } else {
            options = cells.slice(1);
          }
        }
        if (options.length >= 2) {
          tableQuestions.push({
            prompt,
            options,
            correctIndex,
          });
        }
      }
    }
    if (tableQuestions.length > 0) {
      return { questions: tableQuestions, warnings: [] };
    }
  }

  // 2. Extract Answer Key section at the bottom if present (e.g. نموذج الإجابة: 1- أ 2- ج)
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

  // Preprocess inline text & Word table cell merges
  // Only split when an explicit answer pattern (e.g. "الإجابة الصحيحة: أ") is IMMEDIATELY followed by an explicit explanation header
  // Note: Do NOT use (?:^|\s) at the start without preserving it, otherwise preceding \n is deleted!
  cleanedText = cleanedText.replace(/((?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب|الحل|الاختيار\s+الصحيح)\s*[:：\-]?\s*[أابجدهإآA-Da-d1-6])\s+((?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير(?:\s+الإجابة)?|توضيح(?:\s+الإجابة)?|الشرح(?:\s+والتوضيح)?|شرح(?:\s+الحل|\s+الإجابة)?|سبب(?:\s+الإجابة)?|ملاحظة)\s*[:：\-])/gi, "$1\n$2");

  // Split inline choices e.g. "أ) باريس    ب) لندن" or "A) Final — B) const" or "أ) كذا - ب) كذا"
  // 1) Separator with explicit punctuation (—, -, |, /, comma, semicolon, 2+ spaces, tab)
  cleanedText = cleanedText.replace(/([^\n\s]+)(?:\s*(?:[\—\–\-\|\/]|[\,\;])\s*|\s{2,}|\t)((?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*(?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\]\/]\s+)/gi, (match, p1, p2) => {
    if (/^(?:Question|سؤال|س|Q|السؤال|item|ex|no|num)$/i.test(p1.trim())) {
      return match;
    }
    return `${p1}\n${p2}`;
  });

  // 2) Separator with single space when followed by standard choice letter and closing bracket/dot/slash
  cleanedText = cleanedText.replace(/([^\n\s]+)\s+((?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\/]\s+)/gi, (match, p1, p2) => {
    if (/^(?:Question|سؤال|س|Q|السؤال|item|ex|no|num)$/i.test(p1.trim())) {
      return match;
    }
    return `${p1}\n${p2}`;
  });

  // 3) Split inline choices glued without spaces (from Word soft break loss) e.g. "الإلكترونيةب) ظهور"
  cleanedText = cleanedText.replace(/([a-zA-Z\u0600-\u06FF])([A-Fa-fأابجدهإآ]|هـ|[1-6])\)\s+/g, "$1\n$2) ");

  // Split question headers if accidentally on same line after previous content
  cleanedText = cleanedText.replace(/([^\n])\s+((?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\(?\d+\)|(?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-\/]?\s*\d+|Question\s*[:：\-]?\s*\d+|#\d+)\s*[:：\-\.\/])/gi, "$1\n$2");

  const lines = cleanedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => Boolean(line) && !line.match(/^[\_\-\*]{3,}$/));

  const questions = [];
  const warnings = [];

  let current = null;

  const finishCurrent = (qIndex) => {
    if (!current) return;
    let cleanedPrompt = current.prompt
      .replace(/^(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-.\/]?\s*/i, "")
      .replace(/^(?:السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))\s*[:：\-.\/]?\s*/i, "")
      .replace(/^(?:\(\d+\)|\d+\s*[\.\)\-\/:\—\–])\s*/, "")
      .trim();

    // Clean inline answers from prompt end ONLY when preceded by an explicit label (e.g. "[الإجابة: ب]")
    // Do NOT strip bare parenthesized characters like "(A)" or "(أ)" because they are often part of the question itself!
    const inlineAnsMatch = cleanedPrompt.match(/[\(\[]\s*(?:(?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|الجواب|الحل|Answer)\s*[:：\-]\s*)([أابجدهإآA-Da-d1-6]|صواب|صح|خطأ)\s*[\)\]]\s*$/i);
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
      cleanedPrompt = cleanedPrompt.replace(/[\(\[]\s*(?:(?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|الجواب|الحل|Answer)\s*[:：\-]\s*)([أابجدهإآA-Da-d1-6]|صواب|صح|خطأ)\s*[\)\]]\s*$/i, "").trim();
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

  // CHOICE_RE: Support أ), أ-, أ/, (أ), [أ], A), 1), 1-, 1/, (1), [1], الأول
  const CHOICE_RE = /^\s*(?:(?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\s*[\)\.\:\-\]\/]\s*)(.+)$/i;

  // ANSWER_RE: MUST have explicit colon or "هو/هي"
  const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|الحل(?:\s+الصحيح)?|الاختيار\s+الصحيح)\s*(?:[:：\-]|(?:هو|هي)\s*[:：\-]?)\s*(.+)$/i;

  // EXPLANATION_HEADER_RE: MUST have explicit colon or dash and explicit definite keyword or composite phrase
  const EXPLANATION_HEADER_RE = /^\s*(?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير\s+(?:الإجابة|الحل|السؤال)|توضيح\s+(?:الإجابة|الحل|السؤال)|الشرح(?:\s+والتوضيح)?|شرح\s+(?:الحل|الإجابة|السؤال)|سبب\s+(?:الإجابة|الحل|الاختيار)|ملاحظة)\s*[:：\-]\s*(.*)$/i;

  // EXPLICIT_QUESTION_RE: "سؤال 1", "س1:", "س1 /", "السؤال الأول", "Q1:"
  const EXPLICIT_QUESTION_RE = /^\s*(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?|السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|#\d+)(?:\s*[:：\-\.\)\/]\s*(.*))?$/i;

  // Generic Numbered line: "1- ...", "1. ...", "(1) ...", "1: ..."
  const NUMBERED_LINE_RE = /^\s*(?:\((\d+)\)|\b(\d+)\s*[\.\:\-\)\/\—\–])\s*(.*)$/;

  // Robust Unicode-aware Question-like check for both Arabic and English
  // Question must have ? / ؟ OR START with an interrogative word/verb
  const isQuestionLike = (str) =>
    /[\؟\?]/.test(str) ||
    /^\s*(?:ما|ماذا|من\s+(?:هو|هي|هم|هن|الذي|التي|الذين)|أين|اين|متى|كيف|لماذا|علل|فسر|اذكر|قارن|اختر|هل|كم|أي|اي|وضح|صنف|عدد|اشرح|حدد|عرف|what|which|why|how|when|where|who|whose|whom)(?:[\s:：\-\/]|$)/iu.test(str);

  let collectingExplanation = false;
  let hasFoundAnswer = false;
  let questionCounter = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 1. Explicit Question Header (e.g. "سؤال 1:", "س1 /", "السؤال الأول:", "Q1:")
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

    // 1b. Check if line looks like a question
    const numMatch = line.match(NUMBERED_LINE_RE);
    const lineIsQuestion = isQuestionLike(line);
    const numValue = numMatch ? parseInt(numMatch[1] || numMatch[2], 10) : NaN;
    const isNextSequentialChoice = current && !isNaN(numValue) && (numValue === current.options.length + 1) && !lineIsQuestion && current.options.length < 6;

    if (numMatch && !isNextSequentialChoice && (!current || current.options.length >= 2 || hasFoundAnswer || lineIsQuestion)) {
      const restOfLine = (numMatch[3] || "").trim();
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

    // 2. Check if this is a Choice line
    const choiceMatch = line.match(CHOICE_RE);
    const isLetterChoice = choiceMatch ? /^[A-Fa-fأابجدهإآهـ]$/.test(choiceMatch[1]) : false;
    const isSequentialChoice = Boolean(current && current.options.length > 0);
    const isChoice = Boolean(choiceMatch && (isLetterChoice || isSequentialChoice || !isQuestionLike(line)));

    if (isChoice && choiceMatch) {
      const optionToken = choiceMatch[1];
      const optIdx = optionIndex(optionToken);

      // If we see Option 0 ("أ" or "A" or "1") AND current already has 2+ choices:
      // it means a previous question has finished without an explicit header!
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

    // 3. Answer Line (e.g. "الإجابة الصحيحة: ب" or "Answer: B")
    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch && current) {
      collectingExplanation = false;
      hasFoundAnswer = true;
      const answerVal = answerMatch[1].trim();

      // True / False check
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

    // 4. Explanation Header
    const explanationHeaderMatch = line.match(EXPLANATION_HEADER_RE);
    if (explanationHeaderMatch && current) {
      collectingExplanation = true;
      const inlineText = explanationHeaderMatch[1].trim();
      if (inlineText) current.explanation = inlineText;
      continue;
    }

    // 5. Multi-line explanation collection
    if (collectingExplanation && current) {
      const isNewQ =
        line.match(EXPLICIT_QUESTION_RE) ||
        line.match(ANSWER_RE) ||
        line.match(CHOICE_RE) ||
        (line.match(NUMBERED_LINE_RE) && isQuestionLike(line)) ||
        (isQuestionLike(line) && (current.options.length >= 2 || hasFoundAnswer));

      if (isNewQ) {
        collectingExplanation = false;
      } else {
        current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
        continue;
      }
    }

    // 6. Fallback line handling
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

  // Deduplicate questions by prompt to prevent repeated questions
  const seenParsed = new Set();
  const deduplicatedQuestions = [];
  for (const q of questions) {
    const key = normalizeQuestionPrompt(q.prompt);
    if (key && seenParsed.has(key)) {
      warnings.push(`تم استبعاد سؤال مكرر تلقائيًا: «${q.prompt.slice(0, 45)}...»`);
      continue;
    }
    if (key) seenParsed.add(key);
    deduplicatedQuestions.push(q);
  }

  return { questions: deduplicatedQuestions, warnings };
}

// TEST 1: 1-1 mcq.docx
const buf1 = fs.readFileSync('1-1 mcq.docx');
const xml1 = extractFromZip(buf1, 'word/document.xml');
const text1 = extractTextFromDocxXml(xml1);
const res1 = parseImportedQuestions(text1);

console.log('=== TEST 1 (1-1 mcq.docx) ===');
console.log('Total Questions:', res1.questions.length);
console.log('Total Warnings:', res1.warnings.length);
console.log('Warnings:', res1.warnings);
console.log('Q1 prompt:', res1.questions[0].prompt);
console.log('Q1 options:', res1.questions[0].options);
console.log('Q1 correctIndex:', res1.questions[0].correctIndex);
console.log('Q1 explanation:', res1.questions[0].explanation);
console.log('Q25 prompt:', res1.questions[24].prompt);
console.log('Q25 options:', res1.questions[24].options);
console.log('Q25 correctIndex:', res1.questions[24].correctIndex);
console.log('Q25 explanation:', res1.questions[24].explanation);

// TEST 2: test/2-1 mcq.docx if exists
if (fs.existsSync('test/2-1 mcq.docx')) {
  const buf2 = fs.readFileSync('test/2-1 mcq.docx');
  const xml2 = extractFromZip(buf2, 'word/document.xml');
  const text2 = extractTextFromDocxXml(xml2);
  const res2 = parseImportedQuestions(text2);
  console.log('\n=== TEST 2 (test/2-1 mcq.docx) ===');
  console.log('Total Questions:', res2.questions.length);
  console.log('Total Warnings:', res2.warnings.length);
}
