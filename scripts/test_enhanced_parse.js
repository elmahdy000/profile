const sampleRTLFile = `\u200F\uFEFFسؤال 1:
\u200Fما التطور الذي أدى إلى بداية عصر معالجة المعلومات إلكترونياً؟
\u200Fأ) ظهور الحواسيب الإلكترونية
\u200Fب) ظهور الهواتف الذكية
\u200Fج) انتشار التجارة الإلكترونية
\u200Fد) ظهور شبكات التواصل الاجتماعي
\u200Fالإجابة الصحيحة: أ
\u200Fالتوضيح: أدى ظهور الحواسيب الإلكترونية إلى إمكانية معالجة كميات كبيرة من البيانات بسرعة ودقة.`;

function optionIndex(token) {
  const normalized = token.replace(/[()]/g, "").trim().toLowerCase();
  const map = {
    a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
    أ: 0, ا: 0, ب: 1, ج: 2, د: 3, ه: 4, "هـ": 4, و: 5,
  };
  if (normalized in map) return map[normalized];
  const numeric = Number.parseInt(normalized, 10);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
}

function parseImportedQuestionsEnhanced(rawText) {
  const cleanedText = rawText
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n");

  const lines = cleanedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => Boolean(line) && !line.match(/^[\_\-\*]{3,}$/));

  const questions = [];
  const warnings = [];
  let current = null;

  const finishCurrent = () => {
    if (!current) return;
    const finalPrompt = current.arabicTranslation
      ? `${current.prompt}\n${current.arabicTranslation}`
      : current.prompt;
    if (finalPrompt && current.options.length >= 2) {
      questions.push({
        prompt: finalPrompt,
        options: current.options,
        correctIndex: current.correctIndex ?? 0,
        explanation: current.explanation,
      });
      if (current.correctIndex === null) {
        warnings.push(`لم يتم العثور على سطر إجابة صريح للسؤال: «${current.prompt.slice(0, 60)}». تم تعيين الاختيار الأول افتراضيًا.`);
      }
    } else if (current.prompt) {
      warnings.push(`تم تجاوز السؤال: «${current.prompt.slice(0, 60)}» لأنه يحتاج اختيارين على الأقل (يحتوي على ${current.options.length}).`);
    }
    current = null;
  };

  const isArabicLine = (line) => /[\u0600-\u06FF]/.test(line);
  const CHOICE_RE = /^\s*(?:\(?([A-Fa-fأابجده]|هـ|[1-6])\)?[.):\-\s]\s*)(.+)$/;
  const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة)\s*[:：\-]?\s*(.+)$/i;
  const EXPLANATION_HEADER_RE = /^\s*(?::?\s*(?:explanation|note|التوضيح|التفسير|الشرح|تفسير|شرح|ملاحظة)\s*:?\s*)(.*)$/i;
  const QUESTION_HEADER_RE = /^\s*(?:(?:س(?:ؤال)?\s*)?\d+|Q(?:uestion)?\s*\d+|#\d+)(?:\s*[.):\-]\s*(.*))?$/i;

  let collectingExplanation = false;
  let hasFoundAnswer = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const questionHeaderMatch = line.match(QUESTION_HEADER_RE);
    if (questionHeaderMatch && !line.match(/^\s*[A-Fa-fأابجده]\s*[.):\-]/)) {
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

    const explanationHeaderMatch = line.match(EXPLANATION_HEADER_RE);
    if (explanationHeaderMatch && current) {
      collectingExplanation = true;
      const inlineText = explanationHeaderMatch[1].trim();
      if (inlineText) {
        current.explanation = inlineText;
      }
      continue;
    }

    if (collectingExplanation && current) {
      if (line.match(QUESTION_HEADER_RE) || line.match(ANSWER_RE) || line.match(CHOICE_RE)) {
        collectingExplanation = false;
      } else {
        current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
        continue;
      }
    }

    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch && current) {
      collectingExplanation = false;
      hasFoundAnswer = true;
      const answerVal = answerMatch[1].trim();
      const leadingToken = answerVal.match(/^([A-Fa-fأابجده]|هـ|[1-6])(?=[\s\)\.\:\-]|$)/)?.[1];
      const byIndex = leadingToken ? optionIndex(leadingToken) : null;
      const byText = current.options.findIndex((o) => o.toLowerCase().trim() === answerVal.toLowerCase().trim());
      if (byIndex !== null && byIndex < current.options.length) {
        current.correctIndex = byIndex;
      } else if (byText >= 0) {
        current.correctIndex = byText;
      } else {
        const afterLetter = answerVal.replace(/^([A-Fa-fأابجده]|هـ|[1-6])\)?[.):\-\s]+/, "").trim();
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

    const choiceMatch = line.match(CHOICE_RE);
    if (choiceMatch && current && current.options.length < 8 && !hasFoundAnswer) {
      collectingExplanation = false;
      current.options.push(choiceMatch[2].trim());
      continue;
    }

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
    } else if (current.options.length === 0 && !current.arabicTranslation) {
      if (isArabicLine(line) && !isArabicLine(current.prompt)) {
        current.arabicTranslation = line;
      } else {
        current.prompt += `\n${line}`;
      }
    } else if (current.options.length === 0) {
      current.prompt += `\n${line}`;
    } else if (hasFoundAnswer || collectingExplanation) {
      current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
    } else if (!collectingExplanation && current.options.length > 0) {
      current.options[current.options.length - 1] += `\n${line}`;
    }
  }

  finishCurrent();
  return { questions, warnings };
}

console.log(JSON.stringify(parseImportedQuestionsEnhanced(sampleRTLFile), null, 2));
