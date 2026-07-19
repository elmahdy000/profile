import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import {
  db,
  learningFilesTable,
  quizAttemptsTable,
  quizzesTable,
  studentSessionsTable,
  studentsTable,
  videoProgressTable,
  videosTable,
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
const privateUploadDir = path.join(process.cwd(), "private", "learning-files");
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
    if (allowedFileTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error("This learning file type is not allowed"));
  },
}).single("file");

function publicStudent(student: typeof studentsTable.$inferSelect) {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    status: student.status,
    governorate: student.governorate,
    city: student.city,
    grade: student.grade,
    otherGradeDetail: student.otherGradeDetail,
    learningMode: student.learningMode,
    enrolledCategories: student.enrolledCategories,
    enrolledCourseIds: student.enrolledCourseIds,
    createdAt: student.createdAt,
  };
}

function generateAccessCode() {
  return `EDU-${randomBytes(8).toString("hex").toUpperCase()}`;
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
      const grade = String(req.body.grade ?? "").trim();
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
      const allowedGrades = [
        "أولى بكالوريا",
        "تانية بكالوريا",
        "جامعة",
        "أخرى",
      ];
      if (!allowedGrades.includes(grade)) {
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

router.get("/student/me", async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    if (!student) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({ student: publicStudent(student) });
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
            ? current.accessCode || generateAccessCode()
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
    res.json(student);
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
    res.json(
      files
        .filter((file) =>
          canStudentAccessContent(student, file.category, file.stage),
        )
        .map(({ storageName: _storageName, ...file }) => file),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/files", requireAdmin, async (_req, res, next) => {
  try {
    res.json(
      await db
        .select()
        .from(learningFilesTable)
        .orderBy(desc(learningFilesTable.createdAt)),
    );
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
      const [file] = await db
        .insert(learningFilesTable)
        .values({
          title: String(req.body.title).trim(),
          description: String(req.body.description ?? "").trim() || null,
          category: String(req.body.category ?? "عام").trim() || "عام",
          stage: String(req.body.stage ?? "").trim() || null,
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
      const [file] = await db
        .update(learningFilesTable)
        .set({
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
        .where(eq(learningFilesTable.id, Number(req.params.id)))
        .returning();
      if (!file) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
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

router.get("/learning/files/:id/download", async (req, res, next) => {
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
      !canStudentAccessContent(student, file.category, file.stage)
    ) {
      res.status(403).json({ error: "الملف مش ضمن الكورس المسجل ليك" });
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
      `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

router.get("/learning/quizzes", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const allowed = getStudentAllowedCategories(student);
    if (allowed.length === 0) {
      res.json([]);
      return;
    }
    const quizzes = await db
      .select()
      .from(quizzesTable)
      .where(
        and(
          eq(quizzesTable.isPublished, true),
          inArray(quizzesTable.category, allowed),
        ),
      )
      .orderBy(desc(quizzesTable.createdAt));
    res.json(
      quizzes.map((quiz) => ({
        ...quiz,
        questions: quiz.questions.map(
          ({ correctIndex: _correctIndex, ...question }) => question,
        ),
      })),
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
      if (
        !Number.isInteger(videoId) ||
        videoId <= 0 ||
        !Number.isFinite(progress)
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
      const [saved] = await db
        .insert(videoProgressTable)
        .values({
          studentId: student.id,
          videoId,
          progress: savedProgress,
          completed: savedProgress >= 100,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [videoProgressTable.studentId, videoProgressTable.videoId],
          set: {
            progress: savedProgress,
            completed: savedProgress >= 100,
            updatedAt: new Date(),
          },
        })
        .returning();
      res.json({
        videoId: saved.videoId,
        progress: saved.progress,
        completed: saved.completed,
      });
    } catch (error) {
      next(error);
    }
  },
);

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
    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        title,
        description: String(req.body.description ?? "").trim() || null,
        category: String(req.body.category ?? "عام").trim() || "عام",
        passingScore: Math.max(
          0,
          Math.min(100, Number(req.body.passingScore ?? 60)),
        ),
        questions,
        isPublished: req.body.isPublished !== false,
      })
      .returning();
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
      const [quiz] = await db
        .update(quizzesTable)
        .set({
          ...(req.body.title !== undefined && {
            title: String(req.body.title).trim(),
          }),
          ...(req.body.description !== undefined && {
            description: String(req.body.description).trim() || null,
          }),
          ...(req.body.category !== undefined && {
            category: String(req.body.category).trim() || "عام",
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
          updatedAt: new Date(),
        })
        .where(eq(quizzesTable.id, Number(req.params.id)))
        .returning();
      if (!quiz) {
        res.status(404).json({ error: "الاختبار غير موجود" });
        return;
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
      const answers = Array.isArray(req.body.answers)
        ? req.body.answers.map(Number)
        : [];
      if (!quiz || answers.length !== quiz.questions.length) {
        res.status(400).json({ error: "Quiz or answers are invalid" });
        return;
      }
      const student = res.locals.student as typeof studentsTable.$inferSelect;
      if (!canStudentAccessCategory(student, quiz.category)) {
        res.status(403).json({ error: "الاختبار مش ضمن الكورس المسجل ليك" });
        return;
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
