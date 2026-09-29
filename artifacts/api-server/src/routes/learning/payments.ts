import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  paymentReceiptsTable,
  studentLessonSummariesTable,
  studentsTable,
  studentNotificationsTable,
  monthlySubscriptionsTable,
  coursesTable,
  videosTable,
} from "@workspace/db";
import { requireAdmin, getAdminIdentity, getAdminRole } from "../../middleware/auth";
import { requireStudent } from "../../middleware/student-auth";
import { sendPushToStudent } from "../../services/push-notifications";
import { logAudit } from "../../lib/audit";
import {
  paymentReceiptUpload,
  paymentReceiptsDir,
  summariesDir,
  summaryImagesUpload,
  ensureAutomaticCourseAssignments,
  generateAccessCode,
  confirmPendingBookingsForPhone,
} from "./shared";

const router: IRouter = Router();

// ── Payment Receipt Endpoints ──

router.post("/student/payment-receipt", requireStudent, (req, res, next) => {
  paymentReceiptUpload(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({ error: uploadError.message || "تعذر رفع الصورة" });
      return;
    }
    try {
      if (!req.file) {
        res.status(400).json({ error: "ارفع صورة إيصال الدفع" });
        return;
      }
      const student = res.locals.student as typeof studentsTable.$inferSelect;
      if (student.paymentStatus === "paid") {
        fs.rmSync(req.file.path, { force: true });
        res.status(409).json({ error: "حسابك مفعّل بالفعل ومدفوع" });
        return;
      }
      const [pendingReceipt] = await db
        .select()
        .from(paymentReceiptsTable)
        .where(and(
          eq(paymentReceiptsTable.studentId, student.id),
          eq(paymentReceiptsTable.status, "pending"),
        ))
        .limit(1);
      if (pendingReceipt) {
        fs.rmSync(req.file.path, { force: true });
        res.status(409).json({ error: "عندك إيصال مرفوع بالفعل وجاري مراجعته" });
        return;
      }
      const [receipt] = await db
        .insert(paymentReceiptsTable)
        .values({
          studentId: student.id,
          snapshotStudentName: student.name,
          snapshotStudentPhone: student.phone,
          imageStorageName: req.file.filename,
          originalName: path.basename(req.file.originalname),
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        })
        .returning();

      // Update student payment status to pending_review
      await db
        .update(studentsTable)
        .set({ paymentStatus: "pending_review", updatedAt: new Date() })
        .where(eq(studentsTable.id, student.id));

      res.status(201).json({ receipt, paymentStatus: "pending_review" });
    } catch (error) {
      next(error);
    }
  });
});

router.get("/student/payment-status", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const [latestReceipt] = await db
      .select()
      .from(paymentReceiptsTable)
      .where(eq(paymentReceiptsTable.studentId, student.id))
      .orderBy(desc(paymentReceiptsTable.createdAt))
      .limit(1);
    res.json({
      paymentStatus: student.paymentStatus,
      receipt: latestReceipt ? {
        id: latestReceipt.id,
        status: latestReceipt.status,
        adminNotes: latestReceipt.adminNotes,
        createdAt: latestReceipt.createdAt,
      } : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/payment-receipts", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: paymentReceiptsTable.id,
        status: paymentReceiptsTable.status,
        adminNotes: paymentReceiptsTable.adminNotes,
        reviewedByRole: paymentReceiptsTable.reviewedByRole,
        reviewedByName: paymentReceiptsTable.reviewedByName,
        reviewedAt: paymentReceiptsTable.reviewedAt,
        createdAt: paymentReceiptsTable.createdAt,
        originalName: paymentReceiptsTable.originalName,
        mimeType: paymentReceiptsTable.mimeType,
        sizeBytes: paymentReceiptsTable.sizeBytes,
        studentId: paymentReceiptsTable.studentId,
        studentName: sql<string>`COALESCE(${studentsTable.name}, ${paymentReceiptsTable.snapshotStudentName}, 'حساب محذوف')`,
        studentPhone: sql<string>`COALESCE(${studentsTable.phone}, ${paymentReceiptsTable.snapshotStudentPhone}, '—')`,
        paymentStatus: sql<string>`COALESCE(${studentsTable.paymentStatus}, ${paymentReceiptsTable.status})`,
      })
      .from(paymentReceiptsTable)
      .leftJoin(studentsTable, eq(paymentReceiptsTable.studentId, studentsTable.id))
      .orderBy(desc(paymentReceiptsTable.createdAt));
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/payment-receipts/:id", requireAdmin, async (req, res, next) => {
  try {
    const receiptId = Number(req.params.id);
    const status = String(req.body.status ?? "");
    const adminNotes = String(req.body.adminNotes ?? "").trim() || null;
    const identity = getAdminIdentity(req);
    const role = identity?.role || getAdminRole(req);
    const reviewerName = identity?.username || (role === "superadmin" ? "المدير الرئيسي" : "المشرف المساعد");

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "الحالة لازم تكون approved أو rejected" });
      return;
    }
    if (status === "rejected" && role !== "superadmin") {
      res.status(403).json({ error: "رفض إيصالات الدفع متاح للمدير الرئيسي فقط" });
      return;
    }
    const [receipt] = await db
      .select()
      .from(paymentReceiptsTable)
      .where(eq(paymentReceiptsTable.id, receiptId))
      .limit(1);
    if (!receipt) {
      res.status(404).json({ error: "الإيصال غير موجود" });
      return;
    }
    if (receipt.status !== "pending") {
      res.status(409).json({ error: "الإيصال تمت مراجعته بالفعل" });
      return;
    }

    const [updated] = await db
      .update(paymentReceiptsTable)
      .set({
        status,
        adminNotes,
        reviewedByRole: role,
        reviewedByName: reviewerName,
        reviewedAt: new Date(),
      })
      .where(eq(paymentReceiptsTable.id, receiptId))
      .returning();

    if (status === "approved") {
      if (receipt.studentId) {
        const [student] = await db
          .select()
          .from(studentsTable)
          .where(eq(studentsTable.id, receipt.studentId))
          .limit(1);

        if (student) {
          const code = student.accessCode || (await generateAccessCode());
          await db
            .update(studentsTable)
            .set({
              status: "approved",
              paymentStatus: "paid",
              accessCode: code,
              approvedAt: new Date(),
              subscriptionStartDate: new Date(),
              subscriptionStatus: "active",
              updatedAt: new Date(),
            })
            .where(eq(studentsTable.id, receipt.studentId));

          // Ensure automatic course assignments for approved student
          try {
            await ensureAutomaticCourseAssignments({
              ...student,
              status: "approved",
              paymentStatus: "paid",
            });
          } catch (assignErr) {
            console.error("Warning: Failed to ensure automatic course assignments on receipt approval:", assignErr);
          }

          // A verified payment confirms any matching pending booking.
          await confirmPendingBookingsForPhone(student.phone);

          // Create first monthly subscription after payment approval defensively
          try {
            const subscriptionStartDate = new Date();
            const subscriptionEndDate = new Date(subscriptionStartDate);
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 29);

            const [subscription] = await db
              .insert(monthlySubscriptionsTable)
              .values({
                studentId: receipt.studentId,
                monthStartDate: subscriptionStartDate,
                monthEndDate: subscriptionEndDate,
                amountDue: 500,
                paymentStatus: "paid",
                paymentDate: new Date(),
                receiptId: receipt.id,
              })
              .returning();

            if (subscription) {
              await db
                .update(studentsTable)
                .set({
                  currentSubscriptionId: subscription.id,
                  subscriptionStartDate: subscriptionStartDate,
                })
                .where(eq(studentsTable.id, receipt.studentId));
            }
          } catch (subErr) {
            console.error("Warning: Failed to create monthly subscription record:", subErr);
          }
        }

        await db.insert(studentNotificationsTable).values({
          studentId: receipt.studentId,
          type: "success",
          title: "تم تأكيد الدفع وتفعيل الحساب",
          message: "تم تأكيد إيصال الدفع وتفعيل حسابك بنجاح. تقدر دلوقتي تشوف كل الدروس والمحتوى. اشتراكك الشهري ينتهي بعد 29 يوم.",
        });
      }
    } else {
      if (receipt.studentId) {
        await db
          .update(studentsTable)
          .set({ paymentStatus: "unpaid", updatedAt: new Date() })
          .where(eq(studentsTable.id, receipt.studentId));
        await db.insert(studentNotificationsTable).values({
          studentId: receipt.studentId,
          type: "warning",
          title: "تم رفض إيصال الدفع",
          message: adminNotes
            ? `تم رفض الإيصال: ${adminNotes}. ارفع إيصال صحيح.`
            : "تم رفض الإيصال. ارفع إيصال دفع صحيح وواضح.",
        });
      }
    }
    await logAudit(
      req,
      `REVIEW_RECEIPT_${status.toUpperCase()}`,
      "receipt",
      receiptId,
      `قام (${reviewerName}) بـ ${status === "approved" ? "قبول وتفعيل" : "رفض"} إيصال الطالب رقم ${receipt.studentId || "غير محدد"}`
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// STUDENT LESSON SUMMARIES ROUTES (تلاخيص الطلاب)
// ==========================================

// POST /api/learning/summaries/upload - Student uploads summary photos
router.post("/learning/summaries/upload", requireStudent, (req, res, next) => {
  // Allow up to 5 minutes for uploads on slower mobile connections
  req.setTimeout(300000);
  summaryImagesUpload(req, res, async (err) => {
    if (err) {
      const multerErr = err as any;
      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "حجم الصورة كبير جداً (الحد الأقصى 50 ميجابايت لكل صورة)" });
      }
      if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: "يمكنك رفع 10 صور كحد أقصى لكل درس" });
      }
      return res.status(400).json({ error: err.message || "حدث خطأ أثناء رفع صور المذكرة" });
    }
    try {
      const student = res.locals.student || (req as any).student;
      if (!student?.id) {
        return res.status(401).json({ error: "الرجاء تسجيل الدخول أولاً" });
      }
      const studentId = student.id;
      const lessonTitle = String(req.body.lessonTitle ?? "").trim();
      const courseIdStr = req.body.courseId ? String(req.body.courseId).trim() : null;
      const courseTitle = req.body.courseTitle ? String(req.body.courseTitle).trim() : null;
      const studentNotes = req.body.studentNotes ? String(req.body.studentNotes).trim() : null;

      if (!lessonTitle) {
        return res.status(400).json({ error: "اسم الدرس مطلوب" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "يرجى رفع صورة واحدة على الأقل من كشكول الملخص" });
      }

      const imageUrls = files.map((f) => `/api/learning/summaries/images/${f.filename}`);

      const [inserted] = await db
        .insert(studentLessonSummariesTable)
        .values({
          studentId,
          lessonTitle,
          courseId: courseIdStr ? parseInt(courseIdStr, 10) : null,
          courseTitle,
          imageUrls,
          studentNotes,
          status: "pending",
        })
        .returning();

      // Notify student
      await db.insert(studentNotificationsTable).values({
        studentId,
        type: "info",
        title: "تم تسليم الملخص بنجاح 📝",
        message: `تم رفع ملخص درس (${lessonTitle}) بنجاح! ينتظر مراجعة وتدقيق المعلم.`,
      });

      return res.status(201).json(inserted);
    } catch (error) {
      return next(error);
    }
  });
});

// GET /api/learning/summaries/images/:filename - Serve summary image file (auth required)
router.get("/learning/summaries/images/:filename", async (req, res, next) => {
  try {
    // Allow admin access
    const isAdmin = getAdminRole(req) !== null;
    // Allow student access (verify session)
    const student = res.locals.student || (req as any).student;
    let studentId: number | null = null;
    if (!isAdmin) {
      if (!student?.id) {
        // Resolve student from cookie for this endpoint
        const { getApprovedStudent } = await import("../../middleware/student-auth");
        const resolved = await getApprovedStudent(req);
        if (!resolved) return res.status(401).json({ error: "يجب تسجيل الدخول لعرض صور المذكرات" });
        studentId = resolved.id;
      } else {
        studentId = student.id as number;
      }
    }

    const filename = path.basename(req.params.filename);
    const filePath = path.join(summariesDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("الصورة غير موجودة");
    }

    // If student, verify they own a summary with this image
    if (!isAdmin && studentId) {
      const imageUrl = `/api/learning/summaries/images/${filename}`;
      const rows = await db
        .select({ imageUrls: studentLessonSummariesTable.imageUrls })
        .from(studentLessonSummariesTable)
        .where(eq(studentLessonSummariesTable.studentId, studentId));
      const hasAccess = rows.some((r) => Array.isArray(r.imageUrls) && r.imageUrls.includes(imageUrl));
      if (!hasAccess) {
        return res.status(403).json({ error: "غير مصرح لك بالوصول لهذه الصورة" });
      }
    }

    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
});


// GET /api/learning/summaries/my - Student's own summary submissions
router.get("/learning/summaries/my", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student || (req as any).student;
    if (!student?.id) {
      res.status(401).json({ error: "الرجاء تسجيل الدخول أولاً" });
      return;
    }
    const studentId = student.id;
    const summaries = await db
      .select()
      .from(studentLessonSummariesTable)
      .where(eq(studentLessonSummariesTable.studentId, studentId))
      .orderBy(desc(studentLessonSummariesTable.createdAt));
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/summaries - Admin/SubAdmin list all student summaries
router.get("/admin/summaries", requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = req.query.status ? String(req.query.status) : "all";
    const studentIdFilter = req.query.studentId ? parseInt(String(req.query.studentId), 10) : null;

    let query = db
      .select({
        id: studentLessonSummariesTable.id,
        studentId: studentLessonSummariesTable.studentId,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        studentGrade: studentsTable.grade,
        accessCode: studentsTable.accessCode,
        lessonTitle: studentLessonSummariesTable.lessonTitle,
        courseId: studentLessonSummariesTable.courseId,
        courseTitle: studentLessonSummariesTable.courseTitle,
        imageUrls: studentLessonSummariesTable.imageUrls,
        studentNotes: studentLessonSummariesTable.studentNotes,
        status: studentLessonSummariesTable.status,
        adminFeedback: studentLessonSummariesTable.adminFeedback,
        reviewedByRole: studentLessonSummariesTable.reviewedByRole,
        reviewedByName: studentLessonSummariesTable.reviewedByName,
        reviewedAt: studentLessonSummariesTable.reviewedAt,
        createdAt: studentLessonSummariesTable.createdAt,
      })
      .from(studentLessonSummariesTable)
      .leftJoin(studentsTable, eq(studentLessonSummariesTable.studentId, studentsTable.id));

    const conditions = [];
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(studentLessonSummariesTable.status, statusFilter));
    }
    if (studentIdFilter) {
      conditions.push(eq(studentLessonSummariesTable.studentId, studentIdFilter));
    }

    const summaries = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(studentLessonSummariesTable.createdAt))
      : await query.orderBy(desc(studentLessonSummariesTable.createdAt));

    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/summaries/:id/review - Admin/SubAdmin reviews a summary
router.post("/admin/summaries/:id/review", requireAdmin, async (req, res, next) => {
  try {
    const summaryId = parseInt(req.params.id as string, 10);
    const { status, adminFeedback } = req.body; // status: "reviewed" | "needs_revision" | "pending"
    if (!status || !["reviewed", "needs_revision", "pending"].includes(status)) {
      return res.status(400).json({ error: "حالة مراجعة غير صالحة" });
    }

    const [summary] = await db
      .select()
      .from(studentLessonSummariesTable)
      .where(eq(studentLessonSummariesTable.id, summaryId))
      .limit(1);

    if (!summary) {
      return res.status(404).json({ error: "التلخيص غير موجود" });
    }

    const reviewerRole = getAdminRole(req);
    const reviewerIdentity = getAdminIdentity(req);
    const reviewerName = (reviewerIdentity as any)?.fullName || reviewerIdentity?.username || (reviewerRole === "superadmin" ? "د. محمود المهدي" : "المشرف المساعد");

    const [updated] = await db
      .update(studentLessonSummariesTable)
      .set({
        status,
        adminFeedback: adminFeedback !== undefined ? (String(adminFeedback).trim() || null) : summary.adminFeedback,
        reviewedByRole: reviewerRole,
        reviewedByName: reviewerName,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentLessonSummariesTable.id, summaryId))
      .returning();

    // Send notification to student
    if (summary.studentId) {
      const feedbackText = adminFeedback ? ` الملاحظات: ${adminFeedback}` : "";
      const notifTitle = status === "reviewed" ? "تمت مراجعة تلخيص الدرس ⭐" : status === "needs_revision" ? "تنبيه بشأن تلخيص الدرس 📝" : "تحديث حالة التلخيص";
      const notifMsg = status === "reviewed"
        ? `أحسنت! تمت مراجعة واكتفاء ملخص درس (${summary.lessonTitle}) بنجاح.${feedbackText}`
        : `يرجى تعديل ملخص درس (${summary.lessonTitle}).${feedbackText}`;

      await db.insert(studentNotificationsTable).values({
        studentId: summary.studentId,
        type: status === "reviewed" ? "success" : "warning",
        title: notifTitle,
        message: notifMsg,
      });
    }

    await logAudit(
      req,
      `REVIEW_SUMMARY_${status.toUpperCase()}`,
      "summary",
      summaryId,
      `قام (${reviewerName}) بمراجعة تلخيص درس (${summary.lessonTitle}) للطالب #${summary.studentId}`
    );

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/payment-receipts/:id/image", requireAdmin, async (req, res, next) => {
  try {
    const [receipt] = await db
      .select()
      .from(paymentReceiptsTable)
      .where(eq(paymentReceiptsTable.id, Number(req.params.id)))
      .limit(1);
    if (!receipt) {
      res.status(404).json({ error: "الإيصال غير موجود" });
      return;
    }
    const filePath = path.join(paymentReceiptsDir, path.basename(receipt.imageStorageName));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "ملف الصورة غير موجود" });
      return;
    }
    res.setHeader("Content-Type", receipt.mimeType);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(receipt.originalName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});


export default router;
