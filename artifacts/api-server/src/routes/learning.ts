import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import {
  codeRecoveryRequestsTable,
  coursesTable,
  db,
  learningFilesTable,
  quizAttemptsTable,
  quizzesTable,
  studentSessionsTable,
  studentNotificationsTable,
  studentsTable,
  videoProgressTable,
  videosTable,
  videoFileAttachmentsTable,
  type QuizQuestion,
} from "@workspace/db";
import { isAdminRequest, requireAdmin } from "../middleware/auth";
import {
  canStudentAccessCategory,
  canStudentAccessContent,
  canStudentAccessLearningMode,
  getApprovedStudent,
  getStudentAllowedCategories,
  requireStudent,
  STUDENT_COOKIE,
} from "../middleware/student-auth";
import {
  isAcademicStageAllowedForTrack,
  isAcceptedAcademicStage,
  resolveAcademicStageSelection,
} from "../lib/academic-stages";
import { fixedWindowRateLimit } from "../middleware/rate-limit";

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
const privateUploadDir = process.env.LEARNING_FILES_DIR || (
  process.env.NODE_ENV === "production"
    ? "/var/lib/drelmahdy/learning-files"
    : path.join(process.cwd(), "private", "learning-files")
);
fs.mkdirSync(privateUploadDir, { recursive: true });

const allowedFileTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedLearningFileExtensions = new Set([
  ".pdf", ".zip", ".doc", ".docx", ".ppt", ".pptx", ".txt",
  ".jpg", ".jpeg", ".png", ".webp",
]);

const learningFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, privateUploadDir),
    filename: (_req, file, cb) => {
      const safeExt = path
        .extname(file.originalname)
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    // Some browsers/operating systems report Office and ZIP files as
    // application/octet-stream. The extension is validated as a fallback.
    const genericMime = !file.mimetype || file.mimetype === "application/octet-stream";
    if (allowedFileTypes.has(file.mimetype) || (genericMime && allowedLearningFileExtensions.has(extension))) cb(null, true);
    else cb(new Error("صيغة الملف غير مدعومة. استخدم PDF أو Office أو ZIP أو TXT أو صورة."));
  },
}).single("file");

function publicStudent(student: typeof studentsTable.$inferSelect) {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    avatarUrl: student.avatarUrl,
    status: student.status,
    governorate: student.governorate,
    city: student.city,
    grade: student.grade,
    educationSystem: student.educationSystem,
    educationGrade: student.educationGrade,
    schoolType: student.schoolType,
    academicTrack: student.academicTrack,
    otherGradeDetail: student.otherGradeDetail,
    learningMode: student.learningMode,
    enrolledCategories: student.enrolledCategories,
    enrolledCourseIds: student.enrolledCourseIds,
    createdAt: student.createdAt,
  };
}

async function generateAccessCode() {
  // Six easy-to-read characters are compact enough to type while still
  // providing more than 680 million combinations. Ambiguous characters are
  // intentionally excluded.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    const [existing] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(ilike(studentsTable.accessCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("تعذر إنشاء كود دخول فريد");
}

function validateQuestions(value: unknown): QuizQuestion[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const questions = value as QuizQuestion[];
  const valid = questions.every(
    (q) =>
      typeof q?.prompt === "string" &&
      q.prompt.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.every(
        (option) => typeof option === "string" && option.trim().length > 0,
      ) &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length,
  );
  return valid ? questions : null;
}

function normalizeStringList(value: unknown): string[] {
  const values: unknown[] = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item: unknown) => String(item ?? "").trim())
        .filter((item: string) => item.length > 0),
    ),
  );
}

router.post(
  "/student/register",
  studentRegisterLimit,
  async (req, res, next) => {
    try {
      const name = String(req.body.name ?? "").trim();
      const phone = String(req.body.phone ?? "").replace(/\s+/g, "");
      const email = String(req.body.email ?? "").trim() || null;
      const governorate = String(req.body.governorate ?? "").trim();
      const city = String(req.body.city ?? "").trim();
      const submittedGrade = String(req.body.grade ?? "").trim();
      const hasStructuredStage = [
        "educationSystem",
        "educationGrade",
        "schoolType",
        "academicTrack",
      ].some((key) => req.body[key] !== undefined);
      const resolvedStage = hasStructuredStage
        ? resolveAcademicStageSelection(req.body)
        : submittedGrade;
      const grade = resolvedStage ?? "";
      const educationSystem = hasStructuredStage
        ? String(req.body.educationSystem ?? "")
        : null;
      const educationGrade = hasStructuredStage
        ? String(req.body.educationGrade ?? "")
        : null;
      const schoolType = hasStructuredStage
        ? String(req.body.schoolType ?? "")
        : null;
      const academicTrack = hasStructuredStage
        ? String(req.body.academicTrack ?? "")
        : null;
      const otherGradeDetail =
        String(req.body.otherGradeDetail ?? "").trim() || null;
      const learningMode = String(req.body.learningMode ?? "online").trim();

      if (name.length < 2 || !/^\+?\d{10,15}$/.test(phone)) {
        res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان بشكل صحيح" });
        return;
      }
      if (!governorate || !city || !grade) {
        res
          .status(400)
          .json({ error: "المحافظة والمدينة والمرحلة الدراسية مطلوبة" });
        return;
      }
      if (
        (hasStructuredStage && !resolvedStage) ||
        (grade !== "أخرى" && !isAcceptedAcademicStage(grade))
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
      if (!["online", "offline"].includes(learningMode)) {
        res
          .status(400)
          .json({ error: "اختار نظام الدراسة أونلاين أو أوفلاين" });
        return;
      }

      const [existing] = await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.phone, phone))
        .limit(1);
      if (existing) {
        res.json({
          status: existing.status,
          message: "Registration already exists",
        });
        return;
      }
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
          learningMode,
        })
        .returning();
      res.status(201).json({
        status: student.status,
        message: "Registration submitted for admin approval",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/student/login", studentLoginLimit, async (req, res, next) => {
  try {
    const accessCode = String(req.body.accessCode ?? "").trim();
    if (!accessCode) {
      res.status(400).json({ error: "Access code is required" });
      return;
    }
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(ilike(studentsTable.accessCode, accessCode))
      .limit(1);
    if (!student || student.status !== "approved") {
      res
        .status(401)
        .json({ error: "Code is invalid or registration is not approved yet" });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await db
      .insert(studentSessionsTable)
      .values({ studentId: student.id, tokenHash, expiresAt });
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
    const student = await getApprovedStudent(req);
    if (!student) {
      res.json({ student: null });
      return;
    }
    res.json({ student: publicStudent(student) });
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

router.get("/admin/students", requireAdmin, async (_req, res, next) => {
  try {
    const students = await db
      .select()
      .from(studentsTable)
      .orderBy(desc(studentsTable.createdAt));
    res.json(students);
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
    if (!current) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const [student] = await db
      .update(studentsTable)
      .set({
        status: req.body.status !== undefined ? status : current.status,
        accessCode:
          status === "approved"
            ? current.accessCode || await generateAccessCode()
            : current.accessCode,
        approvedAt:
          status === "approved"
            ? current.approvedAt || new Date()
            : current.approvedAt,
        enrolledCategories: Array.isArray(req.body.enrolledCategories)
          ? Array.from(
              new Set<string>(
                (req.body.enrolledCategories as unknown[])
                  .map((value) => String(value).trim())
                  .filter(Boolean),
              ),
            ).slice(0, 20)
          : current.enrolledCategories,
        enrolledCourseIds: Array.isArray(req.body.enrolledCourseIds)
          ? Array.from(
              new Set<number>(
                (req.body.enrolledCourseIds as unknown[])
                  .map(Number)
                  .filter((value) => Number.isInteger(value) && value > 0),
              ),
            ).slice(0, 50)
          : current.enrolledCourseIds,
        learningMode:
          req.body.learningMode !== undefined &&
          ["online", "offline"].includes(String(req.body.learningMode))
            ? String(req.body.learningMode)
            : current.learningMode,
        notes:
          req.body.notes !== undefined ? String(req.body.notes) : current.notes,
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, id))
      .returning();
    if (req.body.status === "suspended") {
      await db
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.studentId, id));
    }
    if (req.body.status === "approved" && current.status !== "approved") {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "success",
        title: "حسابك اتفعل بنجاح",
        message: "تقدر دلوقتي تدخل على كورساتك وتبدأ التعلم بالكود الخاص بيك.",
      });
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
});

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
          latestId = currentId;
          res.write(`event: refresh\ndata: ${JSON.stringify({ latestId })}\n\n`);
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

router.delete("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const [student] = await db
      .delete(studentsTable)
      .where(eq(studentsTable.id, Number(req.params.id)))
      .returning();
    if (!student) res.status(404).json({ error: "Student not found" });
    else res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/learning/files", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const files = await db
      .select()
      .from(learningFilesTable)
      .where(eq(learningFilesTable.isPublished, true))
      .orderBy(desc(learningFilesTable.createdAt));
    const fileIds = files.map((file) => file.id);
    const links = fileIds.length
      ? await db
          .select({ fileId: videoFileAttachmentsTable.fileId, video: videosTable })
          .from(videoFileAttachmentsTable)
          .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
          .where(inArray(videoFileAttachmentsTable.fileId, fileIds))
      : [];
    const linkedVideos = new Map<number, Array<typeof videosTable.$inferSelect>>();
    for (const link of links) {
      linkedVideos.set(link.fileId, [...(linkedVideos.get(link.fileId) ?? []), link.video]);
    }
    res.json(
      files
        .filter((file) => file.targetType === "videos"
          ? (linkedVideos.get(file.id) ?? []).some((video) =>
              video.isPublished && canStudentAccessContent(
                student, video.category, video.stage, video.stages, video.courseId,
              ),
            )
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId))
        .map(({ storageName: _storageName, ...file }) => file),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/files", requireAdmin, async (_req, res, next) => {
  try {
    const files = await db
        .select()
        .from(learningFilesTable)
        .orderBy(desc(learningFilesTable.createdAt));
    const links = files.length ? await db
      .select({ fileId: videoFileAttachmentsTable.fileId, videoId: videoFileAttachmentsTable.videoId })
      .from(videoFileAttachmentsTable)
      .where(inArray(videoFileAttachmentsTable.fileId, files.map((file) => file.id))) : [];
    res.json(files.map((file) => ({
      ...file,
      videoIds: links.filter((link) => link.fileId === file.id).map((link) => link.videoId),
    })));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/admin/learning/files",
  requireAdmin,
  learningFileUpload,
  async (req, res, next) => {
    try {
      if (!req.file || !String(req.body.title ?? "").trim()) {
        if (req.file) fs.rmSync(req.file.path, { force: true });
        res.status(400).json({ error: "Title and file are required" });
        return;
      }
      const targetType = String(req.body.targetType ?? "stages") === "videos" ? "videos" : "stages";
      const stages = Array.from(new Set(
        String(req.body.stages ?? req.body.stage ?? "")
          .split(",").map((value) => value.trim()).filter(Boolean),
      )).slice(0, 20);
      const videoIds = Array.from(new Set(
        String(req.body.videoIds ?? "").split(",").map(Number).filter(Number.isInteger),
      )).slice(0, 100);
      const courseId = Number(req.body.courseId) || null;
      let category = String(req.body.category ?? "عام").trim() || "عام";
      if ((targetType === "stages" && stages.length === 0) || (targetType === "videos" && videoIds.length === 0)) {
        fs.rmSync(req.file.path, { force: true });
        res.status(400).json({ error: targetType === "videos" ? "اختر فيديو واحدًا على الأقل" : "اختر مرحلة واحدة على الأقل" });
        return;
      }
      if (targetType === "stages") {
        const [course] = courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
        const validTrackIds = new Set(["baccalaureate", "computer-science", "engineering"]);
        if (courseId && !course) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "اختر كورسًا صحيحًا" }); return;
        }
        if (course?.stages.length && stages.some((stage) => !course.stages.includes(stage))) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "إحدى المراحل غير متاحة داخل الكورس" }); return;
        }
        if (!course && !validTrackIds.has(category)) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "اختر قسمًا تعليميًا صحيحًا" }); return;
        }
        if (!course && stages.some((stage) => !isAcademicStageAllowedForTrack(category, stage))) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "إحدى المراحل لا تنتمي إلى القسم التعليمي المختار" }); return;
        }
        category = course?.title || category;
      }
      const [file] = await db
        .insert(learningFilesTable)
        .values({
          title: String(req.body.title).trim(),
          courseId: targetType === "stages" ? courseId : null,
          description: String(req.body.description ?? "").trim() || null,
          category,
          stage: stages[0] ?? null,
          stages,
          targetType,
          subject: String(req.body.subject ?? "").trim() || null,
          tags: String(req.body.tags ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 20),
          order: Number.isFinite(Number(req.body.order))
            ? Number(req.body.order)
            : 0,
          originalName: path.basename(req.file.originalname),
          storageName: req.file.filename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          isPublished: String(req.body.isPublished ?? "true") !== "false",
        })
        .returning();
      if (targetType === "videos") {
        const validVideos = await db.select().from(videosTable).where(inArray(videosTable.id, videoIds));
        if (validVideos.length !== videoIds.length) {
          await db.delete(learningFilesTable).where(eq(learningFilesTable.id, file.id));
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "أحد الفيديوهات المختارة غير موجود" });
          return;
        }
        await db.insert(videoFileAttachmentsTable).values(
          validVideos.map((video, order) => ({ videoId: video.id, fileId: file.id, order })),
        );
      }
      if (file.isPublished) {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const linkedVideos = targetType === "videos"
          ? await db.select().from(videosTable).where(inArray(videosTable.id, videoIds))
          : [];
        const recipients = approvedStudents.filter((student) => targetType === "videos"
          ? linkedVideos.some((video) => video.isPublished && canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId))
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId));
        if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "file",
          title: "ملف جديد متاح لك",
          message: `${file.title} متاح الآن داخل ملفاتك.`,
        })));
      }
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/learning/files/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const [currentFile] = await db.select().from(learningFilesTable).where(eq(learningFilesTable.id, fileId)).limit(1);
      if (!currentFile) { res.status(404).json({ error: "الملف غير موجود" }); return; }
      const targetType = req.body.targetType === "videos" ? "videos" : req.body.targetType === "stages" ? "stages" : undefined;
      const stages: string[] | undefined = req.body.stages !== undefined
        ? (Array.isArray(req.body.stages) ? req.body.stages : String(req.body.stages).split(","))
            .map(String).map((stage: string) => stage.trim()).filter(Boolean)
        : undefined;
      const videoIds: number[] | undefined = req.body.videoIds !== undefined
        ? (Array.isArray(req.body.videoIds) ? req.body.videoIds : String(req.body.videoIds).split(","))
            .map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
        : undefined;
      if (targetType === "stages" && stages?.length === 0) {
        res.status(400).json({ error: "اختر مرحلة واحدة على الأقل" }); return;
      }
      if (targetType === "videos" && videoIds?.length === 0) {
        res.status(400).json({ error: "اختر فيديو واحدًا على الأقل" }); return;
      }
      const effectiveTarget = targetType ?? currentFile.targetType;
      const effectiveStages = stages ?? currentFile.stages;
      if (effectiveTarget === "stages" && effectiveStages.length === 0) {
        res.status(400).json({ error: "اختر مرحلة واحدة على الأقل" }); return;
      }
      if (targetType === "videos" && currentFile.targetType !== "videos" && !videoIds?.length) {
        res.status(400).json({ error: "اختر فيديو واحدًا على الأقل" }); return;
      }
      const courseId = req.body.courseId !== undefined ? Number(req.body.courseId) || null : currentFile.courseId;
      const [course] = effectiveTarget === "stages" && courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
      const requestedCategory = req.body.category !== undefined
        ? String(req.body.category).trim()
        : currentFile.category;
      const validTrackIds = new Set(["baccalaureate", "computer-science", "engineering"]);
      if (effectiveTarget === "stages" && courseId && !course) {
        res.status(400).json({ error: "اختر كورسًا صحيحًا" }); return;
      }
      if (effectiveTarget === "stages" && course?.stages.length && effectiveStages.some((stage) => !course.stages.includes(stage))) {
        res.status(400).json({ error: "إحدى المراحل غير متاحة داخل الكورس" }); return;
      }
      if (effectiveTarget === "stages" && !course && !validTrackIds.has(requestedCategory)) {
        res.status(400).json({ error: "اختر قسمًا تعليميًا صحيحًا" }); return;
      }
      if (effectiveTarget === "stages" && !course && effectiveStages.some((stage) => !isAcademicStageAllowedForTrack(requestedCategory, stage))) {
        res.status(400).json({ error: "إحدى المراحل لا تنتمي إلى القسم التعليمي المختار" }); return;
      }
      if (videoIds?.length) {
        const existingVideos = await db.select({ id: videosTable.id }).from(videosTable).where(inArray(videosTable.id, videoIds));
        if (existingVideos.length !== new Set(videoIds).size) {
          res.status(400).json({ error: "أحد الفيديوهات المختارة غير موجود" }); return;
        }
      }
      const [file] = await db
        .update(learningFilesTable)
        .set({
          courseId: effectiveTarget === "stages" ? courseId : null,
          ...(course && { category: course.title }),
          ...(req.body.title !== undefined && {
            title: String(req.body.title).trim(),
          }),
          ...(req.body.description !== undefined && {
            description: String(req.body.description).trim() || null,
          }),
          ...(req.body.category !== undefined && {
            category: String(req.body.category).trim() || "عام",
          }),
          ...(req.body.stage !== undefined && {
            stage: String(req.body.stage).trim() || null,
          }),
          ...(stages !== undefined && { stages, stage: stages[0] ?? null }),
          ...(effectiveTarget === "stages" && {
            category: course?.title || requestedCategory,
            stages: effectiveStages,
            stage: effectiveStages[0] ?? null,
          }),
          ...(targetType === "videos" && { stages: [], stage: null }),
          ...(targetType !== undefined && { targetType }),
          ...(req.body.subject !== undefined && {
            subject: String(req.body.subject).trim() || null,
          }),
          ...(req.body.tags !== undefined && {
            tags: Array.isArray(req.body.tags)
              ? req.body.tags.map(String)
              : String(req.body.tags)
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
          }),
          ...(req.body.order !== undefined && {
            order: Number(req.body.order) || 0,
          }),
          ...(req.body.isPublished !== undefined && {
            isPublished: Boolean(req.body.isPublished),
          }),
        })
        .where(eq(learningFilesTable.id, fileId))
        .returning();
      if (!file) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      if (videoIds !== undefined) {
        await db.delete(videoFileAttachmentsTable).where(eq(videoFileAttachmentsTable.fileId, file.id));
        if (videoIds.length) await db.insert(videoFileAttachmentsTable).values(
          Array.from(new Set(videoIds)).map((videoId, order) => ({ videoId, fileId: file.id, order })),
        );
      } else if (targetType === "stages") {
        await db.delete(videoFileAttachmentsTable).where(eq(videoFileAttachmentsTable.fileId, file.id));
      }
      if (!currentFile.isPublished && file.isPublished) {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const linkedVideos = file.targetType === "videos"
          ? (await db.select({ video: videosTable }).from(videoFileAttachmentsTable)
              .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
              .where(eq(videoFileAttachmentsTable.fileId, file.id))).map(({ video }) => video)
          : [];
        const recipients = approvedStudents.filter((student) => file.targetType === "videos"
          ? linkedVideos.some((video) => video.isPublished && canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId))
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId));
        if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "file",
          title: "ملف جديد متاح لك",
          message: `${file.title} متاح الآن داخل ملفاتك.`,
        })));
      }
      res.json(file);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/admin/learning/files/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [file] = await db
        .delete(learningFilesTable)
        .where(eq(learningFilesTable.id, Number(req.params.id)))
        .returning();
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      fs.rmSync(path.join(privateUploadDir, path.basename(file.storageName)), {
        force: true,
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.get(["/learning/files/:id/preview", "/learning/files/:id/download"], async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    if (!student && !isAdminRequest(req)) {
      res.status(401).json({ error: "Student login is required" });
      return;
    }
    const [file] = await db
      .select()
      .from(learningFilesTable)
      .where(
        and(
          eq(learningFilesTable.id, Number(req.params.id)),
          eq(learningFilesTable.isPublished, true),
        ),
      )
      .limit(1);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (
      student &&
      !(file.targetType === "videos"
        ? (await db.select({ video: videosTable }).from(videoFileAttachmentsTable)
            .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
            .where(eq(videoFileAttachmentsTable.fileId, file.id)))
            .some(({ video }) => video.isPublished && canStudentAccessContent(
              student, video.category, video.stage, video.stages, video.courseId,
            ))
        : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId))
    ) {
      res.status(403).json({ error: "الملف غير متاح لحسابك أو مرحلتك الدراسية" });
      return;
    }
    const filePath = path.join(
      privateUploadDir,
      path.basename(file.storageName),
    );
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File missing from storage" });
      return;
    }
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `${req.path.endsWith("/preview") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    res.setHeader("Cache-Control", "private, no-store");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

router.get("/learning/quizzes", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const [quizzes, attempts, progress] = await Promise.all([
      db.select().from(quizzesTable).where(eq(quizzesTable.isPublished, true)).orderBy(desc(quizzesTable.createdAt)),
      db.select({ id: quizAttemptsTable.id, quizId: quizAttemptsTable.quizId }).from(quizAttemptsTable).where(eq(quizAttemptsTable.studentId, student.id)),
      db.select({ videoId: videoProgressTable.videoId, progress: videoProgressTable.progress }).from(videoProgressTable).where(eq(videoProgressTable.studentId, student.id)),
    ]);
    const attemptsByQuiz = new Map<number, number>();
    for (const attempt of attempts) {
      attemptsByQuiz.set(attempt.quizId, (attemptsByQuiz.get(attempt.quizId) ?? 0) + 1);
    }
    const progressByVideo = new Map(progress.map((row) => [row.videoId, row.progress]));
    res.json(
      quizzes
        .filter((quiz) =>
          canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId),
        )
        .map((quiz) => {
          const attemptsUsed = attemptsByQuiz.get(quiz.id) ?? 0;
          const progressLocked = quiz.scope === "lesson" && quiz.videoId !== null &&
            (progressByVideo.get(quiz.videoId) ?? 0) < quiz.requiredProgress;
          const attemptsLocked = attemptsUsed >= quiz.maxAttempts;
          return {
            ...quiz,
            attemptsUsed,
            locked: progressLocked || attemptsLocked,
            lockedReason: attemptsLocked
              ? "استخدمت كل المحاولات المتاحة"
              : progressLocked
                ? `أكمل ${quiz.requiredProgress}% من الدرس أولًا`
                : null,
            questions: quiz.questions.map(
              ({ correctIndex: _correctIndex, ...question }) => question,
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
    const allowed = getStudentAllowedCategories(student);
    if (allowed.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        videoId: videoProgressTable.videoId,
        progress: videoProgressTable.progress,
        currentTimeSeconds: videoProgressTable.currentTimeSeconds,
        durationSeconds: videoProgressTable.durationSeconds,
        completed: videoProgressTable.completed,
        updatedAt: videoProgressTable.updatedAt,
      })
      .from(videoProgressTable)
      .innerJoin(videosTable, eq(videoProgressTable.videoId, videosTable.id))
      .where(
        and(
          eq(videoProgressTable.studentId, student.id),
          inArray(videosTable.category, allowed),
        ),
      );
    res.json(rows);
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
      db.select().from(videoProgressTable),
      db.select().from(quizAttemptsTable),
      db.select().from(videosTable),
    ]);
    const now = Date.now();
    const activeCutoff = now - 14 * 24 * 60 * 60 * 1000;
    const studentRows = students.map((student) => {
      const ownProgress = progressRows.filter((row) => row.studentId === student.id);
      const ownAttempts = attempts.filter((row) => row.studentId === student.id);
      const eligibleVideos = videos.filter((video) =>
        video.isPublished &&
        canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId) &&
        canStudentAccessLearningMode(student, video.learningMode),
      );
      const activityTimes = [
        ...ownProgress.map((row) => row.updatedAt.getTime()),
        ...ownAttempts.map((row) => row.createdAt.getTime()),
      ];
      const lastActivityMs = activityTimes.length ? Math.max(...activityTimes) : 0;
      return {
        studentId: student.id,
        name: student.name,
        phone: student.phone,
        status: student.status,
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
      },
      students: studentRows,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/quizzes", requireAdmin, async (_req, res, next) => {
  try {
    res.json(
      await db
        .select()
        .from(quizzesTable)
        .orderBy(desc(quizzesTable.createdAt)),
    );
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
    const scope = req.body.scope === "lesson" ? "lesson" : "course";
    const stages = normalizeStringList(req.body.stages ?? req.body.stage);
    const [course] = Number.isInteger(courseId) ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
    if (!course || stages.length === 0 || stages.some((stage) => course.stages.length && !course.stages.includes(stage))) {
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
        maxAttempts: Math.max(1, Math.min(20, Number(req.body.maxAttempts ?? 3))),
        requiredProgress: scope === "lesson" ? Math.max(0, Math.min(100, Number(req.body.requiredProgress ?? 80))) : 0,
        questions,
        isPublished: req.body.isPublished === true,
      })
      .returning();
    if (video) await db.update(videosTable).set({ quizId: quiz.id }).where(eq(videosTable.id, video.id));
    if (quiz.isPublished) {
      const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
      const recipients = approvedStudents.filter((student) =>
        canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId));
      if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
        studentId: student.id,
        type: "quiz",
        title: "اختبار جديد متاح لك",
        message: `${quiz.title} جاهز الآن داخل الاختبارات.`,
      })));
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
      const quizId = Number(req.params.id);
      const [current] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
      if (!current) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
      const courseId = req.body.courseId !== undefined ? Number(req.body.courseId) : current.courseId;
      const scope = req.body.scope !== undefined ? (req.body.scope === "lesson" ? "lesson" : "course") : current.scope;
      const videoId = scope === "lesson" ? (req.body.videoId !== undefined ? Number(req.body.videoId) || null : current.videoId) : null;
      const stages: string[] = req.body.stages !== undefined
        ? normalizeStringList(req.body.stages)
        : current.stages;
      const [course] = courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
      const [video] = scope === "lesson" && videoId ? await db.select().from(videosTable).where(eq(videosTable.id, videoId)).limit(1) : [];
      if (
        !course ||
        stages.length === 0 ||
        stages.some((stage) => course.stages.length > 0 && !course.stages.includes(stage)) ||
        (scope === "lesson" && (!video || video.courseId !== courseId))
      ) {
        res.status(400).json({ error: "الكورس أو المرحلة أو الدرس غير صحيح" }); return;
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
      const [quiz] = await db
        .update(quizzesTable)
        .set({
          courseId,
          videoId,
          scope,
          category: course.title,
          stages,
          stage: stages[0] ?? null,
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
          ...(req.body.isPublished !== undefined && {
            isPublished: Boolean(req.body.isPublished),
          }),
          ...(questions !== undefined && { questions }),
          ...(req.body.maxAttempts !== undefined && { maxAttempts: Math.max(1, Math.min(20, Number(req.body.maxAttempts))) }),
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
        if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "quiz",
          title: "اختبار جديد متاح لك",
          message: `${quiz.title} جاهز الآن داخل الاختبارات.`,
        })));
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
      if (!quiz) res.status(404).json({ error: "Quiz not found" });
      else res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

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
      const answers: number[] = Array.isArray(req.body.answers)
        ? req.body.answers.map((answer: unknown) => Number(answer))
        : [];
      if (!quiz || answers.length !== quiz.questions.length || answers.some((answer: number, index: number) => !Number.isInteger(answer) || answer < 0 || answer >= quiz.questions[index].options.length)) {
        res.status(400).json({ error: "Quiz or answers are invalid" });
        return;
      }
      const student = res.locals.student as typeof studentsTable.$inferSelect;
      if (!canStudentAccessContent(student, quiz.category, quiz.stage, quiz.stages, quiz.courseId)) {
        res.status(403).json({ error: "الاختبار مش ضمن الكورس المسجل ليك" });
        return;
      }
      const previousAttempts = await db.select({ id: quizAttemptsTable.id }).from(quizAttemptsTable).where(and(eq(quizAttemptsTable.quizId, quiz.id), eq(quizAttemptsTable.studentId, student.id)));
      if (previousAttempts.length >= quiz.maxAttempts) {
        res.status(409).json({ error: "استخدمت كل المحاولات المتاحة لهذا الاختبار" }); return;
      }
      if (quiz.scope === "lesson" && quiz.videoId) {
        const [progress] = await db.select().from(videoProgressTable).where(and(eq(videoProgressTable.studentId, student.id), eq(videoProgressTable.videoId, quiz.videoId))).limit(1);
        if ((progress?.progress ?? 0) < quiz.requiredProgress) {
          res.status(403).json({ error: `أكمل ${quiz.requiredProgress}% من الدرس قبل بدء الاختبار` }); return;
        }
      }
      const correct = quiz.questions.reduce(
        (count, question, index) =>
          count + (answers[index] === question.correctIndex ? 1 : 0),
        0,
      );
      const score = Math.round((correct / quiz.questions.length) * 100);
      const passed = score >= quiz.passingScore;
      const [attempt] = await db
        .insert(quizAttemptsTable)
        .values({
          quizId: quiz.id,
          studentId: student.id,
          answers,
          score,
          passed,
        })
        .returning();
      res.json({
        attemptId: attempt.id,
        score,
        passed,
        correct,
        total: quiz.questions.length,
        attemptsUsed: previousAttempts.length + 1,
        attemptsRemaining: Math.max(0, quiz.maxAttempts - previousAttempts.length - 1),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/learning/attempts",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const attempts = await db
        .select({
          id: quizAttemptsTable.id,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          createdAt: quizAttemptsTable.createdAt,
          studentName: studentsTable.name,
          quizTitle: quizzesTable.title,
        })
        .from(quizAttemptsTable)
        .innerJoin(
          studentsTable,
          eq(quizAttemptsTable.studentId, studentsTable.id),
        )
        .innerJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id))
        .orderBy(desc(quizAttemptsTable.createdAt));
      res.json(attempts);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
