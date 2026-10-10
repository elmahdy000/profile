import { Router, type IRouter, type Request } from "express";
import { createRequire } from "module";
import multer from "multer";
import mammoth from "mammoth";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db,
  essayQuestionBankTable,
  coursesTable,
  type InsertEssayQuestionBankItem,
  type EssayQuestionBankItem,
} from "@workspace/db";
import { requireAdmin, getAdminIdentity } from "../../middleware/auth";
import { logAudit } from "../../lib/audit";
import {
  PLATFORM_CANONICAL_STAGES,
  CANONICAL_CURRICULUM_DATA,
  normalizeCanonicalStage,
  normalizeCanonicalUnit,
  normalizeCanonicalLesson,
  getUnitAliases,
  normalizeQuestionPrompt,
  cleanEssayPrompt,
} from "./shared";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

let tableInitialized = false;
async function ensureEssayQuestionBankTable() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS essay_question_bank (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        subject TEXT,
        stage TEXT,
        stages JSONB NOT NULL DEFAULT '[]'::jsonb,
        category TEXT NOT NULL DEFAULT 'عام',
        unit TEXT,
        lesson TEXT,
        difficulty TEXT NOT NULL DEFAULT 'medium',
        points INTEGER NOT NULL DEFAULT 5,
        prompt TEXT NOT NULL,
        model_answer TEXT NOT NULL,
        explanation TEXT,
        image_url TEXT,
        model_answer_image_url TEXT,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_essay_question_bank_stage_unit_lesson ON essay_question_bank(stage, unit, lesson);
      CREATE INDEX IF NOT EXISTS idx_essay_question_bank_course_id ON essay_question_bank(course_id);
      CREATE INDEX IF NOT EXISTS idx_essay_question_bank_category ON essay_question_bank(category);
    `);
    tableInitialized = true;
  } catch (err) {
    console.error("[EssayQuestionBank] Failed to ensure table:", err);
  }
}

export interface ParsedEssayQuestionItem {
  tempId: string;
  prompt: string;
  modelAnswer: string;
  explanation?: string;
  points: number;
  stage?: string;
  unit?: string;
  lesson?: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl?: string;
  modelAnswerImageUrl?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * Smart Parser for Essay Questions
 * Supports:
 * 1. Tagged formats: [UNIT], [LESSON], [PROMPT], [MODEL_ANSWER], [POINTS], [KEY_ELEMENTS], [EXPLANATION]
 * 2. Arabic formats: الوحدة:، الدرس:، السؤال (1):، نص السؤال:، الإجابة النموذجية:، الدرجة:، مفاتيح الإجابة:
 * 3. Q&A format: Q1:, A1:, Points:
 * 4. JSON arrays
 */
export function parseEssayQuestionsFromText(
  rawText: string,
  defaults: {
    stage?: string;
    unit?: string;
    lesson?: string;
    difficulty?: "easy" | "medium" | "hard";
    points?: number;
  } = {}
): {
  detectedStage?: string;
  detectedUnit?: string;
  detectedLesson?: string;
  questions: ParsedEssayQuestionItem[];
} {
  const cleanText = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleanText) {
    return { questions: [] };
  }

  // 1. Check if it's valid JSON array
  if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
    try {
      const parsedJson = JSON.parse(cleanText);
      if (Array.isArray(parsedJson)) {
        const questions: ParsedEssayQuestionItem[] = parsedJson.map((item, idx) => {
          const prompt = String(item.prompt ?? item.question ?? "").trim();
          const modelAnswer = String(item.modelAnswer ?? item.answer ?? item.model_answer ?? "").trim();
          const points = Number(item.points ?? item.score ?? defaults.points ?? 5) || 5;
          const explanation = item.explanation ?? item.keyElements ?? item.rubric ?? undefined;
          const stage = String(item.stage ?? defaults.stage ?? "").trim() || undefined;
          const unit = String(item.unit ?? defaults.unit ?? "").trim() || undefined;
          const lesson = String(item.lesson ?? defaults.lesson ?? "").trim() || undefined;
          const difficulty = (["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : (defaults.difficulty || "medium")) as "easy" | "medium" | "hard";

          const isValid = prompt.length > 0 && modelAnswer.length > 0;
          return {
            tempId: `eq_${Date.now()}_${idx}`,
            prompt,
            modelAnswer,
            explanation,
            points,
            stage,
            unit,
            lesson,
            difficulty,
            imageUrl: item.imageUrl,
            modelAnswerImageUrl: item.modelAnswerImageUrl,
            isValid,
            validationError: !isValid ? (!prompt ? "نص السؤال مفقود" : "الإجابة النموذجية مفقودة") : undefined,
          };
        });
        return { questions };
      }
    } catch {
      // Fallback to text parsing
    }
  }

  let detectedStage = defaults.stage;
  let detectedUnit = defaults.unit;
  let detectedLesson = defaults.lesson;

  // Extract top-level unit/lesson/stage metadata if present
  const stageMatch = cleanText.match(/(?:\[STAGE\]|المرحلة|الصف)\s*[:：]\s*([^\n]+)/i);
  if (stageMatch && stageMatch[1].trim()) {
    detectedStage = stageMatch[1].trim();
  }

  const unitMatch = cleanText.match(/(?:\[UNIT\]|الوحدة|الفصل|Chapter|Unit)\s*[:：]\s*([^\n]+)/i);
  if (unitMatch && unitMatch[1].trim()) {
    detectedUnit = unitMatch[1].trim();
  }

  const lessonMatch = cleanText.match(/(?:\[LESSON\]|الدرس|المحاضرة|Lesson)\s*[:：]\s*([^\n]+)/i);
  if (lessonMatch && lessonMatch[1].trim()) {
    detectedLesson = lessonMatch[1].trim();
  }

  // Convert horizontal rules / divider lines to standard question separators
  let workingText = cleanText.replace(/(?:^|\n)\s*[-=_]{3,}\s*(?=\n|$)/g, "\n[QUESTION_SEP]\n");

  // Determine primary delimiter style:
  // If [QUESTION_1] or [QUESTION 1] or [QUESTION] tags are present, NEVER split on [PROMPT]!
  const hasTaggedQuestion = /\[QUESTION(?:[_\s]\d+)?\]/i.test(workingText);
  const hasTaggedPrompt = /\[PROMPT\]/i.test(workingText);

  let blockRegex: RegExp;
  if (hasTaggedQuestion) {
    blockRegex = /(?:^|\n)(?=\[(?:QUESTION(?:[_\s]\d+)?|QUESTION_SEP)\])/i;
  } else if (hasTaggedPrompt) {
    blockRegex = /(?:^|\n)(?=\[(?:PROMPT|QUESTION_SEP)\])/i;
  } else {
    blockRegex = /(?:^|\n)(?=\[QUESTION_SEP\]|السؤال\s*(?:\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|رقم\s*\d+)[:：\.\-–—\)]|س\s*\d+[:：\.\-–—\)]|سؤال\s*\d+[:：\.\-–—\)]|(?:^|\n)Q\s*\d+[:：\.\-–—\)]|(?:^|\n)Question\s*\d+[:：\.\-–—\)]|(?:^|\n)\d+[\.\-–—\)]\s*(?:[^\n]+))/i;
  }

  const rawBlocks = workingText.split(blockRegex).map((b) => b.trim()).filter(Boolean);
  const rawParsedQuestions: ParsedEssayQuestionItem[] = [];

  for (let idx = 0; idx < rawBlocks.length; idx++) {
    let block = rawBlocks[idx];
    block = block.replace(/^\[QUESTION_SEP\]\s*/i, "").trim();
    if (!block) continue;

    let prompt = "";
    let modelAnswer = "";
    let explanation: string | undefined = undefined;
    let points = defaults.points ?? 5;
    let difficulty: "easy" | "medium" | "hard" = defaults.difficulty ?? "medium";

    // 1. Tagged parsing [PROMPT]: ... [POINTS]: ... [MODEL_ANSWER]: ... [EXPLANATION]:
    if (block.includes("[PROMPT]") || block.includes("[MODEL_ANSWER]")) {
      const pMatch = block.match(/\[PROMPT\]\s*[:：]?\s*([\s\S]*?)(?=\[(?:POINTS|MODEL_ANSWER|EXPLANATION|KEY_ELEMENTS|DIFFICULTY)\]|$)/i);
      if (pMatch) prompt = pMatch[1].trim();

      const ptsMatch = block.match(/\[POINTS\]\s*[:：]?\s*(\d+)/i);
      if (ptsMatch) points = parseInt(ptsMatch[1], 10) || points;

      const diffMatch = block.match(/\[DIFFICULTY\]\s*[:：]?\s*(easy|medium|hard|سهل|متوسط|صعب)/i);
      if (diffMatch) {
        const d = diffMatch[1].toLowerCase();
        if (d === "easy" || d === "سهل") difficulty = "easy";
        else if (d === "hard" || d === "صعب") difficulty = "hard";
        else difficulty = "medium";
      }

      const ansMatch = block.match(/\[MODEL_ANSWER\]\s*[:：]?\s*([\s\S]*?)(?=\[(?:EXPLANATION|KEY_ELEMENTS|RUBRIC|POINTS|DIFFICULTY)\]|$)/i);
      if (ansMatch) modelAnswer = ansMatch[1].trim();

      const expMatch = block.match(/\[(?:EXPLANATION|KEY_ELEMENTS|RUBRIC)\]\s*[:：]?\s*([\s\S]*?)$/i);
      if (expMatch) explanation = expMatch[1].trim();

      // If prompt was not in [PROMPT], extract whatever is before [MODEL_ANSWER]
      if (!prompt) {
        const topText = block.split(/\[(?:MODEL_ANSWER|POINTS|DIFFICULTY|EXPLANATION)\]/i)[0];
        prompt = cleanEssayPrompt(topText);
      }
    } else {
      // 2. Arabic / Natural parsing
      const ptsMatch = block.match(/(?:الدرجة|الدرجات|النقاط|\bPoints\b|\bScore\b)\s*[:：\.\-–—]?\s*(\d+)/i);
      if (ptsMatch) points = parseInt(ptsMatch[1], 10) || points;

      const diffMatch = block.match(/(?:الصعوبة|مستوى الصعوبة|\bDifficulty\b)\s*[:：\.\-–—]?\s*(سهل|متوسط|صعب|easy|medium|hard)/i);
      if (diffMatch) {
        const d = diffMatch[1].toLowerCase();
        if (d === "easy" || d === "سهل") difficulty = "easy";
        else if (d === "hard" || d === "صعب") difficulty = "hard";
        else difficulty = "medium";
      }

      const ansMatch = block.match(/(?:الإجابة النموذجية|الحل النموذجي|إجابة نموذجية|الإجابة|الحل|\bModel\s*Answer\b|\bAnswer\b|\bA\d*\b)\s*[:：\.\-–—]\s*([\s\S]*?)(?=(?:ملاحظات التصحيح|توزيع الدرجات|عناصر الإجابة|الإرشادات|الشرح|Rubric|Explanation|Key Elements)\s*[:：\.\-–—]|$)/i);
      if (ansMatch) {
        modelAnswer = ansMatch[1].trim();
      }

      const expMatch = block.match(/(?:ملاحظات التصحيح|توزيع الدرجات|عناصر الإجابة|الإرشادات|الشرح|Rubric|Explanation|Key Elements)\s*[:：\.\-–—]\s*([\s\S]*?)$/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
      }

      const promptExplicit = block.match(/(?:نص السؤال|السؤال)\s*[:：\.\-–—]\s*([\s\S]*?)(?=(?:الدرجة|الدرجات|الإجابة النموذجية|الحل النموذجي|\bModel\s*Answer\b|\bAnswer\b)\s*[:：\.\-–—]|$)/i);
      if (promptExplicit) {
        prompt = promptExplicit[1].trim();
      } else {
        const lines = block.split("\n");
        const promptLines: string[] = [];
        for (const line of lines) {
          if (line.match(/(?:الدرجة|الدرجات|\bPoints\b|\bScore\b|الإجابة النموذجية|الحل النموذجي|إجابة نموذجية|الإجابة|الحل|\bModel\s*Answer\b|\bAnswer\b|\bA\d*\b)\s*[:：\.\-–—]/i)) {
            break;
          }
          const cleanLine = line.replace(/^(?:السؤال\s*(?:\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|رقم\s*\d+)[:：\.\-–—\)]|س\s*\d+[:：\.\-–—\)]|سؤال\s*\d+[:：\.\-–—\)]|Q\s*\d+[:：\.\-–—\)]|Question\s*\d+[:：\.\-–—\)]|\d+[\.\-–—\)])\s*/i, "").trim();
          if (cleanLine) promptLines.push(cleanLine);
        }
        prompt = promptLines.join("\n").trim();
      }
    }

    prompt = cleanEssayPrompt(prompt);
    if (!prompt && !modelAnswer) continue;

    rawParsedQuestions.push({
      tempId: `eq_${Date.now()}_${idx}`,
      prompt: prompt || "(نص السؤال مفقود)",
      modelAnswer: modelAnswer || "",
      explanation,
      points,
      stage: detectedStage,
      unit: detectedUnit,
      lesson: detectedLesson,
      difficulty,
      isValid: false,
    });
  }

  // 3. Prompt-based Deduplication & Merging:
  const seenMap = new Map<string, number>();
  const questions: ParsedEssayQuestionItem[] = [];

  for (const q of rawParsedQuestions) {
    const key = normalizeQuestionPrompt(cleanEssayPrompt(q.prompt));

    if (key && seenMap.has(key)) {
      const existingIdx = seenMap.get(key)!;
      const existing = questions[existingIdx];
      if (!existing.modelAnswer && q.modelAnswer) {
        existing.modelAnswer = q.modelAnswer;
        existing.isValid = Boolean(existing.prompt && existing.prompt !== "(نص السؤال مفقود)" && existing.modelAnswer);
        existing.validationError = existing.isValid
          ? undefined
          : (!existing.prompt || existing.prompt === "(نص السؤال مفقود)" ? "لم يتم التعرف على نص السؤال" : "لم يتم التعرف على الإجابة النموذجية");
      }
      if (!existing.explanation && q.explanation) {
        existing.explanation = q.explanation;
      }
      continue;
    }

    if (key) {
      seenMap.set(key, questions.length);
    }

    const isValid = Boolean(q.prompt && q.prompt !== "(نص السؤال مفقود)" && q.modelAnswer);
    const validationError = !isValid
      ? (!q.prompt || q.prompt === "(نص السؤال مفقود)" ? "لم يتم التعرف على نص السؤال" : "لم يتم التعرف على الإجابة النموذجية")
      : undefined;

    questions.push({
      ...q,
      isValid,
      validationError,
    });
  }

  const normStage = normalizeCanonicalStage(detectedStage) || detectedStage;
  const normUnit = detectedUnit ? normalizeCanonicalUnit(normStage, detectedUnit) : detectedUnit;
  const normLesson = detectedLesson
    ? (normalizeCanonicalLesson(normStage, normUnit, detectedLesson, { allowCustom: true }) || detectedLesson)
    : detectedLesson;

  return {
    detectedStage: normStage,
    detectedUnit: normUnit,
    detectedLesson: normLesson,
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/admin/learning/essay-question-bank
// List & filter essay questions from the dedicated essay bank
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/learning/essay-question-bank", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();

    const stage = req.query.stage ? String(req.query.stage).trim() : undefined;
    const unit = req.query.unit ? String(req.query.unit).trim() : undefined;
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty).trim() : undefined;
    const search = req.query.q ? String(req.query.q).trim() : undefined;
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
    const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10));

    const conditions: any[] = [];

    if (stage && stage !== "all") {
      const canonical = normalizeCanonicalStage(stage) || stage;
      conditions.push(
        or(
          eq(essayQuestionBankTable.stage, stage),
          eq(essayQuestionBankTable.stage, canonical),
          ilike(essayQuestionBankTable.stage, `%${canonical.split("·")[1]?.trim() || stage}%`),
          sql`${essayQuestionBankTable.stages} @> ${JSON.stringify([stage])}::jsonb`,
          sql`${essayQuestionBankTable.stages} @> ${JSON.stringify([canonical])}::jsonb`
        )
      );
    }

    if (unit && unit !== "all") {
      const aliases = getUnitAliases(stage, unit);
      if (aliases.length > 1) {
        conditions.push(inArray(essayQuestionBankTable.unit, aliases));
      } else {
        conditions.push(eq(essayQuestionBankTable.unit, unit));
      }
    }

    if (lesson && lesson !== "all") {
      conditions.push(eq(essayQuestionBankTable.lesson, lesson));
    }

    if (difficulty && difficulty !== "all") {
      conditions.push(eq(essayQuestionBankTable.difficulty, difficulty));
    }

    if (search) {
      conditions.push(
        or(
          ilike(essayQuestionBankTable.prompt, `%${search}%`),
          ilike(essayQuestionBankTable.modelAnswer, `%${search}%`),
          ilike(essayQuestionBankTable.unit, `%${search}%`),
          ilike(essayQuestionBankTable.lesson, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(essayQuestionBankTable)
      .where(whereClause);

    const questions = await db
      .select()
      .from(essayQuestionBankTable)
      .where(whereClause)
      .orderBy(desc(essayQuestionBankTable.id))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      total: countRow?.count || 0,
      questions,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/admin/learning/essay-question-bank/taxonomy
// Returns distinct stages, units, and lessons available in the essay bank
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/learning/essay-question-bank/taxonomy", requireAdmin, async (_req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();

    const rows = await db
      .select({
        stage: essayQuestionBankTable.stage,
        unit: essayQuestionBankTable.unit,
        lesson: essayQuestionBankTable.lesson,
        difficulty: essayQuestionBankTable.difficulty,
        count: sql<number>`count(*)::int`,
      })
      .from(essayQuestionBankTable)
      .groupBy(
        essayQuestionBankTable.stage,
        essayQuestionBankTable.unit,
        essayQuestionBankTable.lesson,
        essayQuestionBankTable.difficulty
      );

    // Pre-seed units and lessons from canonical curriculum
    const unitsMap = new Map<string, Set<string>>();
    for (const stageItem of CANONICAL_CURRICULUM_DATA) {
      for (const unitItem of stageItem.units) {
        if (!unitsMap.has(unitItem.unit)) {
          unitsMap.set(unitItem.unit, new Set(unitItem.lessons));
        } else {
          unitItem.lessons.forEach((l) => unitsMap.get(unitItem.unit)!.add(l));
        }
      }
    }

    for (const r of rows) {
      const normStage = normalizeCanonicalStage(r.stage);
      if (r.unit) {
        const normUnit = normalizeCanonicalUnit(normStage, r.unit);
        if (!unitsMap.has(normUnit)) {
          unitsMap.set(normUnit, new Set());
        }
        if (r.lesson) {
          const normLesson = normalizeCanonicalLesson(normStage, normUnit, r.lesson, { allowCustom: true });
          if (normLesson) {
            unitsMap.get(normUnit)!.add(normLesson);
          }
        }
      }
    }

    const units = Array.from(unitsMap.entries()).map(([unitName, lessonsSet]) => ({
      unit: unitName,
      lessons: Array.from(lessonsSet),
    }));

    res.json({
      success: true,
      stages: [...PLATFORM_CANONICAL_STAGES],
      taxonomyTree: CANONICAL_CURRICULUM_DATA,
      units,
      summaryRows: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/admin/learning/essay-question-bank/upload-parse
// Parses a file (Word, PDF, Text, JSON) or raw text without saving yet
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/admin/learning/essay-question-bank/upload-parse",
  requireAdmin,
  upload.single("file"),
  async (req: Request, res, next) => {
    try {
      let rawText = "";

      if (req.file) {
        const ext = req.file.originalname.split(".").pop()?.toLowerCase();
        if (ext === "docx") {
          const mammothResult = await mammoth.extractRawText({ buffer: req.file.buffer });
          rawText = mammothResult.value;
        } else if (ext === "pdf") {
          const pdfResult = await pdfParse(req.file.buffer);
          rawText = pdfResult.text;
        } else {
          rawText = req.file.buffer.toString("utf-8");
        }
      } else if (req.body.rawText) {
        rawText = String(req.body.rawText);
      } else {
        res.status(400).json({ error: "برجاء رفع ملف (.docx أو .pdf أو .txt) أو إرسال نص للتحليل" });
        return;
      }

      const defaultStage = req.body.defaultStage ? String(req.body.defaultStage).trim() : undefined;
      const defaultUnit = req.body.defaultUnit ? String(req.body.defaultUnit).trim() : undefined;
      const defaultLesson = req.body.defaultLesson ? String(req.body.defaultLesson).trim() : undefined;
      const defaultDifficulty = (["easy", "medium", "hard"].includes(req.body.defaultDifficulty)
        ? req.body.defaultDifficulty
        : "medium") as "easy" | "medium" | "hard";
      const defaultPoints = req.body.defaultPoints ? parseInt(String(req.body.defaultPoints), 10) || 5 : 5;

      const parsed = parseEssayQuestionsFromText(rawText, {
        stage: defaultStage,
        unit: defaultUnit,
        lesson: defaultLesson,
        difficulty: defaultDifficulty,
        points: defaultPoints,
      });

      res.json({
        success: true,
        detectedStage: parsed.detectedStage,
        detectedUnit: parsed.detectedUnit,
        detectedLesson: parsed.detectedLesson,
        count: parsed.questions.length,
        validCount: parsed.questions.filter((q) => q.isValid).length,
        questions: parsed.questions,
      });
    } catch (err: any) {
      console.error("[EssayQuestionBank] Parse error:", err);
      res.status(400).json({
        error: "فشل في معالجة الملف، تأكد من سلامة تنسيق الملف",
        details: err?.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/admin/learning/essay-question-bank/bulk-save
// Saves approved parsed questions into the dedicated essay question bank
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/learning/essay-question-bank/bulk-save", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();

    const items = req.body.questions;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "قائمة الأسئلة المقالية فارغة" });
      return;
    }

    const validInserts: InsertEssayQuestionBankItem[] = [];
    const seenPrompts = new Set<string>();

    for (const q of items) {
      const prompt = cleanEssayPrompt(String(q.prompt ?? "").trim());
      const modelAnswer = String(q.modelAnswer ?? q.model_answer ?? "").trim();
      if (!prompt || !modelAnswer) continue;

      const pKey = normalizeQuestionPrompt(prompt);
      if (pKey && seenPrompts.has(pKey)) continue;
      if (pKey) seenPrompts.add(pKey);

      const rawStage = q.stage ? String(q.stage).trim() : "عام";
      const stage = normalizeCanonicalStage(rawStage) || rawStage;
      const stages = Array.isArray(q.stages) && q.stages.length > 0 ? q.stages : [stage];
      const unit = q.unit ? normalizeCanonicalUnit(stage, q.unit) : null;
      const lesson = q.lesson
        ? (normalizeCanonicalLesson(stage, unit, q.lesson, { allowCustom: true }) || String(q.lesson).trim())
        : null;

      validInserts.push({
        courseId: q.courseId ? Number(q.courseId) : null,
        subject: q.subject ? String(q.subject).trim() : null,
        stage,
        stages,
        category: q.category ? String(q.category).trim() : "عام",
        unit,
        lesson,
        difficulty: (["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium") as any,
        points: Number(q.points) > 0 ? Number(q.points) : 5,
        prompt,
        modelAnswer,
        explanation: q.explanation ? String(q.explanation).trim() : null,
        imageUrl: q.imageUrl ? String(q.imageUrl).trim() : null,
        modelAnswerImageUrl: q.modelAnswerImageUrl ? String(q.modelAnswerImageUrl).trim() : null,
        tags: Array.isArray(q.tags) ? q.tags : [],
      });
    }

    if (validInserts.length === 0) {
      res.status(400).json({ error: "لم يتم العثور على أي أسئلة صالحة للحفظ (نص السؤال والحل النموذجي مطلوبان)" });
      return;
    }

    const insertedRows = await db
      .insert(essayQuestionBankTable)
      .values(validInserts)
      .returning({ id: essayQuestionBankTable.id });

    logAudit(
      req,
      "bulk_insert_essay_questions",
      "essay_question_bank",
      null,
      `تم حفظ ${insertedRows.length} سؤال مقالي في بنك الأسئلة المقالية المستقل`
    );

    res.json({
      success: true,
      message: `تم حفظ ${insertedRows.length} سؤال مقالي بنجاح في بنك الأسئلة المقالية!`,
      insertedCount: insertedRows.length,
      ids: insertedRows.map((r) => r.id),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /api/admin/learning/essay-question-bank
// Create a single essay question manually
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/learning/essay-question-bank", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();

    const {
      prompt,
      modelAnswer,
      explanation,
      points,
      stage,
      stages,
      category,
      unit,
      lesson,
      difficulty,
      courseId,
      imageUrl,
      modelAnswerImageUrl,
      tags,
    } = req.body;

    if (!prompt || !modelAnswer) {
      res.status(400).json({ error: "نص السؤال المقالي والإجابة النموذجية كلاهما مطلوب" });
      return;
    }

    const rawStage = stage ? String(stage).trim() : "عام";
    const finalStage = normalizeCanonicalStage(rawStage) || rawStage;
    const finalStages = Array.isArray(stages) && stages.length > 0 ? stages : [finalStage];
    const finalUnit = unit ? normalizeCanonicalUnit(finalStage, unit) : null;
    const finalLesson = lesson
      ? (normalizeCanonicalLesson(finalStage, finalUnit, lesson, { allowCustom: true }) || String(lesson).trim())
      : null;

    const [newQuestion] = await db
      .insert(essayQuestionBankTable)
      .values({
        courseId: courseId ? Number(courseId) : null,
        stage: finalStage,
        stages: finalStages,
        category: category ? String(category).trim() : "عام",
        unit: finalUnit,
        lesson: finalLesson,
        difficulty: (["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium") as any,
        points: Number(points) > 0 ? Number(points) : 5,
        prompt: String(prompt).trim(),
        modelAnswer: String(modelAnswer).trim(),
        explanation: explanation ? String(explanation).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        modelAnswerImageUrl: modelAnswerImageUrl ? String(modelAnswerImageUrl).trim() : null,
        tags: Array.isArray(tags) ? tags : [],
      })
      .returning();

    res.status(201).json({ success: true, question: newQuestion });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PUT /api/admin/learning/essay-question-bank/:id
// Update an existing essay question in the bank
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/learning/essay-question-bank/:id", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(String(rawId), 10);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "معرف السؤال غير صالح" });
      return;
    }

    const {
      prompt,
      modelAnswer,
      explanation,
      points,
      stage,
      stages,
      category,
      unit,
      lesson,
      difficulty,
      courseId,
      imageUrl,
      modelAnswerImageUrl,
      tags,
    } = req.body;

    const updateData: Partial<InsertEssayQuestionBankItem> = {
      updatedAt: new Date(),
    };

    if (prompt !== undefined) updateData.prompt = String(prompt).trim();
    if (modelAnswer !== undefined) updateData.modelAnswer = String(modelAnswer).trim();
    if (explanation !== undefined) updateData.explanation = explanation ? String(explanation).trim() : null;
    if (points !== undefined) updateData.points = Number(points) || 5;
    if (stage !== undefined) {
      const rawStage = String(stage).trim();
      updateData.stage = normalizeCanonicalStage(rawStage) || rawStage;
      updateData.stages = Array.isArray(stages) ? stages : [updateData.stage || "عام"];
    }
    if (category !== undefined) updateData.category = String(category).trim();
    if (unit !== undefined) {
      updateData.unit = unit ? normalizeCanonicalUnit(updateData.stage || undefined, unit) : null;
    }
    if (lesson !== undefined) {
      updateData.lesson = lesson
        ? (normalizeCanonicalLesson(updateData.stage || undefined, updateData.unit || undefined, lesson, { allowCustom: true }) || String(lesson).trim())
        : null;
    }
    if (difficulty !== undefined) {
      updateData.difficulty = (["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium") as any;
    }
    if (courseId !== undefined) updateData.courseId = courseId ? Number(courseId) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    if (modelAnswerImageUrl !== undefined) {
      updateData.modelAnswerImageUrl = modelAnswerImageUrl ? String(modelAnswerImageUrl).trim() : null;
    }
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

    const [updated] = await db
      .update(essayQuestionBankTable)
      .set(updateData)
      .where(eq(essayQuestionBankTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "السؤال المقالي غير موجود" });
      return;
    }

    res.json({ success: true, question: updated });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DELETE /api/admin/learning/essay-question-bank/:id
// Delete a single essay question from the bank
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/admin/learning/essay-question-bank/:id", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayQuestionBankTable();
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(String(rawId), 10);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "معرف السؤال غير صالح" });
      return;
    }

    const [deleted] = await db
      .delete(essayQuestionBankTable)
      .where(eq(essayQuestionBankTable.id, id))
      .returning({ id: essayQuestionBankTable.id });

    if (!deleted) {
      res.status(404).json({ error: "السؤال المقالي غير موجود" });
      return;
    }

    res.json({ success: true, message: "تم حذف السؤال المقالي بنجاح" });
  } catch (err) {
    next(err);
  }
});

export default router;
