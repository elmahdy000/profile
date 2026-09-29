import { Router, type IRouter } from "express";
import { and, desc, eq, gt, gte, inArray, or, sql, count } from "drizzle-orm";
import {
  db,
  studentsTable,
  studentNotesTable,
  videoProgressTable,
  videosTable,
  coursesTable,
  studentNotificationsTable,
  monthlySubscriptionsTable,
} from "@workspace/db";
import { requireAdmin } from "../../middleware/auth";
import { requireStudent } from "../../middleware/student-auth";
import { sendPushToStudent } from "../../services/push-notifications";
import { logAudit } from "../../lib/audit";

const router: IRouter = Router();

// ── Student Notes CRUD ──

router.get("/learning/notes/:videoId", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const videoId = Number(req.params.videoId);
    if (!Number.isInteger(videoId) || videoId <= 0) {
      res.status(400).json({ error: "معرف الفيديو غير صالح" });
      return;
    }
    const notes = await db
      .select()
      .from(studentNotesTable)
      .where(
        and(
          eq(studentNotesTable.studentId, student.id),
          eq(studentNotesTable.videoId, videoId),
        ),
      )
      .orderBy(desc(studentNotesTable.createdAt));
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

router.post("/learning/notes/:videoId", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const videoId = Number(req.params.videoId);
    const content = String(req.body.content ?? "").trim();
    const timestampSeconds = req.body.timestampSeconds != null
      ? Math.max(0, Math.round(Number(req.body.timestampSeconds)))
      : null;
    if (!Number.isInteger(videoId) || videoId <= 0) {
      res.status(400).json({ error: "معرف الفيديو غير صالح" });
      return;
    }
    if (!content || content.length > 2000) {
      res.status(400).json({ error: "الملاحظة مطلوبة (2000 حرف كحد أقصى)" });
      return;
    }
    const existing = await db
      .select({ id: studentNotesTable.id })
      .from(studentNotesTable)
      .where(
        and(
          eq(studentNotesTable.studentId, student.id),
          eq(studentNotesTable.videoId, videoId),
        ),
      );
    if (existing.length >= 20) {
      res.status(409).json({ error: "وصلت للحد الأقصى (20 ملاحظة لكل درس)" });
      return;
    }
    const [note] = await db
      .insert(studentNotesTable)
      .values({
        studentId: student.id,
        videoId,
        content,
        timestampSeconds: Number.isFinite(timestampSeconds) ? timestampSeconds : null,
      })
      .returning();
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

router.patch("/learning/notes/:id", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const noteId = Number(req.params.id);
    const content = String(req.body.content ?? "").trim();
    if (!content || content.length > 2000) {
      res.status(400).json({ error: "الملاحظة مطلوبة (2000 حرف كحد أقصى)" });
      return;
    }
    const [note] = await db
      .update(studentNotesTable)
      .set({ content, updatedAt: new Date() })
      .where(
        and(
          eq(studentNotesTable.id, noteId),
          eq(studentNotesTable.studentId, student.id),
        ),
      )
      .returning();
    if (!note) {
      res.status(404).json({ error: "الملاحظة غير موجودة" });
      return;
    }
    res.json(note);
  } catch (error) {
    next(error);
  }
});

router.delete("/learning/notes/:id", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const noteId = Number(req.params.id);
    const [note] = await db
      .delete(studentNotesTable)
      .where(
        and(
          eq(studentNotesTable.id, noteId),
          eq(studentNotesTable.studentId, student.id),
        ),
      )
      .returning();
    if (!note) {
      res.status(404).json({ error: "الملاحظة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// C++ Code Execution endpoint using Wandbox / GCC Online API
router.post(
  "/learning/compiler/run",
  requireStudent,
  async (req, res, next) => {
    try {
      const code = String(req.body.code ?? "");
      const stdin = String(req.body.stdin ?? "");
      
      if (!code.trim()) {
        res.status(400).json({ error: "الكود فارغ" });
        return;
      }

      if (code.length > 50000) {
        res.status(400).json({ error: "حجم الكود كبير جداً" });
        return;
      }

      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      // ── Primary: Wandbox (synchronous). Falls back to Paiza on failure. ──
      let wandboxOk = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response: Response;
        try {
          response = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              compiler: "gcc-head",
              code,
              stdin,
              options: "warning,c++20",
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.ok) {
          const result = (await response.json()) as any;
          stdout = result.program_output ?? "";
          stderr =
            result.program_error ||
            result.compiler_error ||
            result.compiler_output ||
            "";
          exitCode = result.status === "0" ? 0 : Number(result.status ?? 1);
          wandboxOk = true;
        }
      } catch {
        // network error / abort → fall through to Paiza fallback below
      }

      // ── Fallback: Paiza.IO async runner (create + poll for completion) ──
      if (!wandboxOk) {
        const createRes = await fetch("https://api.paiza.io/runners/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: "cpp",
            source_code: code,
            input: stdin,
            api_key: "guest",
          }),
        });
        if (!createRes.ok) {
          throw new Error(`Compiler API error: ${createRes.status}`);
        }
        const created = (await createRes.json()) as any;
        const runId = created.id;
        if (!runId) {
          throw new Error("Compiler API error: no run id");
        }

        // Poll get_details until the job finishes (bounded hard cap so the
        // request can never hang indefinitely).
        let details: any = null;
        for (let attempt = 0; attempt < 15; attempt++) {
          const detailsRes = await fetch(
            `https://api.paiza.io/runners/get_details?id=${runId}&api_key=guest`,
          );
          details = (await detailsRes.json()) as any;
          if (details.status !== "running") break;
          await new Promise((r) => setTimeout(r, 500));
        }

        stdout = details?.stdout ?? "";
        stderr = details?.stderr || details?.build_stderr || "";
        exitCode =
          details?.build_exit_code === 0 && details?.exit_code === 0 ? 0 : 1;
      }

      // A clean run (exit 0) stays a success even when stderr carries compiler
      // warnings; only genuine errors (nonzero exit) count as failure.
      const success = exitCode === 0;

      res.json({
        output: stdout,
        error: stderr,
        exitCode,
        success,
      });
    } catch (error) {
      res.status(500).json({
        output: "",
        error: "تعذر الاتصال بـ C++ Compiler Server حالياً. يرجى المحاولة مرة أخرى.",
        exitCode: 1,
        success: false,
      });
    }
  }
);

router.get(
  "/admin/center-stats",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const offlineStudents = await db
        .select({
          id: studentsTable.id,
          centerName: studentsTable.centerName,
          appointmentSlot: studentsTable.appointmentSlot,
          status: studentsTable.status,
          grade: studentsTable.grade,
        })
        .from(studentsTable)
        .where(
          or(
            eq(studentsTable.learningMode, "offline"),
            sql`${studentsTable.centerName} IS NOT NULL AND ${studentsTable.centerName} != ''`
          )
        );

      const statsMap: Record<string, number> = {};
      let totalOffline = 0;

      for (const s of offlineStudents) {
        totalOffline++;
        const cName = s.centerName || "غير محدد";
        statsMap[cName] = (statsMap[cName] || 0) + 1;
      }

      res.json({
        totalOffline,
        centerCounts: statsMap,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// Monthly Subscriptions Management
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /admin/subscriptions
 * Get all monthly subscriptions with filtering
 */
router.get(
  "/admin/subscriptions",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { status, expiringSoon } = req.query;

      let conditions = [];

      if (status && status !== "all") {
        conditions.push(eq(monthlySubscriptionsTable.paymentStatus, status as string));
      }

      const subscriptions = await db
        .select({
          subscription: monthlySubscriptionsTable,
          student: {
            id: studentsTable.id,
            name: studentsTable.name,
            phone: studentsTable.phone,
            email: studentsTable.email,
            grade: studentsTable.grade,
            subscriptionStatus: studentsTable.subscriptionStatus,
          },
        })
        .from(monthlySubscriptionsTable)
        .leftJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(monthlySubscriptionsTable.monthEndDate));

      let result = subscriptions;

      // Filter expiring soon (within 3 days)
      if (expiringSoon === "true") {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        result = subscriptions.filter((s) => {
          const endDate = new Date(s.subscription.monthEndDate);
          return endDate <= threeDaysFromNow && endDate >= now && s.subscription.paymentStatus === "pending";
        });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/subscriptions/expiring
 * Get subscriptions expiring within 3 days
 */
router.get(
  "/admin/subscriptions/expiring",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiring = await db
        .select({
          subscription: monthlySubscriptionsTable,
          student: {
            id: studentsTable.id,
            name: studentsTable.name,
            phone: studentsTable.phone,
            email: studentsTable.email,
          },
        })
        .from(monthlySubscriptionsTable)
        .leftJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
        .where(
          and(
            eq(monthlySubscriptionsTable.paymentStatus, "pending"),
            sql`${monthlySubscriptionsTable.monthEndDate} >= ${now}`,
            sql`${monthlySubscriptionsTable.monthEndDate} <= ${threeDaysFromNow}`
          )
        )
        .orderBy(monthlySubscriptionsTable.monthEndDate);

      res.json(expiring);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/subscriptions/:id/mark-paid
 * Mark subscription as paid and create next subscription automatically
 */
router.post(
  "/admin/subscriptions/:id/mark-paid",
  requireAdmin,
  async (req, res, next) => {
    try {
      const subscriptionId = parseInt(String(req.params.id));
      const { adminNotes } = req.body;

      const [subscription] = await db
        .select()
        .from(monthlySubscriptionsTable)
        .where(eq(monthlySubscriptionsTable.id, subscriptionId));

      if (!subscription) {
        res.status(404).json({ error: "الاشتراك غير موجود" });
        return;
      }

      // Update current subscription to paid
      await db
        .update(monthlySubscriptionsTable)
        .set({
          paymentStatus: "paid",
          paymentDate: new Date(),
          adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(monthlySubscriptionsTable.id, subscriptionId));

      // Create next subscription (29 days from end of current)
      const nextStartDate = new Date(subscription.monthEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1); // Start day after current ends
      const nextEndDate = new Date(nextStartDate);
      nextEndDate.setDate(nextEndDate.getDate() + 29);

      const [newSubscription] = await db
        .insert(monthlySubscriptionsTable)
        .values({
          studentId: subscription.studentId,
          monthStartDate: nextStartDate,
          monthEndDate: nextEndDate,
          amountDue: 500,
          paymentStatus: "pending",
        })
        .returning();

      // Update student's current subscription reference
      await db
        .update(studentsTable)
        .set({
          currentSubscriptionId: newSubscription.id,
          subscriptionStatus: "active",
          updatedAt: new Date(),
        })
        .where(eq(studentsTable.id, subscription.studentId));

      // Send notification
      const daysUntilExpiry = Math.ceil((nextEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      await db.insert(studentNotificationsTable).values({
        studentId: subscription.studentId,
        title: "تم تأكيد الدفع 💚",
        message: `تم تأكيد دفع اشتراك الشهر بنجاح. اشتراكك الحالي ينتهي بعد ${daysUntilExpiry} يوم (${nextEndDate.toLocaleDateString("ar-EG")})`,
        type: "success",
      });

      // Log admin action
      await logAudit(
        req,
        "CONFIRM_SUBSCRIPTION_PAYMENT",
        "subscription",
        subscriptionId.toString(),
        `تأكيد دفع الاشتراك للطالب ${subscription.studentId}`
      );

      res.json({
        success: true,
        subscription,
        nextSubscription: newSubscription,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/subscriptions/:id/mark-overdue
 * Mark subscription as overdue and suspend student
 */
router.post(
  "/admin/subscriptions/:id/mark-overdue",
  requireAdmin,
  async (req, res, next) => {
    try {
      const subscriptionId = parseInt(String(req.params.id));
      const { adminNotes } = req.body;

      const [subscription] = await db
        .select()
        .from(monthlySubscriptionsTable)
        .where(eq(monthlySubscriptionsTable.id, subscriptionId));

      if (!subscription) {
        res.status(404).json({ error: "الاشتراك غير موجود" });
        return;
      }

      // Update subscription to overdue
      await db
        .update(monthlySubscriptionsTable)
        .set({
          paymentStatus: "overdue",
          adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(monthlySubscriptionsTable.id, subscriptionId));

      // Suspend student account
      await db
        .update(studentsTable)
        .set({
          subscriptionStatus: "suspended",
          updatedAt: new Date(),
        })
        .where(eq(studentsTable.id, subscription.studentId));

      // Send notification
      await db.insert(studentNotificationsTable).values({
        studentId: subscription.studentId,
        title: "انتهى اشتراكك ⚠️",
        message: "اشتراكك الشهري انتهى ولم يتم تجديده. يرجى الدفع لإعادة تفعيل حسابك والوصول إلى المحتوى التعليمي.",
        type: "warning",
      });

      // Log admin action
      await logAudit(
        req,
        "MARK_SUBSCRIPTION_OVERDUE",
        "subscription",
        subscriptionId.toString(),
        `وضع علامة متأخر على اشتراك الطالب ${subscription.studentId}`
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/subscriptions/notify-expiring
 * Send notifications to students with expiring subscriptions
 */
router.post(
  "/admin/subscriptions/notify-expiring",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiring = await db
        .select()
        .from(monthlySubscriptionsTable)
        .where(
          and(
            eq(monthlySubscriptionsTable.paymentStatus, "pending"),
            sql`${monthlySubscriptionsTable.monthEndDate} >= ${now}`,
            sql`${monthlySubscriptionsTable.monthEndDate} <= ${threeDaysFromNow}`
          )
        );

      let notifiedCount = 0;

      for (const sub of expiring) {
        const daysLeft = Math.ceil((new Date(sub.monthEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        await db.insert(studentNotificationsTable).values({
          studentId: sub.studentId,
          title: "تنبيه انتهاء الاشتراك ⏰",
          message: `اشتراكك الشهري ينتهي خلال ${daysLeft} يوم (${new Date(sub.monthEndDate).toLocaleDateString("ar-EG")}). يرجى تجديد اشتراكك لتجنب توقف الخدمة.`,
          type: "warning",
        });

        await db
          .update(monthlySubscriptionsTable)
          .set({ notifiedAt: new Date() })
          .where(eq(monthlySubscriptionsTable.id, sub.id));

        notifiedCount++;
      }

      res.json({
        success: true,
        notifiedCount,
        message: `تم إرسال ${notifiedCount} إشعار للطلاب`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/students/:id/create-subscription
 * Manually create a subscription for a student (used after first payment approval)
 */
router.post(
  "/admin/students/:id/create-subscription",
  requireAdmin,
  async (req, res, next) => {
    try {
      const studentId = parseInt(String(req.params.id));

      const [student] = await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.id, studentId));

      if (!student) {
        res.status(404).json({ error: "الطالب غير موجود" });
        return;
      }

      // Create first subscription (29 days from now)
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 29);

      const [subscription] = await db
        .insert(monthlySubscriptionsTable)
        .values({
          studentId,
          monthStartDate: startDate,
          monthEndDate: endDate,
          amountDue: 500,
          paymentStatus: "pending",
        })
        .returning();

      // Update student
      await db
        .update(studentsTable)
        .set({
          currentSubscriptionId: subscription.id,
          subscriptionStartDate: startDate,
          subscriptionStatus: "active",
          updatedAt: new Date(),
        })
        .where(eq(studentsTable.id, studentId));

      // Send notification
      await db.insert(studentNotificationsTable).values({
        studentId,
        title: "تم تفعيل اشتراكك 🎉",
        message: `مرحباً بك! تم تفعيل اشتراكك بنجاح. اشتراكك ينتهي بعد 29 يوم (${endDate.toLocaleDateString("ar-EG")})`,
        type: "success",
      });

      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
