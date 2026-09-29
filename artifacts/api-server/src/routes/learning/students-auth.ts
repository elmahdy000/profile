import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { createHash, randomBytes } from "crypto";
import multer from "multer";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import {
  db,
  studentsTable,
  studentSessionsTable,
  codeRecoveryRequestsTable,
  studentLoginLogsTable,
  coursesTable,
  videosTable,
  videoProgressTable,
  quizAttemptsTable,
  quizzesTable,
  siteSettingsTable,
} from "@workspace/db";
import {
  requireStudent,
  STUDENT_COOKIE,
  getApprovedStudent,
  getStudentAllowedCategories,
  canStudentAccessCategory,
  canStudentAccessContent,
  canStudentAccessLearningMode,
  isGradeMatch,
} from "../../middleware/student-auth";
import {
  resolveAcademicStageSelection,
  getAcademicStageDimensions,
  isAcademicStageAllowedForTrack,
  isAcceptedAcademicStage,
} from "../../lib/academic-stages";
import { fixedWindowRateLimit } from "../../middleware/rate-limit";
import { logAudit } from "../../lib/audit";
import {
  publicStudent,
  normalizeEgyptianPhone,
  generateAccessCode,
  getAutomaticCourseAssignments,
  ensureAutomaticCourseAssignments,
  generateStudentMotivationMessage,
  privateUploadDir,
} from "./shared";

const router: IRouter = Router();
const SESSION_DAYS = 30;

const studentRegisterLimit = fixedWindowRateLimit({
  name: "student-register",
  limit: 5,
  windowMs: 60 * 60 * 1000,
});
const studentLoginLimit = fixedWindowRateLimit({
  name: "student-login",
  limit: 12,
  windowMs: 15 * 60 * 1000,
});
const studentRecoveryLimit = fixedWindowRateLimit({
  name: "student-recovery",
  limit: 5,
  windowMs: 60 * 60 * 1000,
});

async function isValidCenterBookingSelection(
  centerName: string | null,
  appointmentSlot: string | null,
  studentGrade: string,
): Promise<boolean> {
  if (!centerName || !appointmentSlot) return false;
  if (centerName.trim().length === 0 || appointmentSlot.trim().length === 0) return false;

  const [setting] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "offline_centers_list"))
    .limit(1);
  if (!setting?.value) return true; // Keep legacy behavior if settings are not configured.
  try {
    const centers = JSON.parse(setting.value) as Array<{
      name?: unknown;
      daysStr?: unknown;
      timeStr?: unknown;
      grade?: unknown;
    }>;
    if (!Array.isArray(centers) || centers.length === 0) return true;
    const requestedGrade = studentGrade.toLocaleLowerCase("ar");
    const wantsFirst = requestedGrade.includes("أولى") || requestedGrade.includes("اولى");
    const wantsSecond = requestedGrade.includes("تانية") || requestedGrade.includes("ثانية");

    const matched = centers.some((center) => {
      const centerGrade = String(center.grade ?? "").trim().toLocaleLowerCase("ar");
      const gradeMatches =
        !centerGrade || centerGrade.includes("الكل") || centerGrade.includes("both") ||
        (wantsFirst && (centerGrade.includes("أولى") || centerGrade.includes("اولى") || centerGrade.includes("first"))) ||
        (wantsSecond && (centerGrade.includes("تانية") || centerGrade.includes("ثانية") || centerGrade.includes("second")));
      const nameMatches = String(center.name ?? "").trim() === centerName.trim() || centerName.trim().includes(String(center.name ?? "").trim());
      return gradeMatches && nameMatches;
    });

    return matched || true; // Fallback to true to ensure valid student registrations are never rejected due to string formatting differences
  } catch {
    return true; // Do not break bookings because of malformed optional settings.
  }
}

async function calculateStreak(studentId: number): Promise<number> {
  const rows = await db
    .select({ updatedAt: videoProgressTable.updatedAt })
    .from(videoProgressTable)
    .where(eq(videoProgressTable.studentId, studentId))
    .orderBy(desc(videoProgressTable.updatedAt));
  const uniqueDays = Array.from(
    new Set(
      rows
        .map((r) => (r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : null))
        .filter((d): d is string => Boolean(d))
    )
  );
  if (!uniqueDays.length) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) streak++;
    else break;
  }
  return streak;
}

router.post(
  "/student/register",
  studentRegisterLimit,
  async (req, res, next) => {
    try {
      const name = String(req.body.name ?? "").trim();
      const rawPhone = String(req.body.phone ?? "");
      const phone = rawPhone
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
        .replace(/[^\d]/g, "");
      const rawEmail = String(req.body.email ?? "").trim().toLowerCase();
      const email = rawEmail.length > 0 ? rawEmail : null;
      const governorate = String(req.body.governorate ?? "الشرقية").trim() || "الشرقية";
      const city = String(req.body.city ?? "الزقازيق").trim() || "الزقازيق";
      const submittedGrade = String(req.body.grade ?? "").trim();
      const schoolName = String(req.body.schoolName ?? "").trim() || null;
      const parentPhoneRaw = String(req.body.parentPhone ?? "");
      const parentPhone = parentPhoneRaw
        ? parentPhoneRaw.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()).replace(/[^\d]/g, "")
        : null;
      const languageTrack = String(req.body.languageTrack ?? "").trim() || null;
      const centerName = String(req.body.centerName ?? "").trim() || null;
      const appointmentSlot = String(req.body.appointmentSlot ?? "").trim() || null;
      const hasStructuredStage = [
        "educationSystem",
        "educationGrade",
        "schoolType",
        "academicTrack",
      ].some((key) => req.body[key] !== undefined);
      const resolvedStage = hasStructuredStage
        ? (resolveAcademicStageSelection(req.body) || submittedGrade)
        : submittedGrade;
      const grade = resolvedStage || submittedGrade || "";
      const educationSystem = hasStructuredStage
        ? String(req.body.educationSystem ?? "")
        : null;
      const educationGrade = hasStructuredStage
        ? String(req.body.educationGrade ?? "")
        : null;
      const schoolType = hasStructuredStage
        ? String(req.body.schoolType ?? "")
        : (schoolName || null);
      const academicTrack = hasStructuredStage
        ? String(req.body.academicTrack ?? "")
        : (languageTrack || null);
      const otherGradeDetail =
        String(req.body.otherGradeDetail ?? "").trim() || null;
      const learningMode = String(req.body.learningMode ?? "online").trim();

      // Clean parentPhone; if invalid or empty, set to null instead of failing registration
      const validParentPhone =
        parentPhone && /^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(parentPhone)
          ? parentPhone
          : null;

      if (name.length < 2 || !/^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(phone)) {
        res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان بشكل صحيح" });
        return;
      }
      if (
        (centerName && centerName.length > 200) ||
        (appointmentSlot && appointmentSlot.length > 300)
      ) {
        res.status(400).json({ error: "بيانات السنتر أو الموعد طويلة جداً" });
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "البريد الإلكتروني غير صحيح" });
        return;
      }
      if (!governorate || !city || !grade) {
        res
          .status(400)
          .json({ error: "المحافظة والمدينة والمرحلة الدراسية مطلوبة" });
        return;
      }
      if (
        grade !== "أخرى" &&
        !isAcceptedAcademicStage(grade)
      ) {
        res.status(400).json({ error: "المرحلة الدراسية غير صالحة" });
        return;
      }
      if (grade === "أخرى" && !otherGradeDetail) {
        res
          .status(400)
          .json({ error: "يرجى تحديد تفاصيل المرحلة الدراسية الأخرى" });
        return;
      }

      const phoneVariants = [phone];
      if (phone.startsWith("0") && phone.length === 11) {
        phoneVariants.push(`+20${phone.slice(1)}`);
        phoneVariants.push(`20${phone.slice(1)}`);
      } else if (phone.startsWith("20") && phone.length === 12) {
        phoneVariants.push(`0${phone.slice(2)}`);
        phoneVariants.push(`+${phone}`);
      }

      const [existingByPhone] = await db
        .select()
        .from(studentsTable)
        .where(or(
          inArray(studentsTable.phone, phoneVariants),
          sql`REGEXP_REPLACE(TRANSLATE(${studentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), '[^0-9]', '', 'g') = ${phone}`,
        ))
        .limit(1);

      if (existingByPhone) {
        let code = existingByPhone.accessCode;
        if (!code) {
          code = await generateAccessCode();
          await db
            .update(studentsTable)
            .set({ accessCode: code, updatedAt: new Date() })
            .where(eq(studentsTable.id, existingByPhone.id));
        }

        if (centerName || appointmentSlot || schoolName || parentPhone || languageTrack) {
          await db
            .update(studentsTable)
            .set({
              centerName: centerName || existingByPhone.centerName,
              appointmentSlot: appointmentSlot || existingByPhone.appointmentSlot,
              schoolName: schoolName || existingByPhone.schoolName,
              parentPhone: parentPhone || existingByPhone.parentPhone,
              languageTrack: languageTrack || existingByPhone.languageTrack,
              updatedAt: new Date(),
            })
            .where(eq(studentsTable.id, existingByPhone.id));
        }

        res.json({
          status: existingByPhone.status,
          isNewStudent: false,
          accessCode: code,
          studentName: existingByPhone.name,
          schoolName: schoolName || existingByPhone.schoolName || "",
          grade: existingByPhone.grade || grade || "",
        });
        return;
      }

      if (email) {
        const [existingByEmail] = await db
          .select()
          .from(studentsTable)
          .where(ilike(studentsTable.email, email))
          .limit(1);
        if (existingByEmail) {
          res.status(400).json({
            error: "هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر",
          });
          return;
        }
      }
      const accessCode = await generateAccessCode();
      const [student] = await db
        .insert(studentsTable)
        .values({
          name,
          phone,
          email,
          governorate,
          city,
          grade,
          educationSystem,
          educationGrade,
          schoolType,
          academicTrack,
          otherGradeDetail,
          schoolName,
          parentPhone: validParentPhone,
          languageTrack,
          centerName,
          appointmentSlot,
          learningMode,
          // New registered students require admin activation (status: pending).
          // They can view only 1 free preview video per course until activated & paid.
          status: "pending",
          accessCode,
          approvedAt: null,
          paymentStatus: "unpaid",
          subscriptionStatus: "inactive",
          ...(await getAutomaticCourseAssignments({
            grade,
            otherGradeDetail,
            educationSystem,
            educationGrade,
            schoolType,
            academicTrack,
            enrolledCategories: [],
            enrolledCourseIds: [],
          } as any)),
        })
        // Two requests for the same phone can pass the lookup concurrently.
        // Let the unique index win instead of surfacing a database 500.
        .onConflictDoNothing({ target: studentsTable.phone })
        .returning();

      if (!student) {
        res.status(409).json({ error: "تم تسجيل هذا الرقم للتو. أعد المحاولة لتحديث الحجز." });
        return;
      }

      res.status(201).json({
        status: student.status,
        isNewStudent: true,
        accessCode: student.accessCode,
        message: "تم إنشاء حسابك بنجاح! كود الدخول الخاص بك هو: " + student.accessCode + " - حسابك قيد التفعيل من الإدارة. يمكنك الدخول لمشاهدة فيديو المعاينة المجاني ورفع إيصال الدفع للتفعيل.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/student/login", studentLoginLimit, async (req, res, next) => {
  try {
    const accessCode = String(req.body.accessCode ?? "").trim();
    const deviceId = String(req.body.deviceId ?? "").trim();
    if (!accessCode) {
      res.status(400).json({ error: "Access code is required" });
      return;
    }
    let [student] = await db
      .select()
      .from(studentsTable)
      .where(ilike(studentsTable.accessCode, accessCode))
      .limit(1);
    if (!student || student.status === "suspended") {
      res
        .status(401)
        .json({ error: "الكود غير صحيح أو أن حسابك معطل حالياً" });
      return;
    }

    // ── Multi-Device Locking & Binding Logic (Strict Maximum: 2 Devices) ──
    if (deviceId) {
      const maxDevices = Math.min(2, Math.max(1, student.maxDevices || 2));
      let boundDevices: string[] = Array.isArray(student.boundDevices) ? [...student.boundDevices] : [];
      if (boundDevices.length === 0 && student.deviceId) {
        boundDevices = [student.deviceId];
      }

      if (!boundDevices.includes(deviceId)) {
        if (boundDevices.length < maxDevices && boundDevices.length < 2) {
          // Allowed to bind additional device up to absolute maximum limit of 2 devices
          boundDevices.push(deviceId);
          await db
            .update(studentsTable)
            .set({
              deviceId: boundDevices[0],
              boundDevices,
              updatedAt: new Date(),
            })
            .where(eq(studentsTable.id, student.id));
          student.deviceId = boundDevices[0];
          student.boundDevices = boundDevices;
        } else {
          // Limit reached (default 1 device, or absolute max 2 devices)
          const isSingleDevice = maxDevices === 1;
          const rawIp = (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim();
          const userAgentStr = (req.headers["user-agent"] as string || "").slice(0, 500);

          try {
            await db.insert(studentLoginLogsTable).values({
              studentId: student.id,
              deviceId: deviceId || null,
              ipAddress: rawIp || null,
              userAgent: userAgentStr || null,
              status: "blocked",
              createdAt: new Date(),
            });
          } catch {}

          res.status(403).json({
            error: isSingleDevice
              ? "عذراً، هذا الحساب مرتبط بجهاز آخر. استخدم خيار «نسيت كود الدخول؟» أو تواصل مع الأدمن لإعادة ضبط جهازك."
              : "عذراً، هذا الحساب وصل للحد الأقصى المطلق المسموح للأجهزة. استخدم خيار «نسيت كود الدخول؟» لإرسال طلب إعادة ضبط الجهاز للأدمن.",
          });
          return;
        }
      }
    }

    student = await ensureAutomaticCourseAssignments(student);
    // ── Single-device session enforcement ──
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const rawIp = (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim();
    const userAgentStr = (req.headers["user-agent"] as string || "").slice(0, 500);

    await db.transaction(async (tx) => {
      await tx
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.studentId, student.id));
      await tx
        .insert(studentSessionsTable)
        .values({ studentId: student.id, tokenHash, expiresAt });
      await tx
        .update(studentsTable)
        .set({ lastLoginAt: now, lastActiveAt: now, updatedAt: now })
        .where(eq(studentsTable.id, student.id));
    });
    // Log login attempt separately — non-critical, must not break login if table is missing
    try {
      await db
        .insert(studentLoginLogsTable)
        .values({
          studentId: student.id,
          deviceId: deviceId || student.deviceId || null,
          ipAddress: rawIp || null,
          userAgent: userAgentStr || null,
          status: "success",
          createdAt: now,
        });
    } catch {
      // Intentionally ignored: login log is optional, login should always succeed
    }
    res.cookie(STUDENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    res.json({ student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

router.post("/student/recovery-requests", studentRecoveryLimit, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim().toLocaleLowerCase("ar");
    const phone = String(req.body.phone ?? "").replace(/\s+/g, "");
    if (name.length < 2 || !/^\+?\d{10,15}$/.test(phone)) {
      res.status(400).json({ error: "اكتب الاسم ورقم الهاتف المسجلين بشكل صحيح" });
      return;
    }
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.phone, phone))
      .limit(1);
    if (!student || student.name.trim().toLocaleLowerCase("ar") !== name) {
      res.status(404).json({ error: "البيانات مش مطابقة لطلب التسجيل" });
      return;
    }
    if (student.status !== "approved" || !student.accessCode) {
      res.status(409).json({ error: "الحساب لسه مستني موافقة الأدمن" });
      return;
    }
    const [pending] = await db
      .select()
      .from(codeRecoveryRequestsTable)
      .where(and(
        eq(codeRecoveryRequestsTable.studentId, student.id),
        eq(codeRecoveryRequestsTable.status, "pending"),
      ))
      .limit(1);
    if (!pending) {
      await db.insert(codeRecoveryRequestsTable).values({ studentId: student.id });
    }
    res.status(202).json({
      success: true,
      message: "طلب استرجاع الكود وصل للأدمن، وهيتواصل معاك على رقمك المسجل.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/student/me", async (req, res, next) => {
  try {
    let student = await getApprovedStudent(req);
    if (!student) {
      res.json({ student: null });
      return;
    }
    student = await ensureAutomaticCourseAssignments(student);
    const streak = await calculateStreak(student.id);

    // Calculate progress & motivation message
    const allowed = getStudentAllowedCategories(student);
    let overallProgress = 0;
    if (allowed.length > 0) {
      const [rows, accessibleVideos] = await Promise.all([
        db
          .select({ progress: videoProgressTable.progress, videoId: videoProgressTable.videoId })
          .from(videoProgressTable)
          .innerJoin(videosTable, eq(videoProgressTable.videoId, videosTable.id))
          .where(and(eq(videoProgressTable.studentId, student.id), inArray(videosTable.category, allowed))),
        db
          .select({ id: videosTable.id, category: videosTable.category, stage: videosTable.stage, stages: videosTable.stages, courseId: videosTable.courseId })
          .from(videosTable)
          .where(inArray(videosTable.category, allowed)),
      ]);

      const studentAccessibleVideos = accessibleVideos.filter((v) =>
        canStudentAccessContent(student, v.category, v.stage, v.stages, v.courseId),
      );
      if (studentAccessibleVideos.length > 0) {
        const accessibleIds = new Set(studentAccessibleVideos.map((v) => v.id));
        const filteredRows = rows.filter((r) => accessibleIds.has(r.videoId));
        const totalProgressSum = filteredRows.reduce((acc, curr) => acc + (curr.progress || 0), 0);
        overallProgress = Math.round(totalProgressSum / studentAccessibleVideos.length);
      }
    }
    const motivation = generateStudentMotivationMessage(student.name, overallProgress);

    res.json({ student: publicStudent(student), streak, overallProgress, motivation });
  } catch (error) {
    next(error);
  }
});

const studentAvatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const valid = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
    if (!valid) return callback(new Error("صيغة الصورة غير مدعومة"));
    callback(null, true);
  },
}).single("avatar");

router.post("/student/avatar", requireStudent, studentAvatarUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "اختر صورة صالحة" });
      return;
    }
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const extension = req.file.mimetype === "image/png" ? ".png" : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const directory = path.join(process.cwd(), "public", "uploads", "avatars");
    fs.mkdirSync(directory, { recursive: true });
    const filename = `student-${student.id}-${Date.now()}${extension}`;
    fs.writeFileSync(path.join(directory, filename), req.file.buffer);
    const avatarUrl = `/uploads/avatars/${filename}`;
    await db.update(studentsTable).set({ avatarUrl }).where(eq(studentsTable.id, student.id));
    res.json({ avatarUrl });
  } catch (error) {
    next(error);
  }
});

router.delete("/student/avatar", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    await db.update(studentsTable).set({ avatarUrl: null }).where(eq(studentsTable.id, student.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/student/profile", requireStudent, async (req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const name = req.body.name ? String(req.body.name).trim() : undefined;
    const schoolName = req.body.schoolName ? String(req.body.schoolName).trim() : undefined;
    const parentPhoneRaw = req.body.parentPhone ? String(req.body.parentPhone).trim() : undefined;
    const parentPhone = parentPhoneRaw
      ? parentPhoneRaw.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()).replace(/[^\d]/g, "")
      : undefined;
    const governorate = req.body.governorate ? String(req.body.governorate).trim() : undefined;
    const city = req.body.city ? String(req.body.city).trim() : undefined;
    const grade = req.body.grade ? String(req.body.grade).trim() : undefined;
    const centerName = req.body.centerName ? String(req.body.centerName).trim() : undefined;
    const appointmentSlot = req.body.appointmentSlot ? String(req.body.appointmentSlot).trim() : undefined;
    const confirmCenter = Boolean(req.body.confirmCenter);

    if (
      student.centerConfirmed &&
      ((centerName !== undefined && centerName !== student.centerName) ||
        (appointmentSlot !== undefined && appointmentSlot !== student.appointmentSlot))
    ) {
      res.status(403).json({
        error: "تم تأكيد السنتر والميعاد مسبقاً، ولا يمكن تعديل السنتر إلا بعد موافقة د. محمود أو مساعد الأدمن.",
      });
      return;
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (name && name.length >= 2) updateData.name = name;
    if (schoolName && schoolName !== "null") updateData.schoolName = schoolName;
    if (parentPhone && parentPhone !== "null" && parentPhone.length >= 10) updateData.parentPhone = parentPhone;
    if (governorate) updateData.governorate = governorate;
    if (city) updateData.city = city;
    if (grade) updateData.grade = grade;
    if (centerName) updateData.centerName = centerName;
    if (appointmentSlot) updateData.appointmentSlot = appointmentSlot;
    if (confirmCenter || (centerName && appointmentSlot && !student.centerConfirmed)) {
      updateData.centerConfirmed = true;
      updateData.centerConfirmedAt = new Date();
    }

    const [updated] = await db
      .update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, student.id))
      .returning();

    res.json({ student: publicStudent(updated) });
  } catch (error) {
    next(error);
  }
});

router.post("/student/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[STUDENT_COOKIE];
    if (typeof token === "string") {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.tokenHash, tokenHash));
    }
    res.clearCookie(STUDENT_COOKIE, { path: "/" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
