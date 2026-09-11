function optionIndex(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[.():\-]/g, '');
  if (normalized in optionLabels) return optionLabels[normalized];
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
};
const optionLabels = {"1":0,"2":1,"3":2,"4":3,"5":4,"6":5,"a":0,"b":1,"c":2,"d":3,"e":4,"f":5,"أ":0,"ا":0,"ب":1,"ج":2,"د":3,"ه":4,"هـ":4,"و":5,"إ":0,"آ":0,"الأول":0,"الاول":0,"الثاني":1,"الثانى":1,"الثالث":2,"الرابع":3};
function parseImportedQuestions(rawText): { questions; warnings } {
  // 1. Clean invisible RTL markers, normalize Arabic digits, & normalize newlines
  let cleanedText = rawText
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n");

  // 2. Preprocess inline text & Word table cell merges (force newlines before headers/choices/answers/explanations if missing)
  cleanedText = cleanedText.replace(/(الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب|الحل|الاختيار\s+الصحيح)\s*[:：\-]?\s*([أابجدهإآA-Da-d1-6])(التوضيح|التفسير|الشرح|تفسير|شرح|explanation|note)\s*[:：\-]?/gi, "$1: $2\n$3: ");
  // Split inline choices e.g. "أ) باريس  ب) لندن" or "A. Paris  B. London" or "(1) القاهرة (2) الجيزة"
  cleanedText = cleanedText.replace(/([^\n])\s+((?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*(?:[A-Fa-fأابجدهإآ]|هـ|[1-6])\s*[\)\.\:\-\]]\s+)/g, "$1\n$2");
  cleanedText = cleanedText.replace(/([^\n])\s*((?:ال)?س(?:ؤال)?(?:\s*رقم)?\s*[:：\-]?\s*\(?\d+\)?|Question\s*[:：\-]?\s*\d+|#\d+)/gi, "$1\n$2");
  cleanedText = cleanedText.replace(/([^\n])\s*(الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|جواب|الحل(?:\s+الصحيح)?|حل|الاختيار(?:\s+الصحيح)?|اختيار|correct\s*answer|answer)\s*(?:هو|هي)?\s*[:：\-]?\s*/gi, "$1\nالإجابة الصحيحة: ");
  cleanedText = cleanedText.replace(/([^\n])\s*(التوضيح|التفسير|الشرح|تفسير|شرح|explanation|note)\s*[:：\-]?\s*/gi, "$1\nالتوضيح: ");

  const lines = cleanedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => Boolean(line) && !line.match(/^[\_\-\*]{3,}$/));

  const questions = [];
  const warnings = [];

  
    arabicTranslation?;
    options;
    correctIndex;
    explanation?;
  };

  let current = null;

  const finishCurrent = () => {
    if (!current) return;
    // Strip leading question numbers like "1- ", "1. ", "سؤال :1", "Q1:", "(1)"
    let cleanedPrompt = current.prompt
      .replace(/^(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-]?\s*\(?\d+\)?\s*[:：\-.]?\s*/i, "")
      .replace(/^\(?\d+\)?[\s\.\)\-:]+\s*/, "")
      .trim();
    if (!cleanedPrompt && current.prompt) {
      cleanedPrompt = current.prompt;
    }
    // Merge English prompt + Arabic translation if both exist
    const finalPrompt = current.arabicTranslation
      ? `${cleanedPrompt}\n${current.arabicTranslation}`
      : cleanedPrompt;
    if (finalPrompt && current.options.length >= 2) {
      // Ensure correctIndex is valid integer within bounds
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

  // Helper: detect choice lines with support for prefixes like "* أ)", "(أ)", "A.", "1-", etc.
  const CHOICE_RE = /^\s*(?:(?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\s*[\)\.\:\-\]]\s*)(.+)$/i;

  // Helper: detect answer line
  const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|جواب|الحل(?:\s+الصحيح)?|حل|الاختيار(?:\s+الصحيح)?|اختيار)\s*(?:هو|هي)?\s*[:：\-]?\s*(.+)$/i;

  // Helper: detect explanation header
  const EXPLANATION_HEADER_RE = /^\s*(?::?\s*(?:explanation|note|التوضيح|التفسير|الشرح|تفسير|شرح|ملاحظة)\s*:?\s*)(.*)$/i;

  // Helper: detect question header e.g. "Question 1", "1.", "سؤال 1"
  const QUESTION_HEADER_RE = /^\s*(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-]?\s*\(?\d+\)?|\(?\d+\)?|#\d+)(?:\s*[:：\-\.\)]\s*(.*))?$/i;

  const isNextLineChoice = (idx) => {
    return idx + 1 < lines.length && Boolean(lines[idx + 1].match(CHOICE_RE));
  };

  let collectingExplanation = false;
  let hasFoundAnswer = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 1. Standalone Question Header ("Question 1" or "سؤال 1:" or "1. ...")
    const questionHeaderMatch = line.match(QUESTION_HEADER_RE);
    if (questionHeaderMatch && !line.match(/^\s*[A-Fa-fأابجدهإآ]\s*[.):\-]/)) {
      const inlinePrompt = questionHeaderMatch[1]?.trim();
      finishCurrent();
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: inlinePrompt || "",
        options: [],
        correctIndex: null,
      };
      continue;
    }

    // 2. If current has an answer or explanation, and this line is NOT a choice,
    // and next line is a choice, this line is the PROMPT of the next question!
    if ((hasFoundAnswer || collectingExplanation) && !line.match(CHOICE_RE) && !line.match(ANSWER_RE) && !line.match(EXPLANATION_HEADER_RE) && isNextLineChoice(i)) {
      finishCurrent();
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: line,
        options: [],
        correctIndex: null,
      };
      continue;
    }

    // 3. Explanation Header
    const explanationHeaderMatch = line.match(EXPLANATION_HEADER_RE);
    if (explanationHeaderMatch && current) {
      collectingExplanation = true;
      const inlineText = explanationHeaderMatch[1].trim();
      if (inlineText) {
        current.explanation = inlineText;
      }
      continue;
    }

    // 3b. Multi-line explanation collection
    if (collectingExplanation && current) {
      if (line.match(QUESTION_HEADER_RE) || line.match(ANSWER_RE) || line.match(CHOICE_RE)) {
        collectingExplanation = false;
      } else {
        current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
        continue;
      }
    }

    // 4. Answer Line (e.g. "الإجابة الصحيحة: ب" or "Answer: B" or "الإجابة: صواب")
    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch && current) {
      collectingExplanation = false;
      hasFoundAnswer = true;
      const answerVal = answerMatch[1].trim();

      // Check True / False question if no options yet
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

      // Leading letter token e.g. "ب", "(ب)", "[B]", "2"
      const leadingToken = answerVal.match(/^[\(\[]?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)(?=[\s\)\.\:\-\]]|$)/i)?.[1];
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
        const afterLetter = answerVal.replace(/^[\(\[]?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\)?[.):\-\s]+/, "").trim();
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

    // 4. Choice Line (e.g. "أ) باريس" or "*ب) لندن" or "A) London")
    const choiceMatch = line.match(CHOICE_RE);
    if (choiceMatch && current) {
      const optionToken = choiceMatch[1];
      const optIdx = optionIndex(optionToken);

      // If we see Option 0 ("A" or "أ") while current already has choices,
      // it means the previous question has finished without an explicit header!
      if (optIdx === 0 && current.options.length >= 2) {
        finishCurrent();
        hasFoundAnswer = false;
        collectingExplanation = false;
        current = { prompt: "", options: [], correctIndex: null };
      }

      if (current && current.options.length < 8) {
        collectingExplanation = false;

        // Check if choice has an asterisk or checkmark indicating it is correct
        const isMarkedCorrect =
          /^\s*(?:\*|\[x\]|\[✓\]|\(✓\))\s*/i.test(line) ||
          /(?:\*|\[x\]|\[✓\]|\(✓\)|\(صح\)|\(صحيحة\)|\(الإجابة الصحيحة\)|\(الاجابة الصحيحة\))\s*$/i.test(line) ||
          /\s+\*\s*$/.test(line) ||
          /^\s*[\*\•]\s*/.test(choiceMatch[2]);

        let cleanOption = choiceMatch[2]
          .replace(/^[\*\•\s]+/, "")
          .replace(/\s*(?:\*|\[x\]|\[✓\]|\(✓\)|\(صح\)|\(صحيحة\)|\(الإجابة الصحيحة\)|\(الاجابة الصحيحة\))\s*$/i, "")
          .trim();

        current.options.push(cleanOption);

        if (isMarkedCorrect) {
          current.correctIndex = current.options.length - 1;
          hasFoundAnswer = true;
        }
        continue;
      }
    }

    // 5. Fallback line handling
    if (!current) {
      current = {
        prompt: line,
        options: [],
        correctIndex: null,
      };
      collectingExplanation = false;
      hasFoundAnswer = false;
    } else if (!current.prompt) {
      current.prompt = line;
    } else if (hasFoundAnswer && !collectingExplanation) {
      // Line appears after the previous question's answer line, and is not an explanation.
      // This is the prompt of a new unnumbered question!
      finishCurrent();
      current = {
        prompt: line,
        options: [],
        correctIndex: null,
      };
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
      // Continuation line for the last choice
      current.options[current.options.length - 1] += `\n${line}`;
    }
  }

  finishCurrent();
  return { questions, warnings };
}



;
module.exports = { parseImportedQuestions };