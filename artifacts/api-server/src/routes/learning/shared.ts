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
}).any();

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
export const PLATFORM_CANONICAL_STAGES = [
  "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
  "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
  "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
  "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)",
  "المرحلة الجامعية · كلية حاسبات ومعلومات",
] as const;

export interface CanonicalCurriculumUnit {
  unit: string;
  lessons: string[];
}

export interface CanonicalCurriculumStage {
  stage: string;
  units: CanonicalCurriculumUnit[];
}

export const CANONICAL_CURRICULUM_DATA: CanonicalCurriculumStage[] = [
  {
    stage: "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
    units: [
      {
        unit: "الوحدة الأولى: الذكاء الاصطناعي والمجتمع",
        lessons: [
          "الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي",
          "الدرس الثاني: كيف يعمل الذكاء الاصطناعي",
          "الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية",
          "الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي",
          "شامل مراجعة الوحدة الأولى",
        ],
      },
      {
        unit: "الوحدة الثانية: الأمن السيبراني والتشفير",
        lessons: [
          "الدرس الأول: التشفير والمصادقة",
          "الدرس الثاني: تقنيات تشفير الشبكات وحماية البيانات",
          "الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر",
          "شامل مراجعة الوحدة الثانية",
        ],
      },
    ],
  },
  {
    stage: "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
    units: [
      {
        unit: "الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)",
        lessons: [
          "Lesson 1-1 – Development of Information Technology and Social Transformation",
          "Lesson 1-2 – How AI Works",
          "Lesson 1-3 – AI in Our Daily Life",
          "Lesson 1-4 – AI Ethics",
          "Unit 1 Comprehensive Review",
        ],
      },
      {
        unit: "الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)",
        lessons: [
          "Lesson 2-1 – Cryptographic and Authentications",
          "Lesson 2-2 – Network Security Design & Encryption Technologies",
          "Lesson 2-3 – Security Incident Response & Risk Management",
          "Unit 2 Comprehensive Review",
        ],
      },
    ],
  },
  {
    stage: "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
    units: [
      {
        unit: "الوحدة الأولى: أساسيات البرمجة بلغة C++",
        lessons: [
          "الدرس الأول: مقدمة في لغة C++ وبيئة العمل",
          "الدرس الثاني: المتغيرات وأنواع البيانات",
          "الدرس الثالث: العمليات الرياضية والمنطقية",
          "الدرس الرابع: جمل التحكم والشروط (if & switch)",
          "الدرس الخامس: حلقات التكرار (for & while)",
          "الدرس السادس: المصفوفات (Arrays in C++)",
          "شامل مراجعة الوحدة الأولى",
        ],
      },
    ],
  },
  {
    stage: "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)",
    units: [
      {
        unit: "Unit 1 – Programming Fundamentals in C++",
        lessons: [
          "Lesson 1-1 – Introduction to C++ and Development Environment",
          "Lesson 1-2 – Variables and Data Types",
          "Lesson 1-3 – Operators and Expressions",
          "Lesson 1-4 – Control Statements (if & switch)",
          "Lesson 1-5 – Loops (for & while)",
          "Lesson 1-6 – Arrays in C++",
          "Unit 1 Comprehensive Review",
        ],
      },
    ],
  },
  {
    stage: "المرحلة الجامعية · كلية حاسبات ومعلومات",
    units: [
      {
        unit: "مادة البرمجة الكائنية Object Oriented Programming (OOP)",
        lessons: [
          "الدرس الأول: مقدمة في الـ OOP وفلسفة الكائنات",
          "الدرس الثاني: الـ Classes والـ Objects والـ Constructors",
          "الدرس الثالث: الـ Encapsulation ومستويات الوصول",
          "الدرس الرابع: الـ Inheritance والوراثة",
          "الدرس الخامس: الـ Polymorphism وتعدد الأشكال",
        ],
      },
      {
        unit: "مادة التصميم المنطقي Logic Design",
        lessons: [
          "الدرس الأول: أنظمة الأعداد والتحويلات Number Systems",
          "الدرس الثاني: بوابات المنطق الأساسية Logic Gates",
          "الدرس الثالث: التبسيط وخرائط كارنوف Karnaugh Maps",
          "الدرس الرابع: الدوائر التوافقية Combinational Circuits",
        ],
      },
      {
        unit: "مادة لغة البرمجة C++ Programming",
        lessons: [
          "الدرس الأول: الأساسيات وهيكلية البرنامج",
          "الدرس الثاني: الدوال والوظائف Functions",
          "الدرس الثالث: المؤشرات Pointers والذاكرة",
          "الدرس الرابع: المصفوفات والـ Strings",
        ],
      },
    ],
  },
];

export function normalizeCanonicalStage(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if ((PLATFORM_CANONICAL_STAGES as readonly string[]).includes(s)) return s;

  // 1. University check MUST BE FIRST (to avoid "الفرقة الثانية" triggering 2nd secondary)
  if (
    s.includes("جامع") ||
    s.includes("حاسبات") ||
    s.includes("هندس") ||
    s.includes("الفرقة") ||
    s.includes("كلية") ||
    s.toLowerCase().includes("computer") ||
    s.toLowerCase().includes("university") ||
    s.toLowerCase().includes("faculty") ||
    s.toLowerCase().includes("college")
  ) {
    return "المرحلة الجامعية · كلية حاسبات ومعلومات";
  }

  // 2. 2nd Secondary
  if (s.includes("تانية") || s.includes("ثاني") || s.includes("ثانى") || s.toLowerCase().includes("second")) {
    return s.includes("لغات") || s.toLowerCase().includes("languages") || s.toLowerCase().includes("english")
      ? "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)"
      : "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي";
  }

  // 3. 1st Secondary
  if (s.includes("أولى") || s.includes("اولى") || s.includes("أول") || s.includes("اول") || s.toLowerCase().includes("first")) {
    return s.includes("لغات") || s.toLowerCase().includes("languages") || s.toLowerCase().includes("english")
      ? "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)"
      : "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي";
  }

  return null;
}

export function normalizeCanonicalUnit(stageName?: string | null, unitName?: string | null): string {
  const stage = normalizeCanonicalStage(stageName);
  const u = (unitName || "").trim();
  const lower = u.toLowerCase();

  // 1. تانية بكالوريا عربي
  if (!stage || stage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي") {
    if (
      u.includes("الثانية") ||
      u.includes("التانية") ||
      u.includes("السيبراني") ||
      u.includes("التشفير") ||
      u.includes("الشبكات") ||
      lower.includes("unit 2") ||
      lower.includes("unit2")
    ) {
      return "الوحدة الثانية: الأمن السيبراني والتشفير";
    }
    if (
      u.includes("الأولى") ||
      u.includes("الاولى") ||
      u.includes("الذكاء") ||
      u.includes("المعلومات") ||
      lower.includes("unit 1") ||
      lower.includes("unit1")
    ) {
      return "الوحدة الأولى: الذكاء الاصطناعي والمجتمع";
    }
    return "الوحدة الأولى: الذكاء الاصطناعي والمجتمع";
  }

  // 2. تانية بكالوريا لغات
  if (stage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)") {
    if (
      lower.includes("unit 2") ||
      lower.includes("unit2") ||
      lower.includes("cyber") ||
      lower.includes("encryption") ||
      lower.includes("network") ||
      u.includes("الثانية") ||
      u.includes("التانية")
    ) {
      return "الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)";
    }
    if (
      lower.includes("unit 1") ||
      lower.includes("unit1") ||
      lower.includes("ai") ||
      lower.includes("intelligence") ||
      lower.includes("information technology") ||
      u.includes("الأولى") ||
      u.includes("الاولى")
    ) {
      return "الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)";
    }
    return "الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)";
  }

  // 3. أولى بكالوريا
  if (stage.includes("الأول") || stage.includes("أولى")) {
    if (stage.includes("لغات")) {
      return "Unit 1 – Programming Fundamentals in C++";
    }
    return "الوحدة الأولى: أساسيات البرمجة بلغة C++";
  }

  // 4. المرحلة الجامعية
  if (stage.includes("جامع") || stage.includes("حاسبات")) {
    if (lower.includes("logic") || u.includes("منطقي")) return "مادة التصميم المنطقي Logic Design";
    if (lower.includes("oop") || u.includes("كائنية") || u.includes("كائنات")) return "مادة البرمجة الكائنية Object Oriented Programming (OOP)";
    return "مادة لغة البرمجة C++ Programming";
  }

  return u || "الوحدة الأولى";
}

export function normalizeCanonicalLesson(
  stageName?: string | null,
  unitName?: string | null,
  rawLesson?: string | null,
  options: { allowCustom?: boolean } = {}
): string | null {
  if (!rawLesson) return null;
  const raw = String(rawLesson).trim();
  if (!raw) return null;

  const canonicalStage = normalizeCanonicalStage(stageName);
  const canonicalUnit = normalizeCanonicalUnit(canonicalStage, unitName);
  const lower = raw.toLowerCase();

  const stageDef = CANONICAL_CURRICULUM_DATA.find((s) => s.stage === canonicalStage);
  const unitDef = stageDef?.units.find((u) => u.unit === canonicalUnit);

  if (unitDef) {
    // 1. Direct match
    const exact = unitDef.lessons.find((l) => l.trim().toLowerCase() === lower);
    if (exact) return exact;

    // 2. Stage 1: تانية بكالوريا عربي - الوحدة الأولى: الذكاء الاصطناعي والمجتمع
    if (canonicalStage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي" && canonicalUnit.includes("الأولى")) {
      if (raw.includes("الرابع") || lower.includes("4") || raw.includes("أخلاق") || raw.includes("اخلاق")) {
        return "الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي";
      }
      if (raw.includes("الثالث") || lower.includes("3") || raw.includes("حياتنا")) {
        return "الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية";
      }
      if (raw.includes("الثاني") || raw.includes("الثانى") || lower.includes("2") || raw.includes("يعمل")) {
        return "الدرس الثاني: كيف يعمل الذكاء الاصطناعي";
      }
      if (raw.includes("الأول") || raw.includes("الاول") || lower.includes("1") || raw.includes("تطور")) {
        return "الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي";
      }
      if (raw.includes("شامل") || raw.includes("مراجعة") || raw.includes("تقييم")) {
        return "شامل مراجعة الوحدة الأولى";
      }
    }

    // 3. Stage 1: تانية بكالوريا عربي - الوحدة الثانية: الأمن السيبراني والتشفير
    if (canonicalStage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي" && canonicalUnit.includes("الثانية")) {
      if (raw.includes("الثالث") || lower.includes("3") || raw.includes("حوادث") || raw.includes("مخاطر")) {
        return "الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر";
      }
      if (raw.includes("الثاني") || raw.includes("الثانى") || lower.includes("2") || raw.includes("حماية") || raw.includes("شبكات")) {
        return "الدرس الثاني: تقنيات تشفير الشبكات وحماية البيانات";
      }
      if (raw.includes("الأول") || raw.includes("الاول") || lower.includes("1") || raw.includes("تشفير") || raw.includes("مصادقة")) {
        return "الدرس الأول: التشفير والمصادقة";
      }
      if (raw.includes("شامل") || raw.includes("مراجعة")) {
        return "شامل مراجعة الوحدة الثانية";
      }
    }

    // 4. Stage 2: تانية بكالوريا لغات - Unit 1: AI
    if (canonicalStage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)" && canonicalUnit.includes("Artificial Intelligence")) {
      if (lower.includes("1-4") || lower.includes("ethics") || lower.includes("fourth")) {
        return "Lesson 1-4 – AI Ethics";
      }
      if (lower.includes("1-3") || lower.includes("daily") || lower.includes("third")) {
        return "Lesson 1-3 – AI in Our Daily Life";
      }
      if (lower.includes("1-2") || lower.includes("how ai works") || lower.includes("second")) {
        return "Lesson 1-2 – How AI Works";
      }
      if (lower.includes("1-1") || lower.includes("information technology") || lower.includes("social") || lower.includes("first")) {
        return "Lesson 1-1 – Development of Information Technology and Social Transformation";
      }
      if (lower.includes("comprehensive") || lower.includes("review") || raw.includes("شامل")) {
        return "Unit 1 Comprehensive Review";
      }
    }

    // 5. Stage 2: تانية بكالوريا لغات - Unit 2: Cybersecurity
    if (canonicalStage === "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)" && canonicalUnit.includes("Cybersecurity")) {
      if (lower.includes("2-3") || lower.includes("incident") || lower.includes("risk") || lower.includes("third")) {
        return "Lesson 2-3 – Security Incident Response & Risk Management";
      }
      if (lower.includes("2-2") || lower.includes("network") || lower.includes("encryption") || lower.includes("second")) {
        return "Lesson 2-2 – Network Security Design & Encryption Technologies";
      }
      if (lower.includes("2-1") || lower.includes("cryptographic") || lower.includes("auth") || lower.includes("first")) {
        return "Lesson 2-1 – Cryptographic and Authentications";
      }
      if (lower.includes("comprehensive") || lower.includes("review") || raw.includes("شامل")) {
        return "Unit 2 Comprehensive Review";
      }
    }

    // 6. Stage 3: أولى بكالوريا عربي - C++
    if (canonicalStage === "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي") {
      if (raw.includes("السادس") || lower.includes("6") || lower.includes("arrays") || raw.includes("مصفوف")) {
        return "الدرس السادس: المصفوفات (Arrays in C++)";
      }
      if (raw.includes("الخامس") || lower.includes("5") || lower.includes("loops") || raw.includes("تكرار")) {
        return "الدرس الخامس: حلقات التكرار (for & while)";
      }
      if (raw.includes("الرابع") || lower.includes("4") || lower.includes("switch") || raw.includes("تحكم") || raw.includes("شروط")) {
        return "الدرس الرابع: جمل التحكم والشروط (if & switch)";
      }
      if (raw.includes("الثالث") || lower.includes("3") || raw.includes("عمليات") || raw.includes("منطق")) {
        return "الدرس الثالث: العمليات الرياضية والمنطقية";
      }
      if (raw.includes("الثاني") || raw.includes("الثانى") || lower.includes("2") || raw.includes("متغيرات") || raw.includes("بيانات")) {
        return "الدرس الثاني: المتغيرات وأنواع البيانات";
      }
      if (raw.includes("الأول") || raw.includes("الاول") || lower.includes("1") || raw.includes("مقدمة")) {
        return "الدرس الأول: مقدمة في لغة C++ وبيئة العمل";
      }
      if (raw.includes("شامل") || raw.includes("مراجعة")) {
        return "شامل مراجعة الوحدة الأولى";
      }
    }

    // 7. Stage 4: أولى بكالوريا لغات - C++
    if (canonicalStage === "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)") {
      if (lower.includes("1-6") || lower.includes("arrays")) return "Lesson 1-6 – Arrays in C++";
      if (lower.includes("1-5") || lower.includes("loops")) return "Lesson 1-5 – Loops (for & while)";
      if (lower.includes("1-4") || lower.includes("control") || lower.includes("switch")) return "Lesson 1-4 – Control Statements (if & switch)";
      if (lower.includes("1-3") || lower.includes("operator")) return "Lesson 1-3 – Operators and Expressions";
      if (lower.includes("1-2") || lower.includes("variable")) return "Lesson 1-2 – Variables and Data Types";
      if (lower.includes("1-1") || lower.includes("introduction")) return "Lesson 1-1 – Introduction to C++ and Development Environment";
      if (lower.includes("comprehensive") || lower.includes("review")) return "Unit 1 Comprehensive Review";
    }

    // 8. Stage 5: المرحلة الجامعية
    if (canonicalStage === "المرحلة الجامعية · كلية حاسبات ومعلومات") {
      if (canonicalUnit.includes("Logic Design") || lower.includes("logic")) {
        if (lower.includes("gate") || raw.includes("بوابات") || lower.includes("2") || raw.includes("الثاني")) return "الدرس الثاني: بوابات المنطق الأساسية Logic Gates";
        if (lower.includes("karnaugh") || lower.includes("k-map") || raw.includes("كارنوف") || lower.includes("3") || raw.includes("الثالث")) return "الدرس الثالث: التبسيط وخرائط كارنوف Karnaugh Maps";
        if (lower.includes("combinational") || raw.includes("توافقية") || lower.includes("4") || raw.includes("الرابع")) return "الدرس الرابع: الدوائر التوافقية Combinational Circuits";
        if (lower.includes("number system") || raw.includes("أعداد") || raw.includes("اعداد") || lower.includes("1") || raw.includes("الأول")) return "الدرس الأول: أنظمة الأعداد والتحويلات Number Systems";
      }
      if (canonicalUnit.includes("OOP") || lower.includes("oop")) {
        if (lower.includes("poly") || raw.includes("تعدد") || lower.includes("5") || raw.includes("الخامس")) return "الدرس الخامس: الـ Polymorphism وتعدد الأشكال";
        if (lower.includes("inher") || raw.includes("وراثة") || lower.includes("4") || raw.includes("الرابع")) return "الدرس الرابع: الـ Inheritance والوراثة";
        if (lower.includes("encap") || raw.includes("كبسلة") || lower.includes("3") || raw.includes("الثالث")) return "الدرس الثالث: الـ Encapsulation ومستويات الوصول";
        if (lower.includes("class") || lower.includes("object") || lower.includes("construct") || lower.includes("2") || raw.includes("الثاني")) return "الدرس الثاني: الـ Classes والـ Objects والـ Constructors";
        if (lower.includes("1") || raw.includes("الأول") || raw.includes("مقدمة")) return "الدرس الأول: مقدمة في الـ OOP وفلسفة الكائنات";
      }
      if (canonicalUnit.includes("C++ Programming") || lower.includes("c++")) {
        if (lower.includes("array") || lower.includes("string") || raw.includes("مصفوف") || lower.includes("4") || raw.includes("الرابع")) return "الدرس الرابع: المصفوفات والـ Strings";
        if (lower.includes("pointer") || raw.includes("مؤشر") || lower.includes("3") || raw.includes("الثالث")) return "الدرس الثالث: المؤشرات Pointers والذاكرة";
        if (lower.includes("function") || raw.includes("دوال") || lower.includes("2") || raw.includes("الثاني")) return "الدرس الثاني: الدوال والوظائف Functions";
        if (lower.includes("1") || raw.includes("الأول") || raw.includes("أساس")) return "الدرس الأول: الأساسيات وهيكلية البرنامج";
      }
    }
  }

  if (options.allowCustom && raw.length > 0) {
    return raw;
  }

  return null;
}

export function getUnitAliases(stageName?: string | null, canonicalUnit?: string | null): string[] {
  if (!canonicalUnit) return [];
  const u = canonicalUnit.trim();
  const set = new Set<string>([u]);

  if (u === "الوحدة الأولى: الذكاء الاصطناعي والمجتمع") {
    set.add("الوحدة الأولى: تكنولوجيا المعلومات والمجتمع");
    set.add("الوحدة الأولى: الذكاء الاصطناعي والمجتمع");
    set.add("الوحدة الأولى");
    set.add("الوحدة الاولى");
    set.add("الوحدة الاولى: تكنولوجيا المعلومات والتحول الاجتماعى");
  } else if (u === "الوحدة الثانية: الأمن السيبراني والتشفير") {
    set.add("الوحدة الثانية: الأمن السيبراني والشبكات");
    set.add("الوحدة الثانية: الأمن السيبراني والتشفير");
    set.add("الوحدة الثانية");
    set.add("الوحدة التانية");
  } else if (u.includes("Unit 1: Artificial Intelligence") || u.includes("الذكاء الاصطناعي")) {
    set.add("Unit 1 – Information Technology and Society");
    set.add("Unit 1: Information Technology and Society");
    set.add("Unit 1");
    set.add("الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)");
  } else if (u.includes("Unit 2: Cybersecurity") || u.includes("الأمن السيبراني والتشفير")) {
    set.add("Unit 2 – Cybersecurity and Networks");
    set.add("Unit 2: Cybersecurity and Networks");
    set.add("Unit 2");
    set.add("الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)");
  }

  return Array.from(set);
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
    nameChanged: Boolean(student.nameChanged),
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






