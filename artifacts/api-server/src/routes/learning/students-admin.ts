import { Router, type IRouter } from "express";
import { and, desc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  db,
  studentsTable,
  studentSessionsTable,
  studentNotificationsTable,
  codeRecoveryRequestsTable,
  studentLoginLogsTable,
  coursesTable,
  videosTable,
  videoProgressTable,
  quizAttemptsTable,
  paymentReceiptsTable,
} from "@workspace/db";
import {
  getAdminIdentity,
  getAdminRole,
  isAdminRequest,
  requireAdmin,
  requireSuperAdmin,
} from "../../middleware/auth";
import {
  requireStudent,
  getApprovedStudent,
  canStudentAccessContent,
} from "../../middleware/student-auth";
import {
  resolveAcademicStageSelection,
  getAcademicStageDimensions,
} from "../../lib/academic-stages";
import {
  VAPID_PUBLIC_KEY,
  savePushSubscription,
  removePushSubscription,
  sendPushToStudent,
  sendPushToAllStudents,
} from "../../services/push-notifications";
import { logAudit } from "../../lib/audit";
import {
  processSubscriptionExpirations,
  ensureAutomaticCourseAssignments,
  normalizeStringList,
  MANUAL_EMPTY_ENROLLMENT,
  generateAccessCode,
} from "./shared";

const router: IRouter = Router();

router.get(["/admin/students", "/admin/learning/students"], requireAdmin, async (_req, res, next) => {
  try {
    await processSubscriptionExpirations();
    const students = await db
      .select()
      .from(studentsTable)
      .orderBy(desc(studentsTable.createdAt));
    res.json(students);
  } catch (error) {
    next(error);
  }
});

router.post("/admin/students/bulk-status", requireAdmin, async (req, res, next) => {
  try {
    const { studentIds, target, status } = req.body;
    if (!status || !["approved", "pending", "suspended"].includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة" });
    }

    const role = getAdminRole(req);

    if (target === "all" || studentIds === "all") {
      if (role !== "superadmin") {
        return res.status(403).json({
          error: "عفواً: تغيير حالة كافة الطلاب بالكامل مخصص للمدير الرئيسي (Superadmin) فقط.",
        });
      }

      await db
        .update(studentsTable)
        .set({ status })
        .where(ne(studentsTable.status, status));

      await logAudit(
        req,
        "BULK_STATUS_ALL",
        "students",
        null,
        `تحديث حالة كافة الطلاب في المنصة إلى [${status}]`
      );

      if (status === "approved") {
        try {
          const allApproved = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
          for (const s of allApproved) {
            await ensureAutomaticCourseAssignments(s);
          }
        } catch {}
      }
      return res.json({ success: true, message: `تم تحديث حالة كافة الطلاب إلى ${status}` });
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      await db
        .update(studentsTable)
        .set({ status })
        .where(inArray(studentsTable.id, studentIds));

      await logAudit(
        req,
        "BULK_STATUS_SELECTED",
        "students",
        null,
        `تحديث حالة عدد (${studentIds.length}) طالب إلى [${status}]`
      );

      if (status === "approved") {
        try {
          const approvedStudents = await db
            .select()
            .from(studentsTable)
            .where(inArray(studentsTable.id, studentIds));
          for (const s of approvedStudents) {
            await ensureAutomaticCourseAssignments(s);
          }
        } catch {}
      }
      return res.json({ success: true, count: studentIds.length, message: `تم تحديث حالة ${studentIds.length} طالب` });
    }

    return res.status(400).json({ error: "لم يتم تحديد طلاب" });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/learning/daily-activity", requireAdmin, async (_req, res, next) => {
  try {
    const students = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      dailyMap[dateKey] = 0;
    }

    const todayActiveStudents: Array<{
      id: number;
      name: string;
      phone: string;
      grade: string;
      accessCode: string | null;
      lastActiveAt: string | null;
    }> = [];

    for (const student of students) {
      const activeDate = student.lastActiveAt || student.lastLoginAt || student.updatedAt;
      if (!activeDate) continue;
      const activeIso = new Date(activeDate).toISOString();
      const activeDay = activeIso.slice(0, 10);

      if (activeDay in dailyMap) {
        dailyMap[activeDay] += 1;
      }

      if (activeDay === todayStr) {
        todayActiveStudents.push({
          id: student.id,
          name: student.name,
          phone: student.phone || "",
          grade: student.grade || "",
          accessCode: student.accessCode || null,
          lastActiveAt: activeIso,
        });
      }
    }

    todayActiveStudents.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());

    const dailyHistory = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    res.json({
      summary: {
        todayActiveCount: dailyMap[todayStr] || 0,
        yesterdayActiveCount: dailyMap[yesterdayStr] || 0,
        totalApprovedStudents: students.length,
      },
      dailyHistory,
      todayActiveStudents,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/students/stream", requireAdmin, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write("retry: 10000\n\n");

    const sendUpdate = async () => {
      try {
        const students = await db
          .select()
          .from(studentsTable)
          .orderBy(desc(studentsTable.createdAt));
        res.write(`data: ${JSON.stringify(students)}\n\n`);
      } catch {
        res.write(": keep-alive\n\n");
      }
    };

    await sendUpdate();
    const interval = setInterval(sendUpdate, 10000);
    req.on("close", () => clearInterval(interval));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/students/analytics (Detailed student activity & watch history report)
router.get("/admin/students/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [students, progressRecords, videos, attempts] = await Promise.all([
      db.select().from(studentsTable).orderBy(desc(studentsTable.createdAt)),
      db.select().from(videoProgressTable),
      db.select({ id: videosTable.id, title: videosTable.title, category: videosTable.category, stage: videosTable.stage, durationText: videosTable.durationText }).from(videosTable),
      db.select().from(quizAttemptsTable),
    ]);

    const videoMap = new Map(videos.map((v) => [v.id, v]));

    const report = students.map((st) => {
      const stProgress = progressRecords.filter((p) => p.studentId === st.id);
      const stAttempts = attempts.filter((a) => a.studentId === st.id);

      const watchDetails = stProgress.map((p) => {
        const vid = videoMap.get(p.videoId);
        return {
          videoId: p.videoId,
          videoTitle: vid?.title || `فيديو #${p.videoId}`,
          category: vid?.category || "عام",
          stage: vid?.stage || "عام",
          progress: p.progress,
          currentTimeSeconds: p.currentTimeSeconds,
          durationSeconds: p.durationSeconds,
          completed: p.completed,
          updatedAt: p.updatedAt,
        };
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const now = new Date();
      const lastActive = st.lastActiveAt ? new Date(st.lastActiveAt) : (st.lastLoginAt ? new Date(st.lastLoginAt) : new Date(st.createdAt));
      const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: st.id,
        name: st.name,
        phone: st.phone,
        email: st.email,
        accessCode: st.accessCode,
        status: st.status,
        grade: st.grade,
        learningMode: st.learningMode,
        paymentStatus: st.paymentStatus,
        lastLoginAt: st.lastLoginAt,
        lastActiveAt: st.lastActiveAt,
        createdAt: st.createdAt,
        daysInactive,
        isInactive: daysInactive >= 3,
        watchedVideosCount: watchDetails.length,
        completedVideosCount: watchDetails.filter((w) => w.completed).length,
        quizzesCount: stAttempts.length,
        passedQuizzesCount: stAttempts.filter((a) => a.passed).length,
        watchDetails,
        quizDetails: stAttempts.map((a) => ({
          id: a.id,
          quizId: a.quizId,
          score: a.score,
          passed: a.passed,
          timeSpentSeconds: a.timeSpentSeconds,
          createdAt: a.createdAt,
        })),
      };
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status ?? "");
    if (
      !Number.isInteger(id) ||
      (req.body.status !== undefined &&
        !["pending", "approved", "suspended"].includes(status))
    ) {
      res.status(400).json({ error: "Invalid student update" });
      return;
    }
    const [current] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .limit(1);
    const role = getAdminRole(req);

    // Superadmin can always approve. Subadmin can also approve/suspend freely —
    // they are trusted staff handling day-to-day student management.
    // Only an anonymous admin (edge case) would be restricted.
    if (req.body.status === "approved" && current.status !== "approved" && role !== "superadmin" && role !== "subadmin") {
      const [approvedReceipt] = await db
        .select()
        .from(paymentReceiptsTable)
        .where(
          and(
            eq(paymentReceiptsTable.studentId, id),
            eq(paymentReceiptsTable.status, "approved")
          )
        )
        .limit(1);

      if (!approvedReceipt) {
        res.status(403).json({
          error: "عفواً: لا يمكن تفعيل الطالب يدويًا إلا بعد قيام الطالب برفع إيصال التحويل ومراجعته بنجاح في تبويب إدارة المدفوعات.",
        });
        return;
      }
    }
    const requestedCourseIds = Array.isArray(req.body.enrolledCourseIds)
      ? Array.from(
          new Set<number>(
            (req.body.enrolledCourseIds as unknown[])
              .map(Number)
              .filter((value) => Number.isInteger(value) && value > 0),
          ),
        ).slice(0, 50)
      : current.enrolledCourseIds;
    let requestedCategories = Array.isArray(req.body.enrolledCategories)
      ? Array.from(
          new Set<string>(
            (req.body.enrolledCategories as unknown[])
              .map((value) => String(value).trim())
              .filter(Boolean),
          ),
        ).slice(0, 20)
      : current.enrolledCategories;
    const adminExplicitlySetEnrollment =
      req.body.enrolledCourseIds !== undefined ||
      req.body.enrolledCategories !== undefined;
    if (
      adminExplicitlySetEnrollment &&
      requestedCourseIds.length === 0 &&
      requestedCategories.length === 0
    ) {
      requestedCategories = [MANUAL_EMPTY_ENROLLMENT];
    }

    const newGrade = req.body.grade !== undefined ? String(req.body.grade).trim() : undefined;
    const gradeChanged = Boolean(newGrade && newGrade !== current.grade);
    let newEduSystem = current.educationSystem;
    let newEduGrade = current.educationGrade;
    let newSchoolType = current.schoolType;
    let newTrack = current.academicTrack;

    if (newGrade) {
      const dims = getAcademicStageDimensions(newGrade);
      if (dims) {
        newEduSystem = dims.system;
        newEduGrade = dims.grade;
        if (dims.schoolType) newSchoolType = dims.schoolType;
        if (dims.track) newTrack = dims.track;
      }
    }
    if (req.body.schoolType !== undefined) {
      newSchoolType = String(req.body.schoolType).trim();
    }

    let finalCourseIds = requestedCourseIds;
    let finalCategories = requestedCategories;
    if (gradeChanged && !adminExplicitlySetEnrollment) {
      finalCourseIds = [];
      finalCategories = [];
    }

    let [student] = await db
      .update(studentsTable)
      .set({
        grade: newGrade !== undefined ? newGrade : current.grade,
        educationSystem: newEduSystem,
        educationGrade: newEduGrade,
        schoolType: newSchoolType,
        academicTrack: newTrack,
        status: req.body.status !== undefined ? status : current.status,
        accessCode:
          status === "approved"
            ? current.accessCode || await generateAccessCode()
            : current.accessCode,
        enrolledCategories: finalCategories,
        enrolledCourseIds: finalCourseIds,
        learningMode:
          req.body.learningMode !== undefined &&
          ["online", "offline"].includes(String(req.body.learningMode))
            ? String(req.body.learningMode)
            : current.learningMode,
        centerName:
          req.body.centerName !== undefined
            ? (String(req.body.centerName).trim() || null)
            : current.centerName,
        appointmentSlot:
          req.body.appointmentSlot !== undefined
            ? (String(req.body.appointmentSlot).trim() || null)
            : current.appointmentSlot,
        centerConfirmed:
          req.body.centerConfirmed !== undefined
            ? Boolean(req.body.centerConfirmed)
            : current.centerConfirmed,
        centerConfirmedAt:
          req.body.centerConfirmed !== undefined
            ? (req.body.centerConfirmed ? new Date() : null)
            : current.centerConfirmedAt,
        schoolName:
          req.body.schoolName !== undefined
            ? (String(req.body.schoolName).trim() || null)
            : current.schoolName,
        parentPhone:
          req.body.parentPhone !== undefined
            ? (String(req.body.parentPhone).trim() || null)
            : current.parentPhone,
        languageTrack:
          req.body.languageTrack !== undefined
            ? (String(req.body.languageTrack).trim() || null)
            : current.languageTrack,
        paymentStatus:
          req.body.paymentStatus !== undefined &&
          ["paid", "pending_review", "unpaid"].includes(String(req.body.paymentStatus))
            ? String(req.body.paymentStatus)
            : status === "approved"
            ? "paid"
            : current.paymentStatus,
        subscriptionStartDate:
          req.body.paymentStatus === "paid" || status === "approved"
            ? new Date()
            : current.subscriptionStartDate,
        subscriptionStatus:
          req.body.paymentStatus === "paid" || status === "approved"
            ? "active"
            : req.body.paymentStatus === "unpaid"
            ? "expired"
            : current.subscriptionStatus,
        approvedAt:
          status === "approved" || req.body.paymentStatus === "paid"
            ? (current.approvedAt || new Date())
            : current.approvedAt,
        notes:
          req.body.notes !== undefined ? String(req.body.notes) : current.notes,
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, id))
      .returning();
    if (req.body.status !== undefined && req.body.status !== "approved") {
      await db
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.studentId, id));
    }
    // Only auto-assign courses if the admin did NOT explicitly set enrollment in this request.
    // If enrolledCourseIds or enrolledCategories were sent (even as []), the admin intended
    // that exact value — running auto-assign would silently re-add the deleted courses.
    if (student && student.status === "approved" && !adminExplicitlySetEnrollment) {
      student = await ensureAutomaticCourseAssignments(student);
    }
    if (req.body.status === "approved" && current.status !== "approved") {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "success",
        title: "حسابك اتفعل بنجاح",
        message: "تقدر دلوقتي تدخل على كورساتك وتبدأ التعلم بالكود الخاص بيك.",
      });
    }
    if (req.body.enrolledCourseIds !== undefined || req.body.enrolledCategories !== undefined) {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "course",
        title: "تم تحديث كورساتك",
        message: "الكورسات والدروس المتاحة لك اتحدثت تلقائيًا. تقدر تبدأ المشاهدة دلوقتي.",
      });
    } else if (gradeChanged) {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "info",
        title: "تم تحديث مرحلتك الدراسية",
        message: `تم تغيير مرحلتك الدراسية إلى (${newGrade})، وتم تحديث المقررات المتاحة لك تلقائيًا.`,
      });
    } else if (req.body.learningMode !== undefined && student.learningMode !== current.learningMode) {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "info",
        title: "تم تحديث نظام الدراسة",
        message: "تم تحديث المحتوى المتاح لك حسب نظام الدراسة الجديد.",
      });
    }
    const changes: string[] = [];
    if (gradeChanged) {
      changes.push(`المرحلة التعليمية: من [${current.grade}] إلى [${newGrade}]`);
    }
    if (req.body.status !== undefined && req.body.status !== current.status) {
      changes.push(`الحالة: من [${current.status}] إلى [${req.body.status}]`);
    }
    if (req.body.paymentStatus !== undefined && req.body.paymentStatus !== current.paymentStatus) {
      changes.push(`الدفع: من [${current.paymentStatus}] إلى [${req.body.paymentStatus}]`);
    }
    if (req.body.learningMode !== undefined && req.body.learningMode !== current.learningMode) {
      changes.push(`نظام الدراسة: من [${current.learningMode}] إلى [${req.body.learningMode}]`);
    }
    if (req.body.enrolledCourseIds !== undefined) {
      changes.push(`المواد المسجلة: ${student.enrolledCourseIds.length} كورس (IDs: ${student.enrolledCourseIds.join(",")})`);
    }
    if (req.body.resetDevice === true) {
      await db
        .update(studentsTable)
        .set({ deviceId: null })
        .where(eq(studentsTable.id, id));
      student.deviceId = null;
      changes.push(`إعادة تعيين الجهاز الفعلي المقترن`);
    }

    const changeSummary = changes.length > 0 ? changes.join(" | ") : "تحديث بيانات أخرى";
    await logAudit(req, "UPDATE_STUDENT", "student", id, `تعديل الطالب (${current.name}): ${changeSummary}`);
    res.json(student);
  } catch (error) {
    next(error);
  }
});

// Admin Endpoint: Directly reset student bound device lock
router.post(
  "/admin/students/:id/reset-device",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: "معرّف الطالب غير صحيح" });
        return;
      }

      const [updated] = await db
        .update(studentsTable)
        .set({ deviceId: null, boundDevices: [], updatedAt: new Date() })
        .where(eq(studentsTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "الطالب غير موجود" });
        return;
      }

      // Also clear active sessions so student has to re-login from new device
      await db
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.studentId, id));

      await logAudit(req, "RESET_DEVICE", "student", String(id), `إلغاء وفك قفل أجهزة الطالب: ${updated.name}`);

      res.json({ success: true, message: "تم فك وإلغاء قفل الأجهزة للطالب بنجاح", student: updated });
    } catch (error) {
      next(error);
    }
  },
);

// Admin Endpoint: Update student maximum allowed devices limit (1 or 2)
router.post(
  "/admin/students/:id/set-max-devices",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const maxDevices = Number(req.body.maxDevices);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: "معرّف الطالب غير صحيح" });
        return;
      }
      if (![1, 2].includes(maxDevices)) {
        res.status(400).json({ error: "عدد الأجهزة المسموح به يجب أن يكون 1 أو 2 فقط" });
        return;
      }

      const [updated] = await db
        .update(studentsTable)
        .set({ maxDevices, updatedAt: new Date() })
        .where(eq(studentsTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "الطالب غير موجود" });
        return;
      }

      // Add notification for the student
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "info",
        title: maxDevices === 2 ? "تم الاعتماد: السماح بجهاز ثانٍ 📱📱" : "تحديث الأجهزة المسموحة 📱",
        message: maxDevices === 2
          ? "تمت موافقة الأدمن على فتح حسابك من جهاز ثانٍ. يمكنك تسجيل الدخول الآن من جهازك الثاني."
          : "تم تعيين الحد الأقصى للأجهزة إلى جهاز واحد فقط.",
      });

      res.json({
        success: true,
        message: maxDevices === 2 ? "تمت الموافقة والسماح بفتح جهاز ثانٍ للطالب بنجاح" : "تم ضبط الحد الأقصى للأجهزة إلى جهاز واحد",
        student: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/admin/recovery-requests", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: codeRecoveryRequestsTable.id,
        status: codeRecoveryRequestsTable.status,
        createdAt: codeRecoveryRequestsTable.createdAt,
        resolvedAt: codeRecoveryRequestsTable.resolvedAt,
        studentId: studentsTable.id,
        studentName: studentsTable.name,
        phone: studentsTable.phone,
        accessCode: studentsTable.accessCode,
      })
      .from(codeRecoveryRequestsTable)
      .innerJoin(studentsTable, eq(codeRecoveryRequestsTable.studentId, studentsTable.id))
      .orderBy(desc(codeRecoveryRequestsTable.createdAt));
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/recovery-requests/:id", requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status ?? "resolved");
    if (!['pending', 'resolved'].includes(status)) {
      res.status(400).json({ error: "حالة الطلب غير صحيحة" });
      return;
    }
    const [request] = await db
      .update(codeRecoveryRequestsTable)
      .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
      .where(eq(codeRecoveryRequestsTable.id, Number(req.params.id)))
      .returning();
    if (!request) {
      res.status(404).json({ error: "طلب الاسترجاع غير موجود" });
      return;
    }
    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.get("/baccalaureate/honor-wall", async (_req, res, next) => {
  try {
    const students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        school: studentsTable.schoolType,
        grade: studentsTable.educationGrade,
        avatarUrl: studentsTable.avatarUrl,
        educationSystem: studentsTable.educationSystem,
      })
      .from(studentsTable)
      .where(eq(studentsTable.status, "approved"));

    const progressRows = await db
      .select({
        studentId: videoProgressTable.studentId,
        videoId: videoProgressTable.videoId,
        progress: videoProgressTable.progress,
        completed: videoProgressTable.completed,
      })
      .from(videoProgressTable);

    const allVideos = await db
      .select({ id: videosTable.id })
      .from(videosTable);

    const totalVideosCount = allVideos.length || 6;

    // Calculate completed count per student
    const studentCompletedMap = new Map<number, number>();
    for (const p of progressRows) {
      if (p.completed || (p.progress || 0) >= 90) {
        const current = studentCompletedMap.get(p.studentId) || 0;
        studentCompletedMap.set(p.studentId, current + 1);
      }
    }

    const honorList = students
      .map((s) => {
        const completedVideos = studentCompletedMap.get(s.id) || 0;
        const total = totalVideosCount;
        const percentage = total > 0 ? Math.round((completedVideos / total) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          school: s.school || s.educationSystem || "طالب متميز",
          completedVideos,
          totalVideos: total,
          percentage,
          isFullAchiever: percentage >= 80,
          avatarUrl: s.avatarUrl || null,
        };
      })
      .filter((s) => s.percentage >= 80)
      .sort((a, b) => b.completedVideos - a.completedVideos);

    res.json({
      totalBaccVideos: totalVideosCount,
      students: honorList,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/baccalaureate/honor-wall/stream", async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write("retry: 3000\n\n");

    const sendUpdate = async () => {
      const students = await db
        .select({
          id: studentsTable.id,
          name: studentsTable.name,
          school: studentsTable.schoolType,
          avatarUrl: studentsTable.avatarUrl,
        })
        .from(studentsTable)
        .where(eq(studentsTable.status, "approved"));

      const progressRows = await db
        .select({
          studentId: videoProgressTable.studentId,
          videoId: videoProgressTable.videoId,
          progress: videoProgressTable.progress,
          completed: videoProgressTable.completed,
        })
        .from(videoProgressTable);

      const allVideos = await db
        .select({ id: videosTable.id })
        .from(videosTable);

      const totalVideosCount = allVideos.length || 6;

      const studentCompletedMap = new Map<number, number>();
      for (const p of progressRows) {
        if (p.completed || (p.progress || 0) >= 90) {
          const current = studentCompletedMap.get(p.studentId) || 0;
          studentCompletedMap.set(p.studentId, current + 1);
        }
      }

      const honorList = students
        .map((s) => {
          const completedVideos = studentCompletedMap.get(s.id) || 0;
          const percentage = totalVideosCount > 0 ? Math.round((completedVideos / totalVideosCount) * 100) : 0;
          return {
            id: s.id,
            name: s.name,
            school: s.school || "طالب متميز",
            completedVideos,
            totalVideos: totalVideosCount,
            percentage,
            isFullAchiever: percentage >= 80,
            avatarUrl: s.avatarUrl || null,
          };
        })
        .filter((s) => s.percentage >= 80)
        .sort((a, b) => b.completedVideos - a.completedVideos);

      res.write(`data: ${JSON.stringify({ students: honorList, totalBaccVideos: totalVideosCount })}\n\n`);
    };

    await sendUpdate();
    const interval = setInterval(sendUpdate, 4000);
    req.on("close", () => clearInterval(interval));
  } catch (error) {
    next(error);
  }
});

router.get("/learning/notifications", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const rows = await db
      .select()
      .from(studentNotificationsTable)
      .where(eq(studentNotificationsTable.studentId, student.id))
      .orderBy(desc(studentNotificationsTable.createdAt))
      .limit(30);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/learning/notifications/stream", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write("retry: 3000\n\n");

    let latestId = (await db
      .select({ id: studentNotificationsTable.id })
      .from(studentNotificationsTable)
      .where(eq(studentNotificationsTable.studentId, student.id))
      .orderBy(desc(studentNotificationsTable.id))
      .limit(1))[0]?.id ?? 0;
    res.write(`event: ready\ndata: ${JSON.stringify({ latestId })}\n\n`);

    const timer = setInterval(async () => {
      try {
        const currentId = (await db
          .select({ id: studentNotificationsTable.id })
          .from(studentNotificationsTable)
          .where(eq(studentNotificationsTable.studentId, student.id))
          .orderBy(desc(studentNotificationsTable.id))
          .limit(1))[0]?.id ?? 0;
        if (currentId > latestId) {
          const newest = (await db
            .select()
            .from(studentNotificationsTable)
            .where(and(
              eq(studentNotificationsTable.studentId, student.id),
              gt(studentNotificationsTable.id, latestId)
            ))
            .orderBy(desc(studentNotificationsTable.id))
            .limit(1))[0];
          latestId = currentId;
          res.write(`event: refresh\ndata: ${JSON.stringify({ latestId, notification: newest || null })}\n\n`);
        } else {
          res.write(": keep-alive\n\n");
        }
      } catch {
        res.write("event: error\ndata: {}\n\n");
      }
    }, 3000);
    req.on("close", () => clearInterval(timer));
  } catch (error) {
    next(error);
  }
});

router.patch("/learning/notifications/:id/read", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const [notification] = await db
      .update(studentNotificationsTable)
      .set({ readAt: new Date() })
      .where(and(
        eq(studentNotificationsTable.id, Number(req.params.id)),
        eq(studentNotificationsTable.studentId, student.id),
      ))
      .returning();
    if (!notification) {
      res.status(404).json({ error: "الإشعار غير موجود" });
      return;
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

router.post("/learning/notifications/read-all", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    await db
      .update(studentNotificationsTable)
      .set({ readAt: new Date() })
      .where(and(
        eq(studentNotificationsTable.studentId, student.id),
        isNull(studentNotificationsTable.readAt),
      ));
    res.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/notifications/broadcast", requireAdmin, async (req, res, next) => {
  try {
    const { title, message, type = "info", targetGrade, studentIds } = req.body;
    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: "عنوان ونص الإشعار مطلوبان" });
      return;
    }

    const allApproved = await db
      .select({ id: studentsTable.id, grade: studentsTable.grade })
      .from(studentsTable)
      .where(ne(studentsTable.status, "suspended"));

    let targets = allApproved;
    // If specific studentIds provided, use them directly
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const ids = studentIds.map(Number).filter(Number.isInteger);
      targets = allApproved.filter((st) => ids.includes(st.id));
    } else if (targetGrade && targetGrade !== "all") {
      targets = allApproved.filter((st) => st.grade === targetGrade);
    }

    if (targets.length === 0) {
      res.json({ success: true, count: 0, message: "لا يوجد طلاب ينطبق عليهم هذا الشرط" });
      return;
    }

    await db.insert(studentNotificationsTable).values(
      targets.map((st) => ({
        studentId: st.id,
        title: title.trim(),
        message: message.trim(),
        type: type || "info",
      })),
    );

    // Trigger OS-level Web Push even if student has closed the website!
    void sendPushToAllStudents(
      {
        title: title.trim(),
        body: message.trim(),
        url: "/platform",
        tag: `broadcast-${Date.now()}`,
      },
      targetGrade !== "all" ? targetGrade : undefined
    );

    res.json({
      success: true,
      count: targets.length,
      message: `تم إرسال الإشعار بنجاح إلى ${targets.length} طالب`,
    });
  } catch (error) {
    next(error);
  }
});

// ── Web Push Notifications Endpoints ──────────────────────────────────────────
router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post("/push/subscribe", async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    const { subscription, studentId: explicitStudentId } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({ error: "بيانات الاشتراك غير مكتملة" });
      return;
    }
    const userAgent = req.headers["user-agent"] || "";
    await savePushSubscription({
      studentId: student ? student.id : (explicitStudentId || null),
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });
    res.json({ success: true, message: "تم تسجيل اشتراك الإشعارات بنجاح" });
  } catch (error) {
    next(error);
  }
});

router.post("/push/unsubscribe", async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await removePushSubscription(endpoint);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.delete("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      res.status(400).json({ error: "معرّف الطالب غير صحيح" });
      return;
    }

    // Clean up linked session tokens and recovery requests
    await db.delete(studentSessionsTable).where(eq(studentSessionsTable.studentId, studentId));
    await db.delete(codeRecoveryRequestsTable).where(eq(codeRecoveryRequestsTable.studentId, studentId));

    const [student] = await db
      .delete(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .returning();

    if (!student) {
      res.status(404).json({ error: "الطالب غير موجود" });
    } else {
      res.json({ success: true, message: "تم حذف حساب الطالب بالكامل وتفريغ بريده وهاتفه ورقم جهازه للتسجيل مجددًا" });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/admin/students/:id/login-logs", requireAdmin, async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      res.status(400).json({ error: "ID طالب غير صالح" });
      return;
    }
    const logs = await db
      .select()
      .from(studentLoginLogsTable)
      .where(eq(studentLoginLogsTable.studentId, studentId))
      .orderBy(desc(studentLoginLogsTable.createdAt))
      .limit(100);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/students/:id/whatsapp-message", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const type = String(req.query.type ?? "");
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid student ID" });
      return;
    }
    if (!["welcome", "new-content", "reminder"].includes(type)) {
      res.status(400).json({ error: "type must be one of: welcome, new-content, reminder" });
      return;
    }
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .limit(1);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const name = student.name;
    const accessCode = student.accessCode ?? "";
    let message: string;
    if (type === "welcome") {
      message = `أهلاً ${name}، حسابك اتفعل على منصة د. محمود المهدي. كود الدخول الخاص بيك: ${accessCode}. ادخل من هنا: https://drelmahdy.com/platform`;
    } else if (type === "new-content") {
      message = `أهلاً ${name}، محتوى جديد متاح ليك على المنصة. ادخل دلوقتي وشوف الجديد: https://drelmahdy.com/platform`;
    } else {
      message = `أهلاً ${name}، فاكرينك! كمّل دروسك على المنصة وماتوقفش: https://drelmahdy.com/platform`;
    }
    // Normalise Egyptian phone: strip leading 0, prepend country code 20
    const rawPhone = student.phone.replace(/^\+/, "");
    const normalisedPhone = rawPhone.startsWith("0") ? `2${rawPhone}` : rawPhone.startsWith("20") ? rawPhone : `20${rawPhone}`;
    const whatsappUrl = `https://wa.me/${normalisedPhone}?text=${encodeURIComponent(message)}`;
    res.json({ whatsappUrl, message });
  } catch (error) {
    next(error);
  }
});

export default router;
