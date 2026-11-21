import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  coursesTable,
  db,
  essayQuestionBankTable,
  lessonKholasaMaterialsTable,
  questionBankTable,
  quizzesTable,
  studentBookmarksTable,
  studentDailyChallengesTable,
  studentMistakesTable,
  studentNotificationsTable,
  studentsTable,
  videosTable,
  type QuizQuestion,
} from "@workspace/db";
import { validateQuestions } from "./question-parser";
import { getDynamicAdminPassword, isAdminRequest, requireAdmin } from "../../middleware/auth";
import {
  canStudentAccessContent,
  getApprovedStudent,
  requireStudent,
} from "../../middleware/student-auth";
import {
  assertActivePaidStudent,
  calculateStreak,
  getCairoDayKey,
  gradeQuestionOption,
  kholasaMindmapsDir,
  recordSubmissionMistakes,
  resolveCorrectOptionIndex,
  type MistakeRecordingItem,
} from "../../lib/kholasa-helpers";
import {
  allowedImageExtensions,
  isCompleteValidQuestion,
  normalizeCanonicalStage,
  parseLessonSortOrder,
  parseUnitSortOrder,
} from "./shared";

const router: IRouter = Router();

const mindmapUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, kholasaMindmapsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = allowedImageExtensions.has(ext) ? ext : ".png";
      cb(null, `mm-${Date.now()}-${randomBytes(6).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (mime.startsWith("image/") || allowedImageExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("يُسمح برفع صور الخرائط الذهنية فقط (PNG / JPG / WebP)"));
    }
  },
});

function sanitizeQuestionForStudent(q: QuizQuestion | undefined | null) {
  if (!q) return { prompt: "", options: [] };
  const { correctIndex: _ci, correctAnswer: _ca, ...rest } = q;
  return rest;
}

// ── 1. Protected Mindmap / Kholasa Media Endpoint ─────────────────────────────
router.get("/learning/kholasa/media/:filename", async (req, res, next) => {
  try {
    let isAdmin = isAdminRequest(req);
    if (!isAdmin) {
      await getDynamicAdminPassword().catch(() => {});
      isAdmin = isAdminRequest(req);
    }
    if (!isAdmin) {
      const student = await getApprovedStudent(req);
      if (!student || student.status !== "approved" || student.paymentStatus !== "paid") {
        res.status(403).json({
          error: "عرض الخرائط الذهنية متاح فقط للطلاب المفعلين والمسددين.",
          code: "PAYMENT_REQUIRED",
        });
        return;
      }
    }

    const rawName = String(req.params.filename || "");
    const safeName = path.basename(rawName);
    if (!safeName || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
      res.status(400).json({ error: "اسم الملف غير صالح" });
      return;
    }

    const fullPath = path.resolve(kholasaMindmapsDir, safeName);
    const baseDir = path.resolve(kholasaMindmapsDir);
    if (!fullPath.startsWith(baseDir + path.sep)) {
      res.status(403).json({ error: "وصول مرفوض" });
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "الصورة غير موجودة" });
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(fullPath);
  } catch (error) {
    next(error);
  }
});

// ── 2. Student: List All Accessible Kholasa Materials (Active Paid Only) ─────
router.get("/learning/kholasa/materials", requireStudent, async (_req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const [allMaterials, bookmarks, videos, qbCounts, essayCounts] = await Promise.all([
      db
        .select()
        .from(lessonKholasaMaterialsTable)
        .where(eq(lessonKholasaMaterialsTable.isPublished, true))
        .orderBy(lessonKholasaMaterialsTable.lessonOrder, lessonKholasaMaterialsTable.id),
      db
        .select()
        .from(studentBookmarksTable)
        .where(eq(studentBookmarksTable.studentId, student.id)),
      db
        .select({
          id: videosTable.id,
          title: videosTable.title,
          durationText: videosTable.durationText,
          thumbnailUrl: videosTable.thumbnailUrl,
        })
        .from(videosTable)
        .where(eq(videosTable.isPublished, true)),
      db
        .select({
          stage: questionBankTable.stage,
          unit: questionBankTable.unit,
          lesson: questionBankTable.lesson,
          lessonId: questionBankTable.lessonId,
          qType: sql<string>`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`,
          cnt: sql<number>`count(*)::int`,
        })
        .from(questionBankTable)
        .groupBy(
          questionBankTable.stage,
          questionBankTable.unit,
          questionBankTable.lesson,
          questionBankTable.lessonId,
          sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`,
        ),
      db
        .select({
          stage: essayQuestionBankTable.stage,
          unit: essayQuestionBankTable.unit,
          lesson: essayQuestionBankTable.lesson,
          cnt: sql<number>`count(*)::int`,
        })
        .from(essayQuestionBankTable)
        .groupBy(
          essayQuestionBankTable.stage,
          essayQuestionBankTable.unit,
          essayQuestionBankTable.lesson,
        ),
    ]);

    const filtered = allMaterials.filter((m) =>
      canStudentAccessContent(student, "عام", m.stage, m.stages, m.courseId),
    );

    const bookmarkedKeys = new Set(
      bookmarks.map((b) => `${b.itemType}:${b.itemKey}`),
    );
    const videoById = new Map(videos.map((v) => [v.id, v]));

    const essayMap = new Map<string, number>();
    for (const row of essayCounts) {
      const key = `${row.stage || ""}||${row.unit || ""}||${row.lesson || ""}`;
      essayMap.set(key, (essayMap.get(key) || 0) + (Number(row.cnt) || 0));
    }

    filtered.sort((a, b) => {
      const unitDiff = parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit);
      if (unitDiff !== 0) return unitDiff;
      const lessonDiff = parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson);
      if (lessonDiff !== 0) return lessonDiff;
      return a.lessonOrder - b.lessonOrder;
    });

    res.json({
      materials: filtered.map((m) => {
        let mcq = 0;
        let trueFalse = 0;
        for (const row of qbCounts) {
          if (row.stage !== m.stage || row.unit !== m.unit) continue;
          const matchesLesson = row.lesson === m.lesson || (m.videoId !== null && row.lessonId === m.videoId);
          if (!matchesLesson) continue;
          if (row.qType === "true_false") trueFalse += Number(row.cnt) || 0;
          else mcq += Number(row.cnt) || 0;
        }
        const essay = essayMap.get(`${m.stage}||${m.unit}||${m.lesson}`) || 0;
        return {
          ...m,
          isBookmarked: bookmarkedKeys.has(`lesson:${m.id}`),
          video: m.videoId ? videoById.get(m.videoId) ?? null : null,
          questionCounts: { mcq, trueFalse, essay },
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

// ── 2.5. Student: Get Lesson Questions by Type (MCQ / True-False / Essay) ───
router.get("/learning/kholasa/materials/:id/questions", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ error: "معرف الدرس غير صالح" });
      return;
    }

    const [material] = await db
      .select()
      .from(lessonKholasaMaterialsTable)
      .where(
        and(
          eq(lessonKholasaMaterialsTable.id, materialId),
          eq(lessonKholasaMaterialsTable.isPublished, true),
        ),
      )
      .limit(1);

    if (!material) {
      res.status(404).json({ error: "الدرس غير موجود" });
      return;
    }

    if (!canStudentAccessContent(student, "عام", material.stage, material.stages, material.courseId)) {
      res.status(403).json({ error: "هذا الدرس غير متاح لمرحلتك الدراسية" });
      return;
    }

    const qTypeParam = String(req.query.type || "mcq").trim(); // mcq | true_false | essay
    const diffParam = String(req.query.difficulty || "all").trim(); // all | easy | medium | hard
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(25, Math.max(5, Number(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    const lessonMatchQb = material.videoId
      ? or(
          eq(questionBankTable.lesson, material.lesson),
          eq(questionBankTable.lessonId, material.videoId),
        )
      : eq(questionBankTable.lesson, material.lesson);

    const qbBaseCond = and(
      eq(questionBankTable.stage, material.stage),
      eq(questionBankTable.unit, material.unit),
      lessonMatchQb,
    );

    const essayBaseCond = and(
      eq(essayQuestionBankTable.stage, material.stage),
      eq(essayQuestionBankTable.unit, material.unit),
      eq(essayQuestionBankTable.lesson, material.lesson),
    );

    const [qbCountRows, essayCountRow] = await Promise.all([
      db
        .select({
          qType: sql<string>`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`,
          cnt: sql<number>`count(*)::int`,
        })
        .from(questionBankTable)
        .where(qbBaseCond)
        .groupBy(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`),
      db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(essayQuestionBankTable)
        .where(essayBaseCond),
    ]);

    const counts = {
      mcq: 0,
      trueFalse: 0,
      essay: Number(essayCountRow[0]?.cnt) || 0,
    };
    for (const r of qbCountRows) {
      if (r.qType === "true_false") counts.trueFalse += Number(r.cnt) || 0;
      else counts.mcq += Number(r.cnt) || 0;
    }

    if (qTypeParam === "essay") {
      const conds = [essayBaseCond];
      if (diffParam === "easy" || diffParam === "medium" || diffParam === "hard") {
        conds.push(eq(essayQuestionBankTable.difficulty, diffParam));
      }
      const [items, totalRow] = await Promise.all([
        db
          .select({
            id: essayQuestionBankTable.id,
            difficulty: essayQuestionBankTable.difficulty,
            points: essayQuestionBankTable.points,
            prompt: essayQuestionBankTable.prompt,
            modelAnswer: essayQuestionBankTable.modelAnswer,
            explanation: essayQuestionBankTable.explanation,
            imageUrl: essayQuestionBankTable.imageUrl,
          })
          .from(essayQuestionBankTable)
          .where(and(...conds))
          .orderBy(essayQuestionBankTable.id)
          .limit(limit)
          .offset(offset),
        db
          .select({ cnt: sql<number>`count(*)::int` })
          .from(essayQuestionBankTable)
          .where(and(...conds)),
      ]);
      const total = Number(totalRow[0]?.cnt) || 0;
      res.json({
        type: "essay",
        counts,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        items,
      });
      return;
    }

    const qbConds = [
      qbBaseCond,
      qTypeParam === "true_false"
        ? sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') = 'true_false'`
        : sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') <> 'true_false'`,
    ];
    if (diffParam === "easy" || diffParam === "medium" || diffParam === "hard") {
      qbConds.push(eq(questionBankTable.difficulty, diffParam));
    }

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id: questionBankTable.id,
          difficulty: questionBankTable.difficulty,
          concept: questionBankTable.concept,
          translation: questionBankTable.translation,
          question: questionBankTable.question,
        })
        .from(questionBankTable)
        .where(and(...qbConds))
        .orderBy(questionBankTable.id)
        .limit(limit)
        .offset(offset),
      db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(questionBankTable)
        .where(and(...qbConds)),
    ]);

    const total = Number(totalRow[0]?.cnt) || 0;
    res.json({
      type: qTypeParam === "true_false" ? "true_false" : "mcq",
      counts,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items: rows.map((r) => ({
        id: r.id,
        difficulty: r.difficulty,
        concept: r.concept || r.question?.concept || null,
        translation: r.translation || r.question?.translation || null,
        question: sanitizeQuestionForStudent(r.question),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/kholasa/materials/:id/check-answer", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const materialId = Number(req.params.id);
    const questionBankId = Number(req.body?.questionBankId);
    const selectedOption = Number(req.body?.selectedOption);

    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ error: "معرف الدرس غير صالح" });
      return;
    }

    if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
      res.status(400).json({ error: "معرف السؤال غير صالح" });
      return;
    }

    const [[material], [row]] = await Promise.all([
      db
        .select()
        .from(lessonKholasaMaterialsTable)
        .where(
          and(
            eq(lessonKholasaMaterialsTable.id, materialId),
            eq(lessonKholasaMaterialsTable.isPublished, true),
          ),
        )
        .limit(1),
      db
        .select()
        .from(questionBankTable)
        .where(eq(questionBankTable.id, questionBankId))
        .limit(1),
    ]);

    if (!material) {
      res.status(404).json({ error: "الدرس غير موجود" });
      return;
    }

    if (!canStudentAccessContent(student, "عام", material.stage, material.stages, material.courseId)) {
      res.status(403).json({ error: "هذا الدرس غير متاح لمرحلتك الدراسية" });
      return;
    }

    if (!row) {
      res.status(404).json({ error: "السؤال غير موجود" });
      return;
    }

    const belongsToMaterial =
      row.stage === material.stage &&
      row.unit === material.unit &&
      (row.lesson === material.lesson || (material.videoId !== null && row.lessonId === material.videoId));

    if (
      !belongsToMaterial ||
      !canStudentAccessContent(student, "عام", row.stage, row.stages)
    ) {
      res.status(403).json({ error: "هذا السؤال غير تابع لهذا الدرس أو غير متاح لمرحلتك" });
      return;
    }

    const q = row.question;
    const { isCorrect, resolvedCorrectOption, normalizedOption } = gradeQuestionOption(q, selectedOption);

    await recordSubmissionMistakes({
      studentId: student.id,
      stage: row.stage,
      unit: row.unit,
      lesson: row.lesson,
      sourceType: "quiz",
      sourceId: material.id,
      items: [
        {
          question: q,
          questionBankId: row.id,
          selectedOption: normalizedOption,
          isCorrect,
          unit: row.unit,
          lesson: row.lesson,
          concept: row.concept,
        },
      ],
    });

    res.json({
      isCorrect,
      correctOption: resolvedCorrectOption,
      explanation: q.explanation || null,
      translation: q.translation || row.translation || null,
    });
  } catch (error) {
    next(error);
  }
});

// ── 3. Student: Get Kholasa Material for a Specific Video ────────────────────
router.get("/learning/kholasa/video/:videoId", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const videoId = Number(req.params.videoId);
    if (!Number.isInteger(videoId) || videoId <= 0) {
      res.status(400).json({ error: "رقم الفيديو غير صالح" });
      return;
    }

    const [material] = await db
      .select()
      .from(lessonKholasaMaterialsTable)
      .where(
        and(
          eq(lessonKholasaMaterialsTable.videoId, videoId),
          eq(lessonKholasaMaterialsTable.isPublished, true),
        ),
      )
      .limit(1);

    if (!material) {
      res.json({ material: null });
      return;
    }

    if (!canStudentAccessContent(student, "عام", material.stage, material.stages, material.courseId)) {
      res.status(403).json({ error: "المحتوى غير متاح لمرحلتك الدراسية" });
      return;
    }

    const [bookmark] = await db
      .select({ id: studentBookmarksTable.id })
      .from(studentBookmarksTable)
      .where(
        and(
          eq(studentBookmarksTable.studentId, student.id),
          eq(studentBookmarksTable.itemType, "lesson"),
          eq(studentBookmarksTable.itemKey, String(material.id)),
        ),
      )
      .limit(1);

    res.json({
      material: {
        ...material,
        isBookmarked: Boolean(bookmark),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── 4. Student: Mistakes Hub (ركن غلطاتي) ─────────────────────────────────────
router.get("/learning/mistakes", requireStudent, async (_req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const rows = await db
      .select()
      .from(studentMistakesTable)
      .where(eq(studentMistakesTable.studentId, student.id))
      .orderBy(desc(studentMistakesTable.lastWrongAt));

    const unresolved = rows.filter((r) => !r.mastered);
    const resolvedCount = rows.length - unresolved.length;

    // Build weakness diagnosis buckets grouped by unit/lesson
    const bucketMap = new Map<
      string,
      {
        key: string;
        unit: string;
        lesson: string | null;
        count: number;
        totalWrongs: number;
      }
    >();

    for (const r of unresolved) {
      const unit = r.unit?.trim() || "الوحدة العامة";
      const lesson = r.lesson?.trim() || null;
      const key = lesson ? `${unit}::${lesson}` : `${unit}::__unit__`;
      const existing = bucketMap.get(key);
      const wrongs = Math.max(1, r.wrongCount || 1);
      if (existing) {
        existing.count += 1;
        existing.totalWrongs += wrongs;
      } else {
        bucketMap.set(key, { key, unit, lesson, count: 1, totalWrongs: wrongs });
      }
    }

    const breakdown = Array.from(bucketMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalWrongs - a.totalWrongs;
    });

    res.json({
      unresolvedCount: unresolved.length,
      resolvedCount,
      totalCount: rows.length,
      topWeakness: breakdown[0] ?? null,
      breakdown,
      mistakes: unresolved.map((m) => {
        const snap = m.questionSnapshot && typeof m.questionSnapshot === "object"
          ? m.questionSnapshot
          : ({ prompt: "", options: [], correctIndex: 0 } as QuizQuestion);
        const safeOptions = Array.isArray(snap.options) ? snap.options : [];
        const resolvedIdx = resolveCorrectOptionIndex({ ...snap, options: safeOptions });
        return {
          id: m.id,
          unit: m.unit,
          lesson: m.lesson,
          concept: m.concept,
          sourceType: m.sourceType,
          wrongCount: m.wrongCount,
          lastWrongAt: m.lastWrongAt,
          question: {
            ...snap,
            prompt: typeof snap.prompt === "string" ? snap.prompt : "",
            options: safeOptions,
            correctIndex: resolvedIdx,
            correctAnswer: safeOptions[resolvedIdx] || snap.correctAnswer || "",
          },
          lastWrongOption: m.lastWrongOption,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/mistakes/practice", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const unitFilter = typeof req.body?.unit === "string" ? req.body.unit.trim() : "";
    const lessonFilter = typeof req.body?.lesson === "string" ? req.body.lesson.trim() : "";
    const limitCount = Math.min(30, Math.max(1, Number(req.body?.limit) || 15));

    const conditions = [
      eq(studentMistakesTable.studentId, student.id),
      eq(studentMistakesTable.mastered, false),
    ];
    if (unitFilter) conditions.push(eq(studentMistakesTable.unit, unitFilter));
    if (lessonFilter) conditions.push(eq(studentMistakesTable.lesson, lessonFilter));

    const rows = await db
      .select()
      .from(studentMistakesTable)
      .where(and(...conditions))
      .orderBy(desc(studentMistakesTable.wrongCount), desc(studentMistakesTable.lastWrongAt))
      .limit(limitCount);

    const validRows = rows.filter(
      (r) =>
        r.questionSnapshot &&
        typeof r.questionSnapshot === "object" &&
        typeof r.questionSnapshot.prompt === "string" &&
        Array.isArray(r.questionSnapshot.options) &&
        r.questionSnapshot.options.length >= 2,
    );

    if (validRows.length === 0) {
      res.status(404).json({ error: "لا توجد أخطاء متبقية ضمن هذا النطاق حالياً!" });
      return;
    }

    res.json({
      total: validRows.length,
      items: validRows.map((r) => ({
        mistakeId: r.id,
        unit: r.unit,
        lesson: r.lesson,
        concept: r.concept,
        wrongCount: r.wrongCount,
        question: sanitizeQuestionForStudent(r.questionSnapshot),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/mistakes/practice/submit", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const mistakeIds = rawAnswers
      .map((a: any) => Number(a?.mistakeId))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (mistakeIds.length === 0) {
      res.status(400).json({ error: "لم يتم إرسال إجابات صالحة" });
      return;
    }

    const rows = await db
      .select()
      .from(studentMistakesTable)
      .where(
        and(
          eq(studentMistakesTable.studentId, student.id),
          inArray(studentMistakesTable.id, mistakeIds),
        ),
      );

    const rowById = new Map(rows.map((r) => [r.id, r]));
    const recordingItems: MistakeRecordingItem[] = [];
    const review = [];
    let correctCount = 0;

    for (const ans of rawAnswers) {
      const mId = Number(ans?.mistakeId);
      const row = rowById.get(mId);
      if (!row) continue;

      const selectedRaw = Number(ans?.selectedOption);
      const q = row.questionSnapshot;
      if (!q || !Array.isArray(q.options) || q.options.length === 0) continue;

      const { isCorrect, resolvedCorrectOption, normalizedOption } = gradeQuestionOption(q, selectedRaw);

      if (isCorrect) correctCount++;

      // Only update mistake counters for questions the student actually answered;
      // never penalize or overwrite lastWrongOption for skipped questions.
      if (normalizedOption >= 0) {
        recordingItems.push({
          question: q,
          questionBankId: row.questionBankId,
          selectedOption: normalizedOption,
          isCorrect,
          unit: row.unit,
          lesson: row.lesson,
          concept: row.concept,
        });
      }

      review.push({
        mistakeId: row.id,
        prompt: q.prompt || "",
        options: q.options,
        selectedOption: normalizedOption,
        correctOption: resolvedCorrectOption,
        isCorrect,
        explanation: q.explanation ?? null,
        translation: q.translation ?? null,
      });
    }

    if (recordingItems.length > 0) {
      await recordSubmissionMistakes({
        studentId: student.id,
        stage: rows[0]?.stage ?? null,
        sourceType: "mistakes_practice",
        items: recordingItems,
      });
    }

    const total = review.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    res.json({
      success: true,
      correctCount,
      total,
      score,
      review,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/mistakes/record", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const { question, selectedOption, isCorrect, unit, lesson, questionBankId } = req.body || {};
    if (!question || typeof question.prompt !== "string" || !Array.isArray(question.options)) {
      res.status(400).json({ error: "بيانات السؤال غير مكتملة" });
      return;
    }

    await recordSubmissionMistakes({
      studentId: student.id,
      stage: student.grade || (student as any).educationGrade || "الصف الثاني الثانوي",
      unit: unit || null,
      lesson: lesson || null,
      sourceType: "mistakes_practice",
      items: [{
        question,
        questionBankId: Number(questionBankId) || null,
        selectedOption: Number(selectedOption) ?? -1,
        isCorrect: Boolean(isCorrect),
        unit: unit || null,
        lesson: lesson || null,
      }],
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/learning/mistakes/:id/resolve", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "معرف السؤال غير صالح" });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(studentMistakesTable)
      .set({
        mastered: true,
        masteredAt: now,
        correctStreak: sql`${studentMistakesTable.correctStreak} + 1`,
        updatedAt: now,
      })
      .where(and(eq(studentMistakesTable.id, id), eq(studentMistakesTable.studentId, student.id)))
      .returning({ id: studentMistakesTable.id });

    if (!updated) {
      res.status(404).json({ error: "العنصر غير موجود" });
      return;
    }

    res.json({ success: true, id: updated.id });
  } catch (error) {
    next(error);
  }
});

// ── 5. Student: Daily Challenge & Streak (التحدي اليومي بتوقيت القاهرة) ──────
router.get("/learning/daily-checkin", requireStudent, async (_req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const todayKey = getCairoDayKey();
    const rawStage = student.grade === "أخرى" ? student.otherGradeDetail : student.grade;
    const canonicalStage = normalizeCanonicalStage(rawStage) || rawStage || null;

    let [todayChallenge] = await db
      .select()
      .from(studentDailyChallengesTable)
      .where(
        and(
          eq(studentDailyChallengesTable.studentId, student.id),
          eq(studentDailyChallengesTable.challengeDate, todayKey),
        ),
      )
      .limit(1);

    if (!todayChallenge && canonicalStage) {
      // Pick up to 25 random candidates from student's exact canonical stage, then validate strictly
      const candidatePool = await db
        .select({
          id: questionBankTable.id,
          stage: questionBankTable.stage,
          stages: questionBankTable.stages,
          question: questionBankTable.question,
          unit: questionBankTable.unit,
          lesson: questionBankTable.lesson,
          concept: questionBankTable.concept,
          translation: questionBankTable.translation,
        })
        .from(questionBankTable)
        .where(
          or(
            eq(questionBankTable.stage, canonicalStage),
            sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([canonicalStage])}::jsonb`,
          ),
        )
        .orderBy(sql`random()`)
        .limit(25);

      const safeCandidates = candidatePool
        .filter(
          (row) =>
            isCompleteValidQuestion(row.question) &&
            canStudentAccessContent(student, "عام", row.stage, row.stages),
        )
        .slice(0, 5);

      if (safeCandidates.length > 0) {
        const pickedQuestions: QuizQuestion[] = safeCandidates.map((row) => ({
          ...row.question,
          id: String(row.id),
          correctIndex: resolveCorrectOptionIndex(row.question),
          translation: row.question.translation || row.translation || undefined,
          concept: row.question.concept || row.concept || undefined,
        }));
        const pickedIds = safeCandidates.map((row) => row.id);

        const [inserted] = await db
          .insert(studentDailyChallengesTable)
          .values({
            studentId: student.id,
            challengeDate: todayKey,
            stage: canonicalStage,
            questionIds: pickedIds,
            questions: pickedQuestions,
            totalQuestions: pickedQuestions.length,
            completed: false,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          todayChallenge = inserted;
        } else {
          const [refetched] = await db
            .select()
            .from(studentDailyChallengesTable)
            .where(
              and(
                eq(studentDailyChallengesTable.studentId, student.id),
                eq(studentDailyChallengesTable.challengeDate, todayKey),
              ),
            )
            .limit(1);
          todayChallenge = refetched;
        }
      }
    }

    const completedRows = await db
      .select({
        challengeDate: studentDailyChallengesTable.challengeDate,
        score: studentDailyChallengesTable.score,
        totalQuestions: studentDailyChallengesTable.totalQuestions,
      })
      .from(studentDailyChallengesTable)
      .where(
        and(
          eq(studentDailyChallengesTable.studentId, student.id),
          eq(studentDailyChallengesTable.completed, true),
        ),
      )
      .orderBy(desc(studentDailyChallengesTable.challengeDate));

    const streak = calculateStreak(
      completedRows.map((r) => r.challengeDate),
      todayKey,
    );

    const questionsPayload = todayChallenge
      ? todayChallenge.completed
        ? todayChallenge.questions.map((q) => ({
            ...q,
            correctIndex: resolveCorrectOptionIndex(q),
          }))
        : todayChallenge.questions.map(sanitizeQuestionForStudent)
      : [];

    res.json({
      todayKey,
      streak,
      totalCompletedDays: completedRows.length,
      recentDays: completedRows.slice(0, 7),
      challenge: todayChallenge
        ? {
            id: todayChallenge.id,
            challengeDate: todayChallenge.challengeDate,
            completed: todayChallenge.completed,
            score: todayChallenge.score,
            totalQuestions: todayChallenge.totalQuestions,
            answers: todayChallenge.completed ? todayChallenge.answers : [],
            questions: questionsPayload,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/daily-checkin/submit", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const todayKey = getCairoDayKey();
    const [challenge] = await db
      .select()
      .from(studentDailyChallengesTable)
      .where(
        and(
          eq(studentDailyChallengesTable.studentId, student.id),
          eq(studentDailyChallengesTable.challengeDate, todayKey),
        ),
      )
      .limit(1);

    if (!challenge || challenge.questions.length === 0) {
      res.status(404).json({ error: "لا يوجد تحدٍ يومي متاح لليوم" });
      return;
    }

    if (challenge.completed) {
      res.json({
        success: true,
        alreadyCompleted: true,
        score: challenge.score,
        totalQuestions: challenge.totalQuestions,
        questions: challenge.questions.map((q) => ({
          ...q,
          correctIndex: resolveCorrectOptionIndex(q),
        })),
        answers: challenge.answers,
      });
      return;
    }

    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const resolvedAnswers: number[] = challenge.questions.map((_, idx) => {
      const val = Number(rawAnswers[idx]);
      return Number.isInteger(val) ? val : -1;
    });

    let correctCount = 0;
    const recordingItems: MistakeRecordingItem[] = [];
    const details = challenge.questions.map((q, idx) => {
      const selectedRaw = resolvedAnswers[idx];
      const { isCorrect, resolvedCorrectOption, normalizedOption } = gradeQuestionOption(q, selectedRaw);
      resolvedAnswers[idx] = normalizedOption;
      if (isCorrect) correctCount++;

      const qbIdNum = Number(challenge.questionIds[idx]);
      recordingItems.push({
        question: q,
        questionBankId: Number.isInteger(qbIdNum) && qbIdNum > 0 ? qbIdNum : null,
        selectedOption: normalizedOption,
        isCorrect,
        concept: q.concept ?? null,
      });

      return {
        questionIndex: idx,
        selectedOption: normalizedOption,
        correctOption: resolvedCorrectOption,
        isCorrect,
        explanation: q.explanation ?? null,
      };
    });

    const now = new Date();
    const [updatedChallenge] = await db
      .update(studentDailyChallengesTable)
      .set({
        answers: resolvedAnswers,
        score: correctCount,
        completed: true,
        completedAt: now,
      })
      .where(and(eq(studentDailyChallengesTable.id, challenge.id), eq(studentDailyChallengesTable.completed, false)))
      .returning({ id: studentDailyChallengesTable.id });

    if (!updatedChallenge) {
      res.json({
        success: true,
        alreadyCompleted: true,
        score: challenge.score,
        totalQuestions: challenge.totalQuestions,
        questions: challenge.questions.map((q) => ({
          ...q,
          correctIndex: resolveCorrectOptionIndex(q),
        })),
        answers: challenge.answers,
      });
      return;
    }

    await recordSubmissionMistakes({
      studentId: student.id,
      stage: challenge.stage,
      sourceType: "daily_challenge",
      sourceId: challenge.id,
      items: recordingItems,
    });

    const completedRows = await db
      .select({ challengeDate: studentDailyChallengesTable.challengeDate })
      .from(studentDailyChallengesTable)
      .where(
        and(
          eq(studentDailyChallengesTable.studentId, student.id),
          eq(studentDailyChallengesTable.completed, true),
        ),
      );
    const streak = calculateStreak(
      completedRows.map((r) => r.challengeDate),
      todayKey,
    );

    res.json({
      success: true,
      score: correctCount,
      totalQuestions: challenge.totalQuestions,
      streak,
      details,
      questions: challenge.questions.map((q) => ({
        ...q,
        correctIndex: resolveCorrectOptionIndex(q),
      })),
      answers: resolvedAnswers,
    });
  } catch (error) {
    next(error);
  }
});

// ── 6. Student: Bookmarks (الإشارات المرجعية) ────────────────────────────────
router.get("/learning/kholasa/bookmarks", requireStudent, async (_req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const bookmarks = await db
      .select()
      .from(studentBookmarksTable)
      .where(eq(studentBookmarksTable.studentId, student.id))
      .orderBy(desc(studentBookmarksTable.createdAt));

    res.json({ bookmarks });
  } catch (error) {
    next(error);
  }
});

router.post("/learning/kholasa/bookmarks/toggle", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const itemType = String(req.body?.itemType || "lesson").trim();
    const itemKey = String(req.body?.itemKey || "").trim();
    const materialId = req.body?.materialId ? Number(req.body.materialId) : null;
    const videoId = req.body?.videoId ? Number(req.body.videoId) : null;
    const title = req.body?.title ? String(req.body.title).trim() : null;

    if (!itemKey) {
      res.status(400).json({ error: "itemKey مطلوب" });
      return;
    }

    const [existing] = await db
      .select({ id: studentBookmarksTable.id })
      .from(studentBookmarksTable)
      .where(
        and(
          eq(studentBookmarksTable.studentId, student.id),
          eq(studentBookmarksTable.itemType, itemType),
          eq(studentBookmarksTable.itemKey, itemKey),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(studentBookmarksTable).where(eq(studentBookmarksTable.id, existing.id));
      res.json({ bookmarked: false });
    } else {
      await db.insert(studentBookmarksTable).values({
        studentId: student.id,
        materialId: materialId && Number.isInteger(materialId) ? materialId : null,
        videoId: videoId && Number.isInteger(videoId) ? videoId : null,
        itemType,
        itemKey,
        title,
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    next(error);
  }
});

// ── 7. Admin Management Routes (requireAdmin) ────────────────────────────────
router.get("/admin/learning/kholasa/materials", requireAdmin, async (_req, res, next) => {
  try {
    const [materials, videos, qbCounts, essayCounts, quizzes] = await Promise.all([
      db
        .select()
        .from(lessonKholasaMaterialsTable)
        .orderBy(lessonKholasaMaterialsTable.stage, lessonKholasaMaterialsTable.lessonOrder, lessonKholasaMaterialsTable.id),
      db
        .select({
          id: videosTable.id,
          title: videosTable.title,
          durationText: videosTable.durationText,
          thumbnailUrl: videosTable.thumbnailUrl,
          courseId: videosTable.courseId,
          stage: videosTable.stage,
        })
        .from(videosTable),
      db
        .select({
          stage: questionBankTable.stage,
          unit: questionBankTable.unit,
          lesson: questionBankTable.lesson,
          lessonId: questionBankTable.lessonId,
          qType: sql<string>`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`,
          cnt: sql<number>`count(*)::int`,
        })
        .from(questionBankTable)
        .groupBy(
          questionBankTable.stage,
          questionBankTable.unit,
          questionBankTable.lesson,
          questionBankTable.lessonId,
          sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq')`,
        ),
      db
        .select({
          stage: essayQuestionBankTable.stage,
          unit: essayQuestionBankTable.unit,
          lesson: essayQuestionBankTable.lesson,
          cnt: sql<number>`count(*)::int`,
        })
        .from(essayQuestionBankTable)
        .groupBy(
          essayQuestionBankTable.stage,
          essayQuestionBankTable.unit,
          essayQuestionBankTable.lesson,
        ),
      db
        .select({
          id: quizzesTable.id,
          videoId: quizzesTable.videoId,
          stage: quizzesTable.stage,
          title: quizzesTable.title,
          description: quizzesTable.description,
        })
        .from(quizzesTable),
    ]);

    const videoById = new Map(videos.map((v) => [v.id, v]));
    const essayMap = new Map<string, number>();
    for (const row of essayCounts) {
      const key = `${row.stage || ""}||${row.unit || ""}||${row.lesson || ""}`;
      essayMap.set(key, (essayMap.get(key) || 0) + (Number(row.cnt) || 0));
    }

    const enriched = materials.map((m) => {
      let mcq = 0;
      let trueFalse = 0;
      for (const row of qbCounts) {
        if (row.stage !== m.stage || row.unit !== m.unit) continue;
        const matchesLesson = row.lesson === m.lesson || (m.videoId !== null && row.lessonId === m.videoId);
        if (!matchesLesson) continue;
        if (row.qType === "true_false") trueFalse += Number(row.cnt) || 0;
        else mcq += Number(row.cnt) || 0;
      }
      const essay = essayMap.get(`${m.stage}||${m.unit}||${m.lesson}`) || 0;
      const quizzesCount = quizzes.filter(
        (q) =>
          (m.videoId && q.videoId === m.videoId) ||
          (q.stage === m.stage &&
            (q.title.includes(m.lesson) || (q.description || "").includes(m.lesson))),
      ).length;

      return {
        ...m,
        video: m.videoId ? videoById.get(m.videoId) ?? null : null,
        questionCounts: { mcq, trueFalse, essay },
        quizzesCount,
      };
    });

    res.json({ materials: enriched });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/kholasa/materials/:id/bundle", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }

    const [material] = await db
      .select()
      .from(lessonKholasaMaterialsTable)
      .where(eq(lessonKholasaMaterialsTable.id, id))
      .limit(1);

    if (!material) {
      res.status(404).json({ error: "الدرس غير موجود" });
      return;
    }

    const lessonMatchQb = material.videoId
      ? or(eq(questionBankTable.lesson, material.lesson), eq(questionBankTable.lessonId, material.videoId))
      : eq(questionBankTable.lesson, material.lesson);

    const [qbRows, essayRows, allQuizzes] = await Promise.all([
      db
        .select()
        .from(questionBankTable)
        .where(
          and(
            eq(questionBankTable.stage, material.stage),
            eq(questionBankTable.unit, material.unit),
            lessonMatchQb,
          ),
        )
        .orderBy(desc(questionBankTable.id)),
      db
        .select()
        .from(essayQuestionBankTable)
        .where(
          and(
            eq(essayQuestionBankTable.stage, material.stage),
            eq(essayQuestionBankTable.unit, material.unit),
            eq(essayQuestionBankTable.lesson, material.lesson),
          ),
        )
        .orderBy(desc(essayQuestionBankTable.id)),
      db
        .select({
          id: quizzesTable.id,
          title: quizzesTable.title,
          description: quizzesTable.description,
          scope: quizzesTable.scope,
          videoId: quizzesTable.videoId,
          stage: quizzesTable.stage,
          durationMinutes: quizzesTable.durationMinutes,
          passingScore: quizzesTable.passingScore,
          maxAttempts: quizzesTable.maxAttempts,
          isPublished: quizzesTable.isPublished,
          questions: quizzesTable.questions,
          createdAt: quizzesTable.createdAt,
        })
        .from(quizzesTable)
        .orderBy(desc(quizzesTable.createdAt)),
    ]);

    const mcqQuestions = qbRows.filter((r) => (r.question?.questionType || "mcq") !== "true_false");
    const trueFalseQuestions = qbRows.filter((r) => r.question?.questionType === "true_false");

    const lessonQuizzes = allQuizzes
      .filter(
        (q) =>
          (material.videoId && q.videoId === material.videoId) ||
          (q.stage === material.stage &&
            (q.title.includes(material.lesson) || (q.description || "").includes(material.lesson))),
      )
      .map((q) => ({
        ...q,
        questionsCount: Array.isArray(q.questions) ? q.questions.length : 0,
      }));

    res.json({
      material,
      mcqQuestions,
      trueFalseQuestions,
      essayQuestions: essayRows,
      quizzes: lessonQuizzes,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/kholasa/materials/:id/create-quiz", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "معرف الدرس غير صالح" });
      return;
    }

    const [material] = await db
      .select()
      .from(lessonKholasaMaterialsTable)
      .where(eq(lessonKholasaMaterialsTable.id, id))
      .limit(1);

    if (!material) {
      res.status(404).json({ error: "الدرس غير موجود" });
      return;
    }

    const title = String(req.body?.title || "").trim();
    const validQuestions = validateQuestions(req.body?.questions);
    if (!title || !validQuestions || validQuestions.length === 0) {
      res.status(400).json({ error: "عنوان الاختبار وقائمة الأسئلة الصالحة مطلوبان" });
      return;
    }

    let resolvedCourseId = material.courseId || null;
    let quizCategory = material.stage || "عام";
    const resolvedVideoId = material.videoId || null;
    const requestedScope = req.body?.scope === "lesson" && resolvedVideoId ? "lesson" : "course";

    if (resolvedVideoId) {
      const [video] = await db
        .select({ courseId: videosTable.courseId, category: videosTable.category })
        .from(videosTable)
        .where(eq(videosTable.id, resolvedVideoId))
        .limit(1);
      if (video) {
        resolvedCourseId = resolvedCourseId ?? video.courseId ?? null;
        quizCategory = video.category || quizCategory;
      }
    }

    if (resolvedCourseId) {
      const [course] = await db
        .select({ title: coursesTable.title })
        .from(coursesTable)
        .where(eq(coursesTable.id, resolvedCourseId))
        .limit(1);
      if (course) quizCategory = course.title;
    }

    const finalStages = material.stages?.length ? material.stages : [material.stage];

    const [createdQuiz] = await db
      .insert(quizzesTable)
      .values({
        title,
        courseId: resolvedCourseId,
        videoId: requestedScope === "lesson" ? resolvedVideoId : null,
        scope: requestedScope,
        description: `اختبار على: ${material.lesson} (${material.unit})`,
        category: quizCategory,
        stage: material.stage,
        stages: finalStages,
        durationMinutes: req.body?.durationMinutes ? Number(req.body.durationMinutes) : null,
        passingScore: Math.max(0, Math.min(100, Number(req.body?.passingScore ?? 60))),
        maxAttempts: Math.max(0, Math.min(20, Number(req.body?.maxAttempts ?? 3))),
        shuffleQuestions: req.body?.shuffleQuestions !== false,
        showExplanations: req.body?.showExplanations !== false,
        requiredProgress: requestedScope === "lesson" ? Math.max(0, Math.min(100, Number(req.body?.requiredProgress ?? 80))) : 0,
        questions: validQuestions,
        isPublished: req.body?.isPublished !== false,
      })
      .returning();

    if (requestedScope === "lesson" && resolvedVideoId) {
      await db
        .update(quizzesTable)
        .set({ videoId: null })
        .where(and(eq(quizzesTable.videoId, resolvedVideoId), ne(quizzesTable.id, createdQuiz.id)));
      await db
        .update(videosTable)
        .set({ quizId: createdQuiz.id })
        .where(eq(videosTable.id, resolvedVideoId));
    }

    if (createdQuiz.isPublished) {
      try {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const recipients = approvedStudents.filter((student) =>
          canStudentAccessContent(student, createdQuiz.category, createdQuiz.stage, createdQuiz.stages, createdQuiz.courseId),
        );
        if (recipients.length > 0) {
          await db.insert(studentNotificationsTable).values(
            recipients.map((student) => ({
              studentId: student.id,
              type: "quiz",
              title: "اختبار جديد متاح لك",
              message: `${createdQuiz.title} جاهز الآن داخل منصة الاختبارات.`,
            })),
          );
        }
      } catch {}
    }

    res.status(201).json({ quiz: createdQuiz });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/kholasa/materials", requireAdmin, async (req, res, next) => {
  try {
    const {
      videoId,
      courseId,
      stage,
      stages,
      unit,
      lesson,
      lessonOrder,
      summaryData,
      mindmapTitle,
      mindmapImages,
      structuredSections,
      flashcards,
      audioUrl,
      pdfUrl,
      isPublished,
    } = req.body || {};

    if (!stage || !unit || !lesson) {
      res.status(400).json({ error: "المرحلة والوحدة والدرس حقول مطلوبة" });
      return;
    }

    const [created] = await db
      .insert(lessonKholasaMaterialsTable)
      .values({
        videoId: videoId ? Number(videoId) : null,
        courseId: courseId ? Number(courseId) : null,
        stage: String(stage).trim(),
        stages: Array.isArray(stages) ? stages : [String(stage).trim()],
        unit: String(unit).trim(),
        lesson: String(lesson).trim(),
        lessonOrder: Number(lessonOrder) || 0,
        summaryData: summaryData || {},
        mindmapTitle: mindmapTitle || lesson,
        mindmapImages: Array.isArray(mindmapImages) ? mindmapImages : [],
        structuredSections: Array.isArray(structuredSections) ? structuredSections : [],
        flashcards: Array.isArray(flashcards) ? flashcards : [],
        audioUrl: audioUrl || null,
        pdfUrl: pdfUrl || null,
        sourceKey: `admin:${Date.now()}:${randomBytes(4).toString("hex")}`,
        isPublished: isPublished !== false,
      })
      .returning();

    res.status(201).json({ material: created });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/learning/kholasa/materials/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }

    const body = req.body || {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.videoId !== undefined) patch.videoId = body.videoId ? Number(body.videoId) : null;
    if (body.courseId !== undefined) patch.courseId = body.courseId ? Number(body.courseId) : null;
    if (body.stage !== undefined) patch.stage = String(body.stage).trim();
    if (body.stages !== undefined) patch.stages = Array.isArray(body.stages) ? body.stages : [];
    if (body.unit !== undefined) patch.unit = String(body.unit).trim();
    if (body.lesson !== undefined) patch.lesson = String(body.lesson).trim();
    if (body.lessonOrder !== undefined) patch.lessonOrder = Number(body.lessonOrder) || 0;
    if (body.summaryData !== undefined) patch.summaryData = body.summaryData;
    if (body.mindmapTitle !== undefined) patch.mindmapTitle = body.mindmapTitle;
    if (body.mindmapImages !== undefined) patch.mindmapImages = Array.isArray(body.mindmapImages) ? body.mindmapImages : [];
    if (body.structuredSections !== undefined) patch.structuredSections = Array.isArray(body.structuredSections) ? body.structuredSections : [];
    if (body.flashcards !== undefined) patch.flashcards = Array.isArray(body.flashcards) ? body.flashcards : [];
    if (body.audioUrl !== undefined) patch.audioUrl = body.audioUrl || null;
    if (body.pdfUrl !== undefined) patch.pdfUrl = body.pdfUrl || null;
    if (body.isPublished !== undefined) patch.isPublished = Boolean(body.isPublished);

    const [updated] = await db
      .update(lessonKholasaMaterialsTable)
      .set(patch)
      .where(eq(lessonKholasaMaterialsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "المادة غير موجودة" });
      return;
    }

    res.json({ material: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/learning/kholasa/materials/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }

    const [deleted] = await db
      .delete(lessonKholasaMaterialsTable)
      .where(eq(lessonKholasaMaterialsTable.id, id))
      .returning({ id: lessonKholasaMaterialsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "المادة غير موجودة" });
      return;
    }

    res.json({ success: true, id: deleted.id });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/kholasa/upload-mindmap", requireAdmin, (req, res, next) => {
  mindmapUpload.single("image")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "فشل رفع صورة الخريطة الذهنية" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "لم يتم اختيار ملف صورة" });
      return;
    }
    res.json({
      success: true,
      filename: req.file.filename,
      url: `/api/learning/kholasa/media/${req.file.filename}`,
    });
  });
});

export default router;

