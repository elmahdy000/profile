import { Router, type IRouter } from "express";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import {
  db,
  monthlySubscriptionsTable,
  paymentReceiptsTable,
  studentsTable,
  studentNotificationsTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { logAudit } from "./learning";

const router: IRouter = Router();

// Helper: Create a new monthly subscription for a student
async function createMonthlySubscription(
  studentId: number,
  startDate: Date = new Date(),
  amountDue: number = 500
) {
  const monthEndDate = new Date(startDate);
  monthEndDate.setDate(monthEndDate.getDate() + 29); // 29 days subscription period

  const [subscription] = await db
    .insert(monthlySubscriptionsTable)
    .values({
      studentId,
      monthStartDate: startDate,
      monthEndDate,
      amountDue,
      paymentStatus: "pending",
    })
    .returning();

  return subscription;
}

// GET /api/admin/subscriptions - List all subscriptions with student details
router.get("/admin/subscriptions", requireAdmin, async (_req, res, next) => {
  try {
    const subscriptions = await db
      .select({
        id: monthlySubscriptionsTable.id,
        studentId: monthlySubscriptionsTable.studentId,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        monthStartDate: monthlySubscriptionsTable.monthStartDate,
        monthEndDate: monthlySubscriptionsTable.monthEndDate,
        amountDue: monthlySubscriptionsTable.amountDue,
        paymentStatus: monthlySubscriptionsTable.paymentStatus,
        paymentDate: monthlySubscriptionsTable.paymentDate,
        receiptId: monthlySubscriptionsTable.receiptId,
        adminNotes: monthlySubscriptionsTable.adminNotes,
        notifiedAt: monthlySubscriptionsTable.notifiedAt,
        createdAt: monthlySubscriptionsTable.createdAt,
      })
      .from(monthlySubscriptionsTable)
      .innerJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
      .orderBy(desc(monthlySubscriptionsTable.monthEndDate));

    res.json(subscriptions);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/subscriptions/expiring - Get subscriptions expiring soon (next 3 days)
router.get("/admin/subscriptions/expiring", requireAdmin, async (_req, res, next) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const expiring = await db
      .select({
        id: monthlySubscriptionsTable.id,
        studentId: monthlySubscriptionsTable.studentId,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        monthEndDate: monthlySubscriptionsTable.monthEndDate,
        paymentStatus: monthlySubscriptionsTable.paymentStatus,
        daysRemaining: sql<number>`EXTRACT(DAY FROM ${monthlySubscriptionsTable.monthEndDate} - NOW())`,
      })
      .from(monthlySubscriptionsTable)
      .innerJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
      .where(
        and(
          lte(monthlySubscriptionsTable.monthEndDate, threeDaysLater),
          eq(monthlySubscriptionsTable.paymentStatus, "pending")
        )
      )
      .orderBy(monthlySubscriptionsTable.monthEndDate);

    res.json(expiring);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/subscriptions/:id/mark-paid - Mark subscription as paid
router.post("/admin/subscriptions/:id/mark-paid", requireAdmin, async (req, res, next) => {
  try {
    const subscriptionId = Number(req.params.id);
    const receiptId = req.body.receiptId ? Number(req.body.receiptId) : null;
    const adminNotes = String(req.body.adminNotes ?? "").trim() || null;

    const [subscription] = await db
      .select()
      .from(monthlySubscriptionsTable)
      .where(eq(monthlySubscriptionsTable.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }

    if (subscription.paymentStatus === "paid") {
      res.status(409).json({ error: "الاشتراك مدفوع بالفعل" });
      return;
    }

    // Mark as paid and create next month subscription
    const [updated] = await db
      .update(monthlySubscriptionsTable)
      .set({
        paymentStatus: "paid",
        paymentDate: new Date(),
        receiptId,
        adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(monthlySubscriptionsTable.id, subscriptionId))
      .returning();

    // Create next month subscription automatically
    const nextStartDate = new Date(subscription.monthEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);

    await createMonthlySubscription(
      subscription.studentId,
      nextStartDate,
      subscription.amountDue
    );

    // Update student's current subscription reference
    await db
      .update(studentsTable)
      .set({
        paymentStatus: "paid",
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, subscription.studentId));

    // Notify student
    await db.insert(studentNotificationsTable).values({
      studentId: subscription.studentId,
      type: "success",
      title: "تم تأكيد دفع الاشتراك الشهري",
      message: `تم تأكيد دفع اشتراك الشهر بنجاح (${subscription.amountDue} جنيه). الاشتراك القادم يبدأ من ${nextStartDate.toLocaleDateString("ar-EG")}.`,
    });

    await logAudit(
      req,
      "MARK_SUBSCRIPTION_PAID",
      "subscription",
      String(subscriptionId),
      `تأكيد دفع اشتراك شهري للطالب #${subscription.studentId}`
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/subscriptions/:id/mark-overdue - Mark subscription as overdue
router.post("/admin/subscriptions/:id/mark-overdue", requireAdmin, async (req, res, next) => {
  try {
    const subscriptionId = Number(req.params.id);
    const adminNotes = String(req.body.adminNotes ?? "").trim() || null;

    const [updated] = await db
      .update(monthlySubscriptionsTable)
      .set({
        paymentStatus: "overdue",
        adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(monthlySubscriptionsTable.id, subscriptionId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }

    // Update student status to suspended if overdue
    await db
      .update(studentsTable)
      .set({
        subscriptionStatus: "expired",
        paymentStatus: "unpaid",
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, updated.studentId));

    // Notify student
    await db.insert(studentNotificationsTable).values({
      studentId: updated.studentId,
      type: "warning",
      title: "اشتراكك الشهري متأخر",
      message: `اشتراكك الشهري انتهى ولم يتم تجديده. يرجى دفع ${updated.amountDue} جنيه لإعادة تفعيل حسابك.`,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/subscriptions/notify-expiring - Send notifications to students with expiring subscriptions
router.post("/admin/subscriptions/notify-expiring", requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const expiring = await db
      .select()
      .from(monthlySubscriptionsTable)
      .where(
        and(
          lte(monthlySubscriptionsTable.monthEndDate, threeDaysLater),
          eq(monthlySubscriptionsTable.paymentStatus, "pending")
        )
      );

    let notifiedCount = 0;

    for (const subscription of expiring) {
      const daysRemaining = Math.ceil(
        (subscription.monthEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      await db.insert(studentNotificationsTable).values({
        studentId: subscription.studentId,
        type: "warning",
        title: "تنبيه: اشتراكك ينتهي قريباً",
        message: `اشتراكك الشهري سينتهي خلال ${daysRemaining} يوم. يرجى دفع ${subscription.amountDue} جنيه لتجديد الاشتراك وتجنب إيقاف الخدمة.`,
      });

      await db
        .update(monthlySubscriptionsTable)
        .set({ notifiedAt: now })
        .where(eq(monthlySubscriptionsTable.id, subscription.id));

      notifiedCount++;
    }

    res.json({
      success: true,
      notifiedCount,
      message: `تم إرسال ${notifiedCount} إشعار للطلاب الذين ينتهي اشتراكهم قريباً`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/students/:id/create-subscription - Create first subscription for a student after payment
router.post("/admin/students/:id/create-subscription", requireAdmin, async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const amountDue = Number(req.body.amountDue) || 500;

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "الطالب غير موجود" });
      return;
    }

    // Check if student already has an active subscription
    const [existingSubscription] = await db
      .select()
      .from(monthlySubscriptionsTable)
      .where(
        and(
          eq(monthlySubscriptionsTable.studentId, studentId),
          eq(monthlySubscriptionsTable.paymentStatus, "pending")
        )
      )
      .limit(1);

    if (existingSubscription) {
      res.status(409).json({ error: "الطالب لديه اشتراك نشط بالفعل" });
      return;
    }

    const subscription = await createMonthlySubscription(studentId, new Date(), amountDue);

    // Update student record
    await db
      .update(studentsTable)
      .set({
        currentSubscriptionId: subscription.id,
        subscriptionStartDate: subscription.monthStartDate,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, studentId));

    await logAudit(
      req,
      "CREATE_SUBSCRIPTION",
      "subscription",
      String(subscription.id),
      `إنشاء اشتراك شهري للطالب ${student.name}`
    );

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

export default router;
