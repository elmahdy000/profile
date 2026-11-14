import path from "path";
import zlib from "zlib";
import { createRequire } from "module";
import mammoth from "mammoth";
import type { QuizQuestion } from "@workspace/db";
import { normalizeQuestionPrompt, cleanOptionString } from "./shared";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;

function validateQuestions(value: unknown): QuizQuestion[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const questions = value as QuizQuestion[];
  const valid = questions.every(
    (q) =>
      typeof q?.prompt === "string" &&
      q.prompt.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.every(
        (option) => typeof option === "string" && option.trim().length > 0,
      ) &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length,
  );
  if (!valid) return null;

  // Deduplicate questions by prompt and clean option artifacts
  const seen = new Set<string>();
  const deduplicated: QuizQuestion[] = [];
  for (const q of questions) {
    const key = normalizeQuestionPrompt(q.prompt);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduplicated.push({
      ...q,
      prompt: q.prompt.replace(/[\n\s]+[A-Da-dأابجده]\)\s*$/, "").trim(),
      options: q.options.map(cleanOptionString),
      explanation: q.explanation?.trim() || undefined,
    });
  }
  return deduplicated.length > 0 ? deduplicated : null;
}

const optionLabels: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  "أ": 0, "ا": 0, "إ": 0, "آ": 0, "ء": 0,
  "ب": 1,
  "ج": 2,
  "د": 3,
  "ه": 4, "هـ": 4,
  "و": 5,
  "ز": 6,
  "الأول": 0, "الاول": 0,
  "الثاني": 1, "الثانى": 1,
  "الثالث": 2,
  "الرابع": 3,
  "الخامس": 4,
  "السادس": 5,
};

function optionIndex(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/[.():\-\/\[\]]/g, "");
  if (normalized in optionLabels) return optionLabels[normalized];
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
}

function smartDecodeText(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }

  // Check if buffer contains null bytes interleaved (UTF-16LE without BOM)
  if (buffer.length >= 4 && (buffer[1] === 0x00 || buffer[3] === 0x00)) {
    try {
      const u16 = new TextDecoder("utf-16le").decode(buffer);
      if (/[\u0600-\u06FF\w]/.test(u16)) return u16;
    } catch {}
  }

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const utf8Replacements = (utf8.match(/\uFFFD/g) || []).length;

  try {
    const win1256 = new TextDecoder("windows-1256").decode(buffer);
    const winArabic = (win1256.match(/[\u0600-\u06FF]/g) || []).length;
    const utf8Arabic = (utf8.match(/[\u0600-\u06FF]/g) || []).length;
    if (winArabic > utf8Arabic && utf8Replacements > 0) {
      return win1256;
    }
  } catch {}

  return utf8;
}

function extractTextFromDocBinary(buffer: Buffer): string {
  let u16Runs: string[] = [];
  try {
    const u16Str = new TextDecoder("utf-16le", { fatal: false }).decode(buffer);
    const matches = u16Str.match(/[\u0600-\u06FF\w\s.,;:()\-–—?!"'«»\n\r\t]{4,}/g);
    if (matches && matches.length > 0) u16Runs = matches;
  } catch {}

  let winRuns: string[] = [];
  try {
    const winStr = new TextDecoder("windows-1256", { fatal: false }).decode(buffer);
    const matches = winStr.match(/[\u0600-\u06FF\w\s.,;:()\-–—?!"'«»\n\r\t]{4,}/g);
    if (matches && matches.length > 0) winRuns = matches;
  } catch {}

  const u16Text = u16Runs.join("\n");
  const winText = winRuns.join("\n");
  const u16Arabic = (u16Text.match(/[\u0600-\u06FF]/g) || []).length;
  const winArabic = (winText.match(/[\u0600-\u06FF]/g) || []).length;

  return u16Arabic >= winArabic ? u16Text : winText;
}

function extractFromZip(buffer: Buffer, targetName: string): string | null {
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compression = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      if (name === targetName || name.endsWith("/" + targetName)) {
        const compData = buffer.subarray(dataStart, dataStart + compSize);
        if (compression === 8) {
          return zlib.inflateRawSync(compData).toString("utf8");
        } else if (compression === 0) {
          return compData.toString("utf8");
        }
      }
      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return null;
}

function extractTextFromDocxXml(xml: string): string {
  return xml
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<w:p\b[^>]*>/g, "\n")
    .replace(/<w:tab\b[^>]*\/?>/g, "\t")
    .replace(/<w:br\b[^>]*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractTextFromUpload(buffer: Buffer, originalname: string): Promise<string> {
  const extension = path.extname(originalname).toLowerCase();
  let text = "";

  if (extension === ".pdf") {
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text || "";
    } catch {
      text = smartDecodeText(buffer);
    }
  } else if (extension === ".docx") {
    // 1. Direct Word XML extraction first: preserves <w:br/> as newlines, table cells as tabs, and avoids mangling
    try {
      const xml = extractFromZip(buffer, "word/document.xml");
      if (xml) {
        const xmlText = extractTextFromDocxXml(xml);
        if (xmlText && xmlText.trim().length > 30) {
          const testParsed = parseImportedQuestions(xmlText);
          if (testParsed.questions.length > 0) {
            text = xmlText;
          }
        }
      }
    } catch {}

    // 2. Mammoth fallback if XML extraction yielded no valid questions
    if (!text.trim()) {
      let mdText = "";
      try {
        const mdResult = await mammoth.convertToMarkdown({ buffer });
        if (mdResult.value && mdResult.value.trim()) {
          mdText = mdResult.value;
          const testParsed = parseImportedQuestions(mdText);
          if (testParsed.questions.length > 0) {
            text = mdText;
          }
        }
      } catch {}

      if (!text.trim()) {
        try {
          const raw = (await mammoth.extractRawText({ buffer })).value || "";
          if (raw.trim()) {
            const testRaw = parseImportedQuestions(raw);
            if (testRaw.questions.length > 0) {
              text = raw;
            } else {
              text = mdText || raw;
            }
          }
        } catch {}
      }

      if (!text.trim() && mdText) {
        text = mdText;
      }
    }
  } else if (extension === ".doc") {
    let mdText = "";
    try {
      const mdResult = await mammoth.convertToMarkdown({ buffer });
      if (mdResult.value && mdResult.value.trim()) {
        mdText = mdResult.value;
        const testParsed = parseImportedQuestions(mdText);
        if (testParsed.questions.length > 0) {
          text = mdResult.value;
        }
      }
    } catch {}

    if (!text.trim()) {
      try {
        const raw = (await mammoth.extractRawText({ buffer })).value || "";
        if (raw.trim()) {
          const testRaw = parseImportedQuestions(raw);
          if (testRaw.questions.length > 0) {
            text = raw;
          } else {
            text = mdText || raw;
          }
        }
      } catch {}
    }

    if (!text.trim() && mdText) {
      text = mdText;
    }

    if (!text.trim()) {
      text = extractTextFromDocBinary(buffer);
    }
  } else {
    text = smartDecodeText(buffer);
  }

  if (!text.trim()) {
    text = smartDecodeText(buffer);
  }

  return text;
}

export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  // Dotted / dashed student handwriting lines (e.g. "..............." or "_ _ _ _ _")
  if (/^[\.\_\-\s]{4,}$/.test(trimmed)) return true;
  // PDF page number markers: e.g. "-- 3 of 87 --" or "-- Page 5 --"
  if (/^--\s*\d+\s+(?:of|من|page)\s+\d+\s*--$/i.test(trimmed)) return true;
  // Ministry form headers / dates / grade labels
  if (/التاريخ.*(?:الأسبوع|األسبوع)/i.test(trimmed) || /الفصل الدرا.*(?:الأول|األول)/i.test(trimmed)) return true;
  // Ministry section transition banners (e.g. أولاً: المهام الأدائية، ثانياً: أداءات منزلية)
  if (/^(?:أولاً|ثانياً|ثالثاً|رابعاً|خامساً|أوالً|ثانيًا|ثالثًا)\s*[:\-]?\s*(?:أداءات منزلية|المهام الأدائية|امهام األدائية|تقييم)/i.test(trimmed)) return true;
  return false;
}

export function formatModelAnswer(text: string): string {
  if (!text) return "";
  let formatted = text.trim();
  const lineCount = formatted.split("\n").length;
  if (lineCount >= 3) {
    return formatted.replace(/\n{3,}/g, "\n\n").trim();
  }
  formatted = formatted.replace(
    /(?:^|\s+)((?:[0-9]+|[٠-٩]+)[\.\-\)\:]|\([0-9]+|[٠-٩]+\)|[أ-دA-Da-d][\.\-\)])\s+/g,
    (match, prefix, offset) => {
      return offset === 0 ? `${prefix} ` : `\n${prefix} `;
    }
  );
  formatted = formatted.replace(/\s+([•–—])\s+/g, "\n$1 ");
  formatted = formatted.replace(/\n{3,}/g, "\n\n").trim();
  return formatted;
}

export function parseJsonSafe(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const normalized = cleaned
      .replace(/[“”«»]/g, '"')
      .replace(/[‘’]/g, "'");
    return JSON.parse(normalized);
  }
}

export function parseTrueFalseQuestions(rawText: string): { questions: QuizQuestion[]; warnings: string[] } {
  let cleaned = rawText
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.match(/^[\_\-\*]{3,}$/) && !isNoiseLine(l));

  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];

  type TFItem = {
    prompt: string;
    isTrue: boolean | null;
    explanation: string;
  };

  let current: TFItem | null = null;

  const pushCurrent = () => {
    if (!current) return;
    let p = current.prompt.trim();
    p = p.replace(/^(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?|السؤال\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|\(?\d+\)?[\.\:\-\)\/\—\–])\s*/i, "").trim();
    if (!p) {
      current = null;
      return;
    }
    const isEnglish = /[a-zA-Z]/.test(p);
    const options = isEnglish ? ["True", "False"] : ["صواب", "خطأ"];
    const isTrue = current.isTrue !== false; // default to true if unmarked
    const correctIndex = isTrue ? 0 : 1;
    const correctAnswer = options[correctIndex];

    questions.push({
      prompt: p,
      options,
      correctIndex,
      correctAnswer,
      explanation: current.explanation ? current.explanation.trim() : undefined,
      questionType: "true_false",
    } as any);

    if (current.isTrue === null) {
      warnings.push(`السؤال: «${p.slice(0, 45)}...» لم تُحدد إجابته صراحة، عُين "صواب" افتراضياً.`);
    }
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for answer line: "الإجابة: صواب" / "الحل: خطأ"
    const ansMatch = line.match(/^(?:(?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|الجواب|الحل|Answer)\s*[:：\-]\s*)(.*)$/i);
    if (ansMatch && current) {
      const val = ansMatch[1].toLowerCase().trim();
      if (/^(صح|صواب|صحيح|true|نعم|t|1)$/i.test(val)) {
        current.isTrue = true;
      } else if (/^(خطأ|خطا|false|لا|غير\s*صحيح|f|0)$/i.test(val)) {
        current.isTrue = false;
      }
      continue;
    }

    // Check for explanation: "التفسير: ..." / "السبب: ..."
    const expMatch = line.match(/^(?:التفسير|تفسير|السبب|سبب|الشرح|شرح|التوضيح|توضيح|Explanation|Reason|Note)\s*[:：\-]\s*(.*)$/i);
    if (expMatch && current) {
      current.explanation = (current.explanation ? current.explanation + "\n" : "") + (expMatch[1] || "").trim();
      continue;
    }

    // Check for inline answer marks: "(صح)", "(خطأ)", "(✓)", "(✗)", "[x]"
    let inlineIsTrue: boolean | null = null;
    const inlineTrueMatch = line.match(/[\(\[]\s*(?:صح|صواب|صحيح|true|نعم|✓|√)\s*[\)\]]\s*$/i);
    const inlineFalseMatch = line.match(/[\(\[]\s*(?:خطأ|خطا|false|لا|غير\s*صحيح|✗|x|X)\s*[\)\]]\s*$/i);

    if (inlineTrueMatch) {
      inlineIsTrue = true;
      line = line.replace(inlineTrueMatch[0], "").trim();
    } else if (inlineFalseMatch) {
      inlineIsTrue = false;
      line = line.replace(inlineFalseMatch[0], "").trim();
    }

    // Check if line starts a new question header
    const qHeaderMatch = line.match(/^(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?|السؤال\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|\(?\d+\)?[\.\:\-\)\/\—\–])\s*(.*)$/i);

    if (qHeaderMatch) {
      pushCurrent();
      current = {
        prompt: qHeaderMatch[1].trim() || line,
        isTrue: inlineIsTrue,
        explanation: "",
      };
      continue;
    }

    if (current) {
      if (inlineIsTrue !== null) {
        current.isTrue = inlineIsTrue;
      } else if (!current.explanation) {
        current.prompt += " " + line;
      } else {
        current.explanation += "\n" + line;
      }
    } else {
      current = {
        prompt: line,
        isTrue: inlineIsTrue,
        explanation: "",
      };
    }
  }

  pushCurrent();
  return { questions, warnings };
}

export function parseEssayQuestions(rawText: string): { questions: QuizQuestion[]; warnings: string[] } {
  let cleaned = rawText
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u061C]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.match(/^[\_\-\*]{3,}$/) && !isNoiseLine(l));

  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];

  type EssayItem = {
    prompt: string;
    modelAnswer: string;
    points?: number;
  };

  let current: EssayItem | null = null;
  let collectingAnswer = false;

  const pushCurrent = () => {
    if (!current) return;
    let p = current.prompt.trim();
    p = p
      .replace(/^(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-\/]?|السؤال\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)\s*[:：\-\/]?|\(?\d+\)?[\.\:\-\)\/\—\–]\s*)/i, "")
      .replace(/^[:：\-]\s*/, "")
      .trim();
    if (!p) {
      current = null;
      return;
    }
    const formattedAns = formatModelAnswer(current.modelAnswer.trim());
    questions.push({
      prompt: p,
      options: [],
      correctIndex: -1,
      correctAnswer: formattedAns,
      explanation: formattedAns || undefined,
      questionType: "essay",
      points: current.points || 1,
    } as any);
    current = null;
    collectingAnswer = false;
  };

  const EXPLICIT_Q_RE = /^(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?\d+\)?\s*[:：\-\/]?|السؤال\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)\s*[:：\-\/]?)\s*(.*)$/i;
  const BARE_NUM_RE = /^\(?\d+\)?[\.\:\-\)\/\—\–]\s*(.*)$/;
  const ANS_HEADER_RE = /^(?:(?:الإجابة(?:\s+النموذجية)?|الاجابة(?:\s+النموذجية)?|إجابة|اجابة|عناصر\s+(?:الإجابة|الدرجة)|الحل|Model\s*Answer|Answer)\s*[:：\-]\s*)(.*)$/i;
  const PTS_RE = /(?:درجة(?:\s+السؤال)?|الدرجة|Points|Score)\s*[:：\-]\s*(\d+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const ptsMatch = line.match(PTS_RE);
    if (ptsMatch && current) {
      current.points = parseInt(ptsMatch[1], 10);
      continue;
    }

    const ansMatch = line.match(ANS_HEADER_RE);
    if (ansMatch && current) {
      collectingAnswer = true;
      if (ansMatch[1].trim()) {
        current.modelAnswer = (current.modelAnswer ? current.modelAnswer + "\n" : "") + ansMatch[1].trim();
      }
      continue;
    }

    const explicitQMatch = line.match(EXPLICIT_Q_RE);
    const bareNumberMatch = line.match(BARE_NUM_RE);

    const isQuestionLine =
      explicitQMatch ||
      (!collectingAnswer && bareNumberMatch) ||
      (bareNumberMatch && /[\؟\?]/.test(line)) ||
      (bareNumberMatch && /^\(?\d+\)?[\.\:\-\)\/\—\–]\s*(?:ما|ماذا|علل|فسر|قارن|اذكر|وضح|اشرح|عرف|حدد|صنف|كيف|لماذا|Explain|What|How|Compare|Describe|Discuss)\b/i.test(line));

    if (isQuestionLine) {
      pushCurrent();
      const extracted = explicitQMatch ? explicitQMatch[1] : (bareNumberMatch ? bareNumberMatch[1] : line);
      current = {
        prompt: extracted.replace(/^[:：\-]\s*/, "").trim() || line,
        modelAnswer: "",
      };
      collectingAnswer = false;
      continue;
    }

    if (current) {
      if (collectingAnswer) {
        current.modelAnswer = (current.modelAnswer ? current.modelAnswer + "\n" : "") + line;
      } else {
        current.prompt += "\n" + line;
      }
    } else {
      current = {
        prompt: line,
        modelAnswer: "",
      };
    }
  }

  pushCurrent();
  return { questions, warnings };
}

export function parseMcqQuestions(rawText: string): { questions: QuizQuestion[]; warnings: string[] } {
  const result = parseUniversalQuestions(rawText);
  // Ensure every returned question has options and is strictly typed as mcq
  const mcqs = result.questions.filter((q) => q.options && q.options.length >= 2).map((q) => ({
    ...q,
    questionType: "mcq" as const,
  }));
  return { questions: mcqs, warnings: result.warnings };
}

function parseUniversalQuestions(rawText: string): { questions: QuizQuestion[]; warnings: string[] } {
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
        .map((c: string) => c.trim())
        .join("\t")
    );

  // Check for Table rows (lines with \t that have 3+ cells)
  const rawLines = cleanedText.split("\n");
  const isEntireTable = rawLines.filter((l) => l.trim()).length > 0 && rawLines.filter((l) => l.trim()).every((l) => l.split("\t").length >= 3);
  if (isEntireTable) {
    const tableQuestions: QuizQuestion[] = [];
    for (const l of rawLines) {
      const cells = l.split("\t").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const prompt = cells[0];
        let options: string[] = [];
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
            correctAnswer: options[correctIndex]?.trim(),
          });
        }
      }
    }
    if (tableQuestions.length > 0) {
      return { questions: tableQuestions, warnings: [] };
    }
  }

  // 2. Extract Answer Key section at the bottom if present (e.g. نموذج الإجابة: 1- أ 2- ج)
  const answerKeyMap = new Map<number, number>();
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
    .filter((line) => Boolean(line) && !line.match(/^[\_\-\*]{3,}$/) && !isNoiseLine(line));

  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];

  type DraftQuestion = {
    prompt: string;
    arabicTranslation?: string;
    options: string[];
    correctIndex: number | null;
    explanation?: string;
  };

  let current: DraftQuestion | null = null;

  const finishCurrent = (qIndex?: number) => {
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
      current.correctIndex = answerKeyMap.get(qIndex)!;
    }

    // Smart fallback: check if explanation explicitly states the correct option or contains option text
    if (current.correctIndex === null && current.explanation) {
      const explMatch = current.explanation.match(/(?:(?:الإجابة|الاجابة)(?:\s+الصحيحة)?|الخيار(?:\s+الصحيح)?)\s*(?:هي|هو)?\s*[:：\-]?\s*[\(\[]?\s*([أابجدهإآهـA-Fa-f1-6])[\)\]]?/i);
      if (explMatch) {
        const idx = optionIndex(explMatch[1]);
        if (idx !== null && idx < current.options.length) {
          current.correctIndex = idx;
        }
      }
      if (current.correctIndex === null) {
        const matchedOptIdx = current.options.findIndex((opt) => {
          const clean = opt.trim().toLowerCase();
          return clean.length >= 8 && current!.explanation!.toLowerCase().includes(clean);
        });
        if (matchedOptIdx >= 0) {
          current.correctIndex = matchedOptIdx;
        }
      }
    }

    if (finalPrompt && current.options.length >= 2) {
      const validIndex =
        typeof current.correctIndex === "number" &&
        current.correctIndex >= 0 &&
        current.correctIndex < current.options.length
          ? current.correctIndex
          : 0;

      const correctAnswer = current.options[validIndex]?.trim();
      const isTrueFalse =
        current.options.length === 2 &&
        current.options.some((o) => {
          const norm = o.trim().toLowerCase();
          return norm === "صواب" || norm === "صح" || norm === "صحيح" || norm === "true" || norm === "خطأ" || norm === "خطا" || norm === "false";
        });

      questions.push({
        prompt: finalPrompt,
        options: current.options,
        correctIndex: validIndex,
        correctAnswer: correctAnswer,
        explanation: current.explanation ? current.explanation.trim() : undefined,
        questionType: isTrueFalse ? "true_false" : "mcq",
      } as any);
      if (current.correctIndex === null) {
        warnings.push(`لم يتم العثور على إجابة صريحة للسؤال: «${finalPrompt.slice(0, 50)}...». تم تعيين الخيار الأول افتراضيًا.`);
      }
    } else if (finalPrompt && current.options.length === 0) {
      // ✅ ESSAY QUESTION SUPPORT: No options provided, treat as Essay
      const formattedAns = formatModelAnswer(current.explanation ? current.explanation.trim() : "");
      questions.push({
        prompt: finalPrompt,
        options: [],
        correctIndex: -1,
        correctAnswer: formattedAns,
        explanation: formattedAns || undefined,
        questionType: "essay",
      } as any);
    } else if (finalPrompt && current.options.length === 1) {
      // ✅ ESSAY QUESTION WITH SINGLE ANSWER LINE: Treat as model answer / essay
      const singleOpt = formatModelAnswer(current.options[0].trim());
      const fullAns = current.explanation ? `${singleOpt}\n${formatModelAnswer(current.explanation.trim())}` : singleOpt;
      questions.push({
        prompt: finalPrompt,
        options: [],
        correctIndex: -1,
        correctAnswer: fullAns,
        explanation: fullAns,
        questionType: "essay",
      } as any);
    } else if (current.prompt) {
      warnings.push(`تم تجاوز: «${current.prompt.slice(0, 50)}...» لعدم كفاية نص السؤال.`);
    }
    current = null;
  };

  const isArabicLine = (line: string) => /[\u0600-\u06FF]/.test(line);

  // CHOICE_RE: Support أ), أ-, أ/, (أ), [أ], A), 1), 1-, 1/, (1), [1], الأول
  const CHOICE_RE = /^\s*(?:(?:[\*\•\-\[\(]|\[x\]|\[✓\]|\(✓\))?\s*([A-Fa-fأابجدهإآ]|هـ|[1-6]|الأول|الاول|الثاني|الثانى|الثالث|الرابع)\s*[\)\.\:\-\]\/]\s*)(.+)$/i;

  // ANSWER_RE: MUST have explicit colon or "هو/هي"
  const ANSWER_RE = /^\s*(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة|الجواب(?:\s+الصحيح)?|الحل(?:\s+الصحيح)?|الاختيار\s+الصحيح)\s*(?:[:：\-]|(?:هو|هي)\s*[:：\-]?)\s*(.+)$/i;

  // EXPLANATION_HEADER_RE: MUST have explicit colon or dash and explicit definite keyword or composite phrase
  const EXPLANATION_HEADER_RE = /^\s*(?:explanation(?:\s*[\/\-]\s*steps)?|solution|reason|note|التوضيح(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|التفسير(?:\s*[\/\-]\s*(?:خطوات|طريقة)\s*(?:الحل|الإجابة))?|(?:خطوات|طريقة)\s*(?:الحل|الإجابة)|تفسير\s+(?:الإجابة|الحل|السؤال)|توضيح\s+(?:الإجابة|الحل|السؤال)|الشرح(?:\s+والتوضيح)?|شرح\s+(?:الحل|الإجابة|السؤال)|سبب\s+(?:الإجابة|الحل|الاختيار)|ملاحظة)\s*[:：\-]\s*(.*)$/i;

  // EXPLICIT_QUESTION_RE: "سؤال 1", "س1:", "س1 /", "السؤال الأول", "Q1:"
  const EXPLICIT_QUESTION_RE = /^\s*(?:(?:(?:ال)?س(?:ؤال)?(?:\s*رقم)?|Q(?:uestion)?)\s*[:：\-\/]?\s*\(?(\d+)\)?|السؤال\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)|#(\d+))(?:\s*[:：\-\.\)\/]\s*(.*))?$/i;

  // Generic Numbered line: "1- ...", "1. ...", "(1) ...", "1: ..."
  const NUMBERED_LINE_RE = /^\s*(?:\((\d+)\)|\b(\d+)\s*[\.\:\-\)\/\—\–])\s*(.*)$/;

  // Robust Unicode-aware Question-like check for both Arabic and English
  // Question must have ? / ؟ OR START with an interrogative word/verb
  const isQuestionLike = (str: string) =>
    /[\؟\?]/.test(str) ||
    /^\s*(?:ما|ماذا|من\s+(?:هو|هي|هم|هن|الذي|التي|الذين)|أين|اين|متى|كيف|لماذا|علل|فسر|اذكر|قارن|اختر|هل|كم|أي|اي|وضح|صنف|عدد|اشرح|حدد|عرف|what|which|why|how|when|where|who|whose|whom)(?:[\s:：\-\/]|$)/iu.test(str);

  let collectingExplanation = false;
  let hasFoundAnswer = false;
  let currentQNumber = 1;
  let nextQCounter = 1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 1. Explicit Question Header (e.g. "سؤال 1:", "س1 /", "السؤال الأول:", "Q1:")
    const explicitQMatch = line.match(EXPLICIT_QUESTION_RE);
    if (explicitQMatch) {
      finishCurrent(currentQNumber);
      const parsedNum = parseInt(explicitQMatch[1] || explicitQMatch[2] || "", 10);
      currentQNumber = !isNaN(parsedNum) ? parsedNum : nextQCounter;
      nextQCounter = currentQNumber + 1;
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: explicitQMatch[3]?.trim() || "",
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
      finishCurrent(currentQNumber);
      currentQNumber = !isNaN(numValue) ? numValue : nextQCounter;
      nextQCounter = currentQNumber + 1;
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
        finishCurrent(currentQNumber);
        currentQNumber = nextQCounter;
        nextQCounter += 1;
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

      // True / False check or Essay Model Answer
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
        } else {
          // Model answer for an essay question
          current.explanation = current.explanation ? `${current.explanation}\n${answerVal}` : answerVal;
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
      finishCurrent(currentQNumber);
      currentQNumber = nextQCounter;
      nextQCounter += 1;
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

  finishCurrent(currentQNumber);

  // Deduplicate questions by prompt to prevent repeated questions
  const seenParsed = new Set<string>();
  const deduplicatedQuestions: QuizQuestion[] = [];
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

export function parseImportedQuestions(
  rawText: string,
  targetType: string = "auto"
): { questions: QuizQuestion[]; warnings: string[] } {
  const mode = String(targetType || "auto").toLowerCase().trim();
  if (mode === "true_false" || mode === "tf") {
    return parseTrueFalseQuestions(rawText);
  }
  if (mode === "essay") {
    return parseEssayQuestions(rawText);
  }
  if (mode === "mcq") {
    return parseMcqQuestions(rawText);
  }
  return parseUniversalQuestions(rawText);
}



export {
  validateQuestions,
  optionLabels,
  optionIndex,
  smartDecodeText,
  extractFromZip,
  extractTextFromDocxXml,
  extractTextFromUpload,
};
