import { Router, type IRouter, type Request } from "express";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  essayExamsTable,
  essayExamSubmissionsTable,
  studentsTable,
  studentNotificationsTable,
  questionBankTable,
  essayQuestionBankTable,
  coursesTable,
  videosTable,
  type EssayExam,
  type EssayExamSubmission,
  type EssayQuestion,
  type EssayAnswer,
} from "@workspace/db";
import { requireAdmin } from "../../middleware/auth";
import { requireStudent } from "../../middleware/student-auth";
import { sendPushToStudent } from "../../services/push-notifications";
import { essayAnswersDir, essayAnswerUpload, matchStudentToStage, parseUnitSortOrder, parseLessonSortOrder } from "./shared";
import { parseEssayQuestionsFromText } from "./essay-question-bank";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;
const parseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const router: IRouter = Router();

let essayTablesInitialized = false;
async function ensureEssayExamsTables() {
  if (essayTablesInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS essay_exams (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        video_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        stage TEXT,
        stages JSONB NOT NULL DEFAULT '[]'::jsonb,
        unit TEXT,
        lesson TEXT,
        category TEXT NOT NULL DEFAULT 'عام',
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        total_points INTEGER NOT NULL DEFAULT 20,
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        allow_image_upload BOOLEAN NOT NULL DEFAULT true,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      ALTER TABLE essay_exams ADD COLUMN IF NOT EXISTS unit TEXT;
      ALTER TABLE essay_exams ADD COLUMN IF NOT EXISTS lesson TEXT;
      CREATE INDEX IF NOT EXISTS idx_essay_exams_course_id ON essay_exams(course_id);
      CREATE INDEX IF NOT EXISTS idx_essay_exams_category ON essay_exams(category);
      CREATE INDEX IF NOT EXISTS idx_essay_exams_stage_unit_lesson ON essay_exams(stage, unit, lesson);

      CREATE TABLE IF NOT EXISTS essay_exam_submissions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES essay_exams(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        student_name TEXT NOT NULL DEFAULT '',
        student_phone VARCHAR(20),
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        submitted_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'submitted',
        admin_score INTEGER,
        admin_feedback TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_essay_exam_submissions_exam_id ON essay_exam_submissions(exam_id);
      CREATE INDEX IF NOT EXISTS idx_essay_exam_submissions_student_id ON essay_exam_submissions(student_id);
    `);
    essayTablesInitialized = true;
  } catch (err) {
    console.error("[EssayExams] Error ensuring tables:", err);
  }
}

// 1. GET /api/learning/essay-exams - قائمة الاختبارات المقالية المتاحة للطالب
router.get("/learning/essay-exams", requireStudent, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const student = res.locals.student as typeof studentsTable.$inferSelect;

    const allExams = await db
      .select()
      .from(essayExamsTable)
      .where(eq(essayExamsTable.isPublished, true))
      .orderBy(desc(essayExamsTable.id));

    // Filter by student stage/category if applicable
    const relevantExams = allExams.filter((exam) => {
      if (!student.grade && !student.languageTrack) return true;
      const examStages = Array.isArray(exam.stages) && exam.stages.length ? exam.stages : exam.stage ? [exam.stage] : [];
      if (!examStages.length) return true;
      return examStages.some((s) => matchStudentToStage(s, student));
    });

    // Check student's submission status for each exam
    const examIds = relevantExams.map((e) => e.id);
    const submissions = examIds.length
      ? await db
          .select()
          .from(essayExamSubmissionsTable)
          .where(and(
            inArray(essayExamSubmissionsTable.examId, examIds),
            eq(essayExamSubmissionsTable.studentId, student.id),
          ))
      : [];

    const submissionMap = new Map(submissions.map((s) => [s.examId, s]));
    const isUnpaid = student.status !== "approved" || student.paymentStatus !== "paid";

    const result = relevantExams.map((exam) => {
      const sub = submissionMap.get(exam.id);
      const isSubmitted = sub ? sub.status === "submitted" || sub.status === "reviewed" : false;
      const questionsCount = Array.isArray(exam.questions) ? exam.questions.length : 0;

      return {
        id: exam.id,
        courseId: exam.courseId,
        videoId: exam.videoId,
        title: exam.title,
        description: exam.description,
        stage: exam.stage,
        stages: exam.stages,
        unit: exam.unit,
        lesson: exam.lesson,
        category: exam.category,
        durationMinutes: exam.durationMinutes || 60,
        totalPoints: exam.totalPoints,
        questionsCount,
        allowImageUpload: exam.allowImageUpload,
        isSubmitted,
        isLocked: isUnpaid,
        lockedReason: isUnpaid ? "تم قفل الاختبارات المقالية لحين سداد اشتراك الشهر الجديد وتأكيد الدفع." : null,
        submission: sub
          ? {
              id: sub.id,
              status: sub.status,
              startedAt: sub.startedAt,
              submittedAt: sub.submittedAt,
              timeSpentSeconds: sub.timeSpentSeconds,
              adminScore: sub.adminScore,
              adminFeedback: sub.adminFeedback,
            }
          : null,
      };
    });

    res.json({ exams: result });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/learning/essay-exams/:id - جلب تفاصيل الاختبار المقالي مع الأسئلة والحل المثالي بعد التسليم
router.get("/learning/essay-exams/:id", requireStudent, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const student = res.locals.student as typeof studentsTable.$inferSelect;

    if (student.status !== "approved" || student.paymentStatus !== "paid") {
      res.status(403).json({
        error: "تم قفل الاختبارات المقالية لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
        code: "PAYMENT_REQUIRED",
      });
      return;
    }

    const [exam] = await db
      .select()
      .from(essayExamsTable)
      .where(and(eq(essayExamsTable.id, id), eq(essayExamsTable.isPublished, true)))
      .limit(1);

    if (!exam) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود أو غير منشور" });
      return;
    }

    // Check submission
    const [submission] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(and(
        eq(essayExamSubmissionsTable.examId, id),
        eq(essayExamSubmissionsTable.studentId, student.id),
      ))
      .limit(1);

    const isSubmitted = submission ? submission.status === "submitted" || submission.status === "reviewed" : false;

    // Mask model answers if student hasn't submitted yet
    const rawQuestions: EssayQuestion[] = Array.isArray(exam.questions) ? exam.questions : [];
    const questions = rawQuestions.map((q) => {
      if (isSubmitted) {
        return q;
      }
      // Hide model answer and explanation until submitted
      return {
        id: q.id,
        prompt: q.prompt,
        points: q.points,
        imageUrl: q.imageUrl,
        // Do not include modelAnswer, modelAnswerImageUrl, or explanation
      };
    });

    res.json({
      ...exam,
      questions,
      mySubmission: submission || null,
      submission: submission || null,
      isSubmitted,
      exam: {
        ...exam,
        questions,
        mySubmission: submission || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/learning/essay-exams/:id/start - بدء عداد الاختبار المقالي وحفظ وقت البدء
router.post("/learning/essay-exams/:id/start", requireStudent, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const student = res.locals.student as typeof studentsTable.$inferSelect;

    if (student.status !== "approved" || student.paymentStatus !== "paid") {
      res.status(403).json({
        error: "تم قفل الاختبارات المقالية لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
        code: "PAYMENT_REQUIRED",
      });
      return;
    }

    const [exam] = await db
      .select()
      .from(essayExamsTable)
      .where(and(eq(essayExamsTable.id, id), eq(essayExamsTable.isPublished, true)))
      .limit(1);

    if (!exam) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود" });
      return;
    }

    const [existing] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(and(
        eq(essayExamSubmissionsTable.examId, id),
        eq(essayExamSubmissionsTable.studentId, student.id),
      ))
      .limit(1);

    if (existing) {
      res.json({
        success: true,
        submission: existing,
        submissionId: existing.id,
        startedAt: existing.startedAt,
        alreadyStarted: true,
      });
      return;
    }

    const [created] = await db
      .insert(essayExamSubmissionsTable)
      .values({
        examId: id,
        studentId: student.id,
        studentName: student.name || "",
        studentPhone: student.phone || null,
        answers: [],
        status: "in_progress",
        startedAt: new Date(),
      })
      .returning();

    res.json({
      success: true,
      submission: created,
      submissionId: created.id,
      startedAt: created.startedAt,
      alreadyStarted: false,
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/learning/essay-exams/:id/submit - تسليم إجابات الاختبار المقالي وإرجاع الحل النموذجي والمثالي فوراً
router.post("/learning/essay-exams/:id/submit", requireStudent, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const student = res.locals.student as typeof studentsTable.$inferSelect;

    if (student.status !== "approved" || student.paymentStatus !== "paid") {
      res.status(403).json({
        error: "تم قفل الاختبارات المقالية لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
        code: "PAYMENT_REQUIRED",
      });
      return;
    }

    const { answers, timeSpentSeconds } = req.body;

    const [exam] = await db
      .select()
      .from(essayExamsTable)
      .where(eq(essayExamsTable.id, id))
      .limit(1);

    if (!exam) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود" });
      return;
    }

    const examQuestions: EssayQuestion[] = Array.isArray(exam.questions) ? exam.questions : [];
    const validAnswers: EssayAnswer[] = Array.isArray(answers) ? answers : [];

    // مدة الـ 15 دقيقة الإلزامية كحد أدنى للمحاولة والحل الورقي قبل فتح الحل النموذجي
    const MIN_ATTEMPT_SECONDS = 15 * 60; // 15 دقيقة = 900 ثانية
    const examDurationSec = (exam.durationMinutes || 60) * 60;
    const effectiveMinSeconds = Math.min(MIN_ATTEMPT_SECONDS, examDurationSec);

    // التحقق من الوقت المنقضي منذ بدء الاختبار
    const [existing] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(and(
        eq(essayExamSubmissionsTable.examId, id),
        eq(essayExamSubmissionsTable.studentId, student.id),
      ))
      .limit(1);

    const startedTime = existing?.startedAt ? new Date(existing.startedAt).getTime() : Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedTime) / 1000));
    const reportedTimeSpent = Number(timeSpentSeconds) || elapsedSeconds;
    const totalTimeSpent = Math.max(elapsedSeconds, reportedTimeSpent);

    // إذا لم تنقضِ الـ 15 دقيقة بعد، ولم ينتهِ وقت الامتحان الكلي، يتم تنبيه الطالب
    if (totalTimeSpent < effectiveMinSeconds) {
      const remainingCooldown = effectiveMinSeconds - totalTimeSpent;
      const remMinutes = Math.ceil(remainingCooldown / 60);
      res.status(400).json({
        error: `عزيزي الطالب: هذا الاختبار مخصص للحل والتدريب التحريري في ورقتك الخارجية. يُرجى قضاء 15 دقيقة على الأقل في محاولة الحل والتفكير قبل فتح الحل النموذجي. متبقي لديك (${remMinutes}) دقيقة.`,
        cooldownRemainingSeconds: remainingCooldown,
      });
      return;
    }

    // قبول إجابات الطالب الورقية (لا يُشترط رفع صور أو نصوص)
    let submission: typeof essayExamSubmissionsTable.$inferSelect;

    if (existing) {
      if (existing.status === "submitted" || existing.status === "reviewed") {
        res.status(400).json({
          error: "تم تسليم هذا الاختبار مسبقاً، لا يمكن إعادة التسليم",
          alreadySubmitted: true,
        });
        return;
      }

      const [updated] = await db
        .update(essayExamSubmissionsTable)
        .set({
          answers: validAnswers,
          timeSpentSeconds: totalTimeSpent,
          submittedAt: new Date(),
          status: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(essayExamSubmissionsTable.id, existing.id))
        .returning();

      submission = updated;
    } else {
      const [created] = await db
        .insert(essayExamSubmissionsTable)
        .values({
          examId: id,
          studentId: student.id,
          studentName: student.name || "",
          studentPhone: student.phone || null,
          answers: validAnswers,
          timeSpentSeconds: totalTimeSpent,
          startedAt: new Date(Date.now() - totalTimeSpent * 1000),
          submittedAt: new Date(),
          status: "submitted",
        })
        .returning();

      submission = created;
    }

    // إشعار الطالب بظهور الحل النموذجي لبدء التقييم الذاتي
    await db.insert(studentNotificationsTable).values({
      studentId: student.id,
      title: `تم تسليم ${exam.title} بنجاح ✅`,
      message: `تم تسليم إجاباتك للاختبار المقالي. الحل النموذجي والمثالي وخطوات الحل وتوزيع الدرجات متاحة الآن لمقارنة إجابتك وتقييم أدائك ومعرفة ما ينقصك.`,
      type: "essay",
    });

    res.json({
      success: true,
      message: "تم تسليم إجاباتك بنجاح! تم فتح الحل النموذجي والمثالي وخطوات الحل الآن لمقارنة حلك وتقييم أدائك.",
      submission,
      modelAnswers: exam.questions,
    });
  } catch (error) {
    next(error);
  }
});

// 4.5. POST /api/learning/essay-exams/:id/self-assess - حفظ التقييم الذاتي للطالب بعد مراجعة الحل النموذجي
router.post("/learning/essay-exams/:id/self-assess", requireStudent, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const student = res.locals.student as typeof studentsTable.$inferSelect;

    const { questionScores, selfNotes } = req.body;

    const [existing] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(and(
        eq(essayExamSubmissionsTable.examId, id),
        eq(essayExamSubmissionsTable.studentId, student.id),
      ))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "لا يوجد تسليم سابق لهذا الاختبار" });
      return;
    }

    // لا يُسمح بالتقييم الذاتي إذا اعتمد الأدمن الدرجة بالفعل (حتى لا يتم الكتابة فوق درجة المعلم)
    if (existing.status === "reviewed" && !(existing.adminFeedback || "").startsWith("تقييم ذاتي") && existing.adminFeedback !== "تم التقييم الذاتي والمقارنة بالحل النموذجي") {
      res.status(409).json({ error: "تم اعتماد درجة هذا الاختبار من المعلم ولا يمكن تعديلها" });
      return;
    }

    const [examRow] = await db
      .select({ questions: essayExamsTable.questions })
      .from(essayExamsTable)
      .where(eq(essayExamsTable.id, id))
      .limit(1);
    const maxPoints = new Map<string, number>(
      (Array.isArray(examRow?.questions) ? examRow.questions : []).map((q) => [q.id, Number(q.points) || 0]),
    );

    let updatedAnswers: EssayAnswer[] = [];
    let totalSelfScore = 0;
    if (questionScores && typeof questionScores === "object") {
      const existingAnswers: EssayAnswer[] = Array.isArray(existing.answers) ? existing.answers : [];
      const examQuestionsList: EssayQuestion[] = Array.isArray(examRow?.questions) ? examRow.questions : [];
      
      // إذا لم يكن لدى الطالب إجابات سابقة مسجلة (لأنه حل في ورقته فقط)، ننشئ سجلات لكل سؤال
      if (existingAnswers.length === 0) {
        updatedAnswers = examQuestionsList.map((q) => {
          const qScore = questionScores[q.id];
          const raw = qScore !== undefined && qScore !== null ? Number(qScore) : 0;
          const max = maxPoints.get(q.id) ?? Number(q.points) ?? 0;
          const assigned = Math.max(0, Number.isFinite(raw) ? Math.min(raw, max) : 0);
          totalSelfScore += assigned;
          return {
            questionId: q.id,
            writtenText: "حل ورقي خارجي",
            score: assigned,
          };
        });
      } else {
        updatedAnswers = existingAnswers.map((ans) => {
          const qScore = questionScores[ans.questionId];
          const raw = qScore !== undefined && qScore !== null ? Number(qScore) : (ans.score ?? 0);
          const max = maxPoints.get(ans.questionId);
          const assigned = Math.max(0, Number.isFinite(raw) ? (max !== undefined ? Math.min(raw, max) : raw) : 0);
          totalSelfScore += assigned;
          return {
            ...ans,
            score: assigned,
          };
        });
      }
    } else {
      updatedAnswers = Array.isArray(existing.answers) ? existing.answers : [];
    }

    const noteText = selfNotes ? String(selfNotes).trim() : "";
    const feedbackText = noteText ? `تقييم ذاتي: ${noteText}` : "تم التقييم الذاتي والمقارنة بالحل النموذجي";

    const [updated] = await db
      .update(essayExamSubmissionsTable)
      .set({
        adminScore: totalSelfScore,
        adminFeedback: feedbackText,
        answers: updatedAnswers,
        status: "reviewed",
        updatedAt: new Date(),
      })
      .where(eq(essayExamSubmissionsTable.id, existing.id))
      .returning();

    res.json({
      success: true,
      message: "تم حفظ تقييمك الذاتي ورصد درجتك بنجاح 🎯",
      submission: updated,
      totalScore: totalSelfScore,
    });
  } catch (error) {
    next(error);
  }
});

// 5. POST /api/learning/essay-exams/upload-answer-image - رفع صورة ورقة الحل بخط اليد للطالب
router.post("/learning/essay-exams/upload-answer-image", requireStudent, (req, res) => {
  essayAnswerUpload(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "تعذر رفع صورة الإجابة" });
      return;
    }
    const files = req.files as Express.Multer.File[] | undefined;
    const uploadedFile = req.file || (Array.isArray(files) && files.length > 0 ? files[0] : undefined);
    if (!uploadedFile) {
      res.status(400).json({ error: "لم يتم اختيار صورة لرفعها" });
      return;
    }

    const fileUrl = `/api/learning/essay-exams/attachment/${uploadedFile.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      fileUrl,
      filename: uploadedFile.filename,
      size: uploadedFile.size,
    });
  });
});

// 6. GET /api/learning/essay-exams/attachment/:filename - استعراض صور أوراق الإجابة
router.get("/learning/essay-exams/attachment/:filename", async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(essayAnswersDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).send("الملف غير موجود");
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── ADMIN: ESSAY EXAMS MANAGEMENT (لوحة تحكم الأدمن للاختبارات المقالية) ──────
// ─────────────────────────────────────────────────────────────────────────────

// 7. GET /api/admin/learning/essay-exams - استعراض كل الاختبارات المقالية مع إحصائيات التسليم
router.get("/admin/learning/essay-exams", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();

    const exams = await db
      .select()
      .from(essayExamsTable)
      .orderBy(desc(essayExamsTable.id));

    // Get submission count stats for each exam
    const submissions = await db
      .select({
        examId: essayExamSubmissionsTable.examId,
        status: essayExamSubmissionsTable.status,
      })
      .from(essayExamSubmissionsTable);

    const statsMap = new Map<number, { total: number; submitted: number; reviewed: number }>();
    for (const sub of submissions) {
      const cur = statsMap.get(sub.examId) || { total: 0, submitted: 0, reviewed: 0 };
      cur.total++;
      if (sub.status === "submitted") cur.submitted++;
      if (sub.status === "reviewed") cur.reviewed++;
      statsMap.set(sub.examId, cur);
    }

    const result = exams.map((exam) => ({
      ...exam,
      submissionsCount: statsMap.get(exam.id)?.total || 0,
      submittedCount: statsMap.get(exam.id)?.submitted || 0,
      pendingCount: statsMap.get(exam.id)?.submitted || 0,
      reviewedCount: statsMap.get(exam.id)?.reviewed || 0,
      questionsCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
    }));

    res.json({ exams: result });
  } catch (error) {
    next(error);
  }
});

// 8. POST /api/admin/learning/essay-exams - إنشاء اختبار مقالي جديد بالأسئلة والحلول النموذجية
router.post("/admin/learning/essay-exams", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const {
      title,
      description,
      stage,
      stages,
      unit,
      lesson,
      category,
      courseId,
      videoId,
      durationMinutes,
      totalPoints,
      questions,
      allowImageUpload,
      isPublished,
    } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: "عنوان الاختبار المقالي مطلوب" });
      return;
    }

    const rawQuestions: EssayQuestion[] = Array.isArray(questions) ? questions : [];
    if (rawQuestions.length === 0) {
      res.status(400).json({ error: "يجب إضافة سؤال مقالي واحد على الأقل" });
      return;
    }

    const formattedQuestions: EssayQuestion[] = rawQuestions.map((q, idx) => ({
      id: q.id || `eq-${idx + 1}-${Date.now()}`,
      prompt: String(q.prompt || "").trim(),
      points: Number(q.points) || 5,
      modelAnswer: String(q.modelAnswer || "").trim(),
      modelAnswerImageUrl: q.modelAnswerImageUrl || undefined,
      explanation: q.explanation || undefined,
      imageUrl: q.imageUrl || undefined,
    }));

    const calculatedTotalPoints = formattedQuestions.reduce((acc, q) => acc + q.points, 0);

    const [created] = await db
      .insert(essayExamsTable)
      .values({
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        stage: stage || null,
        stages: Array.isArray(stages) ? stages : stage ? [stage] : [],
        unit: unit ? String(unit).trim() : null,
        lesson: lesson ? String(lesson).trim() : null,
        category: category || "عام",
        courseId: courseId ? Number(courseId) : null,
        videoId: videoId ? Number(videoId) : null,
        durationMinutes: Number(durationMinutes) || 60,
        totalPoints: Number(totalPoints) || calculatedTotalPoints || 20,
        questions: formattedQuestions,
        allowImageUpload: allowImageUpload !== false,
        isPublished: isPublished !== false,
      })
      .returning();

    res.json(created);
  } catch (error) {
    next(error);
  }
});

// 9. PATCH /api/admin/learning/essay-exams/:id - تعديل اختبار مقالي
router.patch("/admin/learning/essay-exams/:id", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const {
      title,
      description,
      stage,
      stages,
      unit,
      lesson,
      category,
      courseId,
      videoId,
      durationMinutes,
      totalPoints,
      questions,
      allowImageUpload,
      isPublished,
    } = req.body;

    const patch: any = { updatedAt: new Date() };

    if (title !== undefined) patch.title = String(title).trim();
    if (description !== undefined) patch.description = description ? String(description).trim() : null;
    if (stage !== undefined) patch.stage = stage || null;
    if (stages !== undefined) patch.stages = Array.isArray(stages) ? stages : [];
    if (unit !== undefined) patch.unit = unit ? String(unit).trim() : null;
    if (lesson !== undefined) patch.lesson = lesson ? String(lesson).trim() : null;
    if (category !== undefined) patch.category = category || "عام";
    if (courseId !== undefined) patch.courseId = courseId ? Number(courseId) : null;
    if (videoId !== undefined) patch.videoId = videoId ? Number(videoId) : null;
    if (durationMinutes !== undefined) patch.durationMinutes = Number(durationMinutes) || 60;
    if (allowImageUpload !== undefined) patch.allowImageUpload = Boolean(allowImageUpload);
    if (isPublished !== undefined) patch.isPublished = Boolean(isPublished);

    if (Array.isArray(questions)) {
      patch.questions = questions.map((q: any, idx: number) => ({
        id: q.id || `eq-${idx + 1}-${Date.now()}`,
        prompt: String(q.prompt || "").trim(),
        points: Number(q.points) || 5,
        modelAnswer: String(q.modelAnswer || "").trim(),
        modelAnswerImageUrl: q.modelAnswerImageUrl || undefined,
        explanation: q.explanation || undefined,
        imageUrl: q.imageUrl || undefined,
      }));
      if (totalPoints === undefined) {
        patch.totalPoints = patch.questions.reduce((acc: number, q: any) => acc + (q.points || 0), 0);
      }
    }

    if (totalPoints !== undefined) patch.totalPoints = Number(totalPoints);

    const [updated] = await db
      .update(essayExamsTable)
      .set(patch)
      .where(eq(essayExamsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود" });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 10. DELETE /api/admin/learning/essay-exams/:id - حذف اختبار مقالي
router.delete("/admin/learning/essay-exams/:id", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);

    const [deleted] = await db
      .delete(essayExamsTable)
      .where(eq(essayExamsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود" });
      return;
    }

    res.json({ success: true, message: "تم حذف الاختبار المقالي بنجاح" });
  } catch (error) {
    next(error);
  }
});

// 11. GET /api/admin/learning/essay-exams/:id/submissions - استعراض تسليمات وإجابات الطلاب
router.get("/admin/learning/essay-exams/:id/submissions", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const examId = Number(req.params.id);

    const [exam] = await db
      .select()
      .from(essayExamsTable)
      .where(eq(essayExamsTable.id, examId))
      .limit(1);

    if (!exam) {
      res.status(404).json({ error: "الاختبار المقالي غير موجود" });
      return;
    }

    const submissions = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(eq(essayExamSubmissionsTable.examId, examId))
      .orderBy(desc(essayExamSubmissionsTable.submittedAt));

    res.json({
      exam,
      submissions,
    });
  } catch (error) {
    next(error);
  }
});

// 12. POST /api/admin/learning/essay-exams/submissions/:id/grade - تصحيح إجابة طالب وإرسال الملاحظات والدرجة
router.post("/admin/learning/essay-exams/submissions/:id/grade", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const submissionId = Number(req.params.id);
    const { adminScore, adminFeedback, questionScores } = req.body;

    const [submission] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(eq(essayExamSubmissionsTable.id, submissionId))
      .limit(1);

    if (!submission) {
      res.status(404).json({ error: "التسليم غير موجود" });
      return;
    }

    let updatedAnswers = submission.answers;
    if (questionScores && typeof questionScores === "object") {
      const existingAnswers: EssayAnswer[] = Array.isArray(submission.answers) ? submission.answers : [];
      updatedAnswers = existingAnswers.map((ans) => {
        const qScore = questionScores[ans.questionId];
        return {
          ...ans,
          score: qScore !== undefined && qScore !== null ? Number(qScore) : ans.score,
        };
      });
    }

    const [updated] = await db
      .update(essayExamSubmissionsTable)
      .set({
        adminScore: adminScore !== undefined && adminScore !== null ? Number(adminScore) : submission.adminScore,
        adminFeedback: adminFeedback !== undefined ? String(adminFeedback).trim() : submission.adminFeedback,
        answers: updatedAnswers,
        status: "reviewed",
        updatedAt: new Date(),
      })
      .where(eq(essayExamSubmissionsTable.id, submissionId))
      .returning();

    // Notify student about feedback
    if (submission.studentId) {
      const [exam] = await db
        .select({ title: essayExamsTable.title })
        .from(essayExamsTable)
        .where(eq(essayExamsTable.id, submission.examId))
        .limit(1);

      const examTitle = exam?.title || "الاختبار المقالي";

      await db.insert(studentNotificationsTable).values({
        studentId: submission.studentId,
        title: `تم مراجعة إجابتك في ${examTitle} ✍️`,
        message: adminFeedback
          ? `رصد الدكتور درجتك (${adminScore ?? "—"}) وملاحظاته: ${adminFeedback}`
          : `رصد الدكتور تقييم إجابتك ودرجتك (${adminScore ?? "—"})، يمكنك مراجعتها الآن.`,
        type: "quiz",
      });

      void sendPushToStudent(submission.studentId, {
        title: `تم مراجعة إجابتك المقالية في ${examTitle}`,
        body: `سجل د. محمود تقييمه ودرجتك (${adminScore ?? "—"}). اضغط للمشاهدة.`,
        url: "/platform",
      });
    }

    res.json({
      success: true,
      message: "تم حفظ تقييم الطالب بنجاح وإرسال إشعار له.",
      submission: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. GET /api/admin/learning/essay-exams/curriculum-tree
// شجرة المنهج الفعلي المرفوع على المنصة: مراحل ⬅️ وحدات ⬅️ دروس
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/learning/essay-exams/curriculum-tree", requireAdmin, async (_req, res, next) => {
  try {
    await ensureEssayExamsTables();

    // 1. Fetch from Question Bank
    const qbRows = await db
      .select({
        stage: questionBankTable.stage,
        unit: questionBankTable.unit,
        lesson: questionBankTable.lesson,
      })
      .from(questionBankTable);

    // 2. Fetch from Essay Question Bank
    const eqbRows = await db
      .select({
        stage: essayQuestionBankTable.stage,
        unit: essayQuestionBankTable.unit,
        lesson: essayQuestionBankTable.lesson,
      })
      .from(essayQuestionBankTable);

    // 3. Fetch courses and videos uploaded to platform
    const courses = await db.select().from(coursesTable);
    const videos = await db.select().from(videosTable);

    // Hierarchical map: Stage -> Unit -> Set of Lessons
    const treeMap: Record<string, Record<string, Set<string>>> = {};

    function addEntry(stage?: string | null, unit?: string | null, lesson?: string | null) {
      const s = String(stage || "عام").trim();
      const u = String(unit || "الوحدة الأولى").trim();
      const l = lesson ? String(lesson).trim() : "";

      if (!treeMap[s]) treeMap[s] = {};
      if (!treeMap[s][u]) treeMap[s][u] = new Set();
      if (l) treeMap[s][u].add(l);
    }

    qbRows.forEach((r) => addEntry(r.stage, r.unit, r.lesson));
    eqbRows.forEach((r) => addEntry(r.stage, r.unit, r.lesson));

    // Also include videos with course titles as units
    videos.forEach((v) => {
      const course = courses.find((c) => c.id === v.courseId);
      const stage = v.stage || (course?.stages && course.stages[0]) || "عام";
      const unit = course ? course.title : "الوحدة الأولى";
      addEntry(stage, unit, v.title);
    });

    // Canonical stages and real Unit 1 curriculum guarantee
    const u1Arabic = "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع";
    const u1LessonsArabic = [
      "الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي",
      "الدرس الثاني: كيف يعمل الذكاء الاصطناعي",
      "الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية",
      "الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي",
    ];
    const canonicalArabicStages = [
      "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
      "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
      "الصف الثاني الثانوي - عربي",
      "الصف الأول الثانوي - عربي",
      "تانية بكالوريا عربي",
      "أولى بكالوريا عربي",
    ];
    for (const st of canonicalArabicStages) {
      if (!treeMap[st] || Object.keys(treeMap[st]).length === 0) {
        for (const l of u1LessonsArabic) {
          addEntry(st, u1Arabic, l);
        }
      }
    }

    const u1English = "Unit 1 – Information Technology and Society";
    const u1LessonsEnglish = [
      "Lesson 1-1 – Development of Information Technology and Social Transformation",
      "Lesson 1-2 – How AI Works",
      "Lesson 1-3 – AI in Our Daily Life",
      "Lesson 1-4 – AI Ethics",
    ];
    const canonicalLanguageStages = [
      "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
      "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)",
      "الصف الثاني الثانوي - لغات",
      "الصف الأول الثانوي - لغات",
      "تانية بكالوريا لغات",
      "أولى بكالوريا لغات",
    ];
    for (const st of canonicalLanguageStages) {
      if (!treeMap[st] || Object.keys(treeMap[st]).length === 0) {
        for (const l of u1LessonsEnglish) {
          addEntry(st, u1English, l);
        }
      }
    }

    // Format as sorted tree
    const tree = Object.entries(treeMap).map(([stage, unitsMap]) => ({
      stage,
      units: Object.entries(unitsMap)
        .sort((a, b) => parseUnitSortOrder(a[0]) - parseUnitSortOrder(b[0]))
        .map(([unit, lessonsSet]) => ({
          unit,
          lessons: Array.from(lessonsSet).sort((a, b) => parseLessonSortOrder(a) - parseLessonSortOrder(b)),
        })),
    }));

    res.json({
      success: true,
      stages: Object.keys(treeMap),
      tree,
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. POST /api/admin/learning/essay-exams/upload-parse
// رفع ملف كامل بأسئلة الدرس وإجاباتها النموذجية واستخراجها للمعاينة
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/admin/learning/essay-exams/upload-parse",
  requireAdmin,
  parseUpload.single("file"),
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
        res.status(400).json({ error: "برجاء رفع ملف (.docx أو .pdf أو .txt) أو إرسال نص أسئلة الدرس للتحليل" });
        return;
      }

      const defaultStage = req.body.defaultStage ? String(req.body.defaultStage).trim() : undefined;
      const defaultUnit = req.body.defaultUnit ? String(req.body.defaultUnit).trim() : undefined;
      const defaultLesson = req.body.defaultLesson ? String(req.body.defaultLesson).trim() : undefined;
      const defaultPoints = req.body.defaultPoints ? parseInt(String(req.body.defaultPoints), 10) || 5 : 5;

      const parsed = parseEssayQuestionsFromText(rawText, {
        stage: defaultStage,
        unit: defaultUnit,
        lesson: defaultLesson,
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
      next(err);
    }
  }
);

export default router;
