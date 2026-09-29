import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import multer from "multer";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { db, coursesTable, studentsTable, bookingsTable, studentNotificationsTable, type QuizQuestion } from "@workspace/db";
import { canStudentAccessContent } from "../../middleware/student-auth";

export const privateUploadDir =
  process.env.LEARNING_FILES_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/var/lib/drelmahdy/learning-files"
    : path.join(process.cwd(), "private", "learning-files"));
fs.mkdirSync(privateUploadDir, { recursive: true });

export const paymentReceiptsDir = path.join(privateUploadDir, "payment-receipts");
fs.mkdirSync(paymentReceiptsDir, { recursive: true });

export const summariesDir = path.join(privateUploadDir, "student-summaries");
fs.mkdirSync(summariesDir, { recursive: true });

export const essayAnswersDir = path.join(privateUploadDir, "essay-answers");
fs.mkdirSync(essayAnswersDir, { recursive: true });

export const allowedImageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".gif",
  ".bmp",
  ".jfif",
  ".tiff",
]);

export const allowedSummaryExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".gif",
  ".bmp",
  ".jfif",
  ".tiff",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
]);

export const paymentReceiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentReceiptsDir),
    filename: (_req, file, cb) => {
      const originalExt = path.extname(file.originalname || "").toLowerCase();
      const safeExt = originalExt.replace(/[^.a-z0-9]/g, "");
      const mimeExt: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic",
        "image/heif": ".heif",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
      };
      const ext = safeExt || mimeExt[(file.mimetype || "").toLowerCase()] || ".jpg";
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit per receipt
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const isAllowed =
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime === "application/x-pdf" ||
      mime.includes("octet-stream") ||
      mime === "" ||
      allowedImageExtensions.has(ext) ||
      ext === ".pdf" ||
      !ext;

    if (isAllowed) cb(null, true);
    else cb(new Error("ارفع صورة فقط (JPG أو PNG أو WebP أو HEIC) أو ملف PDF"));
  },
}).single("receipt");

export const summaryImagesUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, summariesDir),
    filename: (_req, file, cb) => {
      const originalExt = path.extname(file.originalname || "").toLowerCase();
      const safeExt = originalExt.replace(/[^.a-z0-9]/g, "");
      const ext = safeExt || ".jpg";
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const isAllowed =
      mime.startsWith("image/") ||
      mime.startsWith("text/") ||
      mime.includes("word") ||
      mime.includes("document") ||
      mime === "application/pdf" ||
      mime === "application/x-pdf" ||
      allowedSummaryExtensions.has(ext) ||
      !ext;

    if (isAllowed) cb(null, true);
    else cb(new Error("صيغة الملف غير مدعومة. ارفع صورة (JPG, PNG, HEIC) أو ملف (PDF, Word, TXT)."));
  },
}).array("images", 10);

export const essayAnswerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, essayAnswersDir),
    filename: (_req, file, cb) => {
      const originalExt = path.extname(file.originalname || "").toLowerCase();
      const safeExt = originalExt.replace(/[^.a-z0-9]/g, "");
      const ext = safeExt || ".jpg";
      cb(null, `ans-${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    if (mime.startsWith("image/") || mime === "application/pdf" || mime === "application/x-pdf") {
      cb(null, true);
    } else {
      cb(new Error("يرجى رفع صورة (JPG, PNG, WebP, HEIC) أو ملف PDF لورقة الإجابة."));
    }
  },
}).single("photo");

export const quizImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => {
    cb(null, true);
  },
}).single("file");


export function normalizeEgyptianPhone(raw: unknown): string {
  if (!raw) return "";
  let str = String(raw).trim();
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicDigits[i], "g"), String(i));
  }
  let digits = str.replace(/\D/g, "");
  if (digits.startsWith("201") && digits.length === 12) {
    digits = digits.substring(1);
  } else if (digits.startsWith("00201") && digits.length === 14) {
    digits = digits.substring(3);
  }
  return digits;
}

export function getStudentTrack(student: {
  languageTrack?: string | null;
  academicTrack?: string | null;
  schoolType?: string | null;
  grade?: string | null;
}): "en" | "ar" {
  const isLanguages = Boolean(
    (student.languageTrack && (student.languageTrack.toLowerCase().includes("lang") || student.languageTrack.includes("لغات"))) ||
    (student.academicTrack && (student.academicTrack.toLowerCase().includes("lang") || student.academicTrack.includes("لغات"))) ||
    (student.schoolType && (student.schoolType.toLowerCase().includes("lang") || student.schoolType.includes("لغات"))) ||
    (student.grade && (student.grade.toLowerCase().includes("لغات") || student.grade.toLowerCase().includes("languages")))
  );
  return isLanguages ? "en" : "ar";
}

export function matchStudentToStage(
  stageName: string,
  student: {
    grade?: string | null;
    educationGrade?: string | null;
    languageTrack?: string | null;
    academicTrack?: string | null;
    schoolType?: string | null;
  }
): boolean {
  const studentTrack = getStudentTrack(student);
  const isStageLanguages = stageName.toLowerCase().includes("لغات") || stageName.toLowerCase().includes("languages");
  if (studentTrack === "en" && !isStageLanguages) {
    return false;
  }
  if (studentTrack === "ar" && isStageLanguages) {
    return false;
  }

  const sStage = stageName.trim();
  const sGrade = (student.grade || "").trim();
  const sEduGrade = (student.educationGrade || "").trim();

  if (sGrade && (sStage.includes(sGrade) || sGrade.includes(sStage))) {
    return true;
  }

  if (sEduGrade) {
    if (sEduGrade === "first_secondary" && (sStage.includes("أولى") || sStage.includes("الأول") || sStage.includes("اولى"))) return true;
    if (sEduGrade === "second_secondary" && (sStage.includes("تانية") || sStage.includes("الثاني") || sStage.includes("ثانية"))) return true;
    if (sEduGrade === "third_secondary" && (sStage.includes("تالتة") || sStage.includes("الثالث") || sStage.includes("ثالثة"))) return true;
    if (sEduGrade.startsWith("university") && (sStage.includes("جامع") || sStage.includes("حاسبات") || sStage.includes("هندس"))) return true;
  }

  return true;
}

export function parseUnitSortOrder(unitName: string): number {
  if (!unitName) return 999;
  const s = unitName.toLowerCase();
  if (/(\b1\b|الأولى|الاولى|unit\s*1|first)/i.test(s)) return 1;
  if (/(\b2\b|الثانية|التانية|unit\s*2|second)/i.test(s)) return 2;
  if (/(\b3\b|الثالثة|التالتة|unit\s*3|third)/i.test(s)) return 3;
  if (/(\b4\b|الرابعة|الرابعه|unit\s*4|fourth)/i.test(s)) return 4;
  if (/(\b5\b|الخامسة|الخامسه|unit\s*5|fifth)/i.test(s)) return 5;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10);
  return 99;
}

export function parseLessonSortOrder(lessonName: string): number {
  if (!lessonName) return 999;
  const s = lessonName.toLowerCase();
  const matchDash = s.match(/(\d+)\s*[-_.]\s*(\d+)/);
  if (matchDash) {
    return parseInt(matchDash[1], 10) * 100 + parseInt(matchDash[2], 10);
  }
  if (s.includes("شامل")) return 9999;
  if (/(\b1\b|الأول|الاول\b|first)/i.test(s)) return 10;
  if (/(\b2\b|الثاني|الثانى\b|second)/i.test(s)) return 20;
  if (/(\b3\b|الثالث\b|third)/i.test(s)) return 30;
  if (/(\b4\b|الرابع\b|fourth)/i.test(s)) return 40;
  if (/(\b5\b|الخامس\b|fifth)/i.test(s)) return 50;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10) * 10;
  return 100;
}

export function normalizeQuestionPrompt(p?: string | null): string {
  if (!p) return "";
  return p
    .trim()
    .toLowerCase()
    .replace(/[\s\r\n\t]+/g, " ")
    .replace(/[؟?.,!،:;ـ_—\-\(\)\[\]\{\}«»"']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function cleanOptionString(opt: string): string {
  return opt
    .replace(/\s*[\r\n]+\s*[\(\[]?[A-Fa-fأابجدهإآهـ1-6][\)\.\:\-\]\/]?\s*$/g, "")
    .replace(/^[\*\•\s]+/, "")
    .trim();
}

export function isCompleteValidQuestion(q: QuizQuestion | undefined | null): boolean {
  if (!q || !q.prompt || typeof q.prompt !== "string") return false;
  const prompt = q.prompt.trim();
  if (prompt.length < 10) return false;
  if (/\b(?:ما فائدة|سؤال|Question)\b\s*$/.test(prompt)) return false;
  if (/\r?\n\s*[A-Da-dأابجده]\)\s*$/.test(prompt)) return false;
  if (/(?:^|\s)[\u0621-\u064A]$/.test(prompt)) return false;
  if (/(?:^|\s)(?:مر|فت|عص|حق|تق|ت|لت|ي|و|ف|ب|ك|ل|ال|دون|في|من|عن|إلى|مع|أو|أن|لل|على|التي|الذي|الذين|اللاتي|اللواتي|بأن|حيث|بما|مثل|تؤدي إلى|من الصعب)$/.test(prompt)) return false;
  if (/[\—\-\:\/]\s*$/.test(prompt)) return false;

  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  const cleanedList: string[] = [];
  for (const rawOpt of q.options) {
    if (!rawOpt || typeof rawOpt !== "string") return false;
    const opt = cleanOptionString(rawOpt);
    if (opt.length < 2) return false;
    if (/(?:^|\s)[\u0621-\u064A]$/.test(opt)) return false;
    if (/(?:^|\s)(?:مر|فت|ت|لت|و|ال|في|من|عن|إلى|مع|أو|أن|لل|على)$/.test(opt)) return false;
    if (/[\—\-]$/.test(opt)) return false;
    cleanedList.push(opt);
  }
  const distinct = new Set(cleanedList);
  if (distinct.size < Math.min(2, cleanedList.length)) return false;
  return true;
}

export function generateStudentMotivationMessage(studentName: string, progressPercentage: number): { status: "excellent" | "good" | "needs_push"; message: string } {
  const firstName = studentName ? studentName.trim().split(" ")[0] : "يا بطل";
  const progress = Math.min(100, Math.max(0, Math.round(progressPercentage)));

  if (progress >= 70) {
    return {
      status: "excellent",
      message: `الله ينور يا ${firstName}! 🔥 انت عامل شغل عالي جداً وماشي بانتظام على المنصة، نسبة إنجازك وصلت ${progress}%! عاش يا بطل، كمل بنفس الحماس وربنا يوفقك 💪✨`,
    };
  } else if (progress >= 40) {
    return {
      status: "good",
      message: `عاش يا ${firstName}، انت انجزت ${progress}% لحد دلوقتي 👍 بس تقدر تعمل أفضل من كده بكثير! شد حيلك شويه وركز الأيام دي عشان تخلص باقي الدروس 🚀`,
    };
  } else {
    return {
      status: "needs_push",
      message: `أهلاً يا ${firstName} 👋، لاحظنا إن نسبة إنجازك ${progress}% بس، وده أقل من طاقتك بكثير! افتكر إن الطريق بيتحسب بالخطوات، قوم يلا ابدأ درس واحد النهاردة واستعين بالله 💪🌟`,
    };
  }
}

export function normalizeStringList(value: unknown): string[] {
  const values: unknown[] = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item: unknown) => String(item ?? "").trim())
        .filter((item: string) => item.length > 0),
    ),
  );
}

export const MANUAL_EMPTY_ENROLLMENT = "__manual_empty__";

export async function getAutomaticCourseAssignments(student: typeof studentsTable.$inferSelect) {
  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.isPublished, true));
  const matching = courses.filter((course) =>
    canStudentAccessContent(student, course.category, null, course.stages, course.id)
  );
  return {
    enrolledCourseIds: matching.map((course) => course.id),
    enrolledCategories: Array.from(new Set(matching.map((course) => course.title))),
  };
}

export async function ensureAutomaticCourseAssignments(student: typeof studentsTable.$inferSelect) {
  if ((student.enrolledCourseIds ?? []).length || (student.enrolledCategories ?? []).length) return student;
  const automaticAssignments = await getAutomaticCourseAssignments(student);
  if (!automaticAssignments.enrolledCourseIds.length) return student;
  const [updated] = await db
    .update(studentsTable)
    .set({ ...automaticAssignments, updatedAt: new Date() })
    .where(eq(studentsTable.id, student.id))
    .returning();
  return updated;
}

export async function generateAccessCode(): Promise<string> {
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

export async function confirmPendingBookingsForPhone(phone: string): Promise<void> {
  const normalized = String(phone ?? "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
  const cleanPhone = normalized.replace(/[^\d]/g, "");
  if (!cleanPhone || cleanPhone.length < 8) return;
  await db
    .update(bookingsTable)
    .set({ status: "confirmed" })
    .where(
      and(
        eq(bookingsTable.status, "pending"),
        sql`REGEXP_REPLACE(TRANSLATE(${bookingsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), '[^0-9]', '', 'g') LIKE ${`%${cleanPhone.slice(-8)}%`}`,
      ),
    );
}

export function publicStudent(student: typeof studentsTable.$inferSelect) {
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
    schoolName: student.schoolName,
    parentPhone: student.parentPhone,
    languageTrack: student.languageTrack,
    centerName: student.centerName,
    appointmentSlot: student.appointmentSlot,
    centerConfirmed: Boolean(student.centerConfirmed),
    centerConfirmedAt: student.centerConfirmedAt,
    learningMode: student.learningMode,
    enrolledCategories: student.enrolledCategories,
    enrolledCourseIds: student.enrolledCourseIds,
    paymentStatus: student.paymentStatus,
    accessCode: student.accessCode,
    createdAt: student.createdAt,
  };
}

/**
 * Automatically checks all active paid students to see if their 30-day monthly subscription has expired.
 * 1. If > 30 days elapsed: reverts paymentStatus to "unpaid" (free tier) and notifies student.
 * 2. If <= 3 days remaining: sends a renewal reminder notification to student.
 */
export async function processSubscriptionExpirations(): Promise<{ expiredCount: number; remindedCount: number }> {
  try {
    const now = new Date();

    // Auto-generate missing access codes for legacy/imported students lacking one
    try {
      const studentsWithoutCode = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(isNull(studentsTable.accessCode));
      for (const s of studentsWithoutCode) {
        try {
          const code = await generateAccessCode();
          await db.update(studentsTable).set({ accessCode: code }).where(eq(studentsTable.id, s.id));
        } catch {
          // ignore duplicate race
        }
      }
    } catch {
      // ignore
    }

    // Fetch all students with paymentStatus === "paid"
    const paidStudents = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.paymentStatus, "paid"));

    let expiredCount = 0;
    let remindedCount = 0;

    for (const student of paidStudents) {
      let startDate = student.subscriptionStartDate || student.approvedAt;
      if (!startDate) {
        // If student is marked paid but lacks subscriptionStartDate, set it now so they get 30 days starting from activation instead of reverting to old createdAt
        startDate = now;
        await db
          .update(studentsTable)
          .set({ subscriptionStartDate: now, approvedAt: student.approvedAt || now, subscriptionStatus: "active" })
          .where(eq(studentsTable.id, student.id));
      }
      const startMs = new Date(startDate).getTime();
      const elapsedDays = (now.getTime() - startMs) / (1000 * 60 * 60 * 24);

      if (elapsedDays >= 30) {
        // Expired! Revert student to unpaid (free preview mode)
        await db
          .update(studentsTable)
          .set({
            paymentStatus: "unpaid",
            subscriptionStatus: "expired",
            updatedAt: now,
          })
          .where(eq(studentsTable.id, student.id));

        await db.insert(studentNotificationsTable).values({
          studentId: student.id,
          type: "warning",
          title: "انتهت فترة الاشتراك الشهري",
          message: "انتهت فترة الاشتراك الشهري الخاصة بك (30 يوماً). تم تحويل حسابك تلقائياً للباقة المجانية (معاينة أول فيديوهين بدون مذكرات). يرجى دفع الاشتراك ورفع الإيصال لفتح المحتوى بالكامل من جديد.",
        });
        expiredCount++;
      } else if (elapsedDays >= 27) {
        // Expiring within 3 days — check if we already reminded student today
        const [existingReminder] = await db
          .select()
          .from(studentNotificationsTable)
          .where(
            and(
              eq(studentNotificationsTable.studentId, student.id),
              eq(studentNotificationsTable.type, "warning"),
              sql`${studentNotificationsTable.createdAt} >= CURRENT_DATE`
            )
          )
          .limit(1);

        if (!existingReminder) {
          const daysLeft = Math.max(1, Math.ceil(30 - elapsedDays));
          await db.insert(studentNotificationsTable).values({
            studentId: student.id,
            type: "warning",
            title: "تذكير: قرب موعد تجديد الاشتراك الشهري",
            message: `متبقي ${daysLeft} ${daysLeft === 1 ? "يوم واحد" : "أيام"} على انتهاء اشتراكك الشهري. يرجى تجديد الدفع ورفع الإيصال لتجنب توقف المنصة والرجوع للباقة المجانية.`,
          });
          remindedCount++;
        }
      }
    }

    return { expiredCount, remindedCount };
  } catch (err) {
    console.error("[SUBSCRIPTION_CHECK_ERROR]", err);
    return { expiredCount: 0, remindedCount: 0 };
  }
}

// Automatically check subscription expirations every 30 minutes
setInterval(() => {
  void processSubscriptionExpirations();
}, 30 * 60 * 1000);






