import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  essayExamsTable,
  essayExamSubmissionsTable,
  studentsTable,
  studentNotificationsTable,
  type EssayExam,
  type EssayExamSubmission,
  type EssayQuestion,
  type EssayAnswer,
} from "@workspace/db";
import { requireAdmin } from "../../middleware/auth";
import { requireStudent } from "../../middleware/student-auth";
import { sendPushToStudent } from "../../services/push-notifications";
import { essayAnswersDir, essayAnswerUpload, matchStudentToStage } from "./shared";

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
        category TEXT NOT NULL DEFAULT 'عام',
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        total_points INTEGER NOT NULL DEFAULT 20,
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        allow_image_upload BOOLEAN NOT NULL DEFAULT true,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_essay_exams_course_id ON essay_exams(course_id);
      CREATE INDEX IF NOT EXISTS idx_essay_exams_category ON essay_exams(category);

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
        category: exam.category,
        durationMinutes: exam.durationMinutes || 60,
        totalPoints: exam.totalPoints,
        questionsCount,
        allowImageUpload: exam.allowImageUpload,
        isSubmitted,
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
      exam: {
        ...exam,
        questions,
      },
      submission: submission || null,
      isSubmitted,
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

    const validAnswers: EssayAnswer[] = Array.isArray(answers) ? answers : [];

    const [existing] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(and(
        eq(essayExamSubmissionsTable.examId, id),
        eq(essayExamSubmissionsTable.studentId, student.id),
      ))
      .limit(1);

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
          timeSpentSeconds: Number(timeSpentSeconds) || existing.timeSpentSeconds,
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
          timeSpentSeconds: Number(timeSpentSeconds) || 0,
          startedAt: new Date(),
          submittedAt: new Date(),
          status: "submitted",
        })
        .returning();

      submission = created;
    }

    // Auto-create notification for student acknowledging submission
    await db.insert(studentNotificationsTable).values({
      studentId: student.id,
      title: `تم تسليم ${exam.title} بنجاح ✅`,
      message: `تم تسليم إجاباتك للاختبار المقالي. الحل النموذجي والمثالي متاح الآن للمراجعة، وسيتم رصد تقييم الدكتور قريباً.`,
      type: "quiz",
    });

    res.json({
      success: true,
      message: "تم تسليم إجاباتك بنجاح! متاح لك الآن مراجعة الحل المثالي والنموذجي.",
      submission,
      modelAnswers: exam.questions,
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
    if (!req.file) {
      res.status(400).json({ error: "لم يتم اختيار صورة لرفعها" });
      return;
    }

    const fileUrl = `/api/learning/essay-exams/attachment/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
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
router.patch("/api/admin/learning/essay-exams/:id", requireAdmin, async (req, res, next) => {
  try {
    await ensureEssayExamsTables();
    const id = Number(req.params.id);
    const {
      title,
      description,
      stage,
      stages,
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
    const { adminScore, adminFeedback } = req.body;

    const [submission] = await db
      .select()
      .from(essayExamSubmissionsTable)
      .where(eq(essayExamSubmissionsTable.id, submissionId))
      .limit(1);

    if (!submission) {
      res.status(404).json({ error: "التسليم غير موجود" });
      return;
    }

    const [updated] = await db
      .update(essayExamSubmissionsTable)
      .set({
        adminScore: adminScore !== undefined && adminScore !== null ? Number(adminScore) : submission.adminScore,
        adminFeedback: adminFeedback !== undefined ? String(adminFeedback).trim() : submission.adminFeedback,
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

export default router;
