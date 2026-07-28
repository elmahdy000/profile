import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import {
  codeRecoveryRequestsTable,
  coursesTable,
  db,
  learningFilesTable,
  paymentReceiptsTable,
  quizAttemptsTable,
  quizzesTable,
  questionBankTable,
  studentSessionsTable,
  studentNotificationsTable,
  studentsTable,
  videoProgressTable,
  videosTable,
  videoFileAttachmentsTable,
  studentNotesTable,
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
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;
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

const paymentReceiptsDir = path.join(privateUploadDir, "payment-receipts");
fs.mkdirSync(paymentReceiptsDir, { recursive: true });

const paymentReceiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentReceiptsDir),
    filename: (_req, file, cb) => {
      const safeExt = path
        .extname(file.originalname)
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("ارفع صورة فقط (JPG أو PNG أو WebP)"));
  },
}).single("receipt");

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

const quizImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".docx", ".txt", ".md"].includes(extension)) cb(null, true);
    else cb(new Error("يمكن استيراد ملفات PDF أو Word (DOCX) أو TXT فقط."));
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
    paymentStatus: student.paymentStatus,
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

const optionLabels: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  "أ": 0, "ا": 0, "ب": 1, "ج": 2, "د": 3, "ه": 4, "هـ": 4,
};

function optionIndex(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/[.():\-]/g, "");
  if (normalized in optionLabels) return optionLabels[normalized];
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric - 1 : null;
}

function parseImportedQuestions(rawText: string): { questions: QuizQuestion[]; warnings: string[] } {
  const lines = rawText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];

  type DraftQuestion = {
    prompt: string;
    arabicTranslation?: string;
    options: string[];
    correctIndex: number | null;
    explanation?: string;
  };

  let current: DraftQuestion | null = null;

  const finishCurrent = () => {
    if (!current) return;
    // Merge English prompt + Arabic translation if both exist
    const finalPrompt = current.arabicTranslation
      ? `${current.prompt}\n${current.arabicTranslation}`
      : current.prompt;
    if (finalPrompt && current.options.length >= 2) {
      questions.push({
        prompt: finalPrompt,
        options: current.options,
        correctIndex: current.correctIndex ?? 0,
        explanation: current.explanation,
      });
      if (current.correctIndex === null) {
        warnings.push(`لم يتم العثور على سطر إجابة صريح للسؤال: «${current.prompt.slice(0, 60)}». تم تعيين الاختيار الأول افتراضيًا.`);
      }
    } else if (current.prompt) {
      warnings.push(`تم تجاوز السؤال: «${current.prompt.slice(0, 60)}» لأنه يحتاج اختيارين على الأقل (يحتوي على ${current.options.length}).`);
    }
    current = null;
  };

  // Helper: detect if a line is Arabic (contains Arabic Unicode chars)
  const isArabicLine = (line: string) => /[\u0600-\u06FF]/.test(line);

  // Helper: detect if line looks like an option prefix (A), B), 1., etc.)
  const CHOICE_RE = /^(?:\(?([A-Fa-fأابجده]|هـ|[1-6])\)?[.):\-\s]\s*)(.+)$/;

  // Helper: detect "Correct Answer: X)" or "Answer: B) main()" — flexible
  const ANSWER_RE = /^(?:correct\s*answer|answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|إجابة|اجابة)\s*[:：\-]?\s*(.+)$/i;

  // Helper: detect explanation line — handles ":التوضيح" (RTL colon first) and "التوضيح:" and "الشرح" etc.
  const EXPLANATION_HEADER_RE = /^(?::?\s*(?:explanation|note|التوضيح|التفسير|الشرح|تفسير|شرح|ملاحظة)\s*:?\s*)(.*)$/i;

  // Helper: detect standalone question header line like "Question 1" or "Question 1:" or "1." or "سؤال 1"
  const QUESTION_HEADER_RE = /^(?:(?:س(?:ؤال)?\s*)?\d+|Q(?:uestion)?\s*\d+|#\d+)(?:\s*[.):\-]\s*(.*))?$/i;

  let collectingExplanation = false;
  let hasFoundAnswer = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 1. Check if standalone Question header (e.g. "Question 1" or "1. What is...")
    const questionHeaderMatch = line.match(QUESTION_HEADER_RE);
    // Ensure it's not matching choice lines like "A)" or single letters
    if (questionHeaderMatch && !line.match(/^[A-Fa-fأابجده]\s*[.):\-]/)) {
      // Check if it's "Question 1" with text inline vs just "Question 1" heading
      const inlinePrompt = questionHeaderMatch[1]?.trim();
      finishCurrent();
      collectingExplanation = false;
      hasFoundAnswer = false;
      current = {
        prompt: inlinePrompt || "",
        options: [],
        correctIndex: null,
      };
      continue;
    }

    // 2. Explanation header
    const explanationHeaderMatch = line.match(EXPLANATION_HEADER_RE);
    if (explanationHeaderMatch && current) {
      collectingExplanation = true;
      const inlineText = explanationHeaderMatch[1].trim();
      if (inlineText) {
        current.explanation = inlineText;
      }
      continue;
    }

    // 2b. Multi-line explanation collection
    if (collectingExplanation && current) {
      if (line.match(QUESTION_HEADER_RE) || line.match(ANSWER_RE) || line.match(CHOICE_RE)) {
        collectingExplanation = false;
      } else {
        current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
        continue;
      }
    }

    // 3. Answer line — "Correct Answer: B) main()"
    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch && current) {
      collectingExplanation = false;
      hasFoundAnswer = true;
      const answerVal = answerMatch[1].trim();
      const leadingToken = answerVal.match(/^([A-Fa-fأابجده]|هـ|[1-6])\b/)?.[1];
      const byIndex = leadingToken ? optionIndex(leadingToken) : null;
      const byText = current.options.findIndex((o) => o.toLowerCase().trim() === answerVal.toLowerCase().trim());
      if (byIndex !== null && byIndex < current.options.length) {
        current.correctIndex = byIndex;
      } else if (byText >= 0) {
        current.correctIndex = byText;
      } else {
        const afterLetter = answerVal.replace(/^([A-Fa-fأابجده]|هـ|[1-6])\)?[.):\-\s]+/, "").trim();
        const byTextAfter = current.options.findIndex((o) =>
          o.toLowerCase().replace(/[()]/g, "").trim().includes(afterLetter.toLowerCase().replace(/[()]/g, "").trim())
        );
        if (byTextAfter >= 0) {
          current.correctIndex = byTextAfter;
        } else if (byIndex !== null) {
          current.correctIndex = byIndex;
        }
      }
      continue;
    }

    // 4. Choice line: "A) start()"
    const choiceMatch = line.match(CHOICE_RE);
    if (choiceMatch && current && current.options.length < 8 && !hasFoundAnswer) {
      collectingExplanation = false;
      current.options.push(choiceMatch[2].trim());
      continue;
    }

    // 5. Fallback line handling
    if (!current) {
      current = {
        prompt: line,
        options: [],
        correctIndex: null,
      };
      collectingExplanation = false;
      hasFoundAnswer = false;
    } else if (!current.prompt) {
      // First line after a header like "Question 1"
      current.prompt = line;
    } else if (current.options.length === 0 && !current.arabicTranslation) {
      // Arabic translation of English prompt (line immediately after English question)
      if (isArabicLine(line) && !isArabicLine(current.prompt)) {
        current.arabicTranslation = line;
      } else {
        current.prompt += `\n${line}`;
      }
    } else if (current.options.length === 0) {
      current.prompt += `\n${line}`;
    } else if (hasFoundAnswer || collectingExplanation) {
      // Any extra lines after the answer line belong to explanation
      current.explanation = (current.explanation ? current.explanation + "\n" : "") + line;
    } else if (!collectingExplanation && current.options.length > 0) {
      // Continuation of last option before answer line
      current.options[current.options.length - 1] += `\n${line}`;
    }
  }

  finishCurrent();
  return { questions, warnings };
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

async function getAutomaticCourseAssignments(stage: string) {
  const normalizedStage = stage.trim().toLocaleLowerCase("ar");
  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.isPublished, true));
  const matching = courses.filter((course) => {
    const courseStages = course.stages ?? [];
    if (courseStages.length === 0) return true; // Courses with no stage restriction are available to all students
    return courseStages.some((cs) => cs.trim().toLocaleLowerCase("ar") === normalizedStage);
  });
  return {
    enrolledCourseIds: matching.map((course) => course.id),
    enrolledCategories: Array.from(new Set(matching.map((course) => course.title))),
  };
}

async function ensureAutomaticCourseAssignments(student: typeof studentsTable.$inferSelect) {
  if ((student.enrolledCourseIds ?? []).length || (student.enrolledCategories ?? []).length) return student;
  const stage = student.grade === "أخرى" ? student.otherGradeDetail || student.grade : student.grade;
  const automaticAssignments = await getAutomaticCourseAssignments(stage || "");
  if (!automaticAssignments.enrolledCourseIds.length) return student;
  const [updated] = await db
    .update(studentsTable)
    .set({ ...automaticAssignments, updatedAt: new Date() })
    .where(eq(studentsTable.id, student.id))
    .returning();
  return updated;
}

async function calculateStreak(studentId: number): Promise<number> {
  const rows = await db
    .select({ updatedAt: videoProgressTable.updatedAt })
    .from(videoProgressTable)
    .where(eq(videoProgressTable.studentId, studentId))
    .orderBy(desc(videoProgressTable.updatedAt));
  if (!rows.length) return 0;
  const uniqueDays = Array.from(new Set(
    rows.map((r) => r.updatedAt.toISOString().slice(0, 10)),
  )).sort().reverse();
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
      const phone = String(req.body.phone ?? "").replace(/\s+/g, "");
      const rawEmail = String(req.body.email ?? "").trim().toLowerCase();
      const email = rawEmail.length > 0 ? rawEmail : null;
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

      if (name.length < 2 || !/^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(phone)) {
        res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان بشكل صحيح" });
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

      const [existingByPhone] = await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.phone, phone))
        .limit(1);
      if (existingByPhone) {
        res.json({
          status: existingByPhone.status,
          accessCode: existingByPhone.status === "approved" ? existingByPhone.accessCode : undefined,
          message: "Registration already exists",
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
          learningMode,
          status: "approved",
          accessCode,
          approvedAt: new Date(),
          paymentStatus: "unpaid",
          ...(await getAutomaticCourseAssignments(grade === "أخرى" ? otherGradeDetail || grade : grade)),
        })
        .returning();
      res.status(201).json({
        status: student.status,
        accessCode: student.accessCode,
        message: "تم تفعيل حسابك. استخدم الكود للدخول على المنصة. أول فيديوهين مجانية، ارفع إيصال الدفع لفتح باقي المحتوى.",
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
    if (!student || student.status !== "approved") {
      res
        .status(401)
        .json({ error: "الكود غير صحيح أو أن حسابك قيد التفعيل حالياً" });
      return;
    }

    // ── Multi-Device Locking & Binding Logic (Strict Maximum: 2 Devices) ──
    if (deviceId) {
      const maxDevices = Math.min(2, Math.max(1, student.maxDevices || 1));
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
          res.status(403).json({
            error: isSingleDevice
              ? "عذراً، هذا الحساب مرتبط بجهاز آخر. يتطلب الفتح من جهاز ثانٍ تواصلك مع الأدمن للموافقة والتفعيل (الحد الأقصى المطلق: جهازين)."
              : "عذراً، هذا الحساب وصل للحد الأقصى المطلق المسموح للأجهزة (جهازين فقط). لا يمكن إضافة أجهزة إضافية.",
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
    await db.transaction(async (tx) => {
      await tx
        .delete(studentSessionsTable)
        .where(eq(studentSessionsTable.studentId, student.id));
      await tx
        .insert(studentSessionsTable)
        .values({ studentId: student.id, tokenHash, expiresAt });
    });
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
    res.json({ student: publicStudent(student), streak });
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
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "الحالة لازم تكون approved أو rejected" });
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
      .set({ status, adminNotes, reviewedAt: new Date() })
      .where(eq(paymentReceiptsTable.id, receiptId))
      .returning();
    if (status === "approved") {
      if (receipt.studentId) {
        await db
          .update(studentsTable)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(studentsTable.id, receipt.studentId));
        await db.insert(studentNotificationsTable).values({
          studentId: receipt.studentId,
          type: "success",
          title: "تم تأكيد الدفع",
          message: "تم تأكيد إيصال الدفع بنجاح. تقدر دلوقتي تشوف كل الفيديوهات والمحتوى.",
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
    res.json(updated);
  } catch (error) {
    next(error);
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
    let [student] = await db
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
        paymentStatus:
          req.body.paymentStatus !== undefined &&
          ["paid", "pending_review", "unpaid"].includes(String(req.body.paymentStatus))
            ? String(req.body.paymentStatus)
            : current.paymentStatus,
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
    if (student) {
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
    } else if (req.body.learningMode !== undefined && student.learningMode !== current.learningMode) {
      await db.insert(studentNotificationsTable).values({
        studentId: id,
        type: "info",
        title: "تم تحديث نظام الدراسة",
        message: "تم تحديث المحتوى المتاح لك حسب نظام الدراسة الجديد.",
      });
    }
    if (req.body.resetDevice === true) {
      await db
        .update(studentsTable)
        .set({ deviceId: null })
        .where(eq(studentsTable.id, id));
      student.deviceId = null;
    }
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
    const { title, message, type = "info", targetGrade } = req.body;
    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: "عنوان ونص الإشعار مطلوبان" });
      return;
    }

    const allApproved = await db
      .select({ id: studentsTable.id, grade: studentsTable.grade })
      .from(studentsTable)
      .where(eq(studentsTable.status, "approved"));

    let targets = allApproved;
    if (targetGrade && targetGrade !== "all") {
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

    res.json({
      success: true,
      count: targets.length,
      message: `تم إرسال الإشعار بنجاح إلى ${targets.length} طالب`,
    });
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
    if (student && student.paymentStatus !== "paid") {
      res.status(403).json({ error: "الملفات المرفقة متاحة فقط للمشتركين المدفوعين", code: "PAYMENT_REQUIRED" });
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
    // Force inline rendering only, never trigger attachment download
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self'; sandbox allow-scripts allow-same-origin");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
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
      const extension = path.extname(req.file.originalname).toLowerCase();
      let extractedText = "";
      if (extension === ".pdf") {
        extractedText = (await pdfParse(req.file.buffer)).text;
      } else if (extension === ".docx") {
        extractedText = (await mammoth.extractRawText({ buffer: req.file.buffer })).value;
      } else {
        extractedText = req.file.buffer.toString("utf8");
      }
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
        durationMinutes: req.body.durationMinutes ? Number(req.body.durationMinutes) : null,
        questionsToShow: req.body.questionsToShow ? Number(req.body.questionsToShow) : null,
        shuffleQuestions: Boolean(req.body.shuffleQuestions),
        showExplanations: req.body.showExplanations !== false,
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
          ...(req.body.durationMinutes !== undefined && { durationMinutes: req.body.durationMinutes ? Number(req.body.durationMinutes) : null }),
          ...(req.body.questionsToShow !== undefined && { questionsToShow: req.body.questionsToShow ? Number(req.body.questionsToShow) : null }),
          ...(req.body.shuffleQuestions !== undefined && { shuffleQuestions: Boolean(req.body.shuffleQuestions) }),
          ...(req.body.showExplanations !== undefined && { showExplanations: Boolean(req.body.showExplanations) }),
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

// ── Question Bank CRUD Endpoints ──

router.get("/admin/learning/question-bank", requireAdmin, async (_req, res, next) => {
  try {
    const questions = await db
      .select()
      .from(questionBankTable)
      .orderBy(desc(questionBankTable.createdAt));
    res.json(questions);
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/question-bank", requireAdmin, async (req, res, next) => {
  try {
    const { prompt, options, correctIndex, explanation, imageUrl, courseId, category, stage, stages, difficulty, subject, tags } = req.body;
    if (!prompt || !Array.isArray(options) || options.length < 2 || typeof correctIndex !== "number") {
      res.status(400).json({ error: "بيانات السؤال غير كاملة" });
      return;
    }
    const [entry] = await db
      .insert(questionBankTable)
      .values({
        courseId: Number(courseId) || null,
        category: String(category || "عام"),
        stage: String(stage || ""),
        stages: Array.isArray(stages) ? stages : [],
        difficulty: String(difficulty || "medium"),
        subject: String(subject || ""),
        tags: Array.isArray(tags) ? tags : [],
        question: {
          prompt: String(prompt).trim(),
          options: options.map((o: unknown) => String(o).trim()),
          correctIndex: Math.max(0, Math.min(options.length - 1, correctIndex)),
          explanation: String(explanation || "").trim() || undefined,
          imageUrl: String(imageUrl || "").trim() || undefined,
        },
      })
      .returning();
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

router.post("/admin/learning/question-bank/batch-import", requireAdmin, async (req, res, next) => {
  try {
    const { questions, courseId, category, stage, stages } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "قائمة الأسئلة فارغة" });
      return;
    }

    const validQuestions = questions.filter(
      (q) => q && typeof q.prompt === "string" && q.prompt.trim() && Array.isArray(q.options) && q.options.length >= 2
    );

    if (validQuestions.length === 0) {
      res.status(400).json({ error: "لا توجد أسئلة صالحة للحفظ" });
      return;
    }

    const inserted = await db
      .insert(questionBankTable)
      .values(
        validQuestions.map((q) => ({
          courseId: Number(courseId) || null,
          category: String(category || "عام"),
          stage: String(stage || ""),
          stages: Array.isArray(stages) ? stages : [],
          difficulty: "medium",
          subject: "",
          tags: [],
          question: {
            prompt: String(q.prompt).trim(),
            options: q.options.map((o: unknown) => String(o).trim()),
            correctIndex: Math.max(0, Math.min(q.options.length - 1, Number(q.correctIndex) || 0)),
            explanation: String(q.explanation || "").trim() || undefined,
            imageUrl: String(q.imageUrl || "").trim() || undefined,
          },
        }))
      )
      .returning();

    res.status(201).json({ count: inserted.length });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/learning/question-bank/:id", requireAdmin, async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(questionBankTable)
      .where(eq(questionBankTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "السؤال غير موجود في البنك" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Generate Quiz from Question Bank automatically
router.post("/admin/learning/question-bank/generate-quiz", requireAdmin, async (req, res, next) => {
  try {
    const { title, courseId, count, category, difficulty, passingScore, durationMinutes } = req.body;
    const qCount = Math.max(1, Math.min(50, Number(count || 10)));
    const allBankQuestions = await db.select().from(questionBankTable);
    
    let filtered = allBankQuestions;
    if (courseId) filtered = filtered.filter((q) => q.courseId === Number(courseId));
    if (category && category !== "all") filtered = filtered.filter((q) => q.category === category);
    if (difficulty && difficulty !== "all") filtered = filtered.filter((q) => q.difficulty === difficulty);

    if (filtered.length === 0) {
      res.status(404).json({ error: "لا توجد أسئلة كافية في البنك تطابق هذا البحث" });
      return;
    }

    // Pick random questions
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, qCount).map((item) => item.question);

    res.json({
      title: title || `اختبار عشوائي من بنك الأسئلة (${selectedQuestions.length} سؤال)`,
      questions: selectedQuestions,
      passingScore: Number(passingScore) || 60,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
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
      const effectiveTotal =
        quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < quiz.questions.length
          ? quiz.questionsToShow
          : quiz.questions.length;

      if (effectiveTotal === 0) {
        res.status(400).json({ error: "الاختبار لا يحتوي على أسئلة" });
        return;
      }

      const correct = quiz.questions.reduce(
        (count, question, index) =>
          count + (answers[index] !== undefined && answers[index] >= 0 && answers[index] === question.correctIndex ? 1 : 0),
        0,
      );

      const score = Math.min(100, Math.round((correct / effectiveTotal) * 100));
      const passed = score >= quiz.passingScore;
      const timeSpentSeconds = Math.max(0, Math.round(Number(req.body.timeSpentSeconds ?? 0))) || 0;
      const details = quiz.questions.map((question, index) => ({
        questionIndex: index,
        selectedOption: answers[index],
        correctOption: question.correctIndex,
        isCorrect: answers[index] === question.correctIndex,
      }));

      // Wrap check + insert in transaction to prevent race condition
      const result = await db.transaction(async (tx) => {
        const prevAttempts = await tx.select({ id: quizAttemptsTable.id }).from(quizAttemptsTable).where(and(eq(quizAttemptsTable.quizId, quiz.id), eq(quizAttemptsTable.studentId, student.id)));
        if (prevAttempts.length >= quiz.maxAttempts) {
          return null; // exceeded
        }
        const [attempt] = await tx
          .insert(quizAttemptsTable)
          .values({
            quizId: quiz.id,
            studentId: student.id,
            answers,
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

      // Return correctIndex per question so frontend can highlight right/wrong
      const showExplanations = quiz.showExplanations !== false;
      res.json({
        attemptId: result.attempt.id,
        score,
        passed,
        correct,
        total: effectiveTotal,
        attemptsUsed: result.attemptsUsed,
        attemptsRemaining: Math.max(0, quiz.maxAttempts - result.attemptsUsed),
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
        });
      } catch {
        // Fallback to Paiza.IO C++ runner if Wandbox times out or is unreachable
        response = await fetch("https://api.paiza.io/runners/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: "cpp",
            source_code: code,
            input: stdin,
            api_key: "guest",
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Compiler API error: ${response.status}`);
      }

      const result = (await response.json()) as any;

      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      if ("program_output" in result || "compiler_error" in result) {
        stdout = result.program_output ?? "";
        stderr = result.program_error || result.compiler_error || result.compiler_output || "";
        exitCode = result.status === "0" ? 0 : Number(result.status ?? 1);
      } else if (result.id) {
        // Paiza runner polling
        const runId = result.id;
        const detailsRes = await fetch(`https://api.paiza.io/runners/get_details?id=${runId}&api_key=guest`);
        const details = (await detailsRes.json()) as any;
        stdout = details.stdout ?? "";
        stderr = details.stderr || details.build_stderr || "";
        exitCode = details.build_exit_code === 0 && details.exit_code === 0 ? 0 : 1;
      }

      res.json({
        output: stdout,
        error: stderr,
        exitCode,
        success: exitCode === 0 && !stderr.includes("error:"),
      });
    } catch (error) {
      res.status(500).json({
        output: "",
        error: "تعذر الاتصال بـ C++ Compiler Server حالياً. يرجى المحاولة مرة أخرى.",
        exitCode: 1,
        success: false,
      });
    }
  },
);

export default router;
