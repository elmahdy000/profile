import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  parentsTable,
  parentSessionsTable,
  quizAttemptsTable,
  studentNotificationsTable,
  studentsTable,
  videoProgressTable,
  videosTable,
} from "@workspace/db";
import { fixedWindowRateLimit } from "../middleware/rate-limit";

const router: IRouter = Router();
const PARENT_COOKIE = "parent_session";

const parentRegisterLimit = fixedWindowRateLimit({
  name: "parent-register",
  limit: 10,
  windowMs: 60 * 60 * 1000,
});

const parentLoginLimit = fixedWindowRateLimit({
  name: "parent-login",
  limit: 15,
  windowMs: 15 * 60 * 1000,
});

function getParentSession(req: any): string | null {
  const token = req.cookies?.[PARENT_COOKIE];
  if (!token || typeof token !== "string") return null;
  return token;
}

// POST /api/parent/register
router.post("/parent/register", parentRegisterLimit, async (req, res, next) => {
  try {
    const parentName = String(req.body.parentName ?? "").trim();
    const parentPhone = String(req.body.parentPhone ?? "").replace(/\s+/g, "");
    const studentPhone = String(req.body.studentPhone ?? "").replace(/\s+/g, "");

    if (!parentName || !parentPhone || !studentPhone) {
      res.status(400).json({ error: "جميع البيانات مطلوبة" });
      return;
    }

    const cleanStudentPhone = studentPhone.replace(/[^\d]/g, "");
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(sql`REPLACE(${studentsTable.phone}, ' ', '') LIKE ${`%${cleanStudentPhone.slice(-8)}%`}`)
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "رقم الطالب غير مسجل على المنصة. تأكد من قيام الطالب بإنشاء حساب أولاً" });
      return;
    }

    const [existingParent] = await db
      .select()
      .from(parentsTable)
      .where(and(eq(parentsTable.phone, parentPhone), eq(parentsTable.studentId, student.id)))
      .limit(1);

    let parentRecord = existingParent;
    if (!parentRecord) {
      const parentCode = `PAR-${randomBytes(3).toString("hex").toUpperCase()}`;
      const [inserted] = await db
        .insert(parentsTable)
        .values({
          name: parentName,
          phone: parentPhone,
          studentId: student.id,
          parentCode,
        })
        .returning();
      parentRecord = inserted;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.delete(parentSessionsTable).where(eq(parentSessionsTable.parentId, parentRecord.id));
      await tx.insert(parentSessionsTable).values({ parentId: parentRecord.id, tokenHash, expiresAt });
    });

    res.cookie(PARENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });

    res.json({
      success: true,
      parentCode: parentRecord.parentCode,
      message: `تم التسجيل بنجاح! كود ولي الأمر الخاص بك هو: ${parentRecord.parentCode}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/parent/login
router.post("/parent/login", parentLoginLimit, async (req, res, next) => {
  try {
    const parentCode = String(req.body.parentCode ?? "").trim().toUpperCase();
    if (!parentCode) {
      res.status(400).json({ error: "برجاء كتابة كود ولي الأمر" });
      return;
    }

    const [parent] = await db
      .select()
      .from(parentsTable)
      .where(eq(parentsTable.parentCode, parentCode))
      .limit(1);

    if (!parent) {
      res.status(404).json({ error: "كود ولي الأمر غير صحيح" });
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.delete(parentSessionsTable).where(eq(parentSessionsTable.parentId, parent.id));
      await tx.insert(parentSessionsTable).values({ parentId: parent.id, tokenHash, expiresAt });
    });

    res.cookie(PARENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });

    res.json({ success: true, parentName: parent.name });
  } catch (error) {
    next(error);
  }
});

// GET /api/parent/report (Check parent auth & get student report)
router.get("/parent/report", async (req, res, next) => {
  try {
    const token = getParentSession(req);
    if (!token) {
      res.status(401).json({ error: "غير مصرح لولي الأمر" });
      return;
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [session] = await db
      .select()
      .from(parentSessionsTable)
      .where(and(eq(parentSessionsTable.tokenHash, tokenHash), sql`${parentSessionsTable.expiresAt} > NOW()`))
      .limit(1);

    if (!session) {
      res.status(401).json({ error: "جلسة ولي الأمر منتهية" });
      return;
    }

    const [parent] = await db.select().from(parentsTable).where(eq(parentsTable.id, session.parentId)).limit(1);
    if (!parent) {
      res.status(404).json({ error: "حساب ولي الأمر غير موجود" });
      return;
    }

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, parent.studentId)).limit(1);
    if (!student) {
      res.status(404).json({ error: "حساب الطالب المرتبط غير موجود" });
      return;
    }

    const [progressRecords, videos, attempts, notifications] = await Promise.all([
      db.select().from(videoProgressTable).where(eq(videoProgressTable.studentId, student.id)),
      db.select({ id: videosTable.id, title: videosTable.title, category: videosTable.category, stage: videosTable.stage }).from(videosTable),
      db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.studentId, student.id)),
      db.select().from(studentNotificationsTable).where(eq(studentNotificationsTable.studentId, student.id)).orderBy(desc(studentNotificationsTable.createdAt)),
    ]);

    const videoMap = new Map(videos.map((v) => [v.id, v]));

    const watchHistory = progressRecords.map((p) => {
      const vid = videoMap.get(p.videoId);
      return {
        videoId: p.videoId,
        videoTitle: vid?.title || `درس #${p.videoId}`,
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
    const lastActive = student.lastActiveAt ? new Date(student.lastActiveAt) : (student.lastLoginAt ? new Date(student.lastLoginAt) : new Date(student.createdAt));
    const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      parent: {
        name: parent.name,
        phone: parent.phone,
        parentCode: parent.parentCode,
      },
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        grade: student.grade,
        learningMode: student.learningMode,
        paymentStatus: student.paymentStatus,
        lastLoginAt: student.lastLoginAt,
        lastActiveAt: student.lastActiveAt,
        createdAt: student.createdAt,
        daysInactive,
        isInactive: daysInactive >= 3,
        watchedCount: watchHistory.length,
        completedCount: watchHistory.filter((w) => w.completed).length,
        quizzesCount: attempts.length,
        passedQuizzesCount: attempts.filter((a) => a.passed).length,
      },
      watchHistory,
      quizHistory: attempts.map((a) => ({
        id: a.id,
        quizId: a.quizId,
        score: a.score,
        passed: a.passed,
        timeSpentSeconds: a.timeSpentSeconds,
        createdAt: a.createdAt,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/parent/logout
router.post("/parent/logout", (_req, res) => {
  res.clearCookie(PARENT_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
