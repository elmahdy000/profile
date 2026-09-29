import { Router, type IRouter } from "express";
import path from "path";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import {
  db,
  questionBankTable,
  coursesTable,
  videosTable,
  quizzesTable,
  quizAttemptsTable,
  studentsTable,
  studentNotificationsTable,
  type QuizQuestion,
} from "@workspace/db";
import { requireAdmin, requireSuperAdmin } from "../../middleware/auth";
import { canStudentAccessContent } from "../../middleware/student-auth";
import { logAudit } from "../../lib/audit";
import {
  parseUnitSortOrder,
  parseLessonSortOrder,
  isCompleteValidQuestion,
  normalizeQuestionPrompt,
  cleanOptionString,
  quizImportUpload,
} from "./shared";
import {
  extractTextFromUpload,
  parseImportedQuestions,
  validateQuestions,
} from "./question-parser";

const router: IRouter = Router();

// ── Question Bank CRUD Endpoints ──

router.get("/admin/learning/question-bank", requireAdmin, async (req, res, next) => {
  try {
    const stage = req.query.stage ? String(req.query.stage).trim() : undefined;
    const unit = req.query.unit ? String(req.query.unit).trim() : undefined;
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty).trim() : undefined;

    let query = db.select().from(questionBankTable);
    const conditions = [];
    if (stage && stage !== "all") conditions.push(eq(questionBankTable.stage, stage));
    if (unit && unit !== "all") conditions.push(eq(questionBankTable.unit, unit));
    if (lesson && lesson !== "all") conditions.push(eq(questionBankTable.lesson, lesson));
    if (difficulty && difficulty !== "all") conditions.push(eq(questionBankTable.difficulty, difficulty));

    const questions = await (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(questionBankTable.createdAt));
    res.json(questions);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/test-bank/tree - Hierarchical structure Stage -> Unit -> Lesson with stats
router.get("/admin/learning/test-bank/tree", requireAdmin, async (_req, res, next) => {
  try {
    const all = await db
      .select({
        id: questionBankTable.id,
        stage: questionBankTable.stage,
        unit: questionBankTable.unit,
        lesson: questionBankTable.lesson,
        difficulty: questionBankTable.difficulty,
        points: questionBankTable.points,
        courseId: questionBankTable.courseId,
        lessonId: questionBankTable.lessonId,
      })
      .from(questionBankTable);

    const courses = await db
      .select({ id: coursesTable.id, title: coursesTable.title, stages: coursesTable.stages })
      .from(coursesTable);

    const videos = await db
      .select({ id: videosTable.id, title: videosTable.title, courseId: videosTable.courseId, stage: videosTable.stage, quizId: videosTable.quizId })
      .from(videosTable);

    // Collect ALL unique stages in the system
    const systemStagesSet = new Set<string>();
    for (const c of courses) {
      if (Array.isArray(c.stages)) {
        for (const s of c.stages) if (s && s.trim()) systemStagesSet.add(s.trim());
      }
    }
    for (const v of videos) {
      if (v.stage && v.stage.trim()) systemStagesSet.add(v.stage.trim());
    }
    for (const row of all) {
      if (row.stage && row.stage.trim()) systemStagesSet.add(row.stage.trim());
    }

    // Default canonical stages if empty
    if (systemStagesSet.size === 0) {
      systemStagesSet.add("البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي");
      systemStagesSet.add("البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي");
      systemStagesSet.add("المرحلة الجامعية · الفرقة الأولى / إعدادي · كلية حاسبات ومعلومات");
      systemStagesSet.add("عام");
    }

    const stagesMap: Record<string, {
      stage: string;
      totalQuestions: number;
      units: Record<string, {
        unit: string;
        totalQuestions: number;
        difficulty: { easy: number; medium: number; hard: number };
        lessons: Record<string, {
          lesson: string;
          lessonId: number | null;
          courseId: number | null;
          totalQuestions: number;
          difficulty: { easy: number; medium: number; hard: number };
        }>;
      }>;
    }> = {};

    // Initialize all system stages so they appear in tree even if 0 questions
    for (const st of systemStagesSet) {
      stagesMap[st] = { stage: st, totalQuestions: 0, units: {} };
    }

    for (const row of all) {
      const stage = String(row.stage || "عام").trim();
      const unit = String(row.unit || "الوحدة العامة").trim();
      const lesson = String(row.lesson || "الدرس العام").trim();
      const diff = (row.difficulty === "easy" || row.difficulty === "hard") ? row.difficulty : "medium";

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, units: {} };
      }
      stagesMap[stage].totalQuestions++;

      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
          lessons: {},
        };
      }
      stagesMap[stage].units[unit].totalQuestions++;
      stagesMap[stage].units[unit].difficulty[diff]++;

      if (!stagesMap[stage].units[unit].lessons[lesson]) {
        stagesMap[stage].units[unit].lessons[lesson] = {
          lesson,
          lessonId: row.lessonId || null,
          courseId: row.courseId || null,
          totalQuestions: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
        };
      } else {
        if (!stagesMap[stage].units[unit].lessons[lesson].lessonId && row.lessonId) {
          stagesMap[stage].units[unit].lessons[lesson].lessonId = row.lessonId;
        }
        if (!stagesMap[stage].units[unit].lessons[lesson].courseId && row.courseId) {
          stagesMap[stage].units[unit].lessons[lesson].courseId = row.courseId;
        }
      }
      stagesMap[stage].units[unit].lessons[lesson].totalQuestions++;
      stagesMap[stage].units[unit].lessons[lesson].difficulty[diff]++;
    }

    const tree = Object.values(stagesMap).map((st) => ({
      stage: st.stage,
      totalQuestions: st.totalQuestions,
      units: Object.values(st.units)
        .sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
        .map((u) => ({
          unit: u.unit,
          totalQuestions: u.totalQuestions,
          difficulty: u.difficulty,
          lessons: Object.values(u.lessons)
            .sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson)),
        })),
    }));

    res.json({
      tree,
      totalQuestions: all.length,
      courses,
      videos,
      stages: Array.from(systemStagesSet),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/test-bank/questions - Filtered list of questions with search
router.get("/admin/learning/test-bank/questions", requireAdmin, async (req, res, next) => {
  try {
    const stage = req.query.stage ? String(req.query.stage).trim() : undefined;
    const unit = req.query.unit ? String(req.query.unit).trim() : undefined;
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty).trim() : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;

    let query = db.select().from(questionBankTable);
    const conditions = [];
    if (stage && stage !== "all") conditions.push(eq(questionBankTable.stage, stage));
    if (unit && unit !== "all") conditions.push(eq(questionBankTable.unit, unit));
    if (lesson && lesson !== "all") conditions.push(eq(questionBankTable.lesson, lesson));
    if (difficulty && difficulty !== "all") conditions.push(eq(questionBankTable.difficulty, difficulty));

    let rows = await (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(questionBankTable.id));

    if (search) {
      rows = rows.filter((r) => {
        const prompt = (r.question?.prompt || "").toLowerCase();
        const opts = (r.question?.options || []).join(" ").toLowerCase();
        return prompt.includes(search) || opts.includes(search);
      });
    }

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/test-bank/upload & /batch-import - Upload file or raw text to create questions for a specific Lesson
router.post(["/admin/learning/test-bank/upload", "/admin/learning/test-bank/batch-import"], requireAdmin, (req, res, next) => {
  quizImportUpload(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({ error: uploadError.message || "تعذر رفع الملف" });
      return;
    }
    try {
      let stage = String(req.body.stage || "").trim();
      let unit = String(req.body.unit || "").trim();
      let lesson = String(req.body.lesson || "").trim();
      let courseId = Number(req.body.courseId) || null;
      const lessonId = Number(req.body.lessonId) || null;
      const defaultDifficulty = String(req.body.difficulty || "medium").trim();
      const defaultPoints = Number(req.body.points) || 1;
      const previewOnly = req.body.previewOnly === "true" || req.body.previewOnly === true;

      // Smart resolution if lessonId (videoId) was passed
      if (lessonId) {
        const [video] = await db.select().from(videosTable).where(eq(videosTable.id, lessonId)).limit(1);
        if (video) {
          lesson = lesson || video.title;
          courseId = courseId || video.courseId;
          stage = stage || video.stage || "";
          if (!stage && video.courseId) {
            const [c] = await db.select().from(coursesTable).where(eq(coursesTable.id, video.courseId)).limit(1);
            if (c?.stages?.length) stage = c.stages[0];
          }
        }
      }

      if (!stage) stage = "عام";
      if (!unit) unit = "الوحدة العامة";
      if (!lesson) lesson = "شامل الوحدة";

      let questionsToProcess: QuizQuestion[] = [];
      let warnings: string[] = [];
      let extractedText = "";

      if (req.file) {
        const extension = path.extname(req.file.originalname).toLowerCase();
        if (extension === ".json") {
          try {
            const parsedJson = JSON.parse(req.file.buffer.toString("utf8"));
            if (Array.isArray(parsedJson)) {
              questionsToProcess = parsedJson;
            } else if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
              questionsToProcess = parsedJson.questions;
            }
          } catch {
            res.status(400).json({ error: "ملف JSON غير صالح" });
            return;
          }
        } else {
          extractedText = await extractTextFromUpload(req.file.buffer, req.file.originalname);
        }

        if (!questionsToProcess.length) {
          if (!extractedText.trim()) {
            if (previewOnly) {
              res.json({
                preview: true,
                totalDetected: 0,
                questions: [],
                extractedText: "",
                warnings: ["الملف المرفوع فارغ أو لم نتمكن من استخراج نص قابل للقراءة منه."],
              });
              return;
            }
            res.status(422).json({ error: "لم نتمكن من استخراج نص صالح من الملف" });
            return;
          }
          const parsed = parseImportedQuestions(extractedText);
          questionsToProcess = parsed.questions;
          warnings = parsed.warnings;
        }
      } else if (req.body.rawQuestions) {
        try {
          const raw = typeof req.body.rawQuestions === "string" ? JSON.parse(req.body.rawQuestions) : req.body.rawQuestions;
          if (Array.isArray(raw)) questionsToProcess = raw;
        } catch {
          res.status(400).json({ error: "بيانات الأسئلة غير صالحة" });
          return;
        }
      } else if (req.body.questions && Array.isArray(req.body.questions)) {
        questionsToProcess = req.body.questions;
      } else if (req.body.text) {
        extractedText = String(req.body.text);
        const parsed = parseImportedQuestions(extractedText);
        questionsToProcess = parsed.questions;
        warnings = parsed.warnings;
      } else {
        res.status(400).json({ error: "يرجى اختيار ملف أو إرسال نص الأسئلة" });
        return;
      }

      const validQuestions = questionsToProcess.filter(
        (q) => q && typeof q.prompt === "string" && q.prompt.trim() && Array.isArray(q.options) && q.options.length >= 2
      );

      if (validQuestions.length === 0) {
        if (previewOnly) {
          res.json({
            preview: true,
            totalDetected: 0,
            questions: [],
            extractedText: extractedText.trim(),
            warnings: [
              "تم استخراج النص من الملف بنجاح، لكن لم يتم التعرف على نمط الأسئلة والخيارات آلياً.",
              "تم وضع النص المستخرج في محرر 'نص مباشر' بالأسفل لتتمكن من مراجعته وتعديل تنسيقه بسهولة.",
            ],
          });
          return;
        }
        res.status(422).json({
          error: "لم يتم التعرف على أي أسئلة صالحة. تأكد من وجود نص السؤال والخيارات والإجابة الصحيحة.",
          extractedTextSnippet: extractedText.slice(0, 300),
        });
        return;
      }

      if (previewOnly) {
        res.json({
          preview: true,
          totalDetected: validQuestions.length,
          warnings,
          questions: validQuestions,
          extractedText: extractedText.trim(),
        });
        return;
      }

      // 1. Deduplicate within this uploaded batch
      const seenPromptsInBatch = new Set<string>();
      const batchUniqueQuestions: QuizQuestion[] = [];
      for (const q of validQuestions) {
        const key = String(q.prompt).trim().toLowerCase();
        if (!seenPromptsInBatch.has(key)) {
          seenPromptsInBatch.add(key);
          batchUniqueQuestions.push(q);
        }
      }

      // 2. Deduplicate against existing questions in DB for this stage/unit/lesson
      const existingRows = await db
        .select({
          id: questionBankTable.id,
          prompt: sql<string>`${questionBankTable.question}->>'prompt'`,
        })
        .from(questionBankTable)
        .where(
          and(
            eq(questionBankTable.stage, stage),
            eq(questionBankTable.unit, unit),
            eq(questionBankTable.lesson, lesson)
          )
        );

      const existingPrompts = new Set(existingRows.map((r) => (r.prompt || "").trim().toLowerCase()));
      const nonDuplicates = batchUniqueQuestions.filter(
        (q) => !existingPrompts.has(String(q.prompt).trim().toLowerCase())
      );

      let insertedCount = 0;
      if (nonDuplicates.length > 0) {
        // Insert non-duplicate questions into question bank
        const inserted = await db
          .insert(questionBankTable)
          .values(
            nonDuplicates.map((q) => ({
              courseId,
              category: "عام",
              stage,
              stages: [stage],
              unit,
              lesson,
              lessonId: lessonId || null,
              difficulty: (q as any).difficulty || defaultDifficulty,
              points: q.points || defaultPoints,
              tags: [stage, unit, lesson].filter(Boolean),
              question: {
                prompt: String(q.prompt).trim(),
                options: q.options.map((o: unknown) => String(o).trim()),
                correctIndex: Math.max(0, Math.min(q.options.length - 1, Number(q.correctIndex) || 0)),
                explanation: String(q.explanation || "").trim() || undefined,
                imageUrl: String(q.imageUrl || "").trim() || undefined,
                points: q.points || defaultPoints,
              },
            }))
          )
          .returning();
        insertedCount = inserted.length;
      }

      // Optional: Direct Quiz Creation on the fly
      let createdQuiz: any = null;
      if (req.body.createQuiz === true || req.body.createQuiz === "true") {
        const quizTitle = String(req.body.quizTitle || "").trim() || (lesson === "شامل الوحدة" ? `اختبار شامل على ${unit}` : `اختبار على ${lesson}`);
        const durationMinutes = Number(req.body.durationMinutes) || 30;
        const passingScore = Number(req.body.passingScore) || 60;
        const maxAttempts = Number(req.body.maxAttempts) || 3;
        const isPublished = req.body.isPublished !== false && req.body.isPublished !== "false";
        
        let quizCategory = stage || "عام";
        let resolvedCourseId = courseId;
        let resolvedVideoId = lessonId;
        
        if (resolvedVideoId) {
          const [video] = await db.select().from(videosTable).where(eq(videosTable.id, resolvedVideoId)).limit(1);
          if (video) {
            resolvedCourseId = video.courseId ?? resolvedCourseId;
            quizCategory = video.category || quizCategory;
          }
        }
        
        let finalStages = [stage];
        if (resolvedCourseId) {
          const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, resolvedCourseId)).limit(1);
          if (course) {
            quizCategory = course.title;
            if (Array.isArray(course.stages) && course.stages.length) {
              finalStages = Array.from(new Set([...finalStages, ...course.stages]));
            }
          }
        }

        const isLessonScope = Boolean(resolvedVideoId);
        const quizQuestionsFormatted = validQuestions.map((q) => {
          const cIdx = Math.max(0, Math.min(q.options.length - 1, Number(q.correctIndex) || 0));
          return {
            prompt: String(q.prompt).trim(),
            options: q.options.map((o: unknown) => String(o).trim()),
            correctIndex: cIdx,
            correctAnswer: q.options[cIdx]?.trim() || "",
            explanation: String(q.explanation || "").trim() || undefined,
            imageUrl: String(q.imageUrl || "").trim() || undefined,
          };
        });

        const [newQuiz] = await db
          .insert(quizzesTable)
          .values({
            title: quizTitle,
            courseId: resolvedCourseId,
            videoId: isLessonScope ? resolvedVideoId : null,
            scope: isLessonScope ? "lesson" : "course",
            description: `اختبار تم إنشاؤه ورفعه مباشرة (${stage} - ${unit} - ${lesson})`,
            category: quizCategory,
            stage: finalStages[0] || stage,
            stages: finalStages,
            durationMinutes,
            passingScore,
            maxAttempts,
            shuffleQuestions: true,
            showExplanations: true,
            requiredProgress: isLessonScope ? 80 : 0,
            questions: quizQuestionsFormatted,
            isPublished,
          })
          .returning();

        if (isLessonScope && resolvedVideoId && newQuiz) {
          await db
            .update(quizzesTable)
            .set({ videoId: null })
            .where(and(eq(quizzesTable.videoId, resolvedVideoId), ne(quizzesTable.id, newQuiz.id)));
          await db
            .update(videosTable)
            .set({ quizId: newQuiz.id })
            .where(eq(videosTable.id, resolvedVideoId));
        }

        createdQuiz = newQuiz;
      }

      const skippedDuplicates = validQuestions.length - nonDuplicates.length;
      if (skippedDuplicates > 0 && nonDuplicates.length === 0 && !createdQuiz) {
        warnings.push("جميع الأسئلة كانت موجودة بالفعل في بنك هذا الدرس (تم تخطي التكرار).");
      }

      res.status(201).json({
        success: true,
        count: insertedCount,
        skippedDuplicates,
        warnings,
        stage,
        unit,
        lesson,
        quiz: createdQuiz,
      });
      return;
    } catch (error) {
      next(error);
    }
  });
});

// POST /api/admin/learning/test-bank/generate-exam - Generate full quiz directly from Test Bank
router.post("/admin/learning/test-bank/generate-exam", requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      stage,
      stages,
      unit,
      lesson,
      lessons,
      courseId,
      videoId,
      scope,
      count,
      difficultyDistribution,
      durationMinutes,
      passingScore,
      maxAttempts,
      shuffleQuestions,
      showExplanations,
      requiredProgress,
      isPublished,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: "عنوان الاختبار مطلوب" });
      return;
    }

    const cleanedLessons: string[] = Array.isArray(lessons)
      ? lessons
          .map((l: any) => (typeof l === "string" ? l.trim() : String(l?.lesson || "").trim()))
          .filter((l): l is string => Boolean(l && l.length > 0))
      : [];
    const isMultiLesson = cleanedLessons.length > 0;

    let resolvedVideoId = isMultiLesson ? null : (Number(videoId || req.body.lessonId) || null);
    let resolvedCourseId = Number(courseId) || null;

    const qCount = Math.max(1, Math.min(100, Number(count || 10)));
    let query = db.select().from(questionBankTable);
    const conditions = [];

    if (stage && stage !== "all") {
      conditions.push(
        or(
          eq(questionBankTable.stage, stage),
          sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([stage])}::jsonb`
        )
      );
    }
    if (unit && unit !== "all") {
      conditions.push(eq(questionBankTable.unit, unit));
    }
    if (isMultiLesson) {
      conditions.push(inArray(questionBankTable.lesson, cleanedLessons));
    } else if (lesson && lesson !== "all") {
      const cleanLes = lesson.trim();
      if (resolvedVideoId) {
        conditions.push(
          or(
            eq(questionBankTable.lessonId, resolvedVideoId),
            eq(questionBankTable.lesson, cleanLes),
            ilike(questionBankTable.lesson, `%${cleanLes}%`)
          )
        );
      } else {
        conditions.push(
          or(
            eq(questionBankTable.lesson, cleanLes),
            ilike(questionBankTable.lesson, `%${cleanLes}%`)
          )
        );
      }
    } else if (resolvedVideoId) {
      conditions.push(eq(questionBankTable.lessonId, resolvedVideoId));
    }

    const availableQuestions = await (conditions.length ? query.where(and(...conditions)) : query);

    // 1. Guarantee zero duplicate prompts or IDs right from the question pool
    const seenBankPrompts = new Set<string>();
    const seenBankIds = new Set<number>();
    const uniqueAvailable: typeof availableQuestions = [];

    for (const q of availableQuestions) {
      if (!isCompleteValidQuestion(q.question)) continue;
      if (seenBankIds.has(q.id)) continue;
      seenBankIds.add(q.id);

      const pKey = normalizeQuestionPrompt(q.question?.prompt);
      if (pKey) {
        if (seenBankPrompts.has(pKey)) continue;
        seenBankPrompts.add(pKey);
      }
      uniqueAvailable.push({
        ...q,
        question: {
          ...q.question,
          prompt: q.question.prompt.replace(/\r?\n\s*[A-Da-dأابجده]\)\s*$/, "").trim(),
          options: (q.question.options || []).map(cleanOptionString),
        },
      });
    }

    if (uniqueAvailable.length === 0) {
      res.status(404).json({ error: "لا توجد أسئلة متوفرة في بنك الأسئلة لهذا النطاق (المرحلة/الوحدة/الدروس المختارة)" });
      return;
    }

    let selectedRows: typeof uniqueAvailable = [];
    let targetCount = Math.min(qCount, uniqueAvailable.length);

    const pickedSet = new Set<number>();
    const pickedPrompts = new Set<string>();

    const canPick = (item: (typeof uniqueAvailable)[0]) => {
      if (pickedSet.has(item.id)) return false;
      const pKey = normalizeQuestionPrompt(item.question?.prompt);
      if (pKey && pickedPrompts.has(pKey)) return false;
      return true;
    };

    const pickQuestion = (item: (typeof uniqueAvailable)[0]) => {
      pickedSet.add(item.id);
      const pKey = normalizeQuestionPrompt(item.question?.prompt);
      if (pKey) pickedPrompts.add(pKey);
      selectedRows.push(item);
    };

    if (isMultiLesson) {
      // Fair balanced sampling across selected lessons to avoid student confusion or bias
      const byLesson = new Map<string, typeof uniqueAvailable>();
      for (const q of uniqueAvailable) {
        const lKey = q.lesson || "عام";
        if (!byLesson.has(lKey)) byLesson.set(lKey, []);
        byLesson.get(lKey)!.push(q);
      }

      // Shuffle questions within each lesson pool
      for (const [key, list] of byLesson.entries()) {
        byLesson.set(key, [...list].sort(() => Math.random() - 0.5));
      }

      const activeLessons = cleanedLessons.filter((l) => byLesson.has(l) && byLesson.get(l)!.length > 0);
      const effectiveLessons = activeLessons.length > 0 ? activeLessons : Array.from(byLesson.keys());

      const quotaPerLesson = Math.max(1, Math.ceil(targetCount / effectiveLessons.length));

      for (const lName of effectiveLessons) {
        const list = byLesson.get(lName) || [];
        let pickedFromLesson = 0;
        for (const item of list) {
          if (selectedRows.length < targetCount && pickedFromLesson < quotaPerLesson && canPick(item)) {
            pickQuestion(item);
            pickedFromLesson++;
          }
        }
      }

      // Fill remainder if lessons have fewer questions than quota
      if (selectedRows.length < targetCount) {
        const remaining = uniqueAvailable
          .filter(canPick)
          .sort(() => Math.random() - 0.5);
        for (const item of remaining) {
          if (selectedRows.length < targetCount) {
            pickQuestion(item);
          }
        }
      }

      // Shuffle final questions so lessons are naturally interspersed
      if (shuffleQuestions !== false) {
        selectedRows.sort(() => Math.random() - 0.5);
      }
    } else if (difficultyDistribution && typeof difficultyDistribution === "object") {
      const easyCount = Math.max(0, Number(difficultyDistribution.easy) || 0);
      const medCount = Math.max(0, Number(difficultyDistribution.medium) || 0);
      const hardCount = Math.max(0, Number(difficultyDistribution.hard) || 0);
      const sum = easyCount + medCount + hardCount;
      if (sum > 0) {
        targetCount = Math.min(sum, uniqueAvailable.length);
      }

      const easyPool = uniqueAvailable.filter((q) => q.difficulty === "easy").sort(() => Math.random() - 0.5);
      const medPool = uniqueAvailable.filter((q) => q.difficulty === "medium").sort(() => Math.random() - 0.5);
      const hardPool = uniqueAvailable.filter((q) => q.difficulty === "hard").sort(() => Math.random() - 0.5);

      for (const item of easyPool) {
        if (selectedRows.filter((r) => r.difficulty === "easy").length >= easyCount) break;
        if (canPick(item)) pickQuestion(item);
      }
      for (const item of medPool) {
        if (selectedRows.filter((r) => r.difficulty === "medium").length >= medCount) break;
        if (canPick(item)) pickQuestion(item);
      }
      for (const item of hardPool) {
        if (selectedRows.filter((r) => r.difficulty === "hard").length >= hardCount) break;
        if (canPick(item)) pickQuestion(item);
      }

      if (selectedRows.length < targetCount) {
        const remaining = uniqueAvailable.filter(canPick).sort(() => Math.random() - 0.5);
        for (const item of remaining) {
          if (selectedRows.length < targetCount) {
            pickQuestion(item);
          }
        }
      }
    } else {
      const shuffled = [...uniqueAvailable].sort(() => Math.random() - 0.5);
      for (const item of shuffled) {
        if (selectedRows.length < targetCount && canPick(item)) {
          pickQuestion(item);
        }
      }
    }

    if (selectedRows.length === 0) {
      res.status(404).json({ error: "تعذر اختيار أسئلة للاختبار" });
      return;
    }

    const finalQuestions: QuizQuestion[] = [];
    const finalPrompts = new Set<string>();
    for (const r of selectedRows) {
      const pKey = normalizeQuestionPrompt(r.question.prompt);
      if (pKey && finalPrompts.has(pKey)) continue;
      if (pKey) finalPrompts.add(pKey);

      // ✅ Validation: تأكد من صحة correctIndex
      const q = r.question;
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        console.error(`❌ سؤال معطوب تم تخطيه - correctIndex=${q.correctIndex}, options.length=${q.options.length}, prompt="${q.prompt?.substring(0, 50)}..."`);
        continue;
      }

      const correctAnswer = q.options[q.correctIndex]?.trim();
      if (!correctAnswer) {
        console.error(`❌ سؤال معطوب تم تخطيه - الإجابة الصحيحة فاضية, prompt="${q.prompt?.substring(0, 50)}..."`);
        continue;
      }

      finalQuestions.push({
        prompt: r.question.prompt,
        options: r.question.options,
        correctIndex: r.question.correctIndex,
        correctAnswer: correctAnswer,  // ✅ حفظ النص الفعلي للإجابة الصحيحة
        explanation: r.question.explanation,
        imageUrl: r.question.imageUrl,
      });
    }

    let quizCategory = stage || "عام";
    let isLessonScope = !isMultiLesson && scope === "lesson" && Boolean(resolvedVideoId);

    if (resolvedVideoId) {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, resolvedVideoId)).limit(1);
      if (video) {
        resolvedCourseId = video.courseId ?? resolvedCourseId;
        quizCategory = video.category || quizCategory;
        isLessonScope = true;
      }
    }

    let finalStages = Array.isArray(stages) && stages.length ? stages : (stage && stage !== "all" ? [stage] : []);

    if (resolvedCourseId) {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, resolvedCourseId)).limit(1);
      if (course) {
        quizCategory = course.title;
        if (Array.isArray(course.stages) && course.stages.length) {
          finalStages = Array.from(new Set([...finalStages, ...course.stages]));
        }
      }
    }

    if (finalStages.length === 0) {
      finalStages = ["عام"];
    }

    const examDescription = isMultiLesson
      ? `اختبار مراجعة شامل على الدروس: ${cleanedLessons.join("، ")} (${stage || ""})`
      : `اختبار تم توليده آلياً من بنك الأسئلة (${stage || ""} - ${unit || ""} - ${lesson || ""})`.trim();

    const [newQuiz] = await db
      .insert(quizzesTable)
      .values({
        title: title.trim(),
        courseId: resolvedCourseId,
        videoId: isLessonScope ? resolvedVideoId : null,
        scope: isLessonScope ? "lesson" : "course",
        description: examDescription,
        category: quizCategory,
        stage: finalStages[0] || null,
        stages: finalStages,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        passingScore: Math.max(0, Math.min(100, Number(passingScore ?? 60))),
        maxAttempts: Math.max(0, Math.min(20, Number(maxAttempts ?? 3))),
        shuffleQuestions: shuffleQuestions !== false,
        showExplanations: showExplanations !== false,
        requiredProgress: isLessonScope ? Math.max(0, Math.min(100, Number(requiredProgress ?? 80))) : 0,
        questions: finalQuestions,
        isPublished: isPublished !== false,
      })
      .returning();

    // CRITICAL: Link newly generated quiz directly to the video lesson and unlink previous quiz
    if (isLessonScope && resolvedVideoId) {
      await db
        .update(quizzesTable)
        .set({ videoId: null })
        .where(and(eq(quizzesTable.videoId, resolvedVideoId), ne(quizzesTable.id, newQuiz.id)));
      await db
        .update(videosTable)
        .set({ quizId: newQuiz.id })
        .where(eq(videosTable.id, resolvedVideoId));
    }

    // Send notifications to enrolled/matching approved students
    if (newQuiz.isPublished) {
      try {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const recipients = approvedStudents.filter((student) =>
          canStudentAccessContent(student, newQuiz.category, newQuiz.stage, newQuiz.stages, newQuiz.courseId)
        );
        if (recipients.length > 0) {
          await db.insert(studentNotificationsTable).values(
            recipients.map((student) => ({
              studentId: student.id,
              type: "quiz",
              title: "اختبار جديد متاح لك",
              message: `${newQuiz.title} جاهز الآن داخل منصة الاختبارات.`,
            }))
          );
        }
      } catch (notifErr) {
        console.error("[GENERATE_EXAM_NOTIFICATION_ERROR]", notifErr);
      }
    }

    res.status(201).json({
      ...newQuiz,
      requestedCount: targetCount,
      actualCount: finalQuestions.length,
      note: finalQuestions.length < targetCount
        ? `تم توليد الاختبار بـ ${finalQuestions.length} سؤالاً نظراً لاكتمال الأسئلة المتاحة بالبنك لهذا النطاق.`
        : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// Single question insert
router.post("/admin/learning/question-bank", requireAdmin, async (req, res, next) => {
  try {
    const { prompt, options, correctIndex, explanation, imageUrl, courseId, category, stage, stages, unit, lesson, lessonId, difficulty, points, subject, tags } = req.body;
    if (!prompt || !Array.isArray(options) || options.length < 2 || typeof correctIndex !== "number") {
      res.status(400).json({ error: "بيانات السؤال غير كاملة" });
      return;
    }
    const [entry] = await db
      .insert(questionBankTable)
      .values({
        courseId: Number(courseId) || null,
        category: String(category || "عام"),
        stage: String(stage || "عام"),
        stages: Array.isArray(stages) ? stages : (stage ? [stage] : []),
        unit: String(unit || "الوحدة العامة"),
        lesson: String(lesson || "الدرس العام"),
        lessonId: Number(lessonId) || null,
        difficulty: String(difficulty || "medium"),
        points: Number(points) || 1,
        subject: String(subject || ""),
        tags: Array.isArray(tags) ? tags : [],
        question: {
          prompt: String(prompt).trim(),
          options: options.map((o: unknown) => String(o).trim()),
          correctIndex: Math.max(0, Math.min(options.length - 1, correctIndex)),
          explanation: String(explanation || "").trim() || undefined,
          imageUrl: String(imageUrl || "").trim() || undefined,
          points: Number(points) || 1,
        },
      })
      .returning();
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/learning/question-bank/:id - Update question in Test Bank
router.put("/admin/learning/question-bank/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { prompt, options, correctIndex, explanation, imageUrl, unit, lesson, difficulty, points } = req.body;

    const [existing] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "السؤال غير موجود" });
      return;
    }

    const updatedQuestion = {
      prompt: prompt ? String(prompt).trim() : existing.question.prompt,
      options: Array.isArray(options) ? options.map((o: any) => String(o).trim()) : existing.question.options,
      correctIndex: typeof correctIndex === "number" ? correctIndex : existing.question.correctIndex,
      explanation: explanation !== undefined ? (String(explanation).trim() || undefined) : existing.question.explanation,
      imageUrl: imageUrl !== undefined ? (String(imageUrl).trim() || undefined) : existing.question.imageUrl,
      points: points !== undefined ? Number(points) : (existing.points || 1),
    };

    const [updated] = await db
      .update(questionBankTable)
      .set({
        unit: unit !== undefined ? String(unit).trim() : existing.unit,
        lesson: lesson !== undefined ? String(lesson).trim() : existing.lesson,
        difficulty: difficulty || existing.difficulty,
        points: points !== undefined ? Number(points) : existing.points,
        question: updatedQuestion,
        updatedAt: new Date(),
      })
      .where(eq(questionBankTable.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/learning/test-bank/clear-lesson - Delete all questions of a specific lesson
router.delete("/admin/learning/test-bank/clear-lesson", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, lesson } = req.body;
    if (!stage || !unit) {
      res.status(400).json({ error: "المرحلة والوحدة مطلوبة للحذف" });
      return;
    }

    const conditions = [
      eq(questionBankTable.stage, stage),
      eq(questionBankTable.unit, unit),
    ];
    if (lesson && lesson !== "all") {
      conditions.push(eq(questionBankTable.lesson, lesson));
    }

    const deleted = await db
      .delete(questionBankTable)
      .where(and(...conditions))
      .returning();

    res.json({ success: true, count: deleted.length });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/question-bank/batch-import", requireAdmin, async (req, res, next) => {
  try {
    const { questions, courseId, category, stage, stages, unit, lesson, lessonId, difficulty, points } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "قائمة الأسئلة فارغة" });
      return;
    }

    const validQuestions = questions.filter(
      (q) => q && typeof q.prompt === "string" && q.prompt.trim() && Array.isArray(q.options) && q.options.length >= 2
    );

    if (validQuestions.length === 0) {
      res.status(400).json({ error: "لا توجد أسئلة صالحة للحفظ" });
      return;
    }

    let targetStage = String(stage || "").trim();
    let targetUnit = String(unit || "").trim();
    let targetLesson = String(lesson || "").trim();
    let resolvedCourseId = Number(courseId) || null;
    const resolvedLessonId = Number(lessonId) || null;

    if (resolvedLessonId) {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, resolvedLessonId)).limit(1);
      if (video) {
        targetLesson = targetLesson || video.title;
        resolvedCourseId = resolvedCourseId || video.courseId;
        targetStage = targetStage || video.stage || "";
        if (!targetStage && video.courseId) {
          const [c] = await db.select().from(coursesTable).where(eq(coursesTable.id, video.courseId)).limit(1);
          if (c?.stages?.length) targetStage = c.stages[0];
        }
      }
    }

    if (!targetStage) targetStage = "عام";
    if (!targetUnit) targetUnit = "الوحدة العامة";
    if (!targetLesson) targetLesson = "الدرس العام";

    // Deduplicate in batch
    const seenPromptsInBatch = new Set<string>();
    const batchUniqueQuestions: any[] = [];
    for (const q of validQuestions) {
      const key = String(q.prompt).trim().toLowerCase();
      if (!seenPromptsInBatch.has(key)) {
        seenPromptsInBatch.add(key);
        batchUniqueQuestions.push(q);
      }
    }

    // Deduplicate against existing DB rows
    const existingRows = await db
      .select({
        id: questionBankTable.id,
        prompt: sql<string>`${questionBankTable.question}->>'prompt'`,
      })
      .from(questionBankTable)
      .where(
        and(
          eq(questionBankTable.stage, targetStage),
          eq(questionBankTable.unit, targetUnit),
          eq(questionBankTable.lesson, targetLesson)
        )
      );

    const existingPrompts = new Set(existingRows.map((r) => (r.prompt || "").trim().toLowerCase()));
    const nonDuplicates = batchUniqueQuestions.filter(
      (q) => !existingPrompts.has(String(q.prompt).trim().toLowerCase())
    );

    if (nonDuplicates.length === 0) {
      res.status(200).json({
        count: 0,
        skippedDuplicates: validQuestions.length,
        message: "جميع هذه الأسئلة موجودة بالفعل في بنك هذا الدرس (تم تخطي التكرار)",
      });
      return;
    }

    const inserted = await db
      .insert(questionBankTable)
      .values(
        nonDuplicates.map((q) => ({
          courseId: resolvedCourseId,
          category: String(category || "عام"),
          stage: targetStage,
          stages: Array.isArray(stages) ? stages : [targetStage],
          unit: targetUnit,
          lesson: targetLesson,
          lessonId: resolvedLessonId || null,
          difficulty: String(q.difficulty || difficulty || "medium"),
          points: Number(q.points || points) || 1,
          subject: "",
          tags: [targetStage, targetUnit, targetLesson].filter(Boolean),
          question: {
            prompt: String(q.prompt).trim(),
            options: q.options.map((o: unknown) => String(o).trim()),
            correctIndex: Math.max(0, Math.min(q.options.length - 1, Number(q.correctIndex) || 0)),
            explanation: String(q.explanation || "").trim() || undefined,
            imageUrl: String(q.imageUrl || "").trim() || undefined,
            points: Number(q.points || points) || 1,
          },
        }))
      )
      .returning();

    res.status(201).json({
      count: inserted.length,
      skippedDuplicates: validQuestions.length - nonDuplicates.length,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/learning/question-bank/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(questionBankTable)
      .where(eq(questionBankTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "السؤال غير موجود في البنك" });
      return;
    }
    await logAudit(req, "DELETE_QUESTION", "question_bank", String(deleted.id), `حذف سؤال من بنك الأسئلة: ${(deleted.question as any)?.questionText || "سؤال"}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Generate Quiz from Question Bank automatically
router.post("/admin/learning/question-bank/generate-quiz", requireAdmin, async (req, res, next) => {
  try {
    const { title, courseId, count, category, difficulty, passingScore, durationMinutes } = req.body;
    const qCount = Math.max(1, Math.min(50, Number(count || 10)));
    const allBankQuestions = await db.select().from(questionBankTable);
    
    let filtered = allBankQuestions;
    if (courseId) filtered = filtered.filter((q) => q.courseId === Number(courseId));
    if (category && category !== "all") filtered = filtered.filter((q) => q.category === category);
    if (difficulty && difficulty !== "all") filtered = filtered.filter((q) => q.difficulty === difficulty);

    if (filtered.length === 0) {
      res.status(404).json({ error: "لا توجد أسئلة كافية في البنك تطابق هذا البحث" });
      return;
    }

    // Pick random questions
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, qCount).map((item) => item.question);

    res.json({
      title: title || `اختبار عشوائي من بنك الأسئلة (${selectedQuestions.length} سؤال)`,
      questions: selectedQuestions,
      passingScore: Number(passingScore) || 60,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
    });
  } catch (error) {
    next(error);
  }
});

async function repairTruncatedQuestions() {
  try {
    const allQuizzes = await db.select().from(quizzesTable);
    for (const quiz of allQuizzes) {
      if (!Array.isArray(quiz.questions)) continue;
      let changed = false;
      const updatedQuestions = quiz.questions.map((q) => {
        let prompt = q.prompt;
        let explanation = q.explanation;
        if (prompt && (prompt.endsWith("غير قابل لل") || prompt.includes("غير قابل لل\n") || prompt.trim() === "لماذا يصعب تقييم نتيجة نظام غير قابل لل")) {
          prompt = prompt.replace(/غير قابل لل\s*$/, "غير قابل للتفسير بشكل واضح؟");
          if (explanation && explanation.startsWith("واضح يجعل")) {
            explanation = "عدم وضوح العوامل المؤدية للنتيجة يجعل " + explanation.replace(/^واضح يجعل\s*/, "");
          }
          changed = true;
        } else if (prompt && (prompt.endsWith(" لل") || prompt.endsWith(" لل؟"))) {
          if (explanation && (explanation.startsWith("واضح") || explanation.startsWith("بشكل واضح"))) {
            prompt = prompt.replace(/\s*لل\s*[\؟\?]?$/, " للتفسير بشكل واضح؟");
            changed = true;
          }
        }
        return { ...q, prompt, explanation };
      });

      if (changed) {
        await db.update(quizzesTable).set({ questions: updatedQuestions }).where(eq(quizzesTable.id, quiz.id));
      }
    }

    const bankItems = await db.select().from(questionBankTable);
    for (const item of bankItems) {
      const q = item.question;
      if (!q || !q.prompt) continue;
      let prompt = q.prompt;
      let explanation = q.explanation;
      let changed = false;
      if (prompt.endsWith("غير قابل لل") || prompt.includes("غير قابل لل\n") || prompt.trim() === "لماذا يصعب تقييم نتيجة نظام غير قابل لل") {
        prompt = prompt.replace(/غير قابل لل\s*$/, "غير قابل للتفسير بشكل واضح؟");
        if (explanation && explanation.startsWith("واضح يجعل")) {
          explanation = "عدم وضوح العوامل المؤدية للنتيجة يجعل " + explanation.replace(/^واضح يجعل\s*/, "");
        }
        changed = true;
      } else if (prompt.endsWith(" لل") || prompt.endsWith(" لل؟")) {
        if (explanation && (explanation.startsWith("واضح") || explanation.startsWith("بشكل واضح"))) {
          prompt = prompt.replace(/\s*لل\s*[\؟\?]?$/, " للتفسير بشكل واضح؟");
          changed = true;
        }
      }

      if (changed) {
        await db.update(questionBankTable).set({
          question: { ...q, prompt, explanation },
        }).where(eq(questionBankTable.id, item.id));
      }
    }
  } catch (e) {
    console.error("[repairTruncatedQuestions error]", e);
  }
}
setTimeout(() => {
  void repairTruncatedQuestions();
}, 2000);

export default router;

