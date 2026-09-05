import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  parentsTable,
  parentSessionsTable,
  quizAttemptsTable,
  quizzesTable,
  studentNotificationsTable,
  studentsTable,
  videoProgressTable,
  videosTable,
} from "@workspace/db";
import { fixedWindowRateLimit } from "../middleware/rate-limit";
import { requireAdmin, requireSuperAdmin } from "../middleware/auth";
import { logAudit } from "./learning";

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

// Normalize Arabic/Eastern digits (٠-٩) to Western digits (0-9)
export function normalizeArabicDigits(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
}

export function cleanDigits(str: string): string {
  return normalizeArabicDigits(str).replace(/[^\d]/g, "");
}

// Cryptographically-strong parent login code. Uses an unambiguous alphabet
// (no 0/O/1/I) and ~41 bits of entropy so codes cannot be predicted or
// feasibly brute-forced. See audit fix #6.
const PARENT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars
function generateParentCode(prefix = "P"): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += PARENT_CODE_ALPHABET[bytes[i] % PARENT_CODE_ALPHABET.length];
  }
  return `${prefix}-${code}`;
}

// POST /api/parent/register
router.post("/parent/register", parentRegisterLimit, async (req, res, next) => {
  try {
    const parentName = String(req.body.parentName ?? req.body.name ?? "").trim();
    const parentPhoneRaw = String(req.body.parentPhone ?? req.body.phone ?? "").trim();
    const studentQueryRaw = String(req.body.studentPhone ?? req.body.studentIdentifier ?? "").trim();

    const parentPhone = cleanDigits(parentPhoneRaw);
    const cleanStudentPhone = cleanDigits(studentQueryRaw);
    const normalizedStudentQuery = normalizeArabicDigits(studentQueryRaw).replace(/\s+/g, "");

    if (!parentName || !parentPhone || !normalizedStudentQuery) {
      res.status(400).json({ error: "اسم ولي الأمر، رقم الهاتف، ورقم هاتف/كود الطالب جميعها مطلوبة" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.status, "approved"),
          sql`(${studentsTable.phone} = ${parentPhone} OR REPLACE(TRANSLATE(${studentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') = ${cleanStudentPhone} OR UPPER(${studentsTable.accessCode}) = UPPER(${normalizedStudentQuery}))`
        )
      )
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "لم نتمكن من العثور على طالب معتمد بهذا الرقم أو الكود. يُرجى التأكد من إنشاء الطالب لحسابه أولاً." });
      return;
    }

    const [existingParent] = await db
      .select()
      .from(parentsTable)
      .where(
        and(
          eq(parentsTable.studentId, student.id),
          sql`REPLACE(TRANSLATE(${parentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${parentPhone.slice(-8)}%`}`
        )
      )
      .limit(1);

    let parentRecord = existingParent;
    if (!parentRecord) {
      const parentCode = generateParentCode("PAR");
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

// POST /api/parent/recover-code
router.post("/parent/recover-code", parentLoginLimit, async (req, res, next) => {
  try {
    const parentPhoneRaw = String(req.body.parentPhone ?? req.body.phone ?? "").trim();
    const studentQueryRaw = String(req.body.studentPhone ?? req.body.studentIdentifier ?? "").trim();

    const parentPhone = cleanDigits(parentPhoneRaw);
    const cleanStudentPhone = cleanDigits(studentQueryRaw);
    const normalizedStudentQuery = normalizeArabicDigits(studentQueryRaw).replace(/\s+/g, "");

    if (!parentPhone || !normalizedStudentQuery) {
      res.status(400).json({ error: "رقم هاتف ولي الأمر ورقم هاتف/كود الطالب مطلوبان لاسترداد الكود" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.status, "approved"),
          sql`(${studentsTable.phone} = ${studentQueryRaw} OR REPLACE(TRANSLATE(${studentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') = ${cleanStudentPhone} OR UPPER(${studentsTable.accessCode}) = UPPER(${normalizedStudentQuery}))`
        )
      )
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "لم نتمكن من العثور على طالب معتمد بهذا الرقم أو الكود." });
      return;
    }

    const [parent] = await db
      .select()
      .from(parentsTable)
      .where(
        and(
          eq(parentsTable.studentId, student.id),
          sql`REPLACE(TRANSLATE(${parentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${parentPhone.slice(-8)}%`}`
        )
      )
      .limit(1);

    if (!parent) {
      res.status(404).json({ error: "لم نجد حساب ولي أمر مسجل برقم الهاتف هذا ومقترن بهذا الطالب." });
      return;
    }

    res.json({
      success: true,
      parentCode: parent.parentCode,
      parentName: parent.name,
      message: `تم العثور على حسابك! كود التتبع الخاص بك هو: ${parent.parentCode}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/parent/login
// Supports:
// 1. Parent Code (e.g. PAR-XXXX) + Parent Phone
// 2. Student Access Code / Student Phone + Parent Phone (auto-provisions or links parent account)
router.post("/parent/login", parentLoginLimit, async (req, res, next) => {
  try {
    const rawPhone = String(req.body.phone ?? req.body.parentPhone ?? "").trim();
    const rawCode = String(req.body.parentCode ?? req.body.code ?? req.body.studentCode ?? "").trim();

    if (!rawCode) {
      res.status(400).json({ error: "برجاء كتابة كود ولي الأمر أو كود الطالب" });
      return;
    }

    const cleanParentPhone = cleanDigits(rawPhone);
    const normalizedCode = normalizeArabicDigits(rawCode).replace(/\s+/g, "").toUpperCase();
    const cleanCodeDigits = cleanDigits(rawCode);

    let parentRecord: typeof parentsTable.$inferSelect | null = null;

    // ─── 1. First Priority: Check if input code matches a parentCode in parentsTable ───
    const parentConditions = [sql`UPPER(${parentsTable.parentCode}) = ${normalizedCode}`];
    if (cleanParentPhone) {
      parentConditions.push(
        sql`REPLACE(TRANSLATE(${parentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${cleanParentPhone.slice(-8)}%`}`
      );
    }

    const [foundParentByCode] = await db
      .select()
      .from(parentsTable)
      .where(and(...parentConditions))
      .limit(1);

    if (foundParentByCode) {
      parentRecord = foundParentByCode;
    } else {
      // ─── 2. Second Priority: Check if input code matches a student accessCode / phone ───
      // Feature: Parent can log in with student code + parent phone
      if (!cleanParentPhone) {
        res.status(400).json({
          error: "عند الدخول بكود الطالب، يُرجى إدخال رقم هاتف ولي الأمر للتحقق والربط.",
        });
        return;
      }

      const studentConditions = [
        sql`(
          UPPER(${studentsTable.accessCode}) = ${normalizedCode}
          ${cleanCodeDigits.length >= 8 ? sql`OR REPLACE(TRANSLATE(${studentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${cleanCodeDigits.slice(-8)}%`}` : sql``}
        )`,
        eq(studentsTable.status, "approved"),
      ];

      const [matchedStudent] = await db
        .select()
        .from(studentsTable)
        .where(and(...studentConditions))
        .limit(1);

      if (matchedStudent) {
        const studentParentPhoneClean = cleanDigits(matchedStudent.parentPhone || "");
        const studentOwnPhoneClean = cleanDigits(matchedStudent.phone || "");

        const phoneMatchesStudentParent =
          studentParentPhoneClean.length >= 8 &&
          (studentParentPhoneClean === cleanParentPhone ||
            studentParentPhoneClean.slice(-8) === cleanParentPhone.slice(-8));

        const phoneMatchesStudentSelf =
          studentOwnPhoneClean.length >= 8 &&
          (studentOwnPhoneClean === cleanParentPhone ||
            studentOwnPhoneClean.slice(-8) === cleanParentPhone.slice(-8));

        // Check if there is an existing parent account for this student & phone
        const [existingParentForStudent] = await db
          .select()
          .from(parentsTable)
          .where(
            and(
              eq(parentsTable.studentId, matchedStudent.id),
              sql`REPLACE(TRANSLATE(${parentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${cleanParentPhone.slice(-8)}%`}`
            )
          )
          .limit(1);

        if (existingParentForStudent) {
          parentRecord = existingParentForStudent;
        } else if (phoneMatchesStudentParent || phoneMatchesStudentSelf || !matchedStudent.parentPhone) {
          // Auto-provision parent account on-the-fly!
          const newCode = generateParentCode("PAR");
          const [createdParent] = await db
            .insert(parentsTable)
            .values({
              name: `ولي أمر الطالب ${matchedStudent.name}`,
              phone: cleanParentPhone,
              studentId: matchedStudent.id,
              parentCode: newCode,
            })
            .returning();

          parentRecord = createdParent;

          if (!matchedStudent.parentPhone) {
            await db
              .update(studentsTable)
              .set({ parentPhone: cleanParentPhone })
              .where(eq(studentsTable.id, matchedStudent.id));
          }
        } else {
          res.status(401).json({
            error: "رقم هاتف ولي الأمر غير مطابق للرقم المسجل في بيانات هذا الطالب.",
          });
          return;
        }
      }
    }

    if (!parentRecord) {
      res.status(404).json({ error: "كود ولي الأمر أو كود الطالب أو رقم الهاتف غير صحيح" });
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.delete(parentSessionsTable).where(eq(parentSessionsTable.parentId, parentRecord!.id));
      await tx.insert(parentSessionsTable).values({ parentId: parentRecord!.id, tokenHash, expiresAt });
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
      parentName: parentRecord.name,
      parentCode: parentRecord.parentCode,
    });
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

    const [progressRecords, videos, attempts, quizRows, notifications] = await Promise.all([
      db.select().from(videoProgressTable).where(eq(videoProgressTable.studentId, student.id)),
      db.select({ id: videosTable.id, title: videosTable.title, category: videosTable.category, stage: videosTable.stage }).from(videosTable),
      db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.studentId, student.id)).orderBy(desc(quizAttemptsTable.createdAt)),
      db.select({
        id: quizzesTable.id,
        title: quizzesTable.title,
        questions: quizzesTable.questions,
        questionsToShow: quizzesTable.questionsToShow,
      }).from(quizzesTable),
      db.select().from(studentNotificationsTable).where(eq(studentNotificationsTable.studentId, student.id)).orderBy(desc(studentNotificationsTable.createdAt)),
    ]);

    const videoMap = new Map(videos.map((v) => [v.id, v]));
    const quizMap = new Map(quizRows.map((q) => [q.id, q]));

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

    // Deduplicate passed quizzes count by unique quizId (student passed the quiz at least once)
    const passedQuizIds = new Set(attempts.filter((a) => a.passed).map((a) => a.quizId));
    const attemptedQuizIds = new Set(attempts.map((a) => a.quizId));

    const formattedQuizHistory = attempts.map((a) => {
      const qz = quizMap.get(a.quizId);
      const qList = Array.isArray(qz?.questions) ? qz.questions : [];
      const totalQuestions =
        qz?.questionsToShow && qz.questionsToShow > 0 && qz.questionsToShow < qList.length
          ? qz.questionsToShow
          : (qList.length || 1);

      let correctCount = 0;
      if (Array.isArray(a.details) && a.details.length > 0) {
        correctCount = a.details.filter((d: any) => d && d.isCorrect === true).length;
      } else {
        correctCount = Math.round(((Number(a.score) || 0) / 100) * totalQuestions);
      }
      correctCount = Math.min(totalQuestions, Math.max(0, correctCount));
      const percentage = Math.min(100, Math.max(0, Math.round(Number(a.score) || 0)));

      return {
        id: a.id,
        quizId: a.quizId,
        quizTitle: qz?.title || `اختبار #${a.quizId}`,
        score: correctCount,
        totalQuestions,
        percentage,
        passed: a.passed,
        timeSpentSeconds: a.timeSpentSeconds || 0,
        createdAt: a.createdAt,
      };
    });

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
        quizzesCount: attemptedQuizIds.size,
        passedQuizzesCount: passedQuizIds.size,
        attemptsCount: attempts.length,
      },
      watchHistory,
      quizHistory: formattedQuizHistory,
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

// GET /api/admin/parents  (admin-only – lists all registered parents)
router.get("/admin/parents", requireAdmin, async (req, res, next) => {
  try {
    // Fetch all parents with their linked student
    const rows = await db
      .select({
        parentId: parentsTable.id,
        parentName: parentsTable.name,
        parentPhone: parentsTable.phone,
        parentCode: parentsTable.parentCode,
        createdAt: parentsTable.createdAt,
        studentId: studentsTable.id,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        studentGrade: studentsTable.grade,
        studentStatus: studentsTable.status,
      })
      .from(parentsTable)
      .leftJoin(studentsTable, eq(parentsTable.studentId, studentsTable.id))
      .orderBy(desc(parentsTable.createdAt));

    // Fetch last session per parent in one query
    const sessions = await db
      .select({
        parentId: parentSessionsTable.parentId,
        expiresAt: parentSessionsTable.expiresAt,
      })
      .from(parentSessionsTable);

    const sessionMap = new Map<number, string>();
    for (const s of sessions) {
      const existing = sessionMap.get(s.parentId);
      if (!existing || new Date(s.expiresAt) > new Date(existing)) {
        sessionMap.set(s.parentId, s.expiresAt as unknown as string);
      }
    }

    const result = rows.map((r) => ({
      id: r.parentId,
      name: r.parentName,
      phone: r.parentPhone,
      parentCode: r.parentCode,
      createdAt: r.createdAt,
      lastSessionExpiresAt: sessionMap.get(r.parentId) ?? null,
      student: r.studentId
        ? {
            id: r.studentId,
            name: r.studentName,
            phone: r.studentPhone,
            grade: r.studentGrade,
            status: r.studentStatus,
          }
        : null,
    }));

    res.json({ parents: result, total: result.length });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/parents (Create parent)
router.post("/admin/parents", requireAdmin, async (req, res, next) => {
  try {
    const { name, phone, studentId } = req.body;
    if (!name || !phone || !studentId) {
      res.status(400).json({ error: "اسم ولي الأمر ورقم هاتفه ومعرّف الطالب مطلوبين" });
      return;
    }

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(studentId))).limit(1);
    if (!student) {
      res.status(404).json({ error: "الطالب المختار غير موجود بالنظام" });
      return;
    }

    const cleanPhone = String(phone).replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      res.status(400).json({ error: "رقم هاتف ولي الأمر غير صحيح" });
      return;
    }

    // Generate unique parent code (crypto-strong)
    const parentCode = generateParentCode("P");

    const [parent] = await db
      .insert(parentsTable)
      .values({
        name: String(name).trim(),
        phone: cleanPhone,
        studentId: Number(studentId),
        parentCode,
      })
      .returning();

    await logAudit(req, "CREATE_PARENT", "parent", String(parent.id), `تم إنشاء حساب ولي أمر جديد: ${parent.name} للطالب: ${student.name}`);

    res.status(201).json({
      success: true,
      message: "تم إنشاء حساب ولي الأمر بنجاح!",
      parent,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/parents/:id (Update parent)
router.patch("/admin/parents/:id", requireAdmin, async (req, res, next) => {
  try {
    const parentId = Number(req.params.id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      res.status(400).json({ error: "معرّف ولي الأمر غير صحيح" });
      return;
    }
    const { name, phone, studentId } = req.body;

    const [existing] = await db.select().from(parentsTable).where(eq(parentsTable.id, parentId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "حساب ولي الأمر غير موجود" });
      return;
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (name) updateData.name = String(name).trim();
    if (phone) {
      const cleanPhone = String(phone).replace(/[^\d]/g, "");
      if (cleanPhone.length >= 8) updateData.phone = cleanPhone;
    }
    if (studentId) {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(studentId))).limit(1);
      if (!student) {
        res.status(404).json({ error: "الطالب المختار غير موجود بالنظام" });
        return;
      }
      updateData.studentId = Number(studentId);
    }

    const [updated] = await db
      .update(parentsTable)
      .set(updateData)
      .where(eq(parentsTable.id, parentId))
      .returning();

    await logAudit(req, "UPDATE_PARENT", "parent", String(parentId), `تم تحديث بيانات ولي الأمر: ${updated.name}`);

    res.json({ success: true, message: "تم تعديل بيانات ولي الأمر بنجاح!", parent: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/parents/:id/regenerate-code (Regenerate parent code)
router.post("/admin/parents/:id/regenerate-code", requireAdmin, async (req, res, next) => {
  try {
    const parentId = Number(req.params.id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      res.status(400).json({ error: "معرّف ولي الأمر غير صحيح" });
      return;
    }
    const [existing] = await db.select().from(parentsTable).where(eq(parentsTable.id, parentId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "حساب ولي الأمر غير موجود" });
      return;
    }

    const newCode = generateParentCode("P");

    const [updated] = await db
      .update(parentsTable)
      .set({ parentCode: newCode, updatedAt: new Date() })
      .where(eq(parentsTable.id, parentId))
      .returning();

    await logAudit(req, "REGENERATE_PARENT_CODE", "parent", String(parentId), `تم إعادة توليد كود دخول ولي الأمر: ${updated.name} الكود الجديد: ${newCode}`);

    res.json({ success: true, message: "تم إسناد كود دخول جديد لولي الأمر بنجاح!", parentCode: newCode });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/parents/:id (Delete parent - Superadmin only)
router.delete("/admin/parents/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const parentId = Number(req.params.id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      res.status(400).json({ error: "معرّف ولي الأمر غير صحيح" });
      return;
    }
    const [existing] = await db.select().from(parentsTable).where(eq(parentsTable.id, parentId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "حساب ولي الأمر غير موجود" });
      return;
    }

    await db.delete(parentsTable).where(eq(parentsTable.id, parentId));
    await logAudit(req, "DELETE_PARENT", "parent", String(parentId), `تم حذف حساب ولي الأمر: ${existing.name}`);

    res.json({ success: true, message: "تم حذف حساب ولي الأمر بنجاح" });
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
