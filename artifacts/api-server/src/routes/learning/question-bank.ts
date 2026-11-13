import { Router, type IRouter } from "express";
import path from "path";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import {
  db,
  questionBankTable,
  essayQuestionBankTable,
  lessonKholasaMaterialsTable,
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

    const kholasaMaterials = await db
      .select({
        id: lessonKholasaMaterialsTable.id,
        stage: lessonKholasaMaterialsTable.stage,
        stages: lessonKholasaMaterialsTable.stages,
        unit: lessonKholasaMaterialsTable.unit,
        lesson: lessonKholasaMaterialsTable.lesson,
        videoId: lessonKholasaMaterialsTable.videoId,
        courseId: lessonKholasaMaterialsTable.courseId,
      })
      .from(lessonKholasaMaterialsTable);

    const essayQuestions = await db
      .select({
        id: essayQuestionBankTable.id,
        stage: essayQuestionBankTable.stage,
        unit: essayQuestionBankTable.unit,
        lesson: essayQuestionBankTable.lesson,
        difficulty: essayQuestionBankTable.difficulty,
      })
      .from(essayQuestionBankTable);

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
    for (const km of kholasaMaterials) {
      if (km.stage && km.stage.trim()) systemStagesSet.add(km.stage.trim());
      if (Array.isArray(km.stages)) {
        for (const st of km.stages) if (st && st.trim()) systemStagesSet.add(st.trim());
      }
    }
    for (const row of all) {
      if (row.stage && row.stage.trim()) systemStagesSet.add(row.stage.trim());
    }
    for (const eq of essayQuestions) {
      if (eq.stage && eq.stage.trim()) systemStagesSet.add(eq.stage.trim());
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
      totalEssays: number;
      units: Record<string, {
        unit: string;
        totalQuestions: number;
        totalEssays: number;
        difficulty: { easy: number; medium: number; hard: number };
        lessons: Record<string, {
          lesson: string;
          lessonId: number | null;
          courseId: number | null;
          totalQuestions: number;
          totalEssays: number;
          difficulty: { easy: number; medium: number; hard: number };
        }>;
      }>;
    }> = {};

    // Initialize all system stages so they appear in tree even if 0 questions
    for (const st of systemStagesSet) {
      stagesMap[st] = { stage: st, totalQuestions: 0, totalEssays: 0, units: {} };
    }

    // 1. Populate from Kholasa Curriculum Materials (Ensures empty/new units and lessons show up)
    for (const km of kholasaMaterials) {
      const stage = String(km.stage || "عام").trim();
      const unit = String(km.unit || "").trim();
      const lesson = String(km.lesson || "").trim();
      if (!unit || !lesson) continue;

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, totalEssays: 0, units: {} };
      }
      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
          lessons: {},
        };
      }
      if (!stagesMap[stage].units[unit].lessons[lesson]) {
        stagesMap[stage].units[unit].lessons[lesson] = {
          lesson,
          lessonId: km.videoId || null,
          courseId: km.courseId || null,
          totalQuestions: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
        };
      } else {
        if (!stagesMap[stage].units[unit].lessons[lesson].lessonId && km.videoId) {
          stagesMap[stage].units[unit].lessons[lesson].lessonId = km.videoId;
        }
        if (!stagesMap[stage].units[unit].lessons[lesson].courseId && km.courseId) {
          stagesMap[stage].units[unit].lessons[lesson].courseId = km.courseId;
        }
      }
    }

    // 2. Populate MCQ & True/False Questions
    for (const row of all) {
      const stage = String(row.stage || "عام").trim();
      const unit = String(row.unit || "الوحدة العامة").trim();
      const lesson = String(row.lesson || "الدرس العام").trim();
      const diff = (row.difficulty === "easy" || row.difficulty === "hard") ? row.difficulty : "medium";

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, totalEssays: 0, units: {} };
      }
      stagesMap[stage].totalQuestions++;

      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          totalEssays: 0,
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
          totalEssays: 0,
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

    // 3. Populate Essay Questions counts
    for (const eqRow of essayQuestions) {
      const stage = String(eqRow.stage || "عام").trim();
      const unit = String(eqRow.unit || "الوحدة العامة").trim();
      const lesson = String(eqRow.lesson || "الدرس العام").trim();

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, totalEssays: 0, units: {} };
      }
      stagesMap[stage].totalEssays = (stagesMap[stage].totalEssays || 0) + 1;

      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
          lessons: {},
        };
      }
      stagesMap[stage].units[unit].totalEssays = (stagesMap[stage].units[unit].totalEssays || 0) + 1;

      if (!stagesMap[stage].units[unit].lessons[lesson]) {
        stagesMap[stage].units[unit].lessons[lesson] = {
          lesson,
          lessonId: null,
          courseId: null,
          totalQuestions: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
        };
      }
      stagesMap[stage].units[unit].lessons[lesson].totalEssays = (stagesMap[stage].units[unit].lessons[lesson].totalEssays || 0) + 1;
    }

    const tree = Object.values(stagesMap).map((st) => ({
      stage: st.stage,
      totalQuestions: st.totalQuestions,
      totalEssays: st.totalEssays || 0,
      units: Object.values(st.units)
        .sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
        .map((u) => ({
          unit: u.unit,
          totalQuestions: u.totalQuestions,
          totalEssays: u.totalEssays || 0,
          difficulty: u.difficulty,
          lessons: Object.values(u.lessons)
            .sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson)),
        })),
    }));

    res.json({
      tree,
      totalQuestions: all.length,
      totalEssays: essayQuestions.length,
      courses,
      videos,
      stages: Array.from(systemStagesSet),
    });
  } catch (error) {
    next(error);
  }
});

// ── Curriculum & Unit/Lesson CRUD Endpoints ──

// POST /api/admin/learning/curriculum/create-unit - Create a new curriculum unit
router.post("/admin/learning/curriculum/create-unit", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, initialLesson } = req.body;
    if (!stage || !unit || !String(unit).trim()) {
      res.status(400).json({ error: "المرحلة واسم الوحدة حقول مطلوبة" });
      return;
    }
    const targetStage = String(stage).trim();
    const targetUnit = String(unit).trim();
    const lessonName = initialLesson && String(initialLesson).trim() ? String(initialLesson).trim() : "الدرس الأول: مقدمة وتمهيد";

    const [existing] = await db
      .select()
      .from(lessonKholasaMaterialsTable)
      .where(
        and(
          eq(lessonKholasaMaterialsTable.stage, targetStage),
          eq(lessonKholasaMaterialsTable.unit, targetUnit)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(lessonKholasaMaterialsTable).values({
        stage: targetStage,
        stages: [targetStage],
        unit: targetUnit,
        lesson: lessonName,
        summaryData: { definitions: [], keyConcepts: [] },
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.json({ success: true, message: `تم إنشاء الوحدة "${targetUnit}" بنجاح!` });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/curriculum/create-lesson - Add a new lesson to a unit
router.post("/admin/learning/curriculum/create-lesson", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, lesson, videoId, courseId } = req.body;
    if (!stage || !unit || !lesson || !String(lesson).trim()) {
      res.status(400).json({ error: "المرحلة والوحدة واسم الدرس حقول مطلوبة" });
      return;
    }
    const targetStage = String(stage).trim();
    const targetUnit = String(unit).trim();
    const targetLesson = String(lesson).trim();

    const [created] = await db
      .insert(lessonKholasaMaterialsTable)
      .values({
        stage: targetStage,
        stages: [targetStage],
        unit: targetUnit,
        lesson: targetLesson,
        videoId: videoId ? Number(videoId) : null,
        courseId: courseId ? Number(courseId) : null,
        summaryData: { definitions: [], keyConcepts: [] },
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json({ success: true, lesson: created, message: `تمت إضافة الدرس "${targetLesson}" بنجاح!` });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/curriculum/rename-unit - Rename a unit across all content tables
router.post("/admin/learning/curriculum/rename-unit", requireAdmin, async (req, res, next) => {
  try {
    const { stage, oldUnit, newUnit } = req.body;
    if (!stage || !oldUnit || !newUnit || !String(newUnit).trim()) {
      res.status(400).json({ error: "المرحلة والاسم الحالي والاسم الجديد حقول مطلوبة" });
      return;
    }
    const targetStage = String(stage).trim();
    const fromUnit = String(oldUnit).trim();
    const toUnit = String(newUnit).trim();

    await Promise.all([
      db.update(questionBankTable).set({ unit: toUnit, updatedAt: new Date() })
        .where(and(eq(questionBankTable.stage, targetStage), eq(questionBankTable.unit, fromUnit))),
      db.update(essayQuestionBankTable).set({ unit: toUnit, updatedAt: new Date() })
        .where(and(eq(essayQuestionBankTable.stage, targetStage), eq(essayQuestionBankTable.unit, fromUnit))),
      db.update(lessonKholasaMaterialsTable).set({ unit: toUnit, updatedAt: new Date() })
        .where(and(eq(lessonKholasaMaterialsTable.stage, targetStage), eq(lessonKholasaMaterialsTable.unit, fromUnit))),
    ]);

    res.json({ success: true, message: `تم تعديل اسم الوحدة إلى "${toUnit}" بنجاح!` });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/curriculum/rename-lesson - Rename a lesson across all content tables
router.post("/admin/learning/curriculum/rename-lesson", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, oldLesson, newLesson, targetUnit, videoId } = req.body;
    if (!stage || !unit || !oldLesson || !newLesson || !String(newLesson).trim()) {
      res.status(400).json({ error: "المرحلة والوحدة واسم الدرس الحالي والجديد حقول مطلوبة" });
      return;
    }
    const targetStage = String(stage).trim();
    const fromUnit = String(unit).trim();
    const toUnit = targetUnit && String(targetUnit).trim() ? String(targetUnit).trim() : fromUnit;
    const fromLesson = String(oldLesson).trim();
    const toLesson = String(newLesson).trim();

    await Promise.all([
      db.update(questionBankTable)
        .set({ lesson: toLesson, unit: toUnit, lessonId: videoId !== undefined ? Number(videoId) || null : undefined, updatedAt: new Date() })
        .where(and(eq(questionBankTable.stage, targetStage), eq(questionBankTable.unit, fromUnit), eq(questionBankTable.lesson, fromLesson))),
      db.update(essayQuestionBankTable)
        .set({ lesson: toLesson, unit: toUnit, updatedAt: new Date() })
        .where(and(eq(essayQuestionBankTable.stage, targetStage), eq(essayQuestionBankTable.unit, fromUnit), eq(essayQuestionBankTable.lesson, fromLesson))),
      db.update(lessonKholasaMaterialsTable)
        .set({ lesson: toLesson, unit: toUnit, videoId: videoId !== undefined ? Number(videoId) || null : undefined, updatedAt: new Date() })
        .where(and(eq(lessonKholasaMaterialsTable.stage, targetStage), eq(lessonKholasaMaterialsTable.unit, fromUnit), eq(lessonKholasaMaterialsTable.lesson, fromLesson))),
    ]);

    res.json({ success: true, message: `تم تعديل بيانات الدرس "${toLesson}" بنجاح!` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/learning/curriculum/delete-unit - Delete a unit and all associated contents
router.delete("/admin/learning/curriculum/delete-unit", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit } = req.body;
    if (!stage || !unit) {
      res.status(400).json({ error: "المرحلة والوحدة مطلوبة للحذف" });
      return;
    }
    const targetStage = String(stage).trim();
    const targetUnit = String(unit).trim();

    const [qDel, eDel, kDel] = await Promise.all([
      db.delete(questionBankTable).where(and(eq(questionBankTable.stage, targetStage), eq(questionBankTable.unit, targetUnit))).returning(),
      db.delete(essayQuestionBankTable).where(and(eq(essayQuestionBankTable.stage, targetStage), eq(essayQuestionBankTable.unit, targetUnit))).returning(),
      db.delete(lessonKholasaMaterialsTable).where(and(eq(lessonKholasaMaterialsTable.stage, targetStage), eq(lessonKholasaMaterialsTable.unit, targetUnit))).returning(),
    ]);

    res.json({ success: true, message: `تم حذف الوحدة "${targetUnit}" بنجاح (${qDel.length} سؤال اختيار، ${eDel.length} سؤال مقالي، ${kDel.length} درس).` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/learning/curriculum/delete-lesson - Delete a lesson and all associated contents
router.delete("/admin/learning/curriculum/delete-lesson", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, lesson } = req.body;
    if (!stage || !unit || !lesson) {
      res.status(400).json({ error: "المرحلة والوحدة واسم الدرس حقول مطلوبة للحذف" });
      return;
    }
    const targetStage = String(stage).trim();
    const targetUnit = String(unit).trim();
    const targetLesson = String(lesson).trim();

    const [qDel, eDel, kDel] = await Promise.all([
      db.delete(questionBankTable).where(and(eq(questionBankTable.stage, targetStage), eq(questionBankTable.unit, targetUnit), eq(questionBankTable.lesson, targetLesson))).returning(),
      db.delete(essayQuestionBankTable).where(and(eq(essayQuestionBankTable.stage, targetStage), eq(essayQuestionBankTable.unit, targetUnit), eq(essayQuestionBankTable.lesson, targetLesson))).returning(),
      db.delete(lessonKholasaMaterialsTable).where(and(eq(lessonKholasaMaterialsTable.stage, targetStage), eq(lessonKholasaMaterialsTable.unit, targetUnit), eq(lessonKholasaMaterialsTable.lesson, targetLesson))).returning(),
    ]);

    res.json({ success: true, message: `تم حذف الدرس "${targetLesson}" بنجاح (${qDel.length} سؤال، ${eDel.length} سؤال مقالي).` });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/curriculum/quizzes - Get quizzes associated with a stage, unit, or lesson
router.get("/admin/learning/curriculum/quizzes", requireAdmin, async (req, res, next) => {
  try {
    const stage = req.query.stage ? String(req.query.stage).trim() : undefined;
    const unit = req.query.unit ? String(req.query.unit).trim() : undefined;
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : undefined;

    let allQuizzes = await db.select().from(quizzesTable).orderBy(desc(quizzesTable.id));
    if (stage && stage !== "all") {
      allQuizzes = allQuizzes.filter(q => q.stage === stage || (Array.isArray(q.stages) && q.stages.includes(stage)));
    }
    if (unit && unit !== "all") {
      allQuizzes = allQuizzes.filter(q => 
        (q.title && q.title.includes(unit)) || 
        (q.category && q.category.includes(unit)) ||
        (q.description && q.description.includes(unit))
      );
    }
    if (lesson && lesson !== "all") {
      allQuizzes = allQuizzes.filter(q => 
        (q.title && q.title.includes(lesson)) || 
        (q.description && q.description.includes(lesson))
      );
    }
    res.json(allQuizzes);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/curriculum/export-json - Export questions as clean structured JSON for Unit or Lesson
router.get("/admin/learning/curriculum/export-json", requireAdmin, async (req, res, next) => {
  try {
    const stage = String(req.query.stage || "").trim();
    const unit = String(req.query.unit || "").trim();
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : "";

    if (!stage || !unit) {
      res.status(400).json({ error: "stage and unit are required" });
      return;
    }

    const isAllLesson = !lesson || lesson === "all";

    // 1. Fetch MCQs & T/F from questionBankTable
    const mcqConds = [
      eq(questionBankTable.stage, stage),
      eq(questionBankTable.unit, unit),
    ];
    if (!isAllLesson) {
      mcqConds.push(eq(questionBankTable.lesson, lesson));
    }
    const mcqRows = await db
      .select()
      .from(questionBankTable)
      .where(and(...mcqConds))
      .orderBy(questionBankTable.lesson, questionBankTable.id);

    // 2. Fetch Essays from essayQuestionBankTable
    const essayConds = [
      eq(essayQuestionBankTable.stage, stage),
      eq(essayQuestionBankTable.unit, unit),
    ];
    if (!isAllLesson) {
      essayConds.push(eq(essayQuestionBankTable.lesson, lesson));
    }
    const essayRows = await db
      .select()
      .from(essayQuestionBankTable)
      .where(and(...essayConds))
      .orderBy(essayQuestionBankTable.lesson, essayQuestionBankTable.id);

    // 3. Format and clean questions
    const formattedMcqs = mcqRows.map((r) => {
      const q = r.question || ({} as any);
      const isTF = (q.options || []).length === 2 && 
        ((q.options[0]?.includes("صواب") && q.options[1]?.includes("خطأ")) ||
         (q.options[0]?.includes("صح") && q.options[1]?.includes("خطأ")) ||
         (q.options[0] === "True" && q.options[1] === "False"));
      return {
        id: r.id,
        category: "mcq_or_tf",
        type: isTF ? "صح أم خطأ" : "اختيار من متعدد",
        unit: r.unit,
        lesson: r.lesson,
        difficulty: r.difficulty || "medium",
        points: r.points || 1,
        prompt: q.prompt || "",
        options: q.options || [],
        correctIndex: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
        correctAnswer: (q.options && typeof q.correctAnswer === "number") ? q.options[q.correctAnswer] : "",
        explanation: q.explanation || "",
        translation: r.translation || "",
        imageUrl: q.imageUrl || null,
        tags: r.tags || [],
      };
    });

    const formattedEssays = essayRows.map((r) => {
      return {
        id: r.id,
        category: "essay",
        type: "سؤال مقالي",
        unit: r.unit,
        lesson: r.lesson,
        difficulty: r.difficulty || "medium",
        points: r.points || 5,
        prompt: r.prompt,
        modelAnswer: r.modelAnswer,
        explanation: r.explanation || "",
        translation: r.translation || "",
        imageUrl: r.imageUrl || null,
        modelAnswerImageUrl: r.modelAnswerImageUrl || null,
        tags: r.tags || [],
      };
    });

    const allQuestions = [...formattedMcqs, ...formattedEssays];

    // Group by lesson
    const lessonsMap = new Map<string, {
      lesson: string;
      totalQuestions: number;
      mcqCount: number;
      trueFalseCount: number;
      essayCount: number;
      questions: any[];
    }>();

    for (const q of allQuestions) {
      const lName = q.lesson || "عام";
      if (!lessonsMap.has(lName)) {
        lessonsMap.set(lName, {
          lesson: lName,
          totalQuestions: 0,
          mcqCount: 0,
          trueFalseCount: 0,
          essayCount: 0,
          questions: [],
        });
      }
      const lObj = lessonsMap.get(lName)!;
      lObj.totalQuestions += 1;
      if (q.category === "essay") {
        lObj.essayCount += 1;
      } else if (q.type === "صح أم خطأ") {
        lObj.trueFalseCount += 1;
      } else {
        lObj.mcqCount += 1;
      }
      lObj.questions.push(q);
    }

    const exportPayload = {
      _meta: {
        exportedAt: new Date().toISOString(),
        stage,
        unit,
        lesson: isAllLesson ? "all" : lesson,
        scope: isAllLesson ? "unit" : "lesson",
      },
      summary: {
        totalQuestions: allQuestions.length,
        mcqCount: formattedMcqs.filter((q) => q.type !== "صح أم خطأ").length,
        trueFalseCount: formattedMcqs.filter((q) => q.type === "صح أم خطأ").length,
        essayCount: formattedEssays.length,
      },
      lessons: Array.from(lessonsMap.values()),
      allQuestions,
    };

    res.json(exportPayload);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/test-bank/questions - Filtered list of questions with search (supports MCQ & Essay)
router.get("/admin/learning/test-bank/questions", requireAdmin, async (req, res, next) => {
  try {
    const stage = req.query.stage ? String(req.query.stage).trim() : undefined;
    const unit = req.query.unit ? String(req.query.unit).trim() : undefined;
    const lesson = req.query.lesson ? String(req.query.lesson).trim() : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty).trim() : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;
    const type = req.query.type ? String(req.query.type).trim().toUpperCase() : undefined;

    const shouldFetchMcq = !type || type === "ALL" || type === "MCQ" || type === "TRUE_FALSE";
    const shouldFetchEssay = !type || type === "ALL" || type === "ESSAY";

    const fetchTasks: Promise<any[]>[] = [];

    // 1. Fetch MCQs
    if (shouldFetchMcq) {
      const mcqConds = [];
      if (stage && stage !== "all") mcqConds.push(eq(questionBankTable.stage, stage));
      if (unit && unit !== "all") mcqConds.push(eq(questionBankTable.unit, unit));
      if (lesson && lesson !== "all") mcqConds.push(eq(questionBankTable.lesson, lesson));
      if (difficulty && difficulty !== "all") mcqConds.push(eq(questionBankTable.difficulty, difficulty));

      let q = db.select().from(questionBankTable);
      fetchTasks.push((mcqConds.length ? q.where(and(...mcqConds)) : q).orderBy(desc(questionBankTable.id)));
    } else {
      fetchTasks.push(Promise.resolve([]));
    }

    // 2. Fetch Essays
    if (shouldFetchEssay) {
      const essayConds = [];
      if (stage && stage !== "all") essayConds.push(eq(essayQuestionBankTable.stage, stage));
      if (unit && unit !== "all") essayConds.push(eq(essayQuestionBankTable.unit, unit));
      if (lesson && lesson !== "all") essayConds.push(eq(essayQuestionBankTable.lesson, lesson));
      if (difficulty && difficulty !== "all") essayConds.push(eq(essayQuestionBankTable.difficulty, difficulty));

      let eqQuery = db.select().from(essayQuestionBankTable);
      fetchTasks.push((essayConds.length ? eqQuery.where(and(...essayConds)) : eqQuery).orderBy(desc(essayQuestionBankTable.id)));
    } else {
      fetchTasks.push(Promise.resolve([]));
    }

    const [mcqRows, essayRows] = await Promise.all(fetchTasks);

    // Format essays to match standard question schema
    const formattedEssays = essayRows.map((e) => ({
      id: `essay-${e.id}`,
      stage: e.stage,
      unit: e.unit,
      lesson: e.lesson,
      difficulty: e.difficulty,
      points: e.points,
      type: "ESSAY",
      category: "essay",
      prompt: e.prompt,
      modelAnswer: e.modelAnswer,
      answer: e.modelAnswer,
      correctAnswer: e.modelAnswer,
      explanation: e.explanation || "",
      translation: e.translation || "",
      question: {
        type: "ESSAY",
        prompt: e.prompt,
        statement: e.prompt,
        answer: e.modelAnswer,
        correctAnswer: e.modelAnswer,
        modelAnswer: e.modelAnswer,
        explanation: e.explanation || "",
        translation: e.translation || "",
        options: [],
      },
      createdAt: e.createdAt,
    }));

    let allRows = [...mcqRows, ...formattedEssays];

    if (search) {
      allRows = allRows.filter((r) => {
        const prompt = (r.question?.prompt || r.prompt || "").toLowerCase();
        const opts = (r.question?.options || []).join(" ").toLowerCase();
        const ans = (r.modelAnswer || r.answer || "").toLowerCase();
        return prompt.includes(search) || opts.includes(search) || ans.includes(search);
      });
    }

    res.json(allRows);
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
            nonDuplicates.map((q) => {
              const opts = q.options.map((o: unknown) => String(o).trim());
              const cIdx = Math.max(0, Math.min(opts.length - 1, Number(q.correctIndex) || 0));
              const inferredType: "mcq" | "true_false" =
                (q as any).questionType === "true_false" || opts.length === 2
                  ? "true_false"
                  : "mcq";
              return {
                courseId,
                category: "عام",
                stage,
                stages: [stage],
                unit,
                lesson,
                lessonId: lessonId || null,
                difficulty: (q as any).difficulty || defaultDifficulty,
                points: q.points || defaultPoints,
                concept: (q as any).concept ? String((q as any).concept).trim() : null,
                translation: (q as any).translation ? String((q as any).translation).trim() : null,
                tags: [stage, unit, lesson].filter(Boolean),
                question: {
                  prompt: String(q.prompt).trim(),
                  options: opts,
                  correctIndex: cIdx,
                  correctAnswer: (q as any).correctAnswer ? String((q as any).correctAnswer).trim() : opts[cIdx],
                  questionType: inferredType,
                  explanation: String(q.explanation || "").trim() || undefined,
                  translation: (q as any).translation ? String((q as any).translation).trim() : undefined,
                  concept: (q as any).concept ? String((q as any).concept).trim() : undefined,
                  imageUrl: String(q.imageUrl || "").trim() || undefined,
                  points: q.points || defaultPoints,
                },
              };
            })
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
      questionType,
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

    if (questionType === "true_false") {
      conditions.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') = 'true_false'`);
    } else if (questionType === "mcq") {
      conditions.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') <> 'true_false'`);
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
    const { prompt, options, correctIndex, explanation, imageUrl, courseId, category, stage, stages, unit, lesson, lessonId, difficulty, points, subject, tags, questionType, translation, concept } = req.body;
    if (!prompt || !Array.isArray(options) || options.length < 2 || typeof correctIndex !== "number") {
      res.status(400).json({ error: "بيانات السؤال غير كاملة" });
      return;
    }
    const cleanOptions = options.map((o: unknown) => String(o).trim());
    const safeIdx = Math.max(0, Math.min(cleanOptions.length - 1, correctIndex));
    const resolvedType: "mcq" | "true_false" = questionType === "true_false" || cleanOptions.length === 2 ? "true_false" : "mcq";
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
        concept: concept ? String(concept).trim() : null,
        translation: translation ? String(translation).trim() : null,
        tags: Array.isArray(tags) ? tags : [],
        question: {
          prompt: String(prompt).trim(),
          options: cleanOptions,
          correctIndex: safeIdx,
          correctAnswer: cleanOptions[safeIdx],
          questionType: resolvedType,
          explanation: String(explanation || "").trim() || undefined,
          translation: translation ? String(translation).trim() : undefined,
          concept: concept ? String(concept).trim() : undefined,
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
    const { prompt, options, correctIndex, explanation, imageUrl, unit, lesson, difficulty, points, questionType, translation, concept } = req.body;

    const [existing] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "السؤال غير موجود" });
      return;
    }

    const nextOptions = Array.isArray(options) ? options.map((o: any) => String(o).trim()) : existing.question.options;
    const nextIdx = typeof correctIndex === "number"
      ? Math.max(0, Math.min(nextOptions.length - 1, correctIndex))
      : existing.question.correctIndex;
    const nextType: QuizQuestion["questionType"] = questionType
      ? (questionType === "true_false" ? "true_false" : "mcq")
      : (existing.question.questionType || (nextOptions.length === 2 ? "true_false" : "mcq"));
    const nextTrans = translation !== undefined ? (String(translation).trim() || undefined) : (existing.question.translation || existing.translation || undefined);
    const nextConcept = concept !== undefined ? (String(concept).trim() || undefined) : (existing.question.concept || existing.concept || undefined);

    const updatedQuestion = {
      prompt: prompt ? String(prompt).trim() : existing.question.prompt,
      options: nextOptions,
      correctIndex: nextIdx,
      correctAnswer: nextOptions[nextIdx] || existing.question.correctAnswer,
      questionType: nextType,
      explanation: explanation !== undefined ? (String(explanation).trim() || undefined) : existing.question.explanation,
      translation: nextTrans,
      concept: nextConcept,
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
        translation: nextTrans ?? null,
        concept: nextConcept ?? null,
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
        nonDuplicates.map((q) => {
          const opts = q.options.map((o: unknown) => String(o).trim());
          const cIdx = Math.max(0, Math.min(opts.length - 1, Number(q.correctIndex) || 0));
          const inferredType: "mcq" | "true_false" =
            q.questionType === "true_false" || opts.length === 2 ? "true_false" : "mcq";
          return {
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
            concept: q.concept ? String(q.concept).trim() : null,
            translation: q.translation ? String(q.translation).trim() : null,
            tags: [targetStage, targetUnit, targetLesson].filter(Boolean),
            question: {
              prompt: String(q.prompt).trim(),
              options: opts,
              correctIndex: cIdx,
              correctAnswer: q.correctAnswer ? String(q.correctAnswer).trim() : opts[cIdx],
              questionType: inferredType,
              explanation: String(q.explanation || "").trim() || undefined,
              translation: q.translation ? String(q.translation).trim() : undefined,
              concept: q.concept ? String(q.concept).trim() : undefined,
              imageUrl: String(q.imageUrl || "").trim() || undefined,
              points: Number(q.points || points) || 1,
            },
          };
        })
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

router.delete("/admin/learning/question-bank/:id", requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!targetId || isNaN(targetId)) {
      res.status(400).json({ error: "معرف السؤال غير صالح" });
      return;
    }

    let deleted: any = null;
    const [qbDeleted] = await db
      .delete(questionBankTable)
      .where(eq(questionBankTable.id, targetId))
      .returning();

    if (qbDeleted) {
      deleted = qbDeleted;
    } else {
      const [essayDeleted] = await db
        .delete(essayQuestionBankTable)
        .where(eq(essayQuestionBankTable.id, targetId))
        .returning();
      if (essayDeleted) {
        deleted = essayDeleted;
      }
    }

    if (!deleted) {
      res.status(404).json({ error: "السؤال غير موجود في البنك" });
      return;
    }
    await logAudit(
      req,
      "DELETE_QUESTION",
      "question_bank",
      String(deleted.id),
      `حذف سؤال من بنك الأسئلة: ${(deleted as any)?.question?.questionText || (deleted as any)?.statement || "سؤال"}`
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Generate Quiz from Question Bank automatically
router.post("/admin/learning/question-bank/generate-quiz", requireAdmin, async (req, res, next) => {
  try {
    const { title, courseId, count, category, stage, stages, difficulty, passingScore, durationMinutes } = req.body;
    const qCount = Math.max(1, Math.min(50, Number(count || 10)));

    let targetStages: string[] = Array.isArray(stages) && stages.length
      ? stages.map((s: unknown) => String(s).trim()).filter(Boolean)
      : stage && stage !== "all"
        ? [String(stage).trim()]
        : [];

    if (targetStages.length === 0 && courseId) {
      const [course] = await db
        .select({ stages: coursesTable.stages })
        .from(coursesTable)
        .where(eq(coursesTable.id, Number(courseId)))
        .limit(1);
      if (Array.isArray(course?.stages) && course.stages.length > 0) {
        targetStages = course.stages;
      }
    }

    const conditions = [];
    if (targetStages.length > 0) {
      conditions.push(inArray(questionBankTable.stage, targetStages));
    } else if (courseId) {
      conditions.push(eq(questionBankTable.courseId, Number(courseId)));
    } else if (category && category !== "all") {
      conditions.push(or(eq(questionBankTable.category, category), eq(questionBankTable.category, "عام")));
    }

    if (difficulty && difficulty !== "all") {
      conditions.push(eq(questionBankTable.difficulty, String(difficulty)));
    }

    const rows = await db
      .select()
      .from(questionBankTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`random()`)
      .limit(qCount * 2);

    const validRows = rows.filter((r) => isCompleteValidQuestion(r.question)).slice(0, qCount);

    if (validRows.length === 0) {
      res.status(404).json({ error: "لا توجد أسئلة كافية في البنك تطابق هذا البحث أو المرحلة" });
      return;
    }

    const selectedQuestions = validRows.map((item) => item.question);

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

