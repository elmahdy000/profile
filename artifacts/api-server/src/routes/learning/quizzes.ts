import { Router, type IRouter } from "express";
import { and, desc, eq, gt, gte, ilike, inArray, isNull, ne, or, sql, count } from "drizzle-orm";
import {
  db,
  quizzesTable,
  quizAttemptsTable,
  quizViewsTable,
  quizExtraAttemptsTable,
  quizDraftsTable,
  studentsTable,
  studentNotificationsTable,
  coursesTable,
  videosTable,
  questionBankTable,
  videoProgressTable,
  type QuizQuestion,
} from "@workspace/db";
import { requireAdmin, requireSuperAdmin } from "../../middleware/auth";
import {
  requireStudent,
  canStudentAccessContent,
  canStudentAccessLearningMode,
} from "../../middleware/student-auth";
import { sendPushToStudent, sendPushToStudents } from "../../services/push-notifications";
import { logAudit } from "../../lib/audit";
import { recordSubmissionMistakes } from "../../lib/kholasa-helpers";
import {
  normalizeQuestionPrompt,
  cleanOptionString,
  isCompleteValidQuestion,
  generateStudentMotivationMessage,
  quizImportUpload,
  matchStudentToStage,
  normalizeStringList,
  ensureAutomaticCourseAssignments,
  ensureQuizAvailabilityColumns,
  ensureQuizDraftsTable,
  enrichQuizQuestionsWithMeta,
  parseOptionalDurationMinutes,
  resolveQuizAvailability,
} from "./shared";
import {
  extractTextFromUpload,
  parseImportedQuestions,
  validateQuestions,
} from "./question-parser";

const router: IRouter = Router();

router.get("/learning/quizzes", requireStudent, async (_req, res, next) => {
  try {
    await Promise.all([ensureQuizAvailabilityColumns(), ensureQuizDraftsTable()]);
    let student = res.locals.student as typeof studentsTable.$inferSelect;
    if (student.status === "approved" && (!(student.enrolledCourseIds?.length) || !(student.enrolledCategories?.length))) {
      try {
        student = await ensureAutomaticCourseAssignments(student);
      } catch { }
    }
    const [attempts, progress, extraGrants, drafts] = await Promise.all([
      db.select({ id: quizAttemptsTable.id, quizId: quizAttemptsTable.quizId, score: quizAttemptsTable.score }).from(quizAttemptsTable).where(eq(quizAttemptsTable.studentId, student.id)),
      db.select({ videoId: videoProgressTable.videoId, progress: videoProgressTable.progress }).from(videoProgressTable).where(eq(videoProgressTable.studentId, student.id)),
      db.select().from(quizExtraAttemptsTable).where(eq(quizExtraAttemptsTable.studentId, student.id)),
      db.select().from(quizDraftsTable).where(eq(quizDraftsTable.studentId, student.id)),
    ]);
    const attemptedQuizIds = Array.from(new Set(attempts.map((a) => a.quizId)));
    const quizzes = await db
      .select()
      .from(quizzesTable)
      .where(
        attemptedQuizIds.length > 0
          ? or(eq(quizzesTable.isPublished, true), inArray(quizzesTable.id, attemptedQuizIds))
          : eq(quizzesTable.isPublished, true),
      )
      .orderBy(desc(quizzesTable.createdAt));

    const attemptsByQuiz = new Map<number, { count: number; bestScore: number }>();
    for (const attempt of attempts) {
      const current = attemptsByQuiz.get(attempt.quizId) ?? { count: 0, bestScore: 0 };
      attemptsByQuiz.set(attempt.quizId, {
        count: current.count + 1,
        bestScore: Math.max(current.bestScore, attempt.score ?? 0),
      });
    }
    const extraGrantsMap = new Map(extraGrants.map((row) => [row.quizId, row.extraAttempts]));
    const progressByVideo = new Map(progress.map((row) => [row.videoId, row.progress]));
    const draftByQuiz = new Map(drafts.map((row) => [row.quizId, row]));
    res.json(
      quizzes
        .filter((quiz) =>
          attemptedQuizIds.includes(quiz.id) ||
          canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId),
        )
        .map((quiz) => {
          const quizAttempts = attemptsByQuiz.get(quiz.id);
          const attemptsUsed = quizAttempts?.count ?? 0;
          const bestScore = quizAttempts?.bestScore ?? null;
          const extraGranted = extraGrantsMap.get(quiz.id) ?? 0;
          const progressLocked = quiz.scope === "lesson" && quiz.videoId !== null &&
            (progressByVideo.get(quiz.videoId) ?? 0) < quiz.requiredProgress;
          const unlimitedAttempts = !quiz.maxAttempts || quiz.maxAttempts <= 0;
          const effectiveMaxAttempts = unlimitedAttempts ? null : quiz.maxAttempts + extraGranted;
          const attemptsLocked = !unlimitedAttempts && attemptsUsed >= (effectiveMaxAttempts ?? 0);
          const windowExpired = Boolean(
            quiz.availableUntil && Date.now() > new Date(quiz.availableUntil).getTime(),
          );
          const isArchivedReview = !quiz.isPublished && attemptsUsed > 0;
          const paymentLocked = student.status !== "approved" || student.paymentStatus !== "paid";
          const expiredLabel = quiz.openHours ? `${quiz.openHours} ساعة` : "المدة المحددة";
          const savedDraft = !paymentLocked ? draftByQuiz.get(quiz.id) : undefined;
          const enrichedQuestions = enrichQuizQuestionsWithMeta(quiz.questions, quiz.unit, quiz.lesson);
          return {
            ...quiz,
            maxAttempts: effectiveMaxAttempts,
            extraAttemptsGranted: extraGranted,
            attemptsUsed,
            bestScore,
            windowExpired,
            isArchivedReview,
            draft: savedDraft
              ? {
                  questionOrder: savedDraft.questionOrder || [],
                  answersByOriginalIndex: savedDraft.answersByOriginalIndex || {},
                  essayByOriginalIndex: savedDraft.essayByOriginalIndex || {},
                  flaggedByOriginalIndex: savedDraft.flaggedByOriginalIndex || {},
                  lastQuestionIndex: savedDraft.lastQuestionIndex ?? 0,
                  elapsedSeconds: savedDraft.elapsedSeconds ?? 0,
                  clientSubmissionId: savedDraft.clientSubmissionId || "",
                  updatedAt: savedDraft.updatedAt,
                }
              : null,
            locked: paymentLocked || progressLocked || attemptsLocked || windowExpired || !quiz.isPublished,
            lockedReason: paymentLocked
              ? "هذا الاختبار مقفل لحين سداد اشتراك الشهر الجديد وتأكيد الدفع"
              : !quiz.isPublished
                ? "تم إغلاق التسليم لهذا الاختبار — متاح للمراجعة فقط"
                : windowExpired
                  ? `انتهت مدة إتاحة الاختبار (${expiredLabel})`
                  : attemptsLocked
                    ? "استخدمت كل المحاولات المتاحة"
                    : progressLocked
                      ? `أكمل ${quiz.requiredProgress}% من الدرس أولًا`
                      : null,
            questions: paymentLocked ? [] : enrichedQuestions.map(
              ({ correctIndex: _correctIndex, correctAnswer: _correctAnswer, ...question }) => question,
            ),
          };
        }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/learning/progress", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const [rows, accessibleVideos] = await Promise.all([
      db
        .select({
          videoId: videoProgressTable.videoId,
          progress: videoProgressTable.progress,
          currentTimeSeconds: videoProgressTable.currentTimeSeconds,
          durationSeconds: videoProgressTable.durationSeconds,
          completed: videoProgressTable.completed,
          updatedAt: videoProgressTable.updatedAt,
        })
        .from(videoProgressTable)
        .where(eq(videoProgressTable.studentId, student.id)),
      db
        .select({ id: videosTable.id, category: videosTable.category, stage: videosTable.stage, stages: videosTable.stages, courseId: videosTable.courseId })
        .from(videosTable),
    ]);

    const studentAccessibleVideos = accessibleVideos.filter((v) =>
      canStudentAccessContent(student, v.category, v.stage, v.stages, v.courseId),
    );
    const totalAccessibleCount = studentAccessibleVideos.length;

    let overallProgress = 0;
    let completedCount = 0;

    if (totalAccessibleCount > 0) {
      const accessibleIds = new Set(studentAccessibleVideos.map((v) => v.id));
      const filteredRows = rows.filter((r) => accessibleIds.has(r.videoId));

      const totalProgressSum = filteredRows.reduce((acc, curr) => acc + (curr.progress || 0), 0);
      completedCount = filteredRows.filter((r) => r.completed || (r.progress || 0) >= 90).length;
      overallProgress = Math.round(totalProgressSum / totalAccessibleCount);
    }

    const motivation = generateStudentMotivationMessage(student.name, overallProgress);

    res.json({
      rows,
      overallProgress,
      completedCount,
      totalCount: totalAccessibleCount,
      motivation,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/learning/progress/:videoId",
  requireStudent,
  async (req, res, next) => {
    try {
      const student = res.locals.student as typeof studentsTable.$inferSelect;
      const videoId = Number(req.params.videoId);
      const progress = Math.max(
        0,
        Math.min(100, Math.round(Number(req.body.progress))),
      );
      const currentTimeSeconds = Math.max(0, Math.round(Number(req.body.currentTimeSeconds ?? 0)));
      const durationSeconds = Math.max(0, Math.round(Number(req.body.durationSeconds ?? 0)));
      if (
        !Number.isInteger(videoId) ||
        videoId <= 0 ||
        !Number.isFinite(progress) ||
        !Number.isFinite(currentTimeSeconds) ||
        !Number.isFinite(durationSeconds)
      ) {
        res.status(400).json({ error: "بيانات التقدم غير صالحة" });
        return;
      }
      const [video] = await db
        .select()
        .from(videosTable)
        .where(eq(videosTable.id, videoId))
        .limit(1);
      if (
        !video ||
        !canStudentAccessContent(
          student,
          video.category,
          video.stage,
          video.stages,
          video.courseId,
        ) ||
        !canStudentAccessLearningMode(student, video.learningMode)
      ) {
        res.status(403).json({ error: "الفيديو مش ضمن الكورس المسجل ليك" });
        return;
      }
      const [current] = await db
        .select()
        .from(videoProgressTable)
        .where(
          and(
            eq(videoProgressTable.studentId, student.id),
            eq(videoProgressTable.videoId, videoId),
          ),
        )
        .limit(1);
      const savedProgress = Math.max(current?.progress ?? 0, progress);
      const savedTime = savedProgress > (current?.progress ?? 0)
        ? currentTimeSeconds
        : Math.max(current?.currentTimeSeconds ?? 0, currentTimeSeconds);
      const savedDuration = Math.max(current?.durationSeconds ?? 0, durationSeconds);
      const [saved] = await db
        .insert(videoProgressTable)
        .values({
          studentId: student.id,
          videoId,
          progress: savedProgress,
          currentTimeSeconds: savedTime,
          durationSeconds: savedDuration,
          completed: savedProgress >= 90,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [videoProgressTable.studentId, videoProgressTable.videoId],
          set: {
            progress: savedProgress,
            currentTimeSeconds: savedTime,
            durationSeconds: savedDuration,
            completed: savedProgress >= 90,
            updatedAt: new Date(),
          },
        })
        .returning();

      const now = new Date();
      await db
        .update(studentsTable)
        .set({ lastActiveAt: now, updatedAt: now })
        .where(eq(studentsTable.id, student.id));

      res.json({
        videoId: saved.videoId,
        progress: saved.progress,
        currentTimeSeconds: saved.currentTimeSeconds,
        durationSeconds: saved.durationSeconds,
        completed: saved.completed,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/admin/learning/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [students, progressRows, attempts, videos] = await Promise.all([
      db.select().from(studentsTable).orderBy(desc(studentsTable.createdAt)),
      db
        .select({
          studentId: videoProgressTable.studentId,
          progress: videoProgressTable.progress,
          completed: videoProgressTable.completed,
          updatedAt: videoProgressTable.updatedAt,
        })
        .from(videoProgressTable),
      db
        .select({
          studentId: quizAttemptsTable.studentId,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          createdAt: quizAttemptsTable.createdAt,
        })
        .from(quizAttemptsTable),
      db
        .select({
          id: videosTable.id,
          category: videosTable.category,
          stage: videosTable.stage,
          stages: videosTable.stages,
          courseId: videosTable.courseId,
          learningMode: videosTable.learningMode,
          isPublished: videosTable.isPublished,
        })
        .from(videosTable)
        .where(eq(videosTable.isPublished, true)),
    ]);
    const now = Date.now();
    const activeCutoff = now - 14 * 24 * 60 * 60 * 1000;

    // Pre-group progress & attempts by studentId in O(N + M) instead of O(Students * Attempts)
    const progressByStudent = new Map<number, typeof progressRows>();
    for (const row of progressRows) {
      const list = progressByStudent.get(row.studentId);
      if (list) list.push(row);
      else progressByStudent.set(row.studentId, [row]);
    }
    const attemptsByStudent = new Map<number, typeof attempts>();
    for (const row of attempts) {
      const list = attemptsByStudent.get(row.studentId);
      if (list) list.push(row);
      else attemptsByStudent.set(row.studentId, [row]);
    }

    // Geographic and Grade Aggregations
    const governorateCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const gradeCounts: Record<string, number> = {};
    const paymentStatusCounts: Record<string, number> = {};

    students.forEach((student) => {
      const gov = student.governorate?.trim() || "غير محدد";
      const city = student.city?.trim() || "غير محدد";
      const grade = student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade?.trim() || "غير محدد";
      const payment = student.paymentStatus || "unpaid";

      governorateCounts[gov] = (governorateCounts[gov] || 0) + 1;
      if (student.governorate) {
        const fullCityKey = `${gov} - ${city}`;
        cityCounts[fullCityKey] = (cityCounts[fullCityKey] || 0) + 1;
      }
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
      paymentStatusCounts[payment] = (paymentStatusCounts[payment] || 0) + 1;
    });

    const governorateDistribution = Object.entries(governorateCounts)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    const topCities = Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const gradeDistribution = Object.entries(gradeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const studentRows = students.map((student) => {
      const ownProgress = progressByStudent.get(student.id) ?? [];
      const ownAttempts = attemptsByStudent.get(student.id) ?? [];
      const eligibleVideos = videos.filter((video) =>
        canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId) &&
        canStudentAccessLearningMode(student, video.learningMode),
      );
      let lastActivityMs = 0;
      for (const row of ownProgress) {
        const t = row.updatedAt.getTime();
        if (t > lastActivityMs) lastActivityMs = t;
      }
      for (const row of ownAttempts) {
        const t = row.createdAt.getTime();
        if (t > lastActivityMs) lastActivityMs = t;
      }
      return {
        studentId: student.id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        governorate: student.governorate || "غير محدد",
        city: student.city || "غير محدد",
        grade: student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade || "غير محدد",
        status: student.status,
        paymentStatus: student.paymentStatus || "unpaid",
        learningMode: student.learningMode,
        assignedLessons: eligibleVideos.length,
        startedLessons: ownProgress.length,
        completedLessons: ownProgress.filter((row) => row.completed).length,
        averageProgress: ownProgress.length
          ? Math.round(ownProgress.reduce((sum, row) => sum + row.progress, 0) / ownProgress.length)
          : 0,
        quizAttempts: ownAttempts.length,
        averageQuizScore: ownAttempts.length
          ? Math.round(ownAttempts.reduce((sum, row) => sum + row.score, 0) / ownAttempts.length)
          : 0,
        lastActivity: lastActivityMs ? new Date(lastActivityMs).toISOString() : null,
        isActive: lastActivityMs >= activeCutoff,
      };
    });
    const approvedRows = studentRows.filter((row) => row.status === "approved");
    res.json({
      summary: {
        totalStudents: students.length,
        approvedStudents: approvedRows.length,
        activeStudents: approvedRows.filter((row) => row.isActive).length,
        inactiveStudents: approvedRows.filter((row) => !row.isActive).length,
        completedLessons: progressRows.filter((row) => row.completed).length,
        averageProgress: progressRows.length
          ? Math.round(progressRows.reduce((sum, row) => sum + row.progress, 0) / progressRows.length)
          : 0,
        quizPassRate: attempts.length
          ? Math.round((attempts.filter((row) => row.passed).length / attempts.length) * 100)
          : 0,
        paidStudents: paymentStatusCounts["paid"] || 0,
        pendingReviewPayments: paymentStatusCounts["pending_review"] || 0,
      },
      governorateDistribution,
      topCities,
      gradeDistribution,
      paymentStatusCounts,
      students: studentRows,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/analytics/export", requireAdmin, async (_req, res, next) => {
  try {
    const [students, progressRows, attempts, videos] = await Promise.all([
      db.select().from(studentsTable).orderBy(desc(studentsTable.createdAt)),
      db
        .select({
          studentId: videoProgressTable.studentId,
          progress: videoProgressTable.progress,
          completed: videoProgressTable.completed,
          updatedAt: videoProgressTable.updatedAt,
        })
        .from(videoProgressTable),
      db
        .select({
          studentId: quizAttemptsTable.studentId,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          createdAt: quizAttemptsTable.createdAt,
        })
        .from(quizAttemptsTable),
      db
        .select({
          id: videosTable.id,
          category: videosTable.category,
          stage: videosTable.stage,
          stages: videosTable.stages,
          courseId: videosTable.courseId,
          learningMode: videosTable.learningMode,
          isPublished: videosTable.isPublished,
        })
        .from(videosTable)
        .where(eq(videosTable.isPublished, true)),
    ]);
    const progressByStudent = new Map<number, typeof progressRows>();
    for (const row of progressRows) {
      const list = progressByStudent.get(row.studentId);
      if (list) list.push(row);
      else progressByStudent.set(row.studentId, [row]);
    }
    const attemptsByStudent = new Map<number, typeof attempts>();
    for (const row of attempts) {
      const list = attemptsByStudent.get(row.studentId);
      if (list) list.push(row);
      else attemptsByStudent.set(row.studentId, [row]);
    }
    const now = Date.now();
    const activeCutoff = now - 14 * 24 * 60 * 60 * 1000;
    const studentRows = students.map((student) => {
      const ownProgress = progressByStudent.get(student.id) ?? [];
      const ownAttempts = attemptsByStudent.get(student.id) ?? [];
      const eligibleVideos = videos.filter((video) =>
        canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId) &&
        canStudentAccessLearningMode(student, video.learningMode),
      );
      let lastActivityMs = 0;
      for (const row of ownProgress) {
        const t = row.updatedAt.getTime();
        if (t > lastActivityMs) lastActivityMs = t;
      }
      for (const row of ownAttempts) {
        const t = row.createdAt.getTime();
        if (t > lastActivityMs) lastActivityMs = t;
      }
      return {
        name: student.name,
        phone: student.phone,
        status: student.status,
        learningMode: student.learningMode,
        assignedLessons: eligibleVideos.length,
        completedLessons: ownProgress.filter((row) => row.completed).length,
        averageProgress: ownProgress.length
          ? Math.round(ownProgress.reduce((sum, row) => sum + row.progress, 0) / ownProgress.length)
          : 0,
        quizAttempts: ownAttempts.length,
        averageQuizScore: ownAttempts.length
          ? Math.round(ownAttempts.reduce((sum, row) => sum + row.score, 0) / ownAttempts.length)
          : 0,
        lastActivity: lastActivityMs ? new Date(lastActivityMs).toISOString() : "",
        isActive: lastActivityMs >= activeCutoff,
      };
    });

    const headers = [
      "اسم الطالب",
      "رقم الهاتف",
      "الحالة",
      "نظام الدراسة",
      "الدروس المتاحة",
      "الدروس المكتملة",
      "متوسط التقدم",
      "محاولات الاختبارات",
      "متوسط درجات الاختبارات",
      "آخر نشاط",
    ];

    const escapeCell = (value: string | number | boolean) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvRows = [
      headers.map(escapeCell).join(","),
      ...studentRows.map((row) =>
        [
          row.name,
          row.phone,
          row.status,
          row.learningMode ?? "",
          row.assignedLessons,
          row.completedLessons,
          row.averageProgress,
          row.quizAttempts,
          row.averageQuizScore,
          row.lastActivity,
        ]
          .map(escapeCell)
          .join(","),
      ),
    ];

    // UTF-8 BOM for Arabic Excel compatibility
    const bom = "﻿";
    const csvContent = bom + csvRows.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="students-analytics.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/quizzes/import", requireAdmin, (req, res, next) => {
  quizImportUpload(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({ error: uploadError.message || "تعذر رفع الملف" });
      return;
    }
    try {
      if (!req.file) {
        res.status(400).json({ error: "اختر ملفًا لاستيراد الأسئلة" });
        return;
      }
      const extractedText = await extractTextFromUpload(req.file.buffer, req.file.originalname);
      if (!extractedText.trim()) {
        res.status(422).json({ error: "لم نتمكن من قراءة نص من الملف. إذا كان PDF مصورًا، حوّله إلى PDF قابل للبحث أولًا." });
        return;
      }
      const parsed = parseImportedQuestions(extractedText);
      if (!parsed.questions.length) {
        res.status(422).json({
          error: "لم يتم اكتشاف أسئلة متعددة الاختيارات. رقّم الأسئلة والاختيارات وأضف سطر Answer أو الإجابة الصحيحة.",
        });
        return;
      }
      res.json({ ...parsed, extractedText });
    } catch (error) {
      next(error);
    }
  });
});

// ── Master Toggle: Global Status & Pause/Resume All Exams ──
router.get("/admin/learning/quizzes/global-status", requireAdmin, async (_req, res, next) => {
  try {
    const [pubCountRes, unpubCountRes, backupCountRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(quizzesTable).where(eq(quizzesTable.isPublished, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(quizzesTable).where(eq(quizzesTable.isPublished, false)),
      db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'exams_active_backup'
        ) as exists,
        COALESCE((SELECT count(*)::int FROM exams_active_backup), 0) as backup_count
      `).catch(() => ({ rows: [{ exists: false, backup_count: 0 }] })),
    ]);

    const publishedCount = pubCountRes[0]?.count ?? 0;
    const unpublishedCount = unpubCountRes[0]?.count ?? 0;
    const backupRow = (backupCountRes as any)?.rows?.[0] || { exists: false, backup_count: 0 };
    const hasBackup = Boolean(backupRow.exists && Number(backupRow.backup_count) > 0);
    const backupCount = Number(backupRow.backup_count) || 0;

    const isPaused = hasBackup || (publishedCount === 0 && backupCount > 0);

    res.json({
      success: true,
      publishedCount,
      unpublishedCount,
      isPaused,
      hasBackup,
      backupCount,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/quizzes/global-toggle", requireAdmin, async (req, res, next) => {
  try {
    const { action } = req.body;
    if (action !== "pause" && action !== "resume") {
      res.status(400).json({ error: "الإجراء غير صالح. يجب أن يكون 'pause' أو 'resume'." });
      return;
    }

    if (action === "pause") {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS exams_active_backup (
          id integer PRIMARY KEY,
          exam_type text NOT NULL,
          backed_up_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await db.execute(sql`
        INSERT INTO exams_active_backup (id, exam_type)
        SELECT id, 'quiz' FROM quizzes WHERE is_published = true
        ON CONFLICT (id) DO NOTHING;
      `);

      try {
        await db.execute(sql`
          INSERT INTO exams_active_backup (id, exam_type)
          SELECT id, 'essay' FROM essay_exams WHERE is_published = true
          ON CONFLICT (id) DO NOTHING;
        `);
      } catch { }

      const backupCountRes = await db.execute(sql`SELECT count(*)::int as cnt FROM exams_active_backup;`);
      const backupCount = Number((backupCountRes as any)?.rows?.[0]?.cnt) || 0;

      await db.execute(sql`UPDATE quizzes SET is_published = false WHERE is_published = true;`);
      try {
        await db.execute(sql`UPDATE essay_exams SET is_published = false WHERE is_published = true;`);
      } catch { }

      try {
        await logAudit(
          req,
          "PAUSE_ALL_EXAMS",
          "exams",
          null,
          `تم إيقاف جميع الامتحانات مؤقتاً بواسطة الأدمن (${backupCount} امتحان)`,
        );
      } catch { }

      res.json({
        success: true,
        isPaused: true,
        backupCount,
        message: `تم إيقاف جميع الامتحانات مؤقتاً بنجاح (تم حفظ ${backupCount} امتحان في النسخة الاحتياطية).`,
      });
    } else {
      // Resume
      const checkRes = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'exams_active_backup'
        ) as exists;
      `);
      const tableExists = Boolean((checkRes as any)?.rows?.[0]?.exists);

      let restoredQuizzes = 0;
      if (tableExists) {
        const updateQuizzesRes = await db.execute(sql`
          UPDATE quizzes 
          SET is_published = true 
          WHERE id IN (SELECT id FROM exams_active_backup WHERE exam_type = 'quiz')
          RETURNING id;
        `);
        restoredQuizzes = (updateQuizzesRes as any)?.rows?.length || 0;

        try {
          await db.execute(sql`
            UPDATE essay_exams 
            SET is_published = true 
            WHERE id IN (SELECT id FROM exams_active_backup WHERE exam_type = 'essay');
          `);
        } catch { }

        await db.execute(sql`DROP TABLE IF EXISTS exams_active_backup;`);
      } else {
        res.status(400).json({
          error: "لم يتم العثور على نسخة احتياطية للامتحانات الموقوفة.",
        });
        return;
      }

      try {
        await logAudit(
          req,
          "RESUME_ALL_EXAMS",
          "exams",
          null,
          `تم إعادة تفعيل جميع الامتحانات بواسطة الأدمن (${restoredQuizzes} امتحان)`,
        );
      } catch { }

      res.json({
        success: true,
        isPaused: false,
        restoredCount: restoredQuizzes,
        message: `تم إعادة تفعيل ${restoredQuizzes} امتحان بنجاح وإتاحتها للطلاب.`,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/quizzes", requireAdmin, async (_req, res, next) => {
  try {
    await ensureQuizAvailabilityColumns();
    const quizzes = await db
      .select()
      .from(quizzesTable)
      .orderBy(desc(quizzesTable.createdAt));

    // Aggregate attempts count and distinct students count per quiz
    const attemptStats = await db
      .select({
        quizId: quizAttemptsTable.quizId,
        totalAttempts: sql<number>`count(${quizAttemptsTable.id})::int`,
        uniqueStudents: sql<number>`count(distinct ${quizAttemptsTable.studentId})::int`,
      })
      .from(quizAttemptsTable)
      .groupBy(quizAttemptsTable.quizId);

    // Aggregate views count and distinct students who opened the quiz/homework
    const viewStats = await db
      .select({
        quizId: quizViewsTable.quizId,
        totalOpens: sql<number>`COALESCE(sum(${quizViewsTable.viewCount}), 0)::int`,
        openedStudents: sql<number>`count(distinct ${quizViewsTable.studentId})::int`,
      })
      .from(quizViewsTable)
      .groupBy(quizViewsTable.quizId);

    const statsMap = new Map<number, { totalAttempts: number; uniqueStudents: number }>(
      attemptStats.map((s) => [
        s.quizId,
        {
          totalAttempts: Number(s.totalAttempts) || 0,
          uniqueStudents: Number(s.uniqueStudents) || 0,
        },
      ]),
    );

    const viewsMap = new Map<number, { totalOpens: number; openedStudents: number }>(
      viewStats.map((v) => [
        v.quizId,
        {
          totalOpens: Number(v.totalOpens) || 0,
          openedStudents: Number(v.openedStudents) || 0,
        },
      ]),
    );

    const enriched = quizzes.map((q) => {
      const stats = statsMap.get(q.id);
      const vStats = viewsMap.get(q.id);
      return {
        ...q,
        attemptsCount: stats?.totalAttempts ?? 0,
        uniqueStudentsCount: stats?.uniqueStudents ?? 0,
        openedStudentsCount: vStats?.openedStudents ?? 0,
        totalOpensCount: vStats?.totalOpens ?? 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/quizzes/:id/views - Get list of students who opened this homework or quiz
router.get("/admin/learning/quizzes/:id/views", requireAdmin, async (req, res, next) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ error: "معرف الاختبار غير صالح" });
      return;
    }

    const [quiz] = await db
      .select({ id: quizzesTable.id, title: quizzesTable.title, scope: quizzesTable.scope, category: quizzesTable.category })
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .limit(1);

    if (!quiz) {
      res.status(404).json({ error: "الواجب أو الاختبار غير موجود" });
      return;
    }

    const views = await db
      .select({
        id: quizViewsTable.id,
        quizId: quizViewsTable.quizId,
        studentId: quizViewsTable.studentId,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        studentGrade: studentsTable.grade,
        studentStage: studentsTable.academicTrack,
        parentPhone: studentsTable.parentPhone,
        firstViewedAt: quizViewsTable.firstViewedAt,
        lastViewedAt: quizViewsTable.lastViewedAt,
        viewCount: quizViewsTable.viewCount,
      })
      .from(quizViewsTable)
      .innerJoin(studentsTable, eq(quizViewsTable.studentId, studentsTable.id))
      .where(eq(quizViewsTable.quizId, quizId))
      .orderBy(desc(quizViewsTable.lastViewedAt));

    res.json({
      quiz,
      totalStudents: views.length,
      totalViews: views.reduce((sum, v) => sum + (v.viewCount || 1), 0),
      students: views,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/quizzes", requireAdmin, async (req, res, next) => {
  try {
    const questions = validateQuestions(req.body.questions);
    const title = String(req.body.title ?? "").trim();
    if (!title || !questions) {
      res.status(400).json({ error: "Valid title and questions are required" });
      return;
    }
    const courseId = Number(req.body.courseId);
    const videoId = Number(req.body.videoId) || null;
    const scope = req.body.scope === "lesson" ? "lesson" : req.body.scope === "homework" ? "homework" : "course";
    const stages = normalizeStringList(req.body.stages ?? req.body.stage);
    const [course] = Number.isInteger(courseId) ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
    if (!course || stages.length === 0 || stages.some((stage: string) => Array.isArray(course.stages) && course.stages.length > 0 && !course.stages.includes(stage))) {
      res.status(400).json({ error: "اختر كورسًا ومراحل صحيحة" }); return;
    }
    const [video] = scope === "lesson" && videoId
      ? await db.select().from(videosTable).where(eq(videosTable.id, videoId)).limit(1)
      : [];
    if (scope === "lesson" && (!video || video.courseId !== courseId)) {
      res.status(400).json({ error: "اختر درسًا صحيحًا من نفس الكورس" }); return;
    }
    if (video) {
      const [linkedQuiz] = await db.select({ id: quizzesTable.id }).from(quizzesTable).where(eq(quizzesTable.videoId, video.id)).limit(1);
      if (linkedQuiz) { res.status(409).json({ error: "هذا الدرس مرتبط باختبار بالفعل" }); return; }
    }
    await ensureQuizAvailabilityColumns();
    const isPublished = req.body.isPublished === true;
    const { openHours, availableUntil } = resolveQuizAvailability({
      rawOpenHours: req.body.openHours,
      rawAvailableUntil: req.body.availableUntil,
      scope,
      isPublished,
      isCreate: true,
    });
    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        title,
        courseId,
        videoId: scope === "lesson" ? videoId : null,
        scope,
        description: String(req.body.description ?? "").trim() || null,
        category: course.title,
        stage: stages[0] ?? null,
        stages,
        passingScore: Math.max(
          0,
          Math.min(100, Number(req.body.passingScore ?? 60)),
        ),
        durationMinutes: parseOptionalDurationMinutes(req.body.durationMinutes),
        openHours,
        availableUntil,
        questionsToShow: req.body.questionsToShow ? Number(req.body.questionsToShow) : null,
        shuffleQuestions: Boolean(req.body.shuffleQuestions),
        showExplanations: req.body.showExplanations !== false,
        // maxAttempts: 0 = unlimited; otherwise clamp to 1..20
        maxAttempts: Math.max(0, Math.min(20, Number(req.body.maxAttempts ?? 3))),
        requiredProgress: scope === "lesson" ? Math.max(0, Math.min(100, Number(req.body.requiredProgress ?? 80))) : 0,
        questions,
        isPublished,
      })
      .returning();
    if (video) await db.update(videosTable).set({ quizId: quiz.id }).where(eq(videosTable.id, video.id));
    if (quiz.isPublished) {
      const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
      const recipients = approvedStudents.filter((student) =>
        canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId));
      if (recipients.length) {
        await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "quiz",
          title: "اختبار جديد متاح لك",
          message: `${quiz.title} جاهز الآن داخل الاختبارات.`,
        })));
        void sendPushToStudents(
          recipients.map((s) => s.id),
          {
            title: "اختبار جديد متاح لك 📝",
            body: `${quiz.title} جاهز الآن داخل المنصة.`,
            url: "/platform",
            tag: `quiz-${quiz.id}`,
          }
        );
      }
    }
    res.status(201).json(quiz);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/admin/learning/quizzes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      await ensureQuizAvailabilityColumns();
      const quizId = Number(req.params.id);
      const [current] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
      if (!current) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
      const courseId = req.body.courseId !== undefined
        ? (req.body.courseId && Number(req.body.courseId) > 0 ? Number(req.body.courseId) : null)
        : current.courseId;
      const scope = req.body.scope !== undefined ? (req.body.scope === "lesson" ? "lesson" : req.body.scope === "homework" ? "homework" : "course") : current.scope;
      const videoId = scope === "lesson"
        ? (req.body.videoId !== undefined ? (Number(req.body.videoId) || null) : current.videoId)
        : null;
      const stages: string[] = req.body.stages !== undefined
        ? normalizeStringList(req.body.stages)
        : (current.stages?.length ? current.stages : (current.stage ? [current.stage] : ["عام"]));

      const [course] = courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
      const [video] = scope === "lesson" && videoId ? await db.select().from(videosTable).where(eq(videosTable.id, videoId)).limit(1) : [];

      if (courseId && !course) {
        res.status(400).json({ error: "الكورس المحدد غير موجود" });
        return;
      }
      if (course && stages.length > 0 && stages.some((stage) => course.stages.length > 0 && !course.stages.includes(stage))) {
        res.status(400).json({ error: "المرحلة غير متوافقة مع الكورس المحدد" });
        return;
      }
      if (scope === "lesson" && videoId && (!video || (courseId && video.courseId !== courseId))) {
        res.status(400).json({ error: "الدرس غير صحيح أو غير تابع للكورس" });
        return;
      }
      if (videoId) {
        const [linkedQuiz] = await db
          .select({ id: quizzesTable.id })
          .from(quizzesTable)
          .where(eq(quizzesTable.videoId, videoId))
          .limit(1);
        if (linkedQuiz && linkedQuiz.id !== quizId) {
          res.status(409).json({ error: "هذا الدرس مرتبط باختبار آخر بالفعل" });
          return;
        }
      }
      if (req.body.title !== undefined && !String(req.body.title).trim()) {
        res.status(400).json({ error: "عنوان الاختبار مطلوب" });
        return;
      }
      let questions: QuizQuestion[] | undefined;
      if (req.body.questions !== undefined) {
        const validatedQuestions = validateQuestions(req.body.questions);
        if (!validatedQuestions) {
          res.status(400).json({ error: "الأسئلة غير صالحة" });
          return;
        }
        questions = validatedQuestions;
      }
      const nextIsPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : current.isPublished;
      const shouldUpdateAvailability =
        req.body.openHours !== undefined ||
        req.body.availableUntil !== undefined ||
        (!current.isPublished && nextIsPublished);
      const availabilityPatch = shouldUpdateAvailability
        ? resolveQuizAvailability({
            rawOpenHours: req.body.openHours,
            rawAvailableUntil: req.body.availableUntil,
            scope,
            isPublished: nextIsPublished,
            wasPublished: current.isPublished,
            currentOpenHours: current.openHours,
            currentAvailableUntil: current.availableUntil,
          })
        : {};
      const [quiz] = await db
        .update(quizzesTable)
        .set({
          courseId,
          videoId,
          scope,
          category: course ? course.title : (current.category || stages[0] || "عام"),
          stages,
          stage: stages[0] ?? current.stage ?? null,
          ...(req.body.title !== undefined && {
            title: String(req.body.title).trim(),
          }),
          ...(req.body.description !== undefined && {
            description: String(req.body.description).trim() || null,
          }),
          ...(req.body.passingScore !== undefined && {
            passingScore: Math.max(
              0,
              Math.min(100, Number(req.body.passingScore)),
            ),
          }),
          ...(req.body.durationMinutes !== undefined && {
            durationMinutes: parseOptionalDurationMinutes(req.body.durationMinutes),
          }),
          ...availabilityPatch,
          ...(req.body.questionsToShow !== undefined && { questionsToShow: req.body.questionsToShow ? Number(req.body.questionsToShow) : null }),
          ...(req.body.shuffleQuestions !== undefined && { shuffleQuestions: Boolean(req.body.shuffleQuestions) }),
          ...(req.body.showExplanations !== undefined && { showExplanations: Boolean(req.body.showExplanations) }),
          ...(req.body.isPublished !== undefined && {
            isPublished: Boolean(req.body.isPublished),
          }),
          ...(questions !== undefined && { questions }),
          ...(req.body.maxAttempts !== undefined && { maxAttempts: Math.max(0, Math.min(20, Number(req.body.maxAttempts))) }),
          requiredProgress: scope === "lesson" ? Math.max(0, Math.min(100, Number(req.body.requiredProgress ?? current.requiredProgress))) : 0,
          updatedAt: new Date(),
        })
        .where(eq(quizzesTable.id, quizId))
        .returning();
      if (!quiz) {
        res.status(404).json({ error: "الاختبار غير موجود" });
        return;
      }
      if (current.videoId && current.videoId !== videoId) await db.update(videosTable).set({ quizId: null }).where(and(eq(videosTable.id, current.videoId), eq(videosTable.quizId, quizId)));
      if (videoId) await db.update(videosTable).set({ quizId }).where(eq(videosTable.id, videoId));
      if (!current.isPublished && quiz.isPublished) {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const recipients = approvedStudents.filter((student) =>
          canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId));
        if (recipients.length) {
          await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
            studentId: student.id,
            type: "quiz",
            title: "اختبار جديد متاح لك",
            message: `${quiz.title} جاهز الآن داخل الاختبارات.`,
          })));
          void sendPushToStudents(
            recipients.map((s) => s.id),
            {
              title: "اختبار جديد متاح لك 📝",
              body: `${quiz.title} جاهز الآن داخل المنصة.`,
              url: "/platform",
              tag: `quiz-${quiz.id}`,
            }
          );
        }
      }
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/admin/learning/quizzes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [quiz] = await db
        .delete(quizzesTable)
        .where(eq(quizzesTable.id, Number(req.params.id)))
        .returning();
      if (!quiz) {
        res.status(404).json({ error: "الاختبار غير موجود" });
        return;
      }
      await logAudit(req, "DELETE_QUIZ", "quiz", String(quiz.id), `حذف اختبار: ${quiz.title}`);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/admin/learning/quizzes/:id/replace-question - Replace a question with a clean one
router.post("/admin/learning/quizzes/:id/replace-question", requireAdmin, async (req, res, next) => {
  try {
    const quizId = Number(req.params.id);
    const { questionIndex, replacementQuestionId, replacementQuestion } = req.body;

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }

    const currentQuestions = [...(quiz.questions || [])];
    const idx = Number(questionIndex);
    if (isNaN(idx) || idx < 0 || idx >= currentQuestions.length) {
      res.status(400).json({ error: "رقم السؤال المطلوب استبداله غير صحيح" });
      return;
    }

    let newQuestion: QuizQuestion | null = null;

    if (replacementQuestion && isCompleteValidQuestion(replacementQuestion)) {
      const correctAnswer = replacementQuestion.options[replacementQuestion.correctIndex]?.trim();
      newQuestion = {
        ...replacementQuestion,
        prompt: replacementQuestion.prompt.replace(/[\n\s]+[A-Da-dأابجده]\)\s*$/, "").trim(),
        options: replacementQuestion.options.map(cleanOptionString),
        correctAnswer: correctAnswer,  // ✅ حفظ النص الفعلي
      };
    } else if (replacementQuestionId) {
      const [bq] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, Number(replacementQuestionId))).limit(1);
      if (bq && isCompleteValidQuestion(bq.question)) {
        const correctAnswer = bq.question.options[bq.question.correctIndex]?.trim();
        newQuestion = {
          ...bq.question,
          prompt: bq.question.prompt.replace(/[\n\s]+[A-Da-dأابجده]\)\s*$/, "").trim(),
          options: bq.question.options.map(cleanOptionString),
          correctAnswer: correctAnswer,  // ✅ حفظ النص الفعلي
        };
      }
    } else {
      // Auto-find a random clean question from question bank
      const currentPrompts = new Set(currentQuestions.map((q) => normalizeQuestionPrompt(q.prompt)));

      const conditions = [];
      if (quiz.courseId) {
        conditions.push(or(eq(questionBankTable.courseId, quiz.courseId), isNull(questionBankTable.courseId)));
      }
      if (quiz.stage) {
        conditions.push(or(eq(questionBankTable.stage, quiz.stage), eq(questionBankTable.stage, "عام")));
      }

      const candidates = await db
        .select()
        .from(questionBankTable)
        .where(conditions.length ? and(...conditions) : undefined);

      const available = candidates
        .filter((bq) => isCompleteValidQuestion(bq.question) && !currentPrompts.has(normalizeQuestionPrompt(bq.question.prompt)))
        .sort(() => Math.random() - 0.5);

      if (available.length > 0) {
        const picked = available[0].question;
        const correctAnswer = picked.options[picked.correctIndex]?.trim();
        newQuestion = {
          ...picked,
          prompt: picked.prompt.replace(/[\n\s]+[A-Da-dأابجده]\)\s*$/, "").trim(),
          options: picked.options.map(cleanOptionString),
          correctAnswer: correctAnswer,  // ✅ حفظ النص الفعلي
        };
      }
    }

    if (!newQuestion) {
      res.status(404).json({ error: "لا توجد أسئلة بديلة متوفرة في بنك الأسئلة لهذا النطاق" });
      return;
    }

    currentQuestions[idx] = newQuestion;

    const [updatedQuiz] = await db
      .update(quizzesTable)
      .set({
        questions: currentQuestions,
        updatedAt: new Date(),
      })
      .where(eq(quizzesTable.id, quizId))
      .returning();

    await logAudit(req, "REPLACE_QUIZ_QUESTION", "quiz", String(quizId), `استبدال السؤال رقم ${idx + 1} في اختبار: ${quiz.title}`);

    res.json({
      success: true,
      quiz: updatedQuiz,
      questionIndex: idx,
      newQuestion,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/learning/quizzes/:id/replacement-candidates - Get clean replacement candidate questions from question bank
router.get("/admin/learning/quizzes/:id/replacement-candidates", requireAdmin, async (req, res, next) => {
  try {
    const quizId = Number(req.params.id);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }

    const currentQuestions = (quiz.questions || []) as QuizQuestion[];
    const currentPrompts = new Set(currentQuestions.map((q) => normalizeQuestionPrompt(q.prompt)));

    const conditions = [];
    if (quiz.courseId) {
      conditions.push(or(eq(questionBankTable.courseId, quiz.courseId), isNull(questionBankTable.courseId)));
    }
    if (quiz.stage) {
      conditions.push(
        or(
          eq(questionBankTable.stage, quiz.stage),
          eq(questionBankTable.stage, "عام"),
          sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([quiz.stage])}::jsonb`
        )
      );
    }

    const rows = await db
      .select()
      .from(questionBankTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(questionBankTable.id));

    const candidates = rows
      .filter((bq) => isCompleteValidQuestion(bq.question) && !currentPrompts.has(normalizeQuestionPrompt(bq.question.prompt)))
      .slice(0, 60)
      .map((bq) => ({
        id: bq.id,
        lesson: bq.lesson,
        unit: bq.unit,
        stage: bq.stage,
        difficulty: bq.difficulty,
        question: {
          ...bq.question,
          prompt: bq.question.prompt.replace(/[\n\s]+[A-Da-dأابجده]\)\s*$/, "").trim(),
          options: (bq.question.options || []).map(cleanOptionString),
        },
      }));

    res.json({
      success: true,
      candidates,
    });
  } catch (error) {
    next(error);
  }
});




router.post(
  "/learning/quizzes/:id/submit",
  requireStudent,
  async (req, res, next) => {
    try {
      const [quiz] = await db
        .select()
        .from(quizzesTable)
        .where(
          and(
            eq(quizzesTable.id, Number(req.params.id)),
            eq(quizzesTable.isPublished, true),
          ),
        )
        .limit(1);
      const rawAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];
      const answers: number[] = rawAnswers.map((answer: unknown) => {
        const num = Number(answer);
        return Number.isInteger(num) ? num : -1;
      });
      if (!quiz) {
        res.status(404).json({ error: "الاختبار غير موجود" });
        return;
      }
      const student = res.locals.student as typeof studentsTable.$inferSelect;
      if (student.status !== "approved" || student.paymentStatus !== "paid") {
        res.status(403).json({
          error: "تم قفل الاختبارات لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
          code: "PAYMENT_REQUIRED",
        });
        return;
      }
      if (!canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId)) {
        res.status(403).json({ error: "الاختبار مش ضمن الكورس المسجل ليك" });
        return;
      }
      if (quiz.availableUntil && Date.now() > new Date(quiz.availableUntil).getTime() + 120_000) {
        res.status(403).json({ error: "انتهت مدة إتاحة الاختبار وتم إغلاقه" });
        return;
      }
      // maxAttempts <= 0 means unlimited attempts
      const unlimitedAttempts = !quiz.maxAttempts || quiz.maxAttempts <= 0;
      const [extraGrant] = await db
        .select({ extraAttempts: quizExtraAttemptsTable.extraAttempts })
        .from(quizExtraAttemptsTable)
        .where(
          and(
            eq(quizExtraAttemptsTable.quizId, quiz.id),
            eq(quizExtraAttemptsTable.studentId, student.id),
          ),
        )
        .limit(1);
      const extraGranted = extraGrant?.extraAttempts ?? 0;
      const effectiveMaxAttempts = unlimitedAttempts ? null : quiz.maxAttempts + extraGranted;
      const clientSubmissionId =
        typeof req.body.clientSubmissionId === "string"
          ? req.body.clientSubmissionId.trim().slice(0, 120)
          : "";

      const effectiveTotal =
        quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < quiz.questions.length
          ? quiz.questionsToShow
          : quiz.questions.length;

      if (effectiveTotal === 0) {
        res.status(400).json({ error: "الاختبار لا يحتوي على أسئلة" });
        return;
      }

      const previousAttempts = await db
        .select()
        .from(quizAttemptsTable)
        .where(and(eq(quizAttemptsTable.quizId, quiz.id), eq(quizAttemptsTable.studentId, student.id)))
        .orderBy(desc(quizAttemptsTable.id));

      // Idempotency guard: if a mobile network dropped right after DB commit (e.g. HTTP 499)
      // and the client auto-retries with the same clientSubmissionId (or retries within 90s when attempts are exhausted),
      // return the already-saved attempt cleanly instead of consuming another attempt or throwing 409!
      if (previousAttempts.length > 0) {
        const latest = previousAttempts[0];
        const latestDetails = Array.isArray(latest.details) ? (latest.details as any[]) : [];
        const latestSubId = typeof latestDetails[0]?.clientSubmissionId === "string" ? latestDetails[0].clientSubmissionId : "";
        const ageMs = latest.createdAt ? Date.now() - new Date(latest.createdAt).getTime() : Infinity;
        const isExactDuplicateRetry = Boolean(clientSubmissionId && latestSubId && clientSubmissionId === latestSubId);
        const isExhaustedImmediateRetry =
          !unlimitedAttempts &&
          previousAttempts.length >= (effectiveMaxAttempts ?? 0) &&
          ageMs >= 0 &&
          ageMs < 90_000;

        if (isExactDuplicateRetry || isExhaustedImmediateRetry) {
          const savedCorrect = latestDetails.length > 0
            ? latestDetails.reduce((cnt, d) => cnt + (d?.isCorrect ? 1 : 0), 0)
            : Math.round(((latest.score ?? 0) / 100) * effectiveTotal);
          const showExplanations = quiz.showExplanations !== false;
          res.json({
            attemptId: latest.id,
            score: latest.score,
            passed: latest.passed,
            correct: savedCorrect,
            total: effectiveTotal,
            attemptsUsed: previousAttempts.length,
            attemptsRemaining: unlimitedAttempts ? null : Math.max(0, (effectiveMaxAttempts ?? 0) - previousAttempts.length),
            details: latestDetails,
            deduplicated: true,
            ...(showExplanations && {
              explanations: quiz.questions.map((q) => q.explanation ?? null),
            }),
          });
          return;
        }
      }

      if (!unlimitedAttempts && previousAttempts.length >= (effectiveMaxAttempts ?? 0)) {
        res.status(409).json({ error: "استخدمت كل المحاولات المتاحة لهذا الاختبار" }); return;
      }
      if (quiz.scope === "lesson" && quiz.videoId) {
        const [progress] = await db.select().from(videoProgressTable).where(and(eq(videoProgressTable.studentId, student.id), eq(videoProgressTable.videoId, quiz.videoId))).limit(1);
        if ((progress?.progress ?? 0) < quiz.requiredProgress) {
          res.status(403).json({ error: `أكمل ${quiz.requiredProgress}% من الدرس قبل بدء الاختبار` }); return;
        }
      }
      const rawDetailedAnswers = Array.isArray(req.body.detailedAnswers) ? req.body.detailedAnswers : [];
      const promptToStudentAnswer = new Map<string, number>();
      const origIndexToStudentAnswer = new Map<number, number>();

      for (const item of rawDetailedAnswers) {
        if (item && typeof item === "object") {
          const opt = Number(item.selectedOption);
          const validOpt = Number.isInteger(opt) ? opt : -1;
          if (item.prompt && typeof item.prompt === "string") {
            const pKey = normalizeQuestionPrompt(item.prompt);
            if (pKey) promptToStudentAnswer.set(pKey, validOpt);
          }
          if (typeof item.originalIndex === "number" && item.originalIndex >= 0) {
            origIndexToStudentAnswer.set(item.originalIndex, validOpt);
          }
        }
      }

      const getStudentAnswerForQuestion = (q: QuizQuestion, dbIndex: number): number => {
        if (origIndexToStudentAnswer.has(dbIndex)) {
          return origIndexToStudentAnswer.get(dbIndex)!;
        }
        const pKey = normalizeQuestionPrompt(q.prompt);
        if (pKey && promptToStudentAnswer.has(pKey)) {
          return promptToStudentAnswer.get(pKey)!;
        }
        if (answers[dbIndex] !== undefined) {
          return answers[dbIndex];
        }
        return -1;
      };

      // Build full resolved answers array (matching quiz.questions[i])
      const resolvedAnswers = quiz.questions.map((q, i) => getStudentAnswerForQuestion(q, i));

      // Build details with resolved student answer
      const details = quiz.questions.map((question, index) => {
        const selectedOption = resolvedAnswers[index];
        const isEssay = question.questionType === "essay" || (!question.options || question.options.length === 0);

        let studentTextAnswer = "";
        if (isEssay) {
          const foundDetailed = rawDetailedAnswers.find(
            (d: any) =>
              (typeof d?.originalIndex === "number" && d.originalIndex === index) ||
              (typeof d?.questionIndex === "number" && d.questionIndex === index) ||
              (d?.prompt && normalizeQuestionPrompt(d.prompt) === normalizeQuestionPrompt(question.prompt))
          );
          studentTextAnswer = String(foundDetailed?.textAnswer || "").trim();
        }

        // 1. Resolve true correct option index from correctAnswer if possible
        let resolvedCorrectOption = question.correctIndex;
        if (question.correctAnswer && question.options) {
          const matchIdx = question.options.findIndex(
            (opt) => opt?.trim() === question.correctAnswer?.trim()
          );
          if (matchIdx >= 0) {
            resolvedCorrectOption = matchIdx;
          }
        }

        // ✅ مطابقة بالنص الفعلي أو استلام الإجابة المقالية
        let isCorrect = false;
        if (isEssay) {
          isCorrect = Boolean(studentTextAnswer);
        } else if (question.options && selectedOption >= 0 && selectedOption < question.options.length) {
          const selectedAnswer = question.options[selectedOption]?.trim();
          const correctAnswer = question.correctAnswer?.trim() || question.options[question.correctIndex]?.trim();

          if (correctAnswer && selectedAnswer) {
            // Priority 1: مطابقة بالنص الفعلي
            isCorrect = selectedAnswer === correctAnswer;
          } else {
            // Priority 2: Fallback للـ index (للأسئلة القديمة)
            isCorrect = selectedOption === resolvedCorrectOption;
          }
        }

        return {
          questionIndex: index,
          prompt: question.prompt,
          selectedOption,
          correctOption: resolvedCorrectOption,
          isCorrect,
          isEssay,
          textAnswer: studentTextAnswer,
          modelAnswer: question.correctAnswer || question.explanation || "",
          ...(index === 0 && clientSubmissionId ? { clientSubmissionId } : {}),
        };
      });

      const correct = details.reduce((count, d) => count + (d.isCorrect ? 1 : 0), 0);
      const score = Math.min(100, Math.round((correct / effectiveTotal) * 100));
      const passed = score >= quiz.passingScore;
      const timeSpentSeconds = Math.max(0, Math.round(Number(req.body.timeSpentSeconds ?? 0))) || 0;

      // Wrap check + insert in transaction to prevent race condition
      const result = await db.transaction(async (tx) => {
        const prevAttempts = await tx.select({ id: quizAttemptsTable.id }).from(quizAttemptsTable).where(and(eq(quizAttemptsTable.quizId, quiz.id), eq(quizAttemptsTable.studentId, student.id)));
        if (!unlimitedAttempts && prevAttempts.length >= (effectiveMaxAttempts ?? 0)) {
          return null; // exceeded
        }
        const [attempt] = await tx
          .insert(quizAttemptsTable)
          .values({
            quizId: quiz.id,
            studentId: student.id,
            answers: resolvedAnswers,
            score,
            passed,
            timeSpentSeconds,
            details,
          })
          .returning();
        return { attempt, attemptsUsed: prevAttempts.length + 1 };
      });

      if (!result) {
        res.status(409).json({ error: "استخدمت كل المحاولات المتاحة لهذا الاختبار" });
        return;
      }

      // Clear saved resume draft once attempt is submitted
      try {
        await ensureQuizDraftsTable();
        await db
          .delete(quizDraftsTable)
          .where(and(eq(quizDraftsTable.quizId, quiz.id), eq(quizDraftsTable.studentId, student.id)));
      } catch { }

      // Update student activity timestamp
      try {
        const now = new Date();
        await db
          .update(studentsTable)
          .set({ lastActiveAt: now, updatedAt: now })
          .where(eq(studentsTable.id, student.id));
      } catch (err) {
        console.error("Failed to update student lastActiveAt:", err);
      }

      // Automatically create a notification for student and parent tracking
      try {
        const passText = passed ? "اجتاز الاختبار بنجاح ✓" : "لم يجتز الاختبار هذه المرة ✕";
        await db.insert(studentNotificationsTable).values({
          studentId: student.id,
          title: `🎯 نتيجة اختبار: ${quiz.title}`,
          message: `أنهى الطالب ${student.name} اختبار "${quiz.title}" وحصل على درجة ${correct} من ${effectiveTotal} (${score}%) - ${passText}.`,
          type: passed ? "success" : "warning",
        });
      } catch (notifErr) {
        console.error("Failed to insert quiz completion notification:", notifErr);
      }

      // Non-blocking: record wrong answers into Mistakes Hub & promote mastered ones
      // IMPORTANT: Only consider questions actually seen/answered in this attempt (prevents marking unseen questions in subset/random quizzes as mistakes).
      try {
        const seenDetails = details.filter((d, idx) => {
          if (d.selectedOption >= 0) return true;
          if (rawDetailedAnswers.length > 0) {
            const q = quiz.questions[idx];
            const pKey = normalizeQuestionPrompt(q?.prompt || "");
            return origIndexToStudentAnswer.has(idx) || Boolean(pKey && promptToStudentAnswer.has(pKey));
          }
          return false;
        });

        await recordSubmissionMistakes({
          studentId: student.id,
          stage: quiz.stage || (Array.isArray(quiz.stages) ? quiz.stages[0] : null),
          sourceType: "quiz",
          sourceId: quiz.id,
          items: seenDetails.map((d) => ({
            question: quiz.questions[d.questionIndex],
            selectedOption: d.selectedOption,
            isCorrect: d.isCorrect,
          })),
        });
      } catch { }

      // Return correctIndex per question so frontend can highlight right/wrong
      const showExplanations = quiz.showExplanations !== false;
      res.json({
        attemptId: result.attempt.id,
        score,
        passed,
        correct,
        total: effectiveTotal,
        attemptsUsed: result.attemptsUsed,
        attemptsRemaining: unlimitedAttempts ? null : Math.max(0, (effectiveMaxAttempts ?? 0) - result.attemptsUsed),
        details,
        ...(showExplanations && {
          explanations: quiz.questions.map((q) => q.explanation ?? null),
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/learning/quizzes/:id/review - Retrieve completed quiz attempt with model answers for review
router.get("/learning/quizzes/:id/review", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId)) {
      res.status(400).json({ error: "Invalid quiz id" });
      return;
    }
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }
    if (!canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId)) {
      res.status(403).json({ error: "غير مسموح لك بالوصول لهذا الاختبار" });
      return;
    }
    const attemptsList = await db
      .select()
      .from(quizAttemptsTable)
      .where(and(eq(quizAttemptsTable.quizId, quizId), eq(quizAttemptsTable.studentId, student.id)))
      .orderBy(desc(quizAttemptsTable.id));

    if (!attemptsList.length) {
      res.status(404).json({ error: "لم تقم بحل هذا الاختبار بعد، يرجى بدئه أولاً." });
      return;
    }

    const requestedAttemptId = req.query.attemptId ? Number(req.query.attemptId) : null;
    const chosenAttempt =
      (requestedAttemptId && attemptsList.find((a) => a.id === requestedAttemptId)) ||
      [...attemptsList].sort((a, b) => {
        if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
        return b.id - a.id;
      })[0];

    const studentAnswers = chosenAttempt.answers || [];
    const storedDetails = Array.isArray(chosenAttempt.details) ? (chosenAttempt.details as any[]) : [];
    const effectiveTotal =
      quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < quiz.questions.length
        ? quiz.questionsToShow
        : quiz.questions.length;

    const details = quiz.questions.map((q, idx) => {
      const stored = storedDetails.find((d: any) => d && (d.questionIndex === idx || d.originalIndex === idx));
      const selected = stored && typeof stored.selectedOption === "number"
        ? stored.selectedOption
        : (studentAnswers[idx] ?? -1);

      let resolvedCorrectOption = q.correctIndex;
      if (stored && typeof stored.correctOption === "number") {
        resolvedCorrectOption = stored.correctOption;
      } else if (q.correctAnswer && q.options) {
        const matchIdx = q.options.findIndex((opt) => opt?.trim() === q.correctAnswer?.trim());
        if (matchIdx >= 0) resolvedCorrectOption = matchIdx;
      }

      const isEssay = q.questionType === "essay" || (!q.options || q.options.length === 0);
      const textAnswer = stored && typeof stored.textAnswer === "string" ? stored.textAnswer : "";

      let isCorrect = false;
      if (stored && typeof stored.isCorrect === "boolean") {
        isCorrect = stored.isCorrect;
      } else if (isEssay) {
        isCorrect = Boolean(textAnswer.trim());
      } else if (q.options && selected >= 0 && selected < q.options.length) {
        const selectedText = q.options[selected]?.trim();
        const correctText = q.correctAnswer?.trim() || q.options[resolvedCorrectOption]?.trim();
        isCorrect = correctText && selectedText ? selectedText === correctText : selected === resolvedCorrectOption;
      }

      return {
        questionIndex: idx,
        selectedOption: selected,
        correctOption: resolvedCorrectOption,
        isCorrect,
        isEssay,
        textAnswer,
        modelAnswer: stored?.modelAnswer || q.correctAnswer || q.explanation || "",
      };
    });

    const correctCount =
      storedDetails.length > 0
        ? storedDetails.reduce((cnt, d) => cnt + (d?.isCorrect ? 1 : 0), 0)
        : details.reduce((cnt, d) => cnt + (d.isCorrect ? 1 : 0), 0);

    const enrichedQuiz = {
      ...quiz,
      questions: enrichQuizQuestionsWithMeta(quiz.questions, quiz.unit, quiz.lesson),
    };

    res.json({
      quiz: enrichedQuiz,
      attempt: chosenAttempt,
      selectedAttemptId: chosenAttempt.id,
      attemptsHistory: attemptsList.map((a, idx) => ({
        id: a.id,
        score: a.score,
        passed: a.passed,
        timeSpentSeconds: a.timeSpentSeconds,
        createdAt: a.createdAt,
        attemptNumber: attemptsList.length - idx,
      })),
      score: chosenAttempt.score,
      passed: chosenAttempt.passed,
      correct: Math.min(effectiveTotal, correctCount),
      total: effectiveTotal,
      attemptsUsed: attemptsList.length,
      details,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/learning/quizzes/:id/draft - Persist in-progress quiz draft on server so student resumes from exact point
router.put("/learning/quizzes/:id/draft", requireStudent, async (req, res, next) => {
  try {
    await ensureQuizDraftsTable();
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ error: "معرف الاختبار غير صالح" });
      return;
    }

    const questionOrder = Array.isArray(req.body?.questionOrder)
      ? req.body.questionOrder.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0)
      : [];
    const answersByOriginalIndex =
      req.body?.answersByOriginalIndex && typeof req.body.answersByOriginalIndex === "object"
        ? req.body.answersByOriginalIndex
        : {};
    const essayByOriginalIndex =
      req.body?.essayByOriginalIndex && typeof req.body.essayByOriginalIndex === "object"
        ? req.body.essayByOriginalIndex
        : {};
    const flaggedByOriginalIndex =
      req.body?.flaggedByOriginalIndex && typeof req.body.flaggedByOriginalIndex === "object"
        ? req.body.flaggedByOriginalIndex
        : {};
    const lastQuestionIndex = Math.max(0, Math.floor(Number(req.body?.lastQuestionIndex) || 0));
    const elapsedSeconds = Math.max(0, Math.floor(Number(req.body?.elapsedSeconds) || 0));
    const clientSubmissionId =
      typeof req.body?.clientSubmissionId === "string"
        ? req.body.clientSubmissionId.trim().slice(0, 120)
        : null;

    const now = new Date();
    await db
      .insert(quizDraftsTable)
      .values({
        quizId,
        studentId: student.id,
        questionOrder,
        answersByOriginalIndex,
        essayByOriginalIndex,
        flaggedByOriginalIndex,
        lastQuestionIndex,
        elapsedSeconds,
        clientSubmissionId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [quizDraftsTable.quizId, quizDraftsTable.studentId],
        set: {
          questionOrder,
          answersByOriginalIndex,
          essayByOriginalIndex,
          flaggedByOriginalIndex,
          lastQuestionIndex,
          elapsedSeconds,
          clientSubmissionId,
          updatedAt: now,
        },
      });

    res.json({ success: true, updatedAt: now.toISOString() });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/quizzes/:id/timer - Lightweight realtime timer sync for active exams & homeworks
router.get("/learning/quizzes/:id/timer", requireStudent, async (req, res, next) => {
  try {
    await ensureQuizAvailabilityColumns();
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }

    const [quiz] = await db
      .select({
        id: quizzesTable.id,
        durationMinutes: quizzesTable.durationMinutes,
        openHours: quizzesTable.openHours,
        availableUntil: quizzesTable.availableUntil,
        isPublished: quizzesTable.isPublished,
        updatedAt: quizzesTable.updatedAt,
      })
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .limit(1);

    if (!quiz) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(quiz);
  } catch (error) {
    next(error);
  }
});

// POST /api/learning/quizzes/:id/view - Log that student opened the homework or quiz
router.post("/learning/quizzes/:id/view", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ error: "معرف الواجب أو الاختبار غير صالح" });
      return;
    }

    const [quiz] = await db
      .select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .limit(1);

    if (!quiz) {
      res.status(404).json({ error: "الواجب أو الاختبار غير موجود" });
      return;
    }

    if (!canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId)) {
      res.status(403).json({ error: "غير مصرح لك بالوصول لهذا الواجب" });
      return;
    }

    await db
      .insert(quizViewsTable)
      .values({
        quizId,
        studentId: student.id,
        firstViewedAt: new Date(),
        lastViewedAt: new Date(),
        viewCount: 1,
      })
      .onConflictDoUpdate({
        target: [quizViewsTable.quizId, quizViewsTable.studentId],
        set: {
          lastViewedAt: new Date(),
          viewCount: sql`${quizViewsTable.viewCount} + 1`,
        },
      });

    res.json({ success: true, quizId, studentId: student.id });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/admin/learning/attempts",
  requireAdmin,
  async (req, res, next) => {
    try {
      const quizIdParam = req.query.quizId ? Number(req.query.quizId) : null;
      const studentIdParam = req.query.studentId ? Number(req.query.studentId) : null;

      const whereConditions = [];
      if (quizIdParam && Number.isInteger(quizIdParam)) {
        whereConditions.push(eq(quizAttemptsTable.quizId, quizIdParam));
      }
      if (studentIdParam && Number.isInteger(studentIdParam)) {
        whereConditions.push(eq(quizAttemptsTable.studentId, studentIdParam));
      }

      let query = db
        .select({
          id: quizAttemptsTable.id,
          quizId: quizAttemptsTable.quizId,
          studentId: quizAttemptsTable.studentId,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          timeSpentSeconds: quizAttemptsTable.timeSpentSeconds,
          detailsCorrectCount: sql<number | null>`${quizAttemptsTable}.correct_count`,
          createdAt: quizAttemptsTable.createdAt,
          studentName: studentsTable.name,
          studentPhone: studentsTable.phone,
          parentPhone: studentsTable.parentPhone,
          studentCode: studentsTable.accessCode,
          studentGrade: studentsTable.grade,
          studentCenter: studentsTable.centerName,
          quizTitle: quizzesTable.title,
          quizStage: quizzesTable.stage,
          quizStages: quizzesTable.stages,
          passingScore: quizzesTable.passingScore,
          questionsCount: sql<number>`COALESCE(${quizzesTable}.questions_count, 0)`,
          questionsToShow: quizzesTable.questionsToShow,
        })
        .from(quizAttemptsTable)
        .innerJoin(
          studentsTable,
          eq(quizAttemptsTable.studentId, studentsTable.id),
        )
        .innerJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id));

      if (whereConditions.length === 1) {
        query = query.where(whereConditions[0]) as any;
      } else if (whereConditions.length > 1) {
        query = query.where(and(...whereConditions)) as any;
      }

      const [attempts, extraGrants] = await Promise.all([
        query.orderBy(desc(quizAttemptsTable.createdAt)),
        db.select().from(quizExtraAttemptsTable),
      ]);

      const extraGrantsMap = new Map(extraGrants.map((g) => [`${g.quizId}_${g.studentId}`, g.extraAttempts]));

      const formattedAttempts = attempts.map((a) => {
        const qLen = Number(a.questionsCount) || 0;
        const totalQuestions =
          a.questionsToShow && a.questionsToShow > 0 && a.questionsToShow < qLen
            ? a.questionsToShow
            : (qLen || 1);

        // Count correct answers computed directly in PostgreSQL without transferring JSONB:
        let correctCount = 0;
        if (a.detailsCorrectCount !== null && a.detailsCorrectCount !== undefined) {
          correctCount = Number(a.detailsCorrectCount) || 0;
        } else {
          correctCount = Math.round(((Number(a.score) || 0) / 100) * totalQuestions);
        }
        correctCount = Math.min(totalQuestions, Math.max(0, correctCount));

        // a.score in DB is already stored as a percentage (0-100)
        // Ensure percentage is strictly clamped between 0% and 100%
        const computedPct =
          totalQuestions > 0
            ? Math.round((correctCount / totalQuestions) * 100)
            : Math.round(Number(a.score) || 0);
        const percentage = Math.min(100, Math.max(0, computedPct));

        return {
          id: a.id,
          quizId: a.quizId,
          studentId: a.studentId,
          studentName: a.studentName || "طالب",
          studentPhone: a.studentPhone || "",
          parentPhone: a.parentPhone || "",
          studentCode: a.studentCode || "",
          studentGrade: a.studentGrade || "غير محدد",
          studentCenter: a.studentCenter || "",
          quizTitle: a.quizTitle || "اختبار",
          quizStage: a.quizStage || (Array.isArray(a.quizStages) && a.quizStages[0]) || "غير محدد",
          score: correctCount, // Raw correct count (e.g. 48 out of 50)
          correctCount,
          rawScore: correctCount,
          percentageScore: percentage,
          totalQuestions,      // Actual number of questions answered
          passingScore: a.passingScore,
          percentage,          // Strictly 0-100%
          passed: a.passed,
          timeSpentSeconds: a.timeSpentSeconds || 0,
          extraAttemptsGranted: extraGrantsMap.get(`${a.quizId}_${a.studentId}`) || 0,
          createdAt: a.createdAt,
        };
      });

      res.json(formattedAttempts);
    } catch (error) {
      next(error);
    }
  },
);

// ── Admin: Grant Extra Attempts for specific student(s) ──

router.post("/admin/learning/quizzes/:quizId/extra-attempts", requireAdmin, async (req, res, next) => {
  try {
    const quizId = Number(req.params.quizId);
    const { studentId, studentIds, extraAttempts = 1, reason } = req.body;

    const targetStudentIds: number[] = Array.isArray(studentIds)
      ? studentIds.map(Number).filter(Boolean)
      : (studentId ? [Number(studentId)] : []);

    if (targetStudentIds.length === 0) {
      res.status(400).json({ error: "يرجى تحديد الطالب أو الطلاب لمنح المحاولة الإضافية" });
      return;
    }

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }

    const numExtra = Math.max(1, Number(extraAttempts) || 1);
    const adminName = (res.locals as any)?.admin?.username || "المعلم";

    for (const sId of targetStudentIds) {
      const [existing] = await db
        .select()
        .from(quizExtraAttemptsTable)
        .where(and(eq(quizExtraAttemptsTable.quizId, quizId), eq(quizExtraAttemptsTable.studentId, sId)))
        .limit(1);

      if (existing) {
        await db
          .update(quizExtraAttemptsTable)
          .set({
            extraAttempts: existing.extraAttempts + numExtra,
            reason: reason || existing.reason,
            grantedBy: adminName,
            updatedAt: new Date(),
          })
          .where(eq(quizExtraAttemptsTable.id, existing.id));
      } else {
        await db.insert(quizExtraAttemptsTable).values({
          quizId,
          studentId: sId,
          extraAttempts: numExtra,
          reason: reason || "منح محاولة إضافية لإعادة الاختبار بواسطة الأدمن",
          grantedBy: adminName,
        });
      }

      // Send notification to student
      await db.insert(studentNotificationsTable).values({
        studentId: sId,
        title: "محاولة إضافية للاختبار 🎓",
        message: `تم منحك محاولة إضافية لإعادة اختبار: "${quiz.title}". يمكنك الدخول وإعادة الاختبار الآن!`,
        type: "quiz",
      });
    }

    await logAudit(
      req,
      "GRANT_EXTRA_QUIZ_ATTEMPT",
      "quizzes",
      String(quizId),
      `منح محاولة إضافية لاختبار ${quiz.title} لعدد ${targetStudentIds.length} طالب`,
    );

    res.json({ success: true, count: targetStudentIds.length });
  } catch (error) {
    next(error);
  }
});


export default router;
