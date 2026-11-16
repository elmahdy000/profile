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
import { sendPushToStudents } from "../../services/push-notifications";
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
  optionIndex,
  parseJsonSafe,
  formatModelAnswer,
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

// Helper: Determine if a question is True/False or MCQ
export function isTrueFalseQuestion(q: any): boolean {
  if (!q) return false;
  if (q.questionType === "true_false") return true;
  if (Array.isArray(q.options) && q.options.length === 2) {
    return q.options.some((o: any) => {
      if (typeof o !== "string") return false;
      const lower = o.toLowerCase().trim();
      return (
        lower.includes("صواب") ||
        lower.includes("صح") ||
        lower.includes("خطأ") ||
        lower.includes("خطا") ||
        lower === "true" ||
        lower === "false"
      );
    });
  }
  return false;
}

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
        question: questionBankTable.question,
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
      mcqCount: number;
      tfCount: number;
      totalEssays: number;
      units: Record<string, {
        unit: string;
        totalQuestions: number;
        mcqCount: number;
        tfCount: number;
        totalEssays: number;
        difficulty: { easy: number; medium: number; hard: number };
        lessons: Record<string, {
          lesson: string;
          lessonId: number | null;
          courseId: number | null;
          totalQuestions: number;
          mcqCount: number;
          tfCount: number;
          totalEssays: number;
          difficulty: { easy: number; medium: number; hard: number };
        }>;
      }>;
    }> = {};

    // Initialize all system stages so they appear in tree even if 0 questions
    for (const st of systemStagesSet) {
      stagesMap[st] = { stage: st, totalQuestions: 0, mcqCount: 0, tfCount: 0, totalEssays: 0, units: {} };
    }

    // 1. Populate from Kholasa Curriculum Materials (Ensures empty/new units and lessons show up)
    for (const km of kholasaMaterials) {
      const stage = String(km.stage || "عام").trim();
      const unit = String(km.unit || "").trim();
      const lesson = String(km.lesson || "").trim();
      if (!unit || !lesson) continue;

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, mcqCount: 0, tfCount: 0, totalEssays: 0, units: {} };
      }
      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          mcqCount: 0,
          tfCount: 0,
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
          mcqCount: 0,
          tfCount: 0,
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
      const isTf = isTrueFalseQuestion(row.question);

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, mcqCount: 0, tfCount: 0, totalEssays: 0, units: {} };
      }
      stagesMap[stage].totalQuestions++;
      if (isTf) {
        stagesMap[stage].tfCount = (stagesMap[stage].tfCount || 0) + 1;
      } else {
        stagesMap[stage].mcqCount = (stagesMap[stage].mcqCount || 0) + 1;
      }

      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          mcqCount: 0,
          tfCount: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
          lessons: {},
        };
      }
      stagesMap[stage].units[unit].totalQuestions++;
      stagesMap[stage].units[unit].difficulty[diff]++;
      if (isTf) {
        stagesMap[stage].units[unit].tfCount = (stagesMap[stage].units[unit].tfCount || 0) + 1;
      } else {
        stagesMap[stage].units[unit].mcqCount = (stagesMap[stage].units[unit].mcqCount || 0) + 1;
      }

      if (!stagesMap[stage].units[unit].lessons[lesson]) {
        stagesMap[stage].units[unit].lessons[lesson] = {
          lesson,
          lessonId: row.lessonId || null,
          courseId: row.courseId || null,
          totalQuestions: 0,
          mcqCount: 0,
          tfCount: 0,
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
      if (isTf) {
        stagesMap[stage].units[unit].lessons[lesson].tfCount = (stagesMap[stage].units[unit].lessons[lesson].tfCount || 0) + 1;
      } else {
        stagesMap[stage].units[unit].lessons[lesson].mcqCount = (stagesMap[stage].units[unit].lessons[lesson].mcqCount || 0) + 1;
      }
    }

    // 3. Populate Essay Questions counts
    for (const eqRow of essayQuestions) {
      const stage = String(eqRow.stage || "عام").trim();
      const unit = String(eqRow.unit || "الوحدة العامة").trim();
      const lesson = String(eqRow.lesson || "الدرس العام").trim();

      if (!stagesMap[stage]) {
        stagesMap[stage] = { stage, totalQuestions: 0, mcqCount: 0, tfCount: 0, totalEssays: 0, units: {} };
      }
      stagesMap[stage].totalEssays = (stagesMap[stage].totalEssays || 0) + 1;

      if (!stagesMap[stage].units[unit]) {
        stagesMap[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          mcqCount: 0,
          tfCount: 0,
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
          mcqCount: 0,
          tfCount: 0,
          totalEssays: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
        };
      }
      stagesMap[stage].units[unit].lessons[lesson].totalEssays = (stagesMap[stage].units[unit].lessons[lesson].totalEssays || 0) + 1;
    }

    const tree = Object.values(stagesMap).map((st) => ({
      stage: st.stage,
      totalQuestions: st.totalQuestions,
      mcqCount: st.mcqCount || 0,
      tfCount: st.tfCount || 0,
      totalEssays: st.totalEssays || 0,
      units: Object.values(st.units)
        .sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
        .map((u) => ({
          unit: u.unit,
          totalQuestions: u.totalQuestions,
          mcqCount: u.mcqCount || 0,
          tfCount: u.tfCount || 0,
          totalEssays: u.totalEssays || 0,
          difficulty: u.difficulty,
          lessons: Object.values(u.lessons)
            .sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson))
            .map((l) => ({
              ...l,
              mcqCount: l.mcqCount || 0,
              tfCount: l.tfCount || 0,
              totalEssays: l.totalEssays || 0,
            })),
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
        q.unit === unit ||
        (q.title && q.title.includes(unit)) || 
        (q.category && q.category.includes(unit)) ||
        (q.description && q.description.includes(unit))
      );
    }
    if (lesson && lesson !== "all") {
      allQuizzes = allQuizzes.filter(q => 
        q.lesson === lesson ||
        (q.lesson && q.lesson.includes(lesson)) ||
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

    const isTrueFalse = type === "TRUE_FALSE" || type === "TF" || type === "TRUEFALSE";
    const isMcq = type === "MCQ" || type === "MULTIPLE_CHOICE";
    const isEssay = type === "ESSAY" || type === "ESSAYS";

    const shouldFetchMcq = !type || type === "ALL" || isMcq || isTrueFalse;
    const shouldFetchEssay = !type || type === "ALL" || isEssay;

    const fetchTasks: Promise<any[]>[] = [];

    // 1. Fetch MCQs
    if (shouldFetchMcq) {
      const mcqConds = [];
      if (stage && stage !== "all") mcqConds.push(eq(questionBankTable.stage, stage));
      if (unit && unit !== "all") mcqConds.push(eq(questionBankTable.unit, unit));
      if (lesson && lesson !== "all") mcqConds.push(eq(questionBankTable.lesson, lesson));
      if (difficulty && difficulty !== "all") mcqConds.push(eq(questionBankTable.difficulty, difficulty));

      if (isTrueFalse) {
        mcqConds.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') = 'true_false'`);
      } else if (isMcq) {
        mcqConds.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') <> 'true_false'`);
      }

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

// ── Universal Question Extractors & Normalizers ──

function extractQuestionsFromJson(parsedJson: any): any[] {
  if (Array.isArray(parsedJson)) return parsedJson;
  if (!parsedJson || typeof parsedJson !== "object") return [];

  const collected: any[] = [];

  // Deep recursive crawler to handle hierarchical structures:
  // e.g. units -> lessons -> questions or any nested object with questions
  function traverse(node: any, currentUnit?: string, currentLesson?: string, currentStage?: string) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) {
        traverse(item, currentUnit, currentLesson, currentStage);
      }
      return;
    }

    const u = node.unit || node.unitTitle || node.chapter || currentUnit;
    const l = node.lesson || node.lessonTitle || node.topic || currentLesson;
    const s = node.stage || node.grade || node.level || currentStage;

    // Check if this node is an actual question
    const hasPrompt = Boolean(node.prompt || node.question || node.questionText || node.statement || node.title || node.text || node.q);
    const hasOptsOrAns = Array.isArray(node.options) || Array.isArray(node.choices) || Array.isArray(node.answers) ||
      Boolean(node.correctAnswer || node.answer || node.modelAnswer || node.solution || node.type || node.questionType || node.optionA || node.choiceA);

    if (hasPrompt && hasOptsOrAns) {
      collected.push({
        ...node,
        unit: node.unit || u,
        lesson: node.lesson || l,
        stage: node.stage || s,
      });
      return;
    }

    // Traverse known arrays
    if (Array.isArray(node.questions)) {
      for (const q of node.questions) {
        if (q && typeof q === "object") {
          collected.push({
            ...q,
            unit: q.unit || u,
            lesson: q.lesson || l,
            stage: q.stage || s,
          });
        }
      }
    }
    if (Array.isArray(node.items)) {
      for (const q of node.items) {
        if (q && typeof q === "object") {
          collected.push({
            ...q,
            unit: q.unit || u,
            lesson: q.lesson || l,
            stage: q.stage || s,
          });
        }
      }
    }

    if (Array.isArray(node.units)) {
      for (const unitObj of node.units) {
        const uTitle = unitObj.unit || unitObj.title || unitObj.name || u;
        traverse(unitObj, uTitle, l, s);
      }
    }
    if (Array.isArray(node.lessons)) {
      for (const lessonObj of node.lessons) {
        const lTitle = lessonObj.lesson || lessonObj.title || lessonObj.name || l;
        traverse(lessonObj, u, lTitle, s);
      }
    }
  }

  // Check top-level direct list properties first
  if (Array.isArray(parsedJson.questions)) return parsedJson.questions;
  if (Array.isArray(parsedJson.items)) return parsedJson.items;
  if (Array.isArray(parsedJson.data)) return parsedJson.data;

  traverse(parsedJson);
  if (collected.length > 0) return collected;

  // Fallback: check any array property in the object
  for (const key of Object.keys(parsedJson)) {
    const val = parsedJson[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
      if (val[0].prompt || val[0].question || val[0].questionText || val[0].title || val[0].statement || val[0].text) {
        return val;
      }
    }
  }
  return [];
}

function normalizeRawQuestion(
  rawInput: any,
  defaultDiff: string = "medium",
  defaultPts: number = 1,
  forcedType: string = "auto"
): QuizQuestion | null {
  if (!rawInput || typeof rawInput !== "object") return null;

  // Flatten nested question payload (e.g. { id, question: { prompt, options, ... } })
  const item = rawInput && typeof rawInput.question === "object" ? { ...rawInput, ...rawInput.question } : rawInput;

  const rawPrompt =
    item.prompt ||
    item.statement ||
    item.question ||
    item.questionText ||
    item.title ||
    item.text ||
    item.q;
  if (!rawPrompt || typeof rawPrompt !== "string" || !rawPrompt.trim()) return null;
  const prompt = rawPrompt.trim();

  let options: string[] = [];
  const rawOpts = item.options || item.choices || item.answers || item.alternatives || item.items;
  if (Array.isArray(rawOpts)) {
    options = rawOpts
      .map((o) => {
        if (typeof o === "string") return o.trim();
        if (typeof o === "number") return String(o);
        if (o && typeof o === "object") {
          return String(o.text || o.title || o.label || o.value || o.option || "").trim();
        }
        return String(o || "").trim();
      })
      .filter(Boolean);
  } else if (item.options && typeof item.options === "object" && !Array.isArray(item.options)) {
    options = Object.values(item.options).map((v) => (typeof v === "object" && v !== null ? (v as any).text || "" : String(v))).filter(Boolean);
  } else if (item.optionA || item.optionB) {
    options = [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean).map(String);
  } else if (item.choiceA || item.choiceB) {
    options = [item.choiceA, item.choiceB, item.choiceC, item.choiceD].filter(Boolean).map(String);
  } else if (item.optA || item.optB) {
    options = [item.optA, item.optB, item.optC, item.optD].filter(Boolean).map(String);
  } else if (item.option1 || item.option2) {
    options = [item.option1, item.option2, item.option3, item.option4].filter(Boolean).map(String);
  } else if (item.A && item.B) {
    options = [item.A, item.B, item.C, item.D].filter(Boolean).map(String);
  }

  const rawExplanation = String(
    item.explanation ||
      item.solution ||
      item.notes ||
      item.hint ||
      item.modelAnswer ||
      item.model_answer ||
      item.correctReason ||
      ""
  ).trim();

  const explanation = formatModelAnswer(rawExplanation);

  let questionType: "mcq" | "true_false" | "essay" = "mcq";
  const rawType = String(item.questionType || item.type || item.kind || "").toLowerCase().trim();

  const isTFByOpts =
    options.length === 2 &&
    options.some((o) => {
      const norm = o.toLowerCase().trim();
      return (
        norm === "صواب" ||
        norm === "صح" ||
        norm === "صحيح" ||
        norm === "true" ||
        norm === "خطأ" ||
        norm === "خطا" ||
        norm === "false"
      );
    });

  const isTFByType = /true_false|true|false|boolean|tf|صح|صواب|خطأ|خطا/i.test(rawType);
  const isEssayByType = /essay|مقالي|مقال|short_answer|text/i.test(rawType);

  const mode = String(forcedType || "auto").toLowerCase().trim();
  if (mode === "true_false" || mode === "tf") {
    questionType = "true_false";
    if (options.length === 0) {
      const isEnglish = /[a-zA-Z]/.test(prompt);
      options = isEnglish ? ["True", "False"] : ["صواب", "خطأ"];
    }
  } else if (mode === "essay") {
    questionType = "essay";
    options = [];
  } else if (mode === "mcq") {
    questionType = "mcq";
  } else {
    if (isEssayByType) {
      questionType = "essay";
    } else if (isTFByType || isTFByOpts) {
      questionType = "true_false";
      if (options.length === 0) {
        const isEnglish = /[a-zA-Z]/.test(prompt);
        options = isEnglish ? ["True", "False"] : ["صواب", "خطأ"];
      }
    } else if (options.length === 0) {
      questionType = "essay";
    } else {
      questionType = "mcq";
    }
  }

  let correctAnswer = String(item.correctAnswer || item.answer || item.correct_answer || item.correct || "").trim();
  if (questionType === "essay") {
    if (!correctAnswer && options.length === 1) {
      correctAnswer = options[0];
    }
    if (!correctAnswer && explanation) {
      correctAnswer = explanation;
    }
    options = [];
  }

  let correctIndex = -1;
  if (questionType !== "essay") {
    if (typeof item.correctIndex === "number" && item.correctIndex >= 0 && item.correctIndex < options.length) {
      correctIndex = item.correctIndex;
    } else if (typeof item.correct_index === "number" && item.correct_index >= 0 && item.correct_index < options.length) {
      correctIndex = item.correct_index;
    } else if (correctAnswer) {
      // 1. Direct exact match
      const foundIdx = options.findIndex((o) => o.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
      if (foundIdx >= 0) {
        correctIndex = foundIdx;
      } else if (questionType === "true_false") {
        // Semantic True/False matching
        const ansNorm = correctAnswer.toLowerCase().trim();
        const isTrueAns = /^(true|صح|صواب|صحيح|نعم|t|1)$/i.test(ansNorm) || item.correctAnswer === true || item.answer === true;
        const isFalseAns = /^(false|خطأ|خطا|لا|خاطئ|f|0)$/i.test(ansNorm) || item.correctAnswer === false || item.answer === false;

        const trueIdx = options.findIndex((o) => /^(true|صح|صواب|صحيح|نعم|t|1)$/i.test(o.toLowerCase().trim()));
        const falseIdx = options.findIndex((o) => /^(false|خطأ|خطا|لا|خاطئ|f|0)$/i.test(o.toLowerCase().trim()));

        if (isTrueAns && trueIdx >= 0) {
          correctIndex = trueIdx;
        } else if (isFalseAns && falseIdx >= 0) {
          correctIndex = falseIdx;
        } else {
          correctIndex = 0;
        }
      } else {
        const optLetterIdx = optionIndex(correctAnswer);
        if (optLetterIdx !== null && optLetterIdx < options.length) {
          correctIndex = optLetterIdx;
        } else {
          correctIndex = 0;
        }
      }
    } else {
      if (Array.isArray(rawOpts)) {
        const markedIdx = rawOpts.findIndex(
          (o) => o && typeof o === "object" && (o.isCorrect === true || o.correct === true)
        );
        if (markedIdx >= 0 && markedIdx < options.length) {
          correctIndex = markedIdx;
        }
      }
      if (correctIndex === -1) correctIndex = 0;
    }
    if (!correctAnswer && options[correctIndex]) {
      correctAnswer = options[correctIndex];
    }
  }

  return {
    prompt,
    options,
    correctIndex,
    correctAnswer: correctAnswer || undefined,
    explanation: explanation || undefined,
    questionType,
    difficulty: item.difficulty || defaultDiff,
    points: typeof item.points === "number" ? item.points : typeof item.score === "number" ? item.score : defaultPts,
    translation: item.translation || undefined,
    concept: item.concept || undefined,
    imageUrl: item.imageUrl || item.image || undefined,
    unit: item.unit || item.unitTitle || undefined,
    lesson: item.lesson || item.lessonTitle || undefined,
    stage: item.stage || item.grade || undefined,
  } as any;
}

function normalizePromptForDedupe(str: string): string {
  return String(str || "")
    .replace(/[\?\؟\,\.\!\،\:\;\-\_\(\)\[\]\{\}\"\'\`]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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
      const skipDuplicates = req.body.skipDuplicates !== false && req.body.skipDuplicates !== "false";
      const targetType = String(req.body.questionType || req.body.targetType || "auto").toLowerCase().trim();

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
            const parsedJson = parseJsonSafe(req.file.buffer.toString("utf8"));
            const rawList = extractQuestionsFromJson(parsedJson);
            questionsToProcess = rawList
              .map((item) => normalizeRawQuestion(item, defaultDifficulty, defaultPoints, targetType))
              .filter(Boolean) as QuizQuestion[];
          } catch {
            res.status(400).json({ error: "ملف JSON غير صالح أو به خطأ برمجي" });
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
          const parsed = parseImportedQuestions(extractedText, targetType);
          questionsToProcess = parsed.questions;
          warnings = parsed.warnings;
        }
      } else if (req.body.rawQuestions) {
        try {
          const raw = typeof req.body.rawQuestions === "string" ? parseJsonSafe(req.body.rawQuestions) : req.body.rawQuestions;
          const rawList = extractQuestionsFromJson(raw);
          questionsToProcess = rawList
            .map((item) => normalizeRawQuestion(item, defaultDifficulty, defaultPoints, targetType))
            .filter(Boolean) as QuizQuestion[];
        } catch {
          res.status(400).json({ error: "بيانات الأسئلة غير صالحة" });
          return;
        }
      } else if (req.body.questions && Array.isArray(req.body.questions)) {
        questionsToProcess = req.body.questions
          .map((item: any) => normalizeRawQuestion(item, defaultDifficulty, defaultPoints, targetType))
          .filter(Boolean) as QuizQuestion[];
      } else if (req.body.text) {
        extractedText = String(req.body.text);
        let parsedFromJson = false;
        let testText = extractedText.trim();
        if (testText.startsWith("```")) {
          testText = testText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        }
        if (testText.startsWith("{") || testText.startsWith("[")) {
          try {
            const raw = parseJsonSafe(testText);
            const rawList = extractQuestionsFromJson(raw);
            if (rawList.length > 0) {
              questionsToProcess = rawList
                .map((item) => normalizeRawQuestion(item, defaultDifficulty, defaultPoints, targetType))
                .filter(Boolean) as QuizQuestion[];
              parsedFromJson = true;
            }
          } catch {
            // Not valid JSON, continue with text parser
          }
        }
        if (!parsedFromJson) {
          const parsed = parseImportedQuestions(extractedText, targetType);
          questionsToProcess = parsed.questions;
          warnings = parsed.warnings;
        }
      } else {
        res.status(400).json({ error: "يرجى اختيار ملف أو إرسال نص الأسئلة" });
        return;
      }

      // Valid questions: any question with a non-empty prompt (MCQ, True/False, Essay)
      const validQuestions = questionsToProcess.filter(
        (q) => q && typeof q.prompt === "string" && q.prompt.trim().length > 0
      );

      if (validQuestions.length === 0) {
        if (previewOnly) {
          res.json({
            preview: true,
            totalDetected: 0,
            questions: [],
            extractedText: extractedText.trim(),
            warnings: [
              "تم فحص الملف/النص، ولكن لم يتم التعرف على بنية واضحة للأسئلة.",
              "تم وضع النص في المحرر لتعديله أو مراجعته يدوياً.",
            ],
          });
          return;
        }
        res.status(422).json({
          error: "لم يتم التعرف على أي أسئلة صالحة. تأكد من وجود نص السؤال.",
          extractedTextSnippet: extractedText.slice(0, 300),
        });
        return;
      }

      // ── Database Duplicate Comparison against Question Bank ──
      const hasItemSpecificUnits = validQuestions.some((q) => Boolean((q as any).unit || (q as any).lesson));
      const existingMcqConditions = [eq(questionBankTable.stage, stage)];
      if (!hasItemSpecificUnits) {
        if (unit && unit !== "الوحدة العامة") existingMcqConditions.push(eq(questionBankTable.unit, unit));
        if (lesson && lesson !== "شامل الوحدة") existingMcqConditions.push(eq(questionBankTable.lesson, lesson));
      }

      const existingMcqRows = await db
        .select({
          id: questionBankTable.id,
          prompt: sql<string>`${questionBankTable.question}->>'prompt'`,
          explanation: sql<string>`${questionBankTable.question}->>'explanation'`,
          unit: questionBankTable.unit,
          lesson: questionBankTable.lesson,
          question: questionBankTable.question,
        })
        .from(questionBankTable)
        .where(and(...existingMcqConditions));

      const existingEssayConditions = [eq(essayQuestionBankTable.stage, stage)];
      if (!hasItemSpecificUnits) {
        if (unit && unit !== "الوحدة العامة") existingEssayConditions.push(eq(essayQuestionBankTable.unit, unit));
        if (lesson && lesson !== "شامل الوحدة") existingEssayConditions.push(eq(essayQuestionBankTable.lesson, lesson));
      }

      const existingEssayRows = await db
        .select({
          id: essayQuestionBankTable.id,
          prompt: essayQuestionBankTable.prompt,
          explanation: essayQuestionBankTable.explanation,
          modelAnswer: essayQuestionBankTable.modelAnswer,
          unit: essayQuestionBankTable.unit,
          lesson: essayQuestionBankTable.lesson,
        })
        .from(essayQuestionBankTable)
        .where(and(...existingEssayConditions));

      const existingBankPrompts = new Map<
        string,
        {
          id: number;
          location: string;
          type: "mcq" | "essay";
          hasExplanation: boolean;
          questionPayload?: any;
        }
      >();
      for (const r of existingMcqRows) {
        const norm = normalizePromptForDedupe(r.prompt);
        const hasExp = Boolean(r.explanation && r.explanation.trim().length > 0);
        if (norm) {
          existingBankPrompts.set(norm, {
            id: r.id,
            location: `${r.unit || ""} / ${r.lesson || ""}`,
            type: "mcq",
            hasExplanation: hasExp,
            questionPayload: r.question,
          });
        }
      }
      for (const r of existingEssayRows) {
        const norm = normalizePromptForDedupe(r.prompt);
        const hasExp = Boolean(
          (r.explanation && r.explanation.trim().length > 0) ||
          (r.modelAnswer && r.modelAnswer.trim().length > 0)
        );
        if (norm) {
          existingBankPrompts.set(norm, {
            id: r.id,
            location: `${r.unit || ""} / ${r.lesson || ""}`,
            type: "essay",
            hasExplanation: hasExp,
          });
        }
      }

      // Mark duplicates and compute accurate breakdown
      const seenInBatch = new Set<string>();
      let mcqCount = 0;
      let trueFalseCount = 0;
      let essayCount = 0;
      let bankDuplicateCount = 0;
      let batchDuplicateCount = 0;

      const enrichedQuestions = validQuestions.map((q) => {
        const norm = normalizePromptForDedupe(q.prompt);
        const inBank = existingBankPrompts.has(norm);
        const inBatch = seenInBatch.has(norm);

        if (inBatch) {
          batchDuplicateCount++;
        } else {
          seenInBatch.add(norm);
        }

        if (inBank) {
          bankDuplicateCount++;
        }

        const qType =
          (q as any).questionType ||
          (!q.options || q.options.length === 0 ? "essay" : q.options.length === 2 ? "true_false" : "mcq");

        if (qType === "essay") essayCount++;
        else if (qType === "true_false") trueFalseCount++;
        else mcqCount++;

        const isDuplicate = inBank || inBatch;
        const bankMatch = inBank ? existingBankPrompts.get(norm) : undefined;

        return {
          ...q,
          questionType: qType,
          isDuplicate,
          isBankDuplicate: inBank,
          isBatchDuplicate: inBatch,
          existingBankLocation: bankMatch?.location,
        };
      });

      const totalDuplicates = enrichedQuestions.filter((q) => q.isDuplicate).length;
      const newQuestionsCount = enrichedQuestions.filter((q) => !q.isDuplicate).length;

      // ── Preview Mode: Return comparison & breakdown immediately ──
      if (previewOnly) {
        res.json({
          preview: true,
          totalDetected: validQuestions.length,
          breakdown: {
            total: validQuestions.length,
            newQuestions: newQuestionsCount,
            totalDuplicates,
            bankDuplicates: bankDuplicateCount,
            batchDuplicates: batchDuplicateCount,
            mcq: mcqCount,
            trueFalse: trueFalseCount,
            essay: essayCount,
          },
          questions: enrichedQuestions,
          warnings,
          extractedText: extractedText.trim(),
        });
        return;
      }

      // ── Final Commit Mode: Save to Database & Enrich Existing ──
      let enrichedExistingCount = 0;
      for (const q of enrichedQuestions) {
        if (q.isBankDuplicate) {
          const norm = normalizePromptForDedupe(q.prompt);
          const existing = existingBankPrompts.get(norm);
          const candidateExp = String(q.explanation || (q as any).correctAnswer || "").trim();
          if (existing && !existing.hasExplanation && candidateExp.length > 0) {
            try {
              if (existing.type === "mcq" && existing.questionPayload) {
                const updatedPayload = { ...existing.questionPayload, explanation: candidateExp };
                await db
                  .update(questionBankTable)
                  .set({ question: updatedPayload })
                  .where(eq(questionBankTable.id, existing.id));
                existing.hasExplanation = true;
                enrichedExistingCount++;
              } else if (existing.type === "essay") {
                await db
                  .update(essayQuestionBankTable)
                  .set({
                    explanation: candidateExp,
                    modelAnswer: candidateExp,
                  })
                  .where(eq(essayQuestionBankTable.id, existing.id));
                existing.hasExplanation = true;
                enrichedExistingCount++;
              }
            } catch (enrichErr) {
              console.error("[QuestionBank] Error enriching existing duplicate:", enrichErr);
            }
          }
        }
      }

      const toInsert = skipDuplicates
        ? enrichedQuestions.filter((q) => !q.isDuplicate)
        : enrichedQuestions;

      const mcqsAndTFs = toInsert.filter((q) => q.questionType !== "essay");
      const essays = toInsert.filter((q) => q.questionType === "essay");

      let insertedMcqCount = 0;
      if (mcqsAndTFs.length > 0) {
        const inserted = await db
          .insert(questionBankTable)
          .values(
            mcqsAndTFs.map((q) => {
              const opts = (q.options || []).map((o: unknown) => String(o).trim());
              const cIdx = Math.max(0, Math.min(opts.length - 1, Number(q.correctIndex) || 0));
              const inferredType: "mcq" | "true_false" =
                q.questionType === "true_false" || opts.length === 2 ? "true_false" : "mcq";
              const targetStage = String((q as any).stage || stage).trim();
              const targetUnit = String((q as any).unit || unit).trim();
              const targetLesson = String((q as any).lesson || lesson).trim();
              return {
                courseId,
                category: "عام",
                stage: targetStage,
                stages: [targetStage],
                unit: targetUnit,
                lesson: targetLesson,
                lessonId: lessonId || null,
                difficulty: (q as any).difficulty || defaultDifficulty,
                points: q.points || defaultPoints,
                concept: (q as any).concept ? String((q as any).concept).trim() : null,
                translation: (q as any).translation ? String((q as any).translation).trim() : null,
                tags: [targetStage, targetUnit, targetLesson, inferredType].filter(Boolean),
                question: {
                  prompt: String(q.prompt).trim(),
                  options: opts,
                  correctIndex: cIdx,
                  correctAnswer: (q as any).correctAnswer ? String((q as any).correctAnswer).trim() : opts[cIdx] || "",
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
        insertedMcqCount = inserted.length;
      }

      let insertedEssayCount = 0;
      if (essays.length > 0) {
        // 1. Insert into essayQuestionBankTable for essay evaluation and grading
        const essayInserts = essays.map((q) => {
          const targetStage = String((q as any).stage || stage).trim();
          const targetUnit = String((q as any).unit || unit).trim();
          const targetLesson = String((q as any).lesson || lesson).trim();
          return {
            courseId,
            subject: "عام",
            stage: targetStage,
            stages: [targetStage],
            category: "عام",
            unit: targetUnit,
            lesson: targetLesson,
            difficulty: (q as any).difficulty || defaultDifficulty,
            points: q.points || defaultPoints,
            prompt: String(q.prompt).trim(),
            modelAnswer: String((q as any).correctAnswer || q.explanation || "إجابة مقالية نموذجية").trim(),
            explanation: String(q.explanation || "").trim() || undefined,
            translation: (q as any).translation ? String((q as any).translation).trim() : undefined,
            imageUrl: String(q.imageUrl || "").trim() || undefined,
            tags: [targetStage, targetUnit, targetLesson, "essay"].filter(Boolean),
          };
        });
        const insertedEssays = await db.insert(essayQuestionBankTable).values(essayInserts).returning();
        insertedEssayCount = insertedEssays.length;

        // 2. Also insert into questionBankTable with questionType: "essay" for unified access & count
        const unifiedEssays = essays.map((q) => {
          const targetStage = String((q as any).stage || stage).trim();
          const targetUnit = String((q as any).unit || unit).trim();
          const targetLesson = String((q as any).lesson || lesson).trim();
          return {
            courseId,
            category: "عام",
            stage: targetStage,
            stages: [targetStage],
            unit: targetUnit,
            lesson: targetLesson,
            lessonId: lessonId || null,
            difficulty: (q as any).difficulty || defaultDifficulty,
            points: q.points || defaultPoints,
            concept: (q as any).concept ? String((q as any).concept).trim() : null,
            translation: (q as any).translation ? String((q as any).translation).trim() : null,
            tags: [targetStage, targetUnit, targetLesson, "essay"].filter(Boolean),
            question: {
              prompt: String(q.prompt).trim(),
              options: [],
              correctIndex: -1,
              correctAnswer: String((q as any).correctAnswer || q.explanation || "").trim(),
              questionType: "essay" as const,
              explanation: String(q.explanation || "").trim() || undefined,
              translation: (q as any).translation ? String((q as any).translation).trim() : undefined,
              concept: (q as any).concept ? String((q as any).concept).trim() : undefined,
              imageUrl: String(q.imageUrl || "").trim() || undefined,
              points: q.points || defaultPoints,
            },
          };
        });
        await db.insert(questionBankTable).values(unifiedEssays);
      }

      const totalInserted = insertedMcqCount + insertedEssayCount;

      // Optional: Direct Quiz Creation on the fly
      let createdQuiz: any = null;
      if (req.body.createQuiz === true || req.body.createQuiz === "true") {
        const quizTitle =
          String(req.body.quizTitle || "").trim() ||
          (lesson === "شامل الوحدة" ? `اختبار شامل على ${unit}` : `اختبار على ${lesson}`);
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
        const quizQuestionsFormatted = toInsert.map((q) => {
          const isEssay = q.questionType === "essay" || !q.options || q.options.length === 0;
          const opts = Array.isArray(q.options) ? q.options.map((o: unknown) => String(o).trim()) : [];
          const cIdx = isEssay ? -1 : Math.max(0, Math.min(opts.length - 1, Number(q.correctIndex) || 0));
          return {
            prompt: String(q.prompt).trim(),
            options: opts,
            correctIndex: cIdx,
            correctAnswer: isEssay
              ? String((q as any).correctAnswer || q.explanation || "").trim()
              : opts[cIdx] || "",
            explanation: String(q.explanation || "").trim() || undefined,
            imageUrl: String(q.imageUrl || "").trim() || undefined,
            questionType: q.questionType || (isEssay ? "essay" : opts.length === 2 ? "true_false" : "mcq"),
            points: q.points || defaultPoints,
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
          await db.update(videosTable).set({ quizId: newQuiz.id }).where(eq(videosTable.id, resolvedVideoId));
        }

        createdQuiz = newQuiz;
      }

      const skippedDuplicates = validQuestions.length - toInsert.length;
      if (skippedDuplicates > 0 && totalInserted === 0 && !createdQuiz) {
        warnings.push("جميع الأسئلة كانت موجودة بالفعل في بنك هذا الدرس (تم تخطي التكرار بنجاح).");
      }
      if (enrichedExistingCount > 0) {
        warnings.push(`تم إثراء ${enrichedExistingCount} سؤال موجود في البنك بالتفسيرات والإجابات النموذجية الجديدة!`);
      }

      res.status(201).json({
        success: true,
        count: totalInserted,
        insertedMcqCount,
        insertedEssayCount,
        enrichedExistingCount,
        skippedDuplicates,
        breakdown: {
          total: validQuestions.length,
          inserted: totalInserted,
          enriched: enrichedExistingCount,
          skipped: skippedDuplicates,
          mcq: insertedMcqCount,
          trueFalse: mcqsAndTFs.filter((q) => q.questionType === "true_false").length,
          essay: insertedEssayCount,
        },
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

// Helper: Normalize lesson string for robust Arabic matching
export function normalizeLessonKey(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // remove tashkeel
    .replace(/[ـ\s]+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^(الدرس|المحاضرة|الفصل)\s*(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)\s*[:\-·•]?\s*/i, "")
    .replace(/^[:\-·•\d\.\s]+/, "")
    .trim();
}

export function isLessonMatch(
  dbLesson: string | null | undefined,
  targetLessons: string[],
  dbLessonId?: number | null,
  targetLessonIds?: (number | null | undefined)[]
): boolean {
  if (!targetLessons || targetLessons.length === 0) return true;
  if (dbLessonId && targetLessonIds?.length && targetLessonIds.includes(dbLessonId)) return true;

  const rawDb = (dbLesson || "").trim();
  if (!rawDb) return false;

  const normDb = normalizeLessonKey(rawDb);

  for (const target of targetLessons) {
    const rawTarget = (target || "").trim();
    if (!rawTarget) continue;

    if (rawDb.toLowerCase() === rawTarget.toLowerCase()) return true;

    const normTarget = normalizeLessonKey(rawTarget);
    if (normDb && normTarget) {
      if (normDb === normTarget || normDb.includes(normTarget) || normTarget.includes(normDb)) {
        return true;
      }
    }

    if (rawDb.includes(rawTarget) || rawTarget.includes(rawDb)) return true;
  }

  return false;
}

interface GenerateQuizParams {
  title: string;
  stage?: string;
  stages?: string[];
  unit?: string;
  lesson?: string;
  lessons?: (string | { lesson: string; lessonId?: number })[];
  courseId?: number | string | null;
  videoId?: number | string | null;
  scope?: string;
  count?: number | string;
  difficultyDistribution?: { easy?: number; medium?: number; hard?: number };
  durationMinutes?: number | string | null;
  passingScore?: number | string;
  maxAttempts?: number | string;
  shuffleQuestions?: boolean;
  showExplanations?: boolean;
  requiredProgress?: number | string;
  isPublished?: boolean;
  questionType?: string;
  isHomework?: boolean;
  previewOnly?: boolean;
  customQuestions?: QuizQuestion[];

  // Step-by-Step Custom Distribution Modes
  distributionMode?: "balanced" | "by_type" | "by_lesson" | "advanced";
  typeDistribution?: { mcq?: number; true_false?: number; essay?: number };
  lessonDistribution?: Record<string, number>;
  advancedDistribution?: Record<string, { mcq?: number; true_false?: number; essay?: number }>;
}

// Helper: Balanced sampling across target lessons
function pickFromPoolBalanced(
  pool: any[],
  count: number,
  targetLessons: string[],
  getTargetLesson: (q: any) => string,
  canPick: (q: any) => boolean,
  pickQuestion: (q: any) => void
) {
  if (count <= 0 || pool.length === 0) return;
  const byLesson = new Map<string, any[]>();
  for (const t of targetLessons) byLesson.set(t, []);
  for (const q of pool) {
    const l = getTargetLesson(q);
    if (!byLesson.has(l)) byLesson.set(l, []);
    byLesson.get(l)!.push(q);
  }
  for (const [k, list] of byLesson.entries()) {
    byLesson.set(k, [...list].sort(() => Math.random() - 0.5));
  }

  const activeLessons = targetLessons.length > 0 ? targetLessons : Array.from(byLesson.keys());
  let picked = 0;
  let rounds = 0;
  while (picked < count && rounds < 100) {
    let pickedInThisRound = 0;
    for (const lName of activeLessons) {
      if (picked >= count) break;
      const list = byLesson.get(lName) || [];
      const item = list.find((it) => canPick(it));
      if (item) {
        pickQuestion(item);
        picked++;
        pickedInThisRound++;
      }
    }
    if (pickedInThisRound === 0) {
      const rem = pool.filter((it) => canPick(it)).sort(() => Math.random() - 0.5);
      for (const item of rem) {
        if (picked >= count) break;
        pickQuestion(item);
        picked++;
      }
      break;
    }
    rounds++;
  }
}

// Unified Core Generator: Strict Lesson Isolation, Fair Balancing & Full Model Answers
async function generateQuizFromBank(params: GenerateQuizParams) {
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
    isHomework,
    previewOnly,
    customQuestions,
    distributionMode = "balanced",
    typeDistribution,
    lessonDistribution,
    advancedDistribution,
  } = params;

  if (!title || !title.trim()) {
    throw new Error("عنوان الاختبار مطلوب");
  }

  const cleanedLessons: string[] = Array.isArray(lessons)
    ? lessons
        .map((l: any) => (typeof l === "string" ? l.trim() : String(l?.lesson || "").trim()))
        .filter((l): l is string => Boolean(l && l.length > 0))
    : [];

  const singleLesson = (lesson && typeof lesson === "string" && lesson.trim() !== "all") ? lesson.trim() : null;

  // Unified list of targeted lessons
  const targetLessons: string[] = cleanedLessons.length > 0
    ? cleanedLessons
    : (singleLesson ? [singleLesson] : []);

  const hasSpecificLessons = targetLessons.length > 0;
  const isMultiLesson = cleanedLessons.length > 0;

  let resolvedVideoId = isMultiLesson ? null : (Number(videoId) || null);
  let resolvedCourseId = Number(courseId) || null;

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

  // Only filter unit if not multi-lesson (multi-lesson may span units)
  if (unit && unit !== "all" && !isMultiLesson) {
    conditions.push(eq(questionBankTable.unit, unit));
  }

  if (questionType === "true_false") {
    conditions.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') = 'true_false'`);
  } else if (questionType === "mcq") {
    conditions.push(sql`COALESCE(${questionBankTable.question}->>'questionType', 'mcq') <> 'true_false'`);
  } else if (questionType === "essay") {
    conditions.push(sql`1=0`);
  }

  const candidateQuestions = await (conditions.length ? query.where(and(...conditions)) : query);

  // STRICT ZERO-LEAKAGE LESSON FILTER:
  // When specific lessons are targeted, every single question MUST match one of the target lessons!
  const strictlyFilteredMcqTf = hasSpecificLessons
    ? candidateQuestions.filter((q) =>
        isLessonMatch(q.lesson, targetLessons, q.lessonId, resolvedVideoId ? [resolvedVideoId] : [])
      )
    : candidateQuestions;

  // Fetch Essay questions when requested or needed
  const shouldFetchEssays =
    questionType === "essay" ||
    questionType === "all" ||
    !questionType ||
    (distributionMode === "by_type" && (Number(typeDistribution?.essay) || 0) > 0) ||
    distributionMode === "advanced" ||
    distributionMode === "by_lesson";

  let candidateEssays: Array<{
    id: number;
    stage: string | null;
    unit: string | null;
    lesson: string | null;
    difficulty: string;
    points: number;
    prompt: string;
    modelAnswer: string;
    explanation: string | null;
  }> = [];

  if (shouldFetchEssays) {
    const essayConditions = [];
    if (stage && stage !== "all") {
      essayConditions.push(
        or(
          eq(essayQuestionBankTable.stage, stage),
          sql`${essayQuestionBankTable.stages}::jsonb @> ${JSON.stringify([stage])}::jsonb`
        )
      );
    }
    if (unit && unit !== "all" && !isMultiLesson) {
      essayConditions.push(eq(essayQuestionBankTable.unit, unit));
    }
    candidateEssays = await (essayConditions.length
      ? db
          .select({
            id: essayQuestionBankTable.id,
            stage: essayQuestionBankTable.stage,
            unit: essayQuestionBankTable.unit,
            lesson: essayQuestionBankTable.lesson,
            difficulty: essayQuestionBankTable.difficulty,
            points: essayQuestionBankTable.points,
            prompt: essayQuestionBankTable.prompt,
            modelAnswer: essayQuestionBankTable.modelAnswer,
            explanation: essayQuestionBankTable.explanation,
          })
          .from(essayQuestionBankTable)
          .where(and(...essayConditions))
      : db
          .select({
            id: essayQuestionBankTable.id,
            stage: essayQuestionBankTable.stage,
            unit: essayQuestionBankTable.unit,
            lesson: essayQuestionBankTable.lesson,
            difficulty: essayQuestionBankTable.difficulty,
            points: essayQuestionBankTable.points,
            prompt: essayQuestionBankTable.prompt,
            modelAnswer: essayQuestionBankTable.modelAnswer,
            explanation: essayQuestionBankTable.explanation,
          })
          .from(essayQuestionBankTable));
  }

  const strictlyFilteredEssays = hasSpecificLessons
    ? candidateEssays.filter((eq) => isLessonMatch(eq.lesson, targetLessons))
    : candidateEssays;

  type CandidateItem = {
    id: number;
    isEssay: boolean;
    stage: string | null;
    unit: string | null;
    lesson: string | null;
    lessonId: number | null;
    difficulty: "easy" | "medium" | "hard";
    points: number;
    kind: "mcq" | "true_false" | "essay";
    question: {
      prompt: string;
      options: string[];
      correctIndex: number;
      correctAnswer?: string;
      explanation?: string;
      imageUrl?: string;
      questionType: "mcq" | "true_false" | "essay";
    };
  };

  const seenBankPrompts = new Set<string>();
  const seenBankIds = new Set<number>();
  const uniqueAvailable: CandidateItem[] = [];

  for (const q of strictlyFilteredMcqTf) {
    if (!isCompleteValidQuestion(q.question)) continue;
    if (seenBankIds.has(q.id)) continue;
    seenBankIds.add(q.id);

    const pKey = normalizeQuestionPrompt(q.question?.prompt);
    if (pKey) {
      if (seenBankPrompts.has(pKey)) continue;
      seenBankPrompts.add(pKey);
    }

    const isTf = isTrueFalseQuestion(q.question);
    const kind: "mcq" | "true_false" = isTf ? "true_false" : "mcq";
    const diff = (q.difficulty === "easy" || q.difficulty === "hard") ? q.difficulty : "medium";

    uniqueAvailable.push({
      id: q.id,
      isEssay: false,
      stage: q.stage,
      unit: q.unit,
      lesson: q.lesson,
      lessonId: q.lessonId,
      difficulty: diff,
      points: q.points || 1,
      kind,
      question: {
        prompt: q.question.prompt.replace(/\r?\n\s*[A-Da-dأابجده]\)\s*$/, "").trim(),
        options: (q.question.options || []).map(cleanOptionString),
        correctIndex: q.question.correctIndex,
        correctAnswer: q.question.options[q.question.correctIndex]?.trim(),
        explanation: q.question.explanation || "",
        imageUrl: q.question.imageUrl,
        questionType: kind,
      },
    });
  }

  for (const eq of strictlyFilteredEssays) {
    if (!eq.prompt || !eq.prompt.trim()) continue;
    const pKey = normalizeQuestionPrompt(eq.prompt);
    if (pKey) {
      if (seenBankPrompts.has(pKey)) continue;
      seenBankPrompts.add(pKey);
    }
    const diff = (eq.difficulty === "easy" || eq.difficulty === "hard") ? eq.difficulty : "medium";

    uniqueAvailable.push({
      id: -eq.id,
      isEssay: true,
      stage: eq.stage,
      unit: eq.unit,
      lesson: eq.lesson,
      lessonId: null,
      difficulty: diff,
      points: eq.points || 5,
      kind: "essay",
      question: {
        prompt: eq.prompt.trim(),
        options: [],
        correctIndex: -1,
        correctAnswer: eq.modelAnswer?.trim() || "",
        explanation: eq.explanation || "",
        questionType: "essay",
      },
    });
  }

  if (uniqueAvailable.length === 0) {
    throw new Error(
      hasSpecificLessons
        ? `لا توجد أسئلة متوفرة في بنك الأسئلة للدروس المحددة (${targetLessons.join("، ")}). يرجى التأكد من إضافة أسئلة لهذه الدروس أولاً.`
        : "لا توجد أسئلة متوفرة في بنك الأسئلة لهذا النطاق."
    );
  }

  const getTargetLesson = (item: CandidateItem): string => {
    if (!hasSpecificLessons) return item.lesson || "عام";
    const matched = targetLessons.find((t) =>
      isLessonMatch(item.lesson, [t], item.lessonId, resolvedVideoId ? [resolvedVideoId] : [])
    );
    return matched || targetLessons[0];
  };

  const pickedSet = new Set<number>();
  const pickedPrompts = new Set<string>();
  const selectedRows: CandidateItem[] = [];

  const canPick = (item: CandidateItem) => {
    if (pickedSet.has(item.id)) return false;
    const pKey = normalizeQuestionPrompt(item.question?.prompt);
    if (pKey && pickedPrompts.has(pKey)) return false;
    return true;
  };

  const pickQuestion = (item: CandidateItem) => {
    pickedSet.add(item.id);
    const pKey = normalizeQuestionPrompt(item.question?.prompt);
    if (pKey) pickedPrompts.add(pKey);
    selectedRows.push(item);
  };

  // ── SELECTION EXECUTION BY DISTRIBUTION MODE ──

  if (distributionMode === "by_type" && typeDistribution) {
    const reqMcq = Math.max(0, Number(typeDistribution.mcq) || 0);
    const reqTf = Math.max(0, Number(typeDistribution.true_false) || 0);
    const reqEssay = Math.max(0, Number(typeDistribution.essay) || 0);

    const availMcq = uniqueAvailable.filter((q) => q.kind === "mcq");
    const availTf = uniqueAvailable.filter((q) => q.kind === "true_false");
    const availEssay = uniqueAvailable.filter((q) => q.kind === "essay");

    if (reqMcq > availMcq.length) {
      throw new Error(`عجز في أسئلة الاختيار من متعدد: المطلوب ${reqMcq} والمتوفر في النطاق المحدد ${availMcq.length} فقط`);
    }
    if (reqTf > availTf.length) {
      throw new Error(`عجز في أسئلة الصواب والخطأ: المطلوب ${reqTf} والمتوفر في النطاق المحدد ${availTf.length} فقط`);
    }
    if (reqEssay > availEssay.length) {
      throw new Error(`عجز في الأسئلة المقالية: المطلوب ${reqEssay} والمتوفر في النطاق المحدد ${availEssay.length} فقط`);
    }

    pickFromPoolBalanced(availMcq, reqMcq, targetLessons, getTargetLesson, canPick, pickQuestion);
    pickFromPoolBalanced(availTf, reqTf, targetLessons, getTargetLesson, canPick, pickQuestion);
    pickFromPoolBalanced(availEssay, reqEssay, targetLessons, getTargetLesson, canPick, pickQuestion);
  } else if (distributionMode === "by_lesson" && lessonDistribution) {
    for (const t of targetLessons) {
      const reqCount = Math.max(0, Number(lessonDistribution[t]) || 0);
      const lessonPool = uniqueAvailable.filter((q) => getTargetLesson(q) === t);

      if (reqCount > lessonPool.length) {
        throw new Error(`عجز في أسئلة الدرس "${t}": المطلوب ${reqCount} والمتوفر ${lessonPool.length} فقط`);
      }

      const shuffled = [...lessonPool].sort(() => Math.random() - 0.5);
      let pickedFromLesson = 0;
      for (const item of shuffled) {
        if (pickedFromLesson >= reqCount) break;
        if (canPick(item)) {
          pickQuestion(item);
          pickedFromLesson++;
        }
      }
    }
  } else if (distributionMode === "advanced" && advancedDistribution) {
    for (const t of targetLessons) {
      const cell = advancedDistribution[t] || {};
      const reqMcq = Math.max(0, Number(cell.mcq) || 0);
      const reqTf = Math.max(0, Number(cell.true_false) || 0);
      const reqEssay = Math.max(0, Number(cell.essay) || 0);

      const lessonPool = uniqueAvailable.filter((q) => getTargetLesson(q) === t);
      const availMcq = lessonPool.filter((q) => q.kind === "mcq");
      const availTf = lessonPool.filter((q) => q.kind === "true_false");
      const availEssay = lessonPool.filter((q) => q.kind === "essay");

      if (reqMcq > availMcq.length) {
        throw new Error(`عجز في أسئلة الاختيار من متعدد للدرس "${t}": المطلوب ${reqMcq} والمتوفر ${availMcq.length} فقط`);
      }
      if (reqTf > availTf.length) {
        throw new Error(`عجز في أسئلة الصواب والخطأ للدرس "${t}": المطلوب ${reqTf} والمتوفر ${availTf.length} فقط`);
      }
      if (reqEssay > availEssay.length) {
        throw new Error(`عجز في الأسئلة المقالية للدرس "${t}": المطلوب ${reqEssay} والمتوفر ${availEssay.length} فقط`);
      }

      const shuffMcq = [...availMcq].sort(() => Math.random() - 0.5);
      let pMcq = 0;
      for (const item of shuffMcq) {
        if (pMcq >= reqMcq) break;
        if (canPick(item)) { pickQuestion(item); pMcq++; }
      }

      const shuffTf = [...availTf].sort(() => Math.random() - 0.5);
      let pTf = 0;
      for (const item of shuffTf) {
        if (pTf >= reqTf) break;
        if (canPick(item)) { pickQuestion(item); pTf++; }
      }

      const shuffEssay = [...availEssay].sort(() => Math.random() - 0.5);
      let pEssay = 0;
      for (const item of shuffEssay) {
        if (pEssay >= reqEssay) break;
        if (canPick(item)) { pickQuestion(item); pEssay++; }
      }
    }
  } else {
    // Mode: balanced (fair sampling across target lessons with zero leakage)
    const qCount = Math.max(1, Math.min(200, Number(count || 10)));
    let targetCount = Math.min(qCount, uniqueAvailable.length);

    if (hasSpecificLessons) {
      const byLesson = new Map<string, CandidateItem[]>();
      for (const t of targetLessons) {
        byLesson.set(t, []);
      }

      for (const q of uniqueAvailable) {
        const matchedTarget = getTargetLesson(q);
        byLesson.get(matchedTarget)?.push(q);
      }

      for (const [key, list] of byLesson.entries()) {
        byLesson.set(key, [...list].sort(() => Math.random() - 0.5));
      }

      const lessonsWithQuestions = targetLessons.filter((t) => (byLesson.get(t) || []).length > 0);
      const effectiveLessons = lessonsWithQuestions.length > 0 ? lessonsWithQuestions : targetLessons;
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

      if (selectedRows.length < targetCount) {
        const remainingSelected = uniqueAvailable
          .filter((q) => canPick(q))
          .sort(() => Math.random() - 0.5);

        for (const item of remainingSelected) {
          if (selectedRows.length < targetCount) {
            pickQuestion(item);
          }
        }
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
  }

  let finalQuestions: QuizQuestion[] = [];

  if (Array.isArray(customQuestions) && customQuestions.length > 0) {
    // Direct adoption of reviewed custom questions (MCQ & True/False)
    for (const q of customQuestions) {
      if (!q.prompt || !q.prompt.trim()) continue;
      const opts = (q.options || []).map(cleanOptionString);
      const isTf = opts.length === 2 && (opts.includes("صواب") || opts.includes("صح") || opts.includes("True") || opts.includes("true"));
      const kind = isTf ? "true_false" : (q.questionType === "true_false" ? "true_false" : "mcq");
      const safeCorrectIdx = typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < opts.length ? q.correctIndex : 0;
      finalQuestions.push({
        prompt: q.prompt.trim(),
        options: opts,
        correctIndex: safeCorrectIdx,
        correctAnswer: q.correctAnswer?.trim() || opts[safeCorrectIdx] || "",
        explanation: q.explanation || "",
        imageUrl: q.imageUrl,
        lesson: q.lesson || (hasSpecificLessons ? targetLessons[0] : undefined),
        unit: q.unit || (unit && unit !== "all" ? unit : undefined),
        difficulty: q.difficulty || "medium",
        points: q.points || 1,
        questionType: kind,
      });
    }
  } else {
    if (selectedRows.length === 0) {
      throw new Error("تعذر اختيار أسئلة للاختبار");
    }

    // Shuffle final questions if enabled
    if (shuffleQuestions !== false) {
      selectedRows.sort(() => Math.random() - 0.5);
    }

    const finalPrompts = new Set<string>();

    for (const r of selectedRows) {
      const pKey = normalizeQuestionPrompt(r.question.prompt);
      if (pKey && finalPrompts.has(pKey)) continue;
      if (pKey) finalPrompts.add(pKey);

      const q = r.question;

      if (r.kind === "essay") {
        finalQuestions.push({
          prompt: q.prompt,
          options: [],
          correctIndex: -1,
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "",
          lesson: r.lesson || (hasSpecificLessons ? targetLessons[0] : undefined),
          unit: r.unit || undefined,
          difficulty: r.difficulty || undefined,
          points: r.points || 5,
          questionType: "essay",
        });
        continue;
      }

      if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        continue;
      }

      const correctAnswer = q.options[q.correctIndex]?.trim();
      if (!correctAnswer) {
        continue;
      }

      finalQuestions.push({
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        correctAnswer: correctAnswer,
        explanation: q.explanation || "",
        imageUrl: q.imageUrl,
        lesson: r.lesson || (hasSpecificLessons ? targetLessons[0] : undefined),
        unit: r.unit || undefined,
        difficulty: r.difficulty || undefined,
        points: r.points || 1,
        questionType: r.kind,
      });
    }
  }

  if (finalQuestions.length === 0) {
    throw new Error("لا توجد أسئلة صالحة متبقية بعد التصفية والمراجعة.");
  }

  // If previewOnly is requested, return candidate questions immediately without persisting
  if (previewOnly) {
    return {
      newQuiz: null,
      finalQuestions,
      targetCount: finalQuestions.length,
      targetLessons,
    };
  }

  const isHomeworkMode = Boolean(isHomework) || scope === "homework";
  let quizCategory = isHomeworkMode ? "واجب" : (stage || "عام");
  let isLessonScope = !isHomeworkMode && !isMultiLesson && scope === "lesson" && Boolean(resolvedVideoId);

  if (!isHomeworkMode && resolvedVideoId) {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, resolvedVideoId)).limit(1);
    if (video) {
      resolvedCourseId = video.courseId ?? resolvedCourseId;
      quizCategory = video.category || quizCategory;
      isLessonScope = true;
    }
  }

  let finalStages = Array.isArray(stages) && stages.length ? stages : (stage && stage !== "all" ? [stage] : []);

  if (!isHomeworkMode && resolvedCourseId) {
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

  const examDescription = isHomeworkMode
    ? (hasSpecificLessons
        ? `واجب منزلي مميز يغطي الدروس: ${targetLessons.join("، ")} (${stage || ""})`
        : `واجب منزلي مقرّر (${stage || ""} - ${unit || ""})`).trim()
    : (hasSpecificLessons
        ? `اختبار تقييمي مميز يغطي حصرياً الدروس: ${targetLessons.join("، ")} (${stage || ""})`
        : `اختبار تم توليده آلياً من بنك الأسئلة (${stage || ""} - ${unit || ""} - ${lesson || ""})`).trim();

  const finalScope = isHomeworkMode ? "homework" : (isLessonScope ? "lesson" : "course");

  const [newQuiz] = await db
    .insert(quizzesTable)
    .values({
      title: title.trim(),
      courseId: isHomeworkMode ? null : resolvedCourseId,
      videoId: isLessonScope ? resolvedVideoId : null,
      scope: finalScope,
      description: examDescription,
      category: isHomeworkMode ? "واجب" : quizCategory,
      stage: finalStages[0] || null,
      stages: finalStages,
      unit: unit && unit !== "all" ? unit : null,
      lesson: hasSpecificLessons ? targetLessons.join("، ") : (lesson && lesson !== "all" ? lesson : null),
      durationMinutes: durationMinutes ? Number(durationMinutes) : (isHomeworkMode ? null : 30),
      passingScore: Math.max(0, Math.min(100, Number(passingScore ?? 60))),
      maxAttempts: Math.max(0, Math.min(20, Number(maxAttempts ?? (isHomeworkMode ? 3 : 3)))),
      shuffleQuestions: shuffleQuestions !== false,
      showExplanations: showExplanations !== false,
      requiredProgress: isLessonScope ? Math.max(0, Math.min(100, Number(requiredProgress ?? 80))) : 0,
      questions: finalQuestions,
      isPublished: isPublished !== false,
    })
    .returning();

  // Link newly generated quiz directly to the video lesson and unlink previous quiz
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
        const notifTitle = isHomeworkMode ? "واجب منزلي جديد متاح لك 📚" : "اختبار جديد متاح لك 📝";
        const notifMsg = isHomeworkMode
          ? `${newQuiz.title} جاهز الآن داخل تبويب الواجب بحسابك.`
          : `${newQuiz.title} جاهز الآن داخل منصة الاختبارات.`;

        await db.insert(studentNotificationsTable).values(
          recipients.map((student) => ({
            studentId: student.id,
            type: isHomeworkMode ? "homework" : "quiz",
            title: notifTitle,
            message: notifMsg,
          }))
        );

        // Also trigger Web Push notifications
        void sendPushToStudents(
          recipients.map((s) => s.id),
          {
            title: notifTitle,
            body: notifMsg,
            url: isHomeworkMode ? "/platform/homework" : "/platform/quizzes",
          }
        ).catch(() => {});
      }
    } catch (notifErr) {
      console.error("[GENERATE_EXAM_NOTIFICATION_ERROR]", notifErr);
    }
  }

  return {
    newQuiz,
    finalQuestions,
    targetCount: finalQuestions.length,
    targetLessons,
  };
}

// POST /api/admin/learning/test-bank/generate-exam - Generate full quiz directly from Test Bank
router.post("/admin/learning/test-bank/generate-exam", requireAdmin, async (req, res, next) => {
  try {
    const result = await generateQuizFromBank(req.body);
    if (!result.newQuiz) throw new Error("تعذر توليد الاختبار");

    res.status(201).json({
      ...result.newQuiz,
      quiz: result.newQuiz,
      requestedCount: result.targetCount,
      actualCount: result.finalQuestions.length,
      selectedLessons: result.targetLessons,
      note: result.finalQuestions.length < result.targetCount
        ? `تم توليد الاختبار بـ ${result.finalQuestions.length} سؤالاً (كامل الأسئلة المتوفرة في الدروس المحددة).`
        : undefined,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "تعذر توليد الاختبار من بنك الأسئلة" });
  }
});

// POST /api/admin/learning/test-bank/preview-exam - Preview questions for review before creating exam or homework
router.post("/admin/learning/test-bank/preview-exam", requireAdmin, async (req, res, next) => {
  try {
    const result = await generateQuizFromBank({ ...req.body, previewOnly: true });
    res.json({
      questions: result.finalQuestions,
      targetCount: result.targetCount,
      targetLessons: result.targetLessons,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "تعذر استخراج ومعاينة الأسئلة من بنك الأسئلة" });
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
    const isExplicitPublish = req.body.isPublished !== undefined
      ? Boolean(req.body.isPublished)
      : req.body.publishMode === "publish";

    const result = await generateQuizFromBank({
      title: req.body.title || "اختبار آلي من بنك الأسئلة",
      stage: req.body.stage,
      stages: req.body.stages,
      unit: req.body.unit,
      lesson: req.body.lesson,
      lessons: req.body.lessons,
      courseId: req.body.courseId,
      videoId: req.body.videoId,
      scope: req.body.scope,
      count: req.body.count,
      difficultyDistribution: req.body.difficultyDistribution,
      durationMinutes: req.body.durationMinutes,
      passingScore: req.body.passingScore,
      maxAttempts: req.body.maxAttempts,
      shuffleQuestions: req.body.shuffleQuestions !== false,
      showExplanations: req.body.showExplanations !== false,
      requiredProgress: req.body.requiredProgress,
      isPublished: isExplicitPublish,
      questionType: req.body.questionType,
    });
    if (!result.newQuiz) throw new Error("تعذر توليد الاختبار");

    res.status(201).json({
      ...result.newQuiz,
      quiz: result.newQuiz,
      title: result.newQuiz.title,
      questions: result.newQuiz.questions,
      passingScore: result.newQuiz.passingScore,
      durationMinutes: result.newQuiz.durationMinutes,
      actualCount: result.finalQuestions.length,
      selectedLessons: result.targetLessons,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "تعذر توليد الاختبار من بنك الأسئلة" });
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

