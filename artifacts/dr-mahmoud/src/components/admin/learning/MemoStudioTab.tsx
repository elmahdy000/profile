import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Printer,
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Layers,
  Type,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  FileSpreadsheet,
  GraduationCap,
  Shuffle,
  ClipboardList,
  CheckSquare,
  Square,
  Sliders,
  Palette,
  FileQuestion,
  HelpCircle,
  Award,
  Edit3,
  Plus,
  X,
  Check,
  Settings as SettingsIcon,
  User,
  CheckCircle,
  ListOrdered,
  MoveUp,
  MoveDown,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id?: string;
  type?: string;
  prompt?: string;
  statement?: string;
  question?: string;
  questionText?: string;
  options?: any[];
  choices?: any[];
  correctIndex?: number;
  answer?: string;
  correctAnswer?: string;
  explanation?: string;
  translation?: string;
  _source?: number;
}

interface NormalizedQuestion {
  id?: string | number;
  type: "MCQ" | "TRUE_FALSE" | "ESSAY" | "DEFINITION" | "TEXT";
  statement: string;
  prompt?: string;
  options: { text: string; isCorrect: boolean; id?: string | number }[];
  answer: string;
  correctAnswer?: string;
  modelAnswer?: string;
  explanation: string;
  translation: string;
  enabled: boolean;
  _source?: number;
}

interface MemoSettings {
  templateStyle: "royal" | "exam" | "tech" | "emerald" | "minimal" | "custom";
  fitMode: "fill" | "contain" | "cover";
  topMm: number; // For page 1
  continuationTopMm: number; // For page 2+
  bottomMm: number;
  rightMm: number;
  leftMm: number;
  headerEnabled: boolean; // First page header
  continuationHeader: "minimal" | "none" | "full"; // Continuation pages header
  headerText: string;
  subHeaderText: string;
  guideView: boolean;
  showAnswers: boolean;
  showExplain: boolean;
  showTranslations: boolean;
  optionLayout: "auto" | "four" | "two" | "one";
  cardStyle: "none" | "lines" | "cards" | "dashed";
  layoutColumns?: 1 | 2;
  density: "compact" | "balanced" | "comfortable";
  showQuestionType: boolean;
  fontSelect: string;
  fontSize: number;
  lineHeight: number;
  contentDir: "rtl" | "ltr";
  questionStart: number;
  pageStart: number;
  maxQuestions: number;
  footerText: string;
  showTotalPages: boolean;
  numPosition: "left" | "right" | "center";
  studentFields: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  numberingStyle?: "continuous" | "per_type";
  essayLines?: number;
  showAnswerSummary?: boolean;
  _v2Margins?: boolean;
  _v3Editorial?: boolean;
}

const FONT_OPTIONS = [
  {
    value: "'Cairo', 'Tahoma', sans-serif",
    label: "كايرو — Cairo (افتراضي واضح)",
    wordFamily: "Cairo, Tahoma, Arial, sans-serif",
  },
  {
    value: "'Tahoma', 'Segoe UI', 'Arial', sans-serif",
    label: "تاهوما — Tahoma (ممتاز للطباعة وWord)",
    wordFamily: "Tahoma, Segoe UI, Arial, sans-serif",
  },
  {
    value: "'Segoe UI', 'Cairo', 'Arial', sans-serif",
    label: "عصري متوازن — Segoe UI (عربي ولغات)",
    wordFamily: "Segoe UI, Tahoma, Arial, sans-serif",
  },
  {
    value: "'Times New Roman', 'Simplified Arabic', serif",
    label: "كلاسيكي رسمي — Times / Arabic",
    wordFamily: "Times New Roman, Simplified Arabic, serif",
  },
] as const;

const DEFAULT_SETTINGS: MemoSettings = {
  templateStyle: "minimal",
  fitMode: "fill",
  topMm: 12,
  continuationTopMm: 10,
  bottomMm: 12,
  rightMm: 13,
  leftMm: 13,
  headerEnabled: true,
  continuationHeader: "minimal",
  headerText: "مذكرة التدريبات الشاملة وبنك الأسئلة",
  subHeaderText: "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
  guideView: false,
  showAnswers: false,
  showExplain: false,
  showTranslations: true,
  optionLayout: "auto",
  cardStyle: "none",
  layoutColumns: 1,
  density: "balanced",
  showQuestionType: false,
  fontSelect: "'Cairo', 'Tahoma', sans-serif",
  fontSize: 10.5,
  lineHeight: 1.52,
  contentDir: "rtl",
  questionStart: 1,
  pageStart: 1,
  maxQuestions: 0,
  footerText: "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
  showTotalPages: true,
  numPosition: "left",
  studentFields: true,
  showWatermark: false,
  watermarkText: "د. محمود المهدي — الحاسب الآلي والذكاء الاصطناعي",
  watermarkOpacity: 0.05,
  numberingStyle: "continuous",
  essayLines: 3,
  showAnswerSummary: false,
  _v2Margins: true,
  _v3Editorial: true,
};

const escapeMemoHtml = (val: string) =>
  String(val || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveWordFontFamily = (fontSelect: string): string => {
  const found = FONT_OPTIONS.find((f) => f.value === fontSelect);
  return found ? found.wordFamily : "Tahoma, Arial, sans-serif";
};

// Global sanitizer to purge any "أكاديمية", "[ للمعلم]", or legacy titles from strings
export const sanitizeMemoText = (txt: string) => {
  return (txt || "")
    .replace(/(\s*\[\s*(نموذج الإجابة للمعلم|نموذج الإجابة|نسخة المعلم|نسخة الطالب|للمعلم|للطالب|معلم|طالب|Model Answer|Teacher Copy|Student Copy)\s*\])+/gi, "")
    .replace(/(\s*\(\s*(نموذج الإجابة للمعلم|نموذج الإجابة|نسخة المعلم|نسخة الطالب|للمعلم|للطالب|معلم|طالب|Model Answer|Teacher Copy|Student Copy)\s*\))+/gi, "")
    .replace(/(\s*(نموذج الإجابة للمعلم|نسخة المعلم|نسخة الطالب|\[\s*للمعلم\s*\]|\(\s*للمعلم\s*\)|للمعلم|للطالب))+/gi, "")
    .replace(/أكاديمية\s*/g, "")
    .replace(/خبير وموجه[^•|]+/g, "")
    .trim();
};

interface ThemeConfig {
  accentColor: string;
  secondaryAccent: string;
  softTint: string;
  cardBorderColor: string;
  cardBorderRight: string;
  numBadgeBg: string;
  numBadgeColor: string;
  numBadgeBorder: string;
  headerBorder: string;
  headerTopAccent: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  sealBg: string;
  sealBorder: string;
  sealShadow: string;
  crestBg: string;
  crestBorder: string;
  crestColor: string;
  drTextColor: string;
  drSubTextColor: string;
  drPillBg: string;
  drPillColor: string;
  drPillBorder: string;
  pageNumberBg: string;
  pageNumberColor: string;
  pageNumberBorder: string;
}

const getThemeConfig = (style: MemoSettings["templateStyle"]): ThemeConfig => {
  switch (style) {
    case "exam":
      return {
        accentColor: "#0f172a",
        secondaryAccent: "#475569",
        softTint: "#f8fafc",
        cardBorderColor: "#cbd5e1",
        cardBorderRight: "2px solid #0f172a",
        numBadgeBg: "#ffffff",
        numBadgeColor: "#0f172a",
        numBadgeBorder: "1.2px solid #0f172a",
        headerBorder: "1.5px solid #0f172a",
        headerTopAccent: "#0f172a",
        badgeBg: "#f8fafc",
        badgeColor: "#0f172a",
        badgeBorder: "1px solid #0f172a",
        sealBg: "#ffffff",
        sealBorder: "1px solid #334155",
        sealShadow: "none",
        crestBg: "#f8fafc",
        crestBorder: "1px solid #0f172a",
        crestColor: "#0f172a",
        drTextColor: "#0f172a",
        drSubTextColor: "#475569",
        drPillBg: "#f8fafc",
        drPillColor: "#0f172a",
        drPillBorder: "1px solid #cbd5e1",
        pageNumberBg: "#f8fafc",
        pageNumberColor: "#0f172a",
        pageNumberBorder: "1px solid #cbd5e1",
      };
    case "tech":
      return {
        accentColor: "#0369a1",
        secondaryAccent: "#0284c7",
        softTint: "#f0f9ff",
        cardBorderColor: "#dbeafe",
        cardBorderRight: "2px solid #0284c7",
        numBadgeBg: "#f0f9ff",
        numBadgeColor: "#0369a1",
        numBadgeBorder: "1px solid #bae6fd",
        headerBorder: "1.5px solid #0284c7",
        headerTopAccent: "#0284c7",
        badgeBg: "#f0f9ff",
        badgeColor: "#0369a1",
        badgeBorder: "1px solid #bae6fd",
        sealBg: "#ffffff",
        sealBorder: "1px solid #bae6fd",
        sealShadow: "none",
        crestBg: "#f0f9ff",
        crestBorder: "1px solid #7dd3fc",
        crestColor: "#0369a1",
        drTextColor: "#0f172a",
        drSubTextColor: "#0369a1",
        drPillBg: "#f0f9ff",
        drPillColor: "#0369a1",
        drPillBorder: "1px solid #bae6fd",
        pageNumberBg: "#f0f9ff",
        pageNumberColor: "#0369a1",
        pageNumberBorder: "1px solid #bae6fd",
      };
    case "emerald":
      return {
        accentColor: "#047857",
        secondaryAccent: "#059669",
        softTint: "#ecfdf5",
        cardBorderColor: "#d1fae5",
        cardBorderRight: "2px solid #059669",
        numBadgeBg: "#ecfdf5",
        numBadgeColor: "#047857",
        numBadgeBorder: "1px solid #a7f3d0",
        headerBorder: "1.5px solid #059669",
        headerTopAccent: "#059669",
        badgeBg: "#ecfdf5",
        badgeColor: "#047857",
        badgeBorder: "1px solid #a7f3d0",
        sealBg: "#ffffff",
        sealBorder: "1px solid #a7f3d0",
        sealShadow: "none",
        crestBg: "#ecfdf5",
        crestBorder: "1px solid #6ee7b7",
        crestColor: "#047857",
        drTextColor: "#0f172a",
        drSubTextColor: "#047857",
        drPillBg: "#ecfdf5",
        drPillColor: "#047857",
        drPillBorder: "1px solid #a7f3d0",
        pageNumberBg: "#ecfdf5",
        pageNumberColor: "#047857",
        pageNumberBorder: "1px solid #a7f3d0",
      };
    case "royal":
      return {
        accentColor: "#92400e",
        secondaryAccent: "#b45309",
        softTint: "#fffbeb",
        cardBorderColor: "#fde68a",
        cardBorderRight: "2px solid #b45309",
        numBadgeBg: "#fffbeb",
        numBadgeColor: "#92400e",
        numBadgeBorder: "1px solid #fcd34d",
        headerBorder: "1.5px solid #b45309",
        headerTopAccent: "#b45309",
        badgeBg: "#fffbeb",
        badgeColor: "#92400e",
        badgeBorder: "1px solid #fcd34d",
        sealBg: "#ffffff",
        sealBorder: "1px solid #fde68a",
        sealShadow: "none",
        crestBg: "#fffbeb",
        crestBorder: "1px solid #fcd34d",
        crestColor: "#92400e",
        drTextColor: "#0f172a",
        drSubTextColor: "#92400e",
        drPillBg: "#fffbeb",
        drPillColor: "#92400e",
        drPillBorder: "1px solid #fde68a",
        pageNumberBg: "#fffbeb",
        pageNumberColor: "#92400e",
        pageNumberBorder: "1px solid #fcd34d",
      };
    case "minimal":
    default:
      return {
        accentColor: "#334155",
        secondaryAccent: "#64748b",
        softTint: "#f8fafc",
        cardBorderColor: "#e2e8f0",
        cardBorderRight: "2px solid #94a3b8",
        numBadgeBg: "#f8fafc",
        numBadgeColor: "#1e293b",
        numBadgeBorder: "1px solid #cbd5e1",
        headerBorder: "1.2px solid #cbd5e1",
        headerTopAccent: "#475569",
        badgeBg: "#f8fafc",
        badgeColor: "#334155",
        badgeBorder: "1px solid #cbd5e1",
        sealBg: "#ffffff",
        sealBorder: "1px solid #e2e8f0",
        sealShadow: "none",
        crestBg: "#f8fafc",
        crestBorder: "1px solid #cbd5e1",
        crestColor: "#334155",
        drTextColor: "#0f172a",
        drSubTextColor: "#64748b",
        drPillBg: "#f8fafc",
        drPillColor: "#334155",
        drPillBorder: "1px solid #e2e8f0",
        pageNumberBg: "#f8fafc",
        pageNumberColor: "#334155",
        pageNumberBorder: "1px solid #e2e8f0",
      };
  }
};

const ARABIC_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];
const ENGLISH_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    statement: "ما هو المفهوم الأساسي للذكاء الاصطناعي التوليدي (Generative AI)؟",
    options: [
      { text: "توليد محتوى جديد مثل النصوص والصور والأكواد البرمجية", isCorrect: true },
      { text: "البحث في قواعد البيانات التقليدية فقط", isCorrect: false },
      { text: "ضغط الملفات الرقمية وتسريع نقلها", isCorrect: false },
      { text: "حماية الأجهزة من الفيروسات والبرمجيات الخبيثة", isCorrect: false },
    ],
    answer: "توليد محتوى جديد مثل النصوص والصور والأكواد البرمجية",
    explanation: "الذكاء الاصطناعي التوليدي قادر على إنشاء محتوى أصلي وجديد بناءً على البيانات التي تم تدريبه عليها.",
    translation: "What is the primary concept of Generative AI?",
  },
  {
    statement: "تُعد الخوارزميات الجينية أحد نماذج التعلم الآلي المستوحاة من التطور البيولوجي الطبيعي.",
    options: [
      { text: "صواب", isCorrect: true },
      { text: "خطأ", isCorrect: false },
    ],
    answer: "صواب",
    explanation: "الخوارزميات الجينية تحاكي عملية الانتقاء الطبيعي والوراثة للوصول إلى الحلول المثلى.",
    translation: "Genetic algorithms are machine learning models inspired by biological evolution.",
  },
  {
    statement: "اذكر باختصار مع التوضيح ثلاثة استخدامات رئيسية للذكاء الاصطناعي في قطاع التعليم الحديث.",
    options: [],
    answer: "1. تخصيص مسارات التعلم لكل طالب وفق قدراته الفردية.\n2. التصحيح الآلي للواجبات والتقييم الفوري.\n3. توفير معلمين افتراضيين ومساعدين أذكياء متاحين على مدار الساعة.",
    explanation: "يسهم الذكاء الاصطناعي في تحسين كفاءة التعليم ومراعاة الفروق الفردية بين المتعلمين.",
    translation: "Briefly state and explain three major applications of AI in modern education.",
  },
];

function textValue(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    return textValue(val.statement || val.prompt || val.text || val.question || val.definition || val.value || "");
  }
  return String(val).trim();
}

function normalizeType(raw: string | undefined): "MCQ" | "TRUE_FALSE" | "ESSAY" | "DEFINITION" | "TEXT" {
  if (!raw) return "MCQ";
  const s = String(raw).toUpperCase().trim();
  if (s.includes("TF") || s.includes("TRUE") || s.includes("FALSE") || s.includes("صواب") || s.includes("خطأ") || s === "BOOLEAN") {
    return "TRUE_FALSE";
  }
  if (s.includes("ESSAY") || s.includes("مقال") || s.includes("OPEN") || s.includes("WRITTEN") || s.includes("SUBJECTIVE")) {
    return "ESSAY";
  }
  if (s.includes("DEF") || s.includes("تعريف") || s.includes("TERM") || s.includes("CONCEPT")) {
    return "DEFINITION";
  }
  if (s.includes("TEXT") || s.includes("NOTE") || s.includes("ملاحظة")) {
    return "TEXT";
  }
  return "MCQ";
}

function normalizeQuestion(raw: any, i: number = 0): NormalizedQuestion {
  const statement = textValue(
    raw.statement ?? raw.prompt ?? raw.question ?? raw.questionText ?? raw.text ?? raw.definition ?? "",
  );
  let opt = raw.options ?? raw.choices ?? raw.answers ?? [];
  if (!Array.isArray(opt)) {
    opt = Object.entries(opt).map(([k, v]) => ({ label: k, text: textValue(v) }));
  }

  const explicitType =
    raw.questionType ??
    raw.question?.questionType ??
    raw.type ??
    raw.question?.type ??
    raw.question_type ??
    raw.category;

  let type: "MCQ" | "TRUE_FALSE" | "ESSAY" | "DEFINITION" | "TEXT";

  if (explicitType) {
    type = normalizeType(explicitType);
  } else if (raw.definition) {
    type = "DEFINITION";
  } else if (raw.modelAnswer || raw.model_answer || raw.answerTranslation || raw.answer_translation) {
    type = "ESSAY";
  } else if (opt && opt.length > 0) {
    type = opt.length === 2 ? "TRUE_FALSE" : "MCQ";
  } else {
    type = "ESSAY";
  }

  if (type === "MCQ" && (!opt || opt.length === 0) && (raw.answer || raw.modelAnswer || raw.model_answer)) {
    type = "ESSAY";
  }

  const options = opt.map((o: any, idx: number) => ({
    text: textValue(o),
    isCorrect: Boolean(o?.isCorrect || (typeof raw.correctIndex === "number" && raw.correctIndex === idx)),
    id: o?.id ?? idx,
  }));

  let ans = textValue(raw.answer ?? raw.correctAnswer ?? raw.modelAnswer ?? raw.model_answer ?? "");
  if (!ans && typeof raw.correctIndex === "number" && options[raw.correctIndex]) {
    ans = options[raw.correctIndex].text;
  }

  let translation = textValue(
    raw.translation ?? raw.arabicTranslation ?? raw.translation_ar ?? raw.promptTranslation ?? "",
  );
  if (raw.answerTranslation && type === "ESSAY") {
    translation = translation
      ? `${translation}\n[ترجمة الإجابة]: ${raw.answerTranslation}`
      : `[ترجمة الإجابة]: ${raw.answerTranslation}`;
  }

  return {
    id: raw.id ?? `q-${Date.now()}-${i}`,
    type,
    statement,
    options,
    answer: String(ans),
    explanation: textValue(raw.explanation ?? raw.reason ?? raw.justification ?? ""),
    translation,
    enabled: raw.enabled !== false,
    _source: i,
  };
}

interface ParsedJsonSection {
  id: string;
  title: string;
  path: string;
  count: number;
  questions: any[];
}

function parseJsonSections(data: any): ParsedJsonSection[] {
  const sections: ParsedJsonSection[] = [];

  function walk(node: any, path: string = "", name: string = "") {
    if (!node) return;

    if (Array.isArray(node.essayQuestions) && node.essayQuestions.length > 0) {
      const parentTitle =
        node.lesson || node.lessonName || node.unit || node.unitName || node.title || name || "أسئلة مقالية";
      sections.push({
        id: `sec-${sections.length}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${parentTitle} (مقالي / Essay)`,
        path: path ? `${path} > ${parentTitle} (مقالي)` : `${parentTitle} (مقالي)`,
        count: node.essayQuestions.length,
        questions: node.essayQuestions.map((q: any) => ({ ...q, type: "ESSAY" })),
      });
    }

    if (Array.isArray(node.mcqQuestions) && node.mcqQuestions.length > 0) {
      const parentTitle =
        node.lesson || node.lessonName || node.unit || node.unitName || node.title || name || "اختيار من متعدد";
      sections.push({
        id: `sec-${sections.length}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${parentTitle} (MCQ)`,
        path: path ? `${path} > ${parentTitle} (MCQ)` : `${parentTitle} (MCQ)`,
        count: node.mcqQuestions.length,
        questions: node.mcqQuestions.map((q: any) => ({ ...q, type: "MCQ" })),
      });
    }

    const qList =
      node.questions ||
      node.items ||
      node.questionsList ||
      node.questions_list ||
      node.allQuestions;
    if (Array.isArray(qList) && qList.length > 0) {
      const title =
        node.title ||
        node.name ||
        node.unit ||
        node.unitName ||
        node.lesson ||
        node.lessonName ||
        name ||
        `قسم ${sections.length + 1}`;
      sections.push({
        id: `sec-${sections.length}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        path: path ? `${path} > ${title}` : title,
        count: qList.length,
        questions: qList,
      });
      return;
    }

    if (Array.isArray(node)) {
      if (!node.length) return;
      const isQuestionArray = node.some(
        (x) =>
          x &&
          (x.prompt ||
            x.statement ||
            x.question ||
            x.options ||
            x.modelAnswer),
      );
      if (isQuestionArray) {
        const title = name || `مجموعة أسئلة (${node.length})`;
        sections.push({
          id: `sec-${sections.length}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          path: path ? `${path} > ${title}` : title,
          count: node.length,
          questions: node,
        });
        return;
      }
      node.forEach((item, idx) => {
        walk(item, path ? `${path}[${idx}]` : `[${idx}]`, `${name || "عنصر"} ${idx + 1}`);
      });
      return;
    }

    if (typeof node === "object") {
      Object.keys(node).forEach((key) => {
        if (key === "essayQuestions" || key === "mcqQuestions") return;
        const val = node[key];
        const nextPath = path ? `${path} > ${key}` : key;
        walk(val, nextPath, key);
      });
    }
  }

  walk(data);
  return sections;
}

interface MemoStudioTabProps {
  quizzes?: any[];
  learningCourses?: any[];
  adminApi: <T>(endpoint: string, options?: any) => Promise<T>;
  onNavigateToQuizzes?: () => void;
}

export const MemoStudioTab: React.FC<MemoStudioTabProps> = ({
  quizzes = [],
  learningCourses = [],
  adminApi,
  onNavigateToQuizzes,
}) => {
  const { toast } = useToast();

  // 4 Main Configuration Steps
  const [activeStep, setActiveStep] = useState<"step1_source" | "step2_distribute" | "step3_design" | "step4_questions">("step1_source");
  const [contentSourceTab, setContentSourceTab] = useState<"curriculum" | "quizzes" | "external">("curriculum");

  // Step 1: Hierarchical Stage & Track Selectors
  const [stageGradeFilter, setStageGradeFilter] = useState<"2nd" | "1st" | "other">("2nd");
  const [stageTrackFilter, setStageTrackFilter] = useState<"ar" | "en">("ar");

  // Step 2: Multi-Type Selection & Distribution
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<("MCQ" | "TRUE_FALSE" | "ESSAY")[]>([
    "MCQ",
    "TRUE_FALSE",
    "ESSAY",
  ]);
  const [lessonAllocations, setLessonAllocations] = useState<Record<string, { mcq: number; tf: number; essay: number }>>({});
  const [targetBatchCount, setTargetBatchCount] = useState<number>(20);

  // Settings State
  const [settings, setSettings] = useState<MemoSettings>(() => {
    try {
      const saved = localStorage.getItem("drelmahdy_memo_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.showWatermark = false;
        if (parsed.subHeaderText) parsed.subHeaderText = sanitizeMemoText(parsed.subHeaderText);
        if (parsed.headerText) parsed.headerText = sanitizeMemoText(parsed.headerText);
        if (parsed.watermarkText) parsed.watermarkText = sanitizeMemoText(parsed.watermarkText);
        if (parsed.footerText) parsed.footerText = sanitizeMemoText(parsed.footerText);
        // Migrate legacy saved defaults cleanly so the crisp publication layout applies right away
        if (!parsed._v3Editorial) {
          if (parsed.topMm === 34 || parsed.topMm === undefined) parsed.topMm = 12;
          if (parsed.continuationTopMm === 12 || parsed.continuationTopMm === undefined) parsed.continuationTopMm = 10;
          if (parsed.bottomMm === 10 || parsed.bottomMm === undefined) parsed.bottomMm = 12;
          if (parsed.rightMm === 12 || parsed.rightMm === undefined) parsed.rightMm = 13;
          if (parsed.leftMm === 12 || parsed.leftMm === undefined) parsed.leftMm = 13;
          if (parsed.fontSize === 11.5 || parsed.fontSize === undefined) parsed.fontSize = 10.5;
          if (parsed.lineHeight === 1.55 || parsed.lineHeight === 1.5 || parsed.lineHeight === undefined) parsed.lineHeight = 1.52;
          if (parsed.templateStyle === "royal" || !parsed.templateStyle) parsed.templateStyle = "minimal";
          if (parsed.cardStyle === "lines" || !parsed.cardStyle) parsed.cardStyle = "none";
          if (!parsed.layoutColumns) parsed.layoutColumns = 1;
          parsed._v2Margins = true;
          parsed._v3Editorial = true;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [questions, setQuestions] = useState<NormalizedQuestion[]>(() =>
    SAMPLE_QUESTIONS.map(normalizeQuestion),
  );
  const [isEditingDocTitle, setIsEditingDocTitle] = useState<boolean>(false);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<"config" | "preview">("config");

  // Multi-level JSON Import State
  const [jsonInput, setJsonInput] = useState<string>("");
  const [detectedJsonSections, setDetectedJsonSections] = useState<ParsedJsonSection[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [showJsonSectionPicker, setShowJsonSectionPicker] = useState<boolean>(false);

  // Curriculum Bank tree
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [selectedLessons, setSelectedLessons] = useState<Array<{
    unit: string;
    lesson: string;
    totalQuestions?: number;
    mcqCount?: number;
    tfCount?: number;
    totalEssays?: number;
  }>>([]);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Question editing modal & creation
  const [editingQuestion, setEditingQuestion] = useState<{
    index: number;
    data: NormalizedQuestion;
  } | null>(null);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);

  // Pagination and view state
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [showAllPages, setShowAllPages] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(0.72);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [warnings, setWarnings] = useState<string[]>([]);

  const paperAreaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const isArabicText = (text: string) => /[\u0600-\u06FF]/.test(text || "");

  // Save settings locally
  useEffect(() => {
    try {
      localStorage.setItem("drelmahdy_memo_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage error", e);
    }
  }, [settings]);

  // Load Question Bank Tree
  const loadTree = async () => {
    try {
      setLoadingTree(true);
      const res = await adminApi<any>("/api/admin/learning/test-bank/tree");
      if (res && Array.isArray(res.tree) && res.tree.length > 0) {
        setTreeData(res.tree);
      }
    } catch (err) {
      console.warn("Could not load question bank tree", err);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  // Hierarchical Stage Selector logic: isolates Arabic vs Languages cleanly!
  useEffect(() => {
    if (!treeData.length) return;

    const matched = treeData.filter((st) => {
      const name = String(st.stage || "").toLowerCase();
      const isLang = name.includes("لغات") || name.includes("languages") || name.includes("language");
      if (stageTrackFilter === "en" && !isLang) return false;
      if (stageTrackFilter === "ar" && isLang) return false;

      if (stageGradeFilter === "2nd") {
        return name.includes("ثاني") || name.includes("تانية") || name.includes("2nd") || name.includes("second");
      }
      if (stageGradeFilter === "1st") {
        return name.includes("أول") || name.includes("أولى") || name.includes("1st") || name.includes("first");
      }
      return true;
    });

    if (matched.length > 0) {
      if (!selectedStageName || !matched.some((m) => m.stage === selectedStageName)) {
        setSelectedStageName(matched[0].stage);
      }
    } else if (treeData.length > 0 && !selectedStageName) {
      setSelectedStageName(treeData[0].stage);
    }
  }, [treeData, stageGradeFilter, stageTrackFilter]);

  // Active stage and units in tree
  const activeTreeStage = treeData.find((st) => st.stage === selectedStageName);
  const stageUnits = activeTreeStage?.units || [];

  // Auto-expand first unit when stage changes
  useEffect(() => {
    if (stageUnits.length > 0) {
      setExpandedUnits((prev) => {
        if (Object.keys(prev).length === 0) {
          return { [stageUnits[0].unit]: true };
        }
        return prev;
      });
    }
  }, [stageUnits]);

  // Sync lessonAllocations with selectedLessons
  useEffect(() => {
    setLessonAllocations((prev) => {
      const next = { ...prev };
      selectedLessons.forEach((item) => {
        const key = `${item.unit}:::${item.lesson}`;
        if (!next[key]) {
          next[key] = { mcq: 0, tf: 0, essay: 0 };
        }
      });
      return next;
    });
  }, [selectedLessons]);

  // Printable region in mm (Page 1 & Continuation pages respect exact user margins)
  const region = useMemo(() => {
    const top = Math.max(6, Math.min(80, settings.topMm || 12));
    const contTop = Math.max(6, Math.min(80, settings.continuationTopMm ?? 10));
    const bottom = Math.max(8, Math.min(60, settings.bottomMm || 12));
    const right = Math.max(6, Math.min(45, settings.rightMm || 13));
    const left = Math.max(6, Math.min(45, settings.leftMm || 13));
    return {
      top,
      contTop,
      bottom,
      right,
      left,
      width: 210 - right - left,
      height: 297 - top - bottom,
    };
  }, [settings.topMm, settings.continuationTopMm, settings.bottomMm, settings.rightMm, settings.leftMm]);

  // Auto-scale preview canvas
  useEffect(() => {
    if (!autoScale) return;
    const updateScale = () => {
      if (paperAreaRef.current) {
        const availableW = paperAreaRef.current.clientWidth - 32;
        const a4PxW = (210 * 96) / 25.4;
        const calc = Math.min(1.0, Math.max(0.45, availableW / a4PxW));
        setScale(parseFloat(calc.toFixed(2)));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [autoScale]);

  // Offscreen measurement engine
  const measureHeight = (html: string, widthMm: number): number => {
    if (!measureRef.current) return 30;
    const holder = measureRef.current;
    holder.style.width = `${widthMm}mm`;
    holder.style.direction = settings.contentDir;
    holder.style.fontFamily = settings.fontSelect;
    holder.style.fontSize = `${settings.fontSize}pt`;
    holder.style.lineHeight = `${settings.lineHeight}`;
    holder.innerHTML = html;
    const el = holder.firstElementChild as HTMLElement;
    if (!el) return 30;
    const px = el.getBoundingClientRect().height;
    return px / (96 / 25.4);
  };

  // Student header strip HTML (clean, editorial, zero heavy boxes)
  const studentStripHtml = useMemo(() => {
    const theme = getThemeConfig(settings.templateStyle);
    const isRtl = settings.contentDir === "rtl";
    if (settings.templateStyle === "exam") {
      return `<div style="border-bottom:1px solid ${theme.cardBorderColor};padding:1.2mm 0 2mm;display:grid;grid-template-columns:1.5fr 1fr 1fr 0.9fr;gap:2.5mm;font-size:8.5pt;color:#0f172a;margin-bottom:3.2mm;font-weight:600;">
        <div>${isRtl ? "الاسم:" : "Name:"} <span style="display:inline-block;width:28mm;border-bottom:1px dotted #64748b;"></span></div>
        <div>${isRtl ? "المجموعة:" : "Group:"} <span style="display:inline-block;width:18mm;border-bottom:1px dotted #64748b;"></span></div>
        <div>${isRtl ? "التاريخ:" : "Date:"} <span style="display:inline-block;width:18mm;border-bottom:1px dotted #64748b;"></span></div>
        <div style="text-align:${isRtl ? "left" : "right"};">${isRtl ? "الدرجة: [ &nbsp; / &nbsp; ]" : "Score: [ &nbsp; / &nbsp; ]"}</div>
      </div>`;
    }
    return `<div style="border-bottom:1px solid ${theme.cardBorderColor};padding:1mm 0 1.8mm;display:flex;gap:4mm;justify-content:space-between;flex-wrap:wrap;font-size:8.4pt;color:#334155;margin-bottom:3mm;">
      <span style="white-space:nowrap;flex:1.4;min-width:30mm;"><strong>${isRtl ? "اسم الطالب:" : "Student:"}</strong> <span style="display:inline-block;width:28mm;border-bottom:1px dotted #94a3b8;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:24mm;"><strong>${isRtl ? "المجموعة:" : "Group:"}</strong> <span style="display:inline-block;width:20mm;border-bottom:1px dotted #94a3b8;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:24mm;"><strong>${isRtl ? "التاريخ:" : "Date:"}</strong> <span style="display:inline-block;width:18mm;border-bottom:1px dotted #94a3b8;"></span></span>
    </div>`;
  }, [settings.templateStyle, settings.contentDir]);

  const getDensityMetrics = (density: MemoSettings["density"]) =>
    ({
      compact: { pad: "1.1mm 0", gap: "0.9mm 2.5mm", qGap: 1.8 },
      balanced: { pad: "1.6mm 0", gap: "1.2mm 3.5mm", qGap: 3.0 },
      comfortable: { pad: "2.2mm 0", gap: "1.8mm 4.5mm", qGap: 4.5 },
    }[density || "balanced"]);

  const computeOptionColCount = (
    opts: Array<{ text: string }>,
    optionLayout: MemoSettings["optionLayout"],
    columnsMode: 1 | 2 = 1,
  ): 1 | 2 | 4 => {
    if (optionLayout === "four") return columnsMode === 2 ? 2 : opts.length <= 2 ? 2 : 4;
    if (optionLayout === "two") return 2;
    if (optionLayout === "one") return 1;
    const maxLen = Math.max(...opts.map((o) => (o.text || "").trim().length), 0);
    if (columnsMode === 2) {
      return maxLen <= 18 ? 2 : 1;
    }
    if (maxLen <= 14 && opts.length <= 4) return opts.length <= 2 ? 2 : 4;
    if (maxLen <= 44) return 2;
    return 1;
  };

  const getSectionHeading = (type: NormalizedQuestion["type"], indexOrder: number): string => {
    const ordinalsAr = ["أولاً", "ثانياً", "ثالثاً", "رابعاً", "خامساً"];
    const ordinalsEn = ["First", "Second", "Third", "Fourth", "Fifth"];
    const isRtlDoc = settings.contentDir === "rtl";
    const ord = isRtlDoc
      ? (ordinalsAr[indexOrder] || `${indexOrder + 1}`)
      : (ordinalsEn[indexOrder] || `Part ${indexOrder + 1}`);
    const labels: Record<NormalizedQuestion["type"], { ar: string; en: string }> = {
      MCQ: { ar: "اختر الإجابة الصحيحة مما يلي", en: "Choose the correct answer" },
      TRUE_FALSE: { ar: "ضع علامة (✓) أمام العبارة الصحيحة أو (✗) أمام العبارة الخاطئة", en: "Mark True or False" },
      ESSAY: { ar: "أجب عن الأسئلة المقالية التالية", en: "Answer the following essay questions" },
      DEFINITION: { ar: "المصطلحات والتعريفات", en: "Key Terms & Definitions" },
      TEXT: { ar: "ملاحظات وإرشادات", en: "Notes & Instructions" },
    };
    const l = labels[type] || labels.MCQ;
    return isRtlDoc ? `${ord}: ${l.ar}` : `${ord}: ${l.en}`;
  };

  // Publication-grade card HTML generator: clean editorial hanging-indent numbering, no circles or box clutter
  const getCardHtml = (q: NormalizedQuestion, qNumber: number, sectionHeader?: string) => {
    const theme = getThemeConfig(settings.templateStyle);
    const stmtIsArabic = isArabicText(q.statement);
    const stmtDir = stmtIsArabic ? "rtl" : "ltr";
    const stmtAlign = stmtIsArabic ? "right" : "left";
    const isTwoCol = settings.layoutColumns === 2;

    const typeLabel = {
      MCQ: stmtIsArabic ? "اختيار من متعدد" : "Multiple Choice",
      TRUE_FALSE: stmtIsArabic ? "صواب أم خطأ" : "True / False",
      ESSAY: stmtIsArabic ? "سؤال مقالي" : "Essay",
      DEFINITION: stmtIsArabic ? "تعريف ومصطلح" : "Definition",
      TEXT: stmtIsArabic ? "ملاحظة هامة" : "Note",
    }[q.type];

    const densityConfig = getDensityMetrics(settings.density);

    const sectionBannerHtml = sectionHeader
      ? `<div style="margin-top:1.5mm;margin-bottom:${densityConfig.qGap}mm;padding-bottom:1.2mm;border-bottom:1.5px solid ${theme.accentColor};font-size:1em;font-weight:800;color:${theme.accentColor};direction:${settings.contentDir};text-align:${settings.contentDir === "rtl" ? "right" : "left"};">${escapeMemoHtml(sectionHeader)}</div>`
      : "";

    if (q.type === "TEXT") {
      return `<div style="break-inside:avoid;margin-bottom:${densityConfig.qGap}mm;">${sectionBannerHtml}<div style="border-${stmtIsArabic ? "right" : "left"}:2.5px solid ${theme.accentColor};padding:1.2mm 2.5mm;white-space:pre-wrap;line-height:inherit;direction:${stmtDir};text-align:${stmtAlign};">${escapeMemoHtml(q.statement)}</div></div>`;
    }

    if (q.type === "DEFINITION") {
      const defAnsIsArabic = isArabicText(q.answer);
      return `<div style="break-inside:avoid;margin-bottom:${densityConfig.qGap}mm;">${sectionBannerHtml}<div style="border-${stmtIsArabic ? "right" : "left"}:2px solid ${theme.accentColor};padding:1mm 2.5mm;direction:${stmtDir};text-align:${stmtAlign};">
        <div style="font-weight:700;color:#0f172a;">${escapeMemoHtml(q.statement)}</div>
        ${settings.showAnswers && q.answer ? `<div style="margin-top:1mm;white-space:pre-wrap;color:#334155;direction:${defAnsIsArabic ? "rtl" : "ltr"};text-align:${defAnsIsArabic ? "right" : "left"};">${escapeMemoHtml(q.answer)}</div>` : ""}
      </div></div>`;
    }

    const opts =
      q.options && q.options.length
        ? q.options
        : q.type === "TRUE_FALSE"
          ? [{ text: stmtIsArabic ? "صواب" : "True" }, { text: stmtIsArabic ? "خطأ" : "False" }]
          : [];

    const colCount = computeOptionColCount(opts, settings.optionLayout, isTwoCol ? 2 : 1);
    const colStyle =
      colCount === 4
        ? "grid-template-columns: repeat(4, minmax(0, 1fr));"
        : colCount === 2
          ? "grid-template-columns: repeat(2, minmax(0, 1fr));"
          : "grid-template-columns: 1fr;";

    const optionsHtml = opts.length
      ? `<div style="display:grid;${colStyle}gap:${densityConfig.gap};margin-top:1.4mm;padding-inline-start:6.2mm;">
          ${opts
        .map((o, i) => {
          const optIsArabic = isArabicText(o.text);
          const optDir = optIsArabic ? "rtl" : "ltr";
          const optAlign = optIsArabic ? "right" : "left";
          const letter = optIsArabic
            ? (ARABIC_LETTERS[i] ?? i + 1)
            : (ENGLISH_LETTERS[i] ?? String.fromCharCode(65 + i));
          return `
            <div style="display:flex;gap:1.4mm;align-items:baseline;break-inside:avoid;direction:${optDir};text-align:${optAlign};">
              <span style="font:700 0.92em Tahoma,Arial,sans-serif;color:${theme.accentColor};flex-shrink:0;">${letter})</span>
              <span style="flex:1;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:400;line-height:1.45;direction:${optDir};">${escapeMemoHtml(o.text)}</span>
            </div>`;
        })
        .join("")}
        </div>`
      : "";

    const essayRuledLinesHtml =
      q.type === "ESSAY" && !settings.showAnswers && (settings.essayLines ?? 3) > 0
        ? `<div style="margin-top:2mm;margin-bottom:0.8mm;padding-inline-start:6.2mm;display:flex;flex-direction:column;gap:3.2mm;">
            ${Array.from({ length: settings.essayLines ?? 3 })
              .map(
                () =>
                  `<div style="border-bottom:1px dotted #94a3b8;width:100%;height:4.2mm;"></div>`,
              )
              .join("")}
          </div>`
        : "";

    let containerStyle = "";
    if (settings.cardStyle === "lines") {
      containerStyle = `border-bottom: 1px solid ${theme.cardBorderColor}; padding: ${densityConfig.pad}; background: transparent;`;
    } else if (settings.cardStyle === "dashed") {
      containerStyle = `border-bottom: 1px dashed #cbd5e1; padding: ${densityConfig.pad}; background: transparent;`;
    } else if (settings.cardStyle === "cards") {
      containerStyle = `border: 1px solid ${theme.cardBorderColor}; border-${stmtIsArabic ? "right" : "left"}: ${theme.cardBorderRight}; border-radius: 1.2mm; padding: ${isTwoCol ? "1.6mm 2mm" : "2mm 2.4mm"}; background: #ffffff;`;
    } else {
      containerStyle = `padding: ${densityConfig.pad}; background: transparent;`;
    }

    const transIsArabic = isArabicText(q.translation);
    const transDir = transIsArabic ? "rtl" : "ltr";
    const transAlign = transIsArabic ? "right" : "left";

    const ansIsArabic = isArabicText(q.answer);
    const ansDir = ansIsArabic ? "rtl" : "ltr";
    const ansAlign = ansIsArabic ? "right" : "left";

    const expIsArabic = isArabicText(q.explanation);
    const expDir = expIsArabic ? "rtl" : "ltr";
    const expAlign = expIsArabic ? "right" : "left";

    return `<div style="break-inside:avoid;page-break-inside:avoid;margin-bottom:${densityConfig.qGap}mm;">${sectionBannerHtml}<article style="box-sizing:border-box;width:100%;max-width:100%;${containerStyle}position:relative;word-break:normal;overflow-wrap:anywhere;direction:${stmtDir};">
      <div style="display:flex;align-items:baseline;gap:1.8mm;min-width:0;width:100%;box-sizing:border-box;direction:${stmtDir};">
        <span style="flex:0 0 auto;color:${theme.accentColor};font:700 0.98em Tahoma,Arial,sans-serif;min-width:5.2mm;">${qNumber}.</span>
        <div style="min-width:0;flex:1;box-sizing:border-box;text-align:${stmtAlign};">
          ${settings.showQuestionType ? `<span style="display:inline-block;color:${theme.secondaryAccent};font-size:0.75em;font-weight:700;margin-inline-end:1.5mm;">[${typeLabel}]</span>` : ""}
          <span style="white-space:pre-wrap;font-weight:600;line-height:inherit;overflow-wrap:anywhere;direction:${stmtDir};text-align:${stmtAlign};">${escapeMemoHtml(q.statement || "—")}</span>
          ${settings.showTranslations && q.translation ? `<div style="white-space:pre-wrap;color:#475569;border-${stmtIsArabic ? "right" : "left"}:1.5px solid #cbd5e1;padding-${stmtIsArabic ? "right" : "left"}:2mm;margin-top:1mm;font-size:0.9em;font-weight:400;overflow-wrap:anywhere;direction:${transDir};text-align:${transAlign};">${escapeMemoHtml(q.translation)}</div>` : ""}
        </div>
      </div>
      ${optionsHtml}
      ${essayRuledLinesHtml}
      ${settings.showAnswers && q.answer ? `<div style="box-sizing:border-box;border-${stmtIsArabic ? "right" : "left"}:2px solid #16a34a;margin-top:1.3mm;margin-inline-start:6.2mm;padding:0.6mm 2mm;font-size:0.88em;color:#166534;white-space:pre-wrap;overflow-wrap:anywhere;direction:${ansDir};text-align:${ansAlign};"><span style="font-weight:700;">${ansIsArabic ? "الإجابة:" : "Answer:"}</span> ${escapeMemoHtml(q.answer)}</div>` : ""}
      ${settings.showExplain && q.explanation ? `<div style="box-sizing:border-box;border-${stmtIsArabic ? "right" : "left"}:2px solid #d97706;margin-top:0.8mm;margin-inline-start:6.2mm;padding:0.5mm 2mm;font-size:0.84em;color:#78350f;white-space:pre-wrap;overflow-wrap:anywhere;direction:${expDir};text-align:${expAlign};"><span style="font-weight:700;">${expIsArabic ? "التوضيح:" : "Explanation:"}</span> ${escapeMemoHtml(q.explanation)}</div>` : ""}
    </article></div>`;
  };

  // Compile active enabled questions + handle continuous vs per_type numbering & sections
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => q.enabled);
  }, [questions]);

  const arrangedQuestions = useMemo(() => {
    if (settings.numberingStyle !== "per_type") {
      return activeQuestions.map((q, idx) => ({
        q,
        qNumber: settings.questionStart + idx,
        rawIndex: idx,
        sectionHeader: undefined as string | undefined,
      }));
    }
    const typeOrder: Array<NormalizedQuestion["type"]> = ["MCQ", "TRUE_FALSE", "ESSAY", "DEFINITION", "TEXT"];
    const grouped: Array<{ q: NormalizedQuestion; qNumber: number; rawIndex: number; sectionHeader?: string }> = [];
    let sectionIdx = 0;
    typeOrder.forEach((t) => {
      const items = activeQuestions
        .map((q, idx) => ({ q, idx }))
        .filter((x) => x.q.type === t);
      if (items.length === 0) return;
      const header = getSectionHeading(t, sectionIdx);
      sectionIdx += 1;
      items.forEach((item, subIdx) => {
        grouped.push({
          q: item.q,
          qNumber: subIdx + 1,
          rawIndex: item.idx,
          sectionHeader: subIdx === 0 ? header : undefined,
        });
      });
    });
    return grouped;
  }, [activeQuestions, settings.numberingStyle, settings.questionStart, settings.contentDir]);

  // Quick Answer Summary block HTML for the end of the sheet
  const answerSummaryHtml = useMemo(() => {
    if (!settings.showAnswerSummary || arrangedQuestions.length === 0) return "";
    const theme = getThemeConfig(settings.templateStyle);
    const isRtl = settings.contentDir === "rtl";
    const objectiveItems = arrangedQuestions.filter((item) => item.q.type === "MCQ" || item.q.type === "TRUE_FALSE");
    if (objectiveItems.length === 0) return "";

    const cells = objectiveItems
      .map((item) => {
        const idx = item.q.options?.findIndex((o) => o.isCorrect) ?? -1;
        const optText = idx >= 0 ? item.q.options[idx]?.text || "" : item.q.answer || "";
        const optIsArabic = isArabicText(optText);
        const letter =
          idx >= 0
            ? optIsArabic
              ? (ARABIC_LETTERS[idx] ?? String(idx + 1))
              : (ENGLISH_LETTERS[idx] ?? String.fromCharCode(65 + idx))
            : optText.slice(0, 14);
        return `<div style="border:1px solid ${theme.cardBorderColor};border-radius:1mm;padding:1mm 1.5mm;font-size:8pt;display:flex;justify-content:space-between;gap:1.5mm;background:#ffffff;">
          <strong style="color:${theme.accentColor};">${item.qNumber}</strong>
          <span style="color:#0f172a;font-weight:700;">${escapeMemoHtml(letter || "—")}</span>
        </div>`;
      })
      .join("");

    return `<div style="break-inside:avoid;margin-top:3mm;padding:2.5mm 3mm;background:${theme.softTint};border:1px solid ${theme.cardBorderColor};border-radius:1.5mm;direction:${settings.contentDir};">
      <div style="font-size:9pt;font-weight:800;color:${theme.accentColor};margin-bottom:2mm;">${isRtl ? "مفتاح الإجابات السريع (للمراجعة الذاتية)" : "Quick Answer Key"}</div>
      <div style="display:grid;grid-template-columns:repeat(6, minmax(0, 1fr));gap:1.4mm;">${cells}</div>
    </div>`;
  }, [settings.showAnswerSummary, arrangedQuestions, settings.templateStyle, settings.contentDir]);

  // Dynamic height measurements matching exact Clean Editorial Masthead
  const p1HeaderMeasuredH = useMemo(() => {
    if (!settings.headerEnabled) return 0;
    const badgeText =
      settings.templateStyle === "exam"
        ? "ورقة اختبار رسمي"
        : settings.templateStyle === "tech"
          ? "بنك الأسئلة والتقييمات"
          : settings.templateStyle === "emerald"
            ? "التقييم الشامل والتدريبات"
            : "مذكرة تدريبات وبنك أسئلة";
    const cleanTitle = escapeMemoHtml(sanitizeMemoText(settings.headerText));
    const cleanSub = escapeMemoHtml(sanitizeMemoText(settings.subHeaderText));

    const testHtml = `
      <div style="width:100%;margin-bottom:3mm;padding-bottom:2mm;border-bottom:1.5px solid #000;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:1.4mm;font-size:7.8pt;font-weight:700;">
          <span>د. محمود المهدي • الحاسب الآلي والذكاء الاصطناعي</span>
          <span>${badgeText}</span>
        </div>
        <div style="width:100%;padding:0 1mm;text-align:center;">
          <div style="font-size:12.5pt;font-weight:800;line-height:1.35;word-break:normal;overflow-wrap:anywhere;">${cleanTitle}</div>
          ${cleanSub ? `<div style="font-size:8.4pt;font-weight:500;margin-top:0.8mm;line-height:1.35;word-break:normal;overflow-wrap:anywhere;">${cleanSub}</div>` : ""}
        </div>
      </div>
    `;
    return measureHeight(testHtml, region.width);
  }, [settings.headerEnabled, settings.templateStyle, settings.headerText, settings.subHeaderText, region.width, settings.fontSelect, settings.fontSize]);

  const contHeaderMeasuredH = useMemo(() => {
    if (settings.continuationHeader !== "minimal") return 0;
    const cleanTitle = escapeMemoHtml(sanitizeMemoText(settings.headerText));
    const testHtml = `
      <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding-bottom:1.2mm;margin-bottom:2.8mm;border-bottom:1px solid #000;box-sizing:border-box;">
        <span style="font-size:7.8pt;font-weight:700;">${cleanTitle}</span>
        <span style="font-size:7.5pt;font-weight:600;">د. محمود المهدي</span>
      </div>
    `;
    return measureHeight(testHtml, region.width);
  }, [settings.continuationHeader, settings.headerText, region.width, settings.fontSelect, settings.fontSize]);

  // Content-Aware A4 Pagination Engine supporting both 1-Column Formal Exam & 2-Column Compact Workbook
  type PageCardItem = { html: string; h: number; qNumber: number; rawQuestion?: any; qIndex?: number };
  type StudioPage = { col1: PageCardItem[]; col2: PageCardItem[]; trailerHtml?: string };

  const pages = useMemo<StudioPage[]>(() => {
    const warns: string[] = [];
    const max = settings.maxQuestions || 99999;
    const isTwoCol = settings.layoutColumns === 2;
    const colWidthMm = isTwoCol ? (region.width - 6) / 2 : region.width;

    const studentH = settings.studentFields ? measureHeight(studentStripHtml, region.width) : 0;
    const safetyBuffer = 5.0;

    const p1Top = region.top;
    const p1AvailableH =
      297 -
      p1Top -
      (settings.headerEnabled ? p1HeaderMeasuredH + 3.0 : 0) -
      (settings.studentFields ? studentH + 3.2 : 0) -
      region.bottom -
      safetyBuffer;

    const contTop = region.contTop;
    const contAvailableH =
      297 -
      contTop -
      (settings.continuationHeader === "minimal" ? contHeaderMeasuredH + 2.8 : 0) -
      region.bottom -
      safetyBuffer;

    const all: StudioPage[] = [];
    let currentCol1: PageCardItem[] = [];
    let currentCol2: PageCardItem[] = [];
    let col1UsedH = 0;
    let col2UsedH = 0;
    let activeCol: 1 | 2 = 1;
    let count = 0;

    for (let idx = 0; idx < arrangedQuestions.length; idx++) {
      const { q, qNumber, rawIndex, sectionHeader } = arrangedQuestions[idx];
      const html = getCardHtml(q, qNumber, sectionHeader);
      const h = measureHeight(html, colWidthMm);

      if (count >= max) break;

      const targetAvailableH = all.length === 0 ? p1AvailableH : contAvailableH;

      if (isTwoCol) {
        if (activeCol === 1 && currentCol1.length > 0 && col1UsedH + h > targetAvailableH) {
          activeCol = 2;
        }
        if (activeCol === 2 && currentCol2.length > 0 && col2UsedH + h > targetAvailableH) {
          all.push({ col1: currentCol1, col2: currentCol2 });
          currentCol1 = [];
          currentCol2 = [];
          col1UsedH = 0;
          col2UsedH = 0;
          activeCol = 1;
        }
      } else {
        if (currentCol1.length > 0 && col1UsedH + h > targetAvailableH) {
          all.push({ col1: currentCol1, col2: [] });
          currentCol1 = [];
          col1UsedH = 0;
        }
      }

      const effectiveTargetH = all.length === 0 ? p1AvailableH : contAvailableH;
      if (h > effectiveTargetH) {
        warns.push(
          `السؤال #${qNumber} طويل جداً (${Math.round(h)}mm) وقد يستهلك مساحة الصفحة بمفرده. يُنصح بتقليل طول الفقرة أو تصغير حجم الخط.`,
        );
      }

      const cardItem: PageCardItem = { html, h, qNumber, rawQuestion: q, qIndex: rawIndex };
      if (isTwoCol && activeCol === 2) {
        currentCol2.push(cardItem);
        col2UsedH += h;
      } else {
        currentCol1.push(cardItem);
        col1UsedH += h;
      }
      count++;
    }

    let trailerPage: StudioPage | null = null;
    if (answerSummaryHtml) {
      const summaryH = measureHeight(answerSummaryHtml, region.width);
      const targetAvailableH = all.length === 0 ? p1AvailableH : contAvailableH;
      const maxColUsed = Math.max(col1UsedH, col2UsedH);
      if ((currentCol1.length > 0 || currentCol2.length > 0) && maxColUsed + summaryH + 3 <= targetAvailableH) {
        all.push({ col1: currentCol1, col2: currentCol2, trailerHtml: answerSummaryHtml });
        currentCol1 = [];
        currentCol2 = [];
      } else {
        if (currentCol1.length > 0 || currentCol2.length > 0) {
          all.push({ col1: currentCol1, col2: currentCol2 });
          currentCol1 = [];
          currentCol2 = [];
        }
        trailerPage = { col1: [], col2: [], trailerHtml: answerSummaryHtml };
      }
    }

    if (currentCol1.length > 0 || currentCol2.length > 0) {
      all.push({ col1: currentCol1, col2: currentCol2 });
    }
    if (trailerPage) {
      all.push(trailerPage);
    }

    setWarnings(warns);
    return all;
  }, [
    arrangedQuestions,
    answerSummaryHtml,
    settings,
    region,
    p1HeaderMeasuredH,
    contHeaderMeasuredH,
    studentStripHtml,
  ]);

  // Clean Header Text
  const cleanHeaderText = (text: string) => {
    return (text || "")
      .replace(/(\s*\[\s*(نموذج الإجابة للمعلم|نموذج الإجابة|نسخة المعلم|نسخة الطالب|للمعلم|للطالب|معلم|طالب|Model Answer|Teacher Copy|Student Copy)\s*\])+/gi, "")
      .replace(/(\s*\(\s*(نموذج الإجابة للمعلم|نموذج الإجابة|نسخة المعلم|نسخة الطالب|للمعلم|للطالب|معلم|طالب|Model Answer|Teacher Copy|Student Copy)\s*\))+/gi, "")
      .replace(/(\s*(نموذج الإجابة للمعلم|نموذج الإجابة|نسخة المعلم|نسخة الطالب|للمعلم|للطالب))+/gi, "")
      .replace(/أكاديمية\s*/g, "")
      .trim();
  };

  // Student vs Teacher Modes
  const setStudentMode = () => {
    setSettings((prev) => ({
      ...prev,
      showAnswers: false,
      showExplain: false,
      headerText: cleanHeaderText(prev.headerText),
    }));
    toast({
      title: "تم تفعيل نسخة الطالب 👨‍🎓",
      description: "المستند الآن بدون حلول جاهزة، مع أسطر مسطرة لكتابة إجابة الأسئلة المقالية يدوياً.",
    });
  };

  const setTeacherMode = () => {
    setSettings((prev) => ({
      ...prev,
      showAnswers: true,
      showExplain: true,
      headerText: cleanHeaderText(prev.headerText),
    }));
    toast({
      title: "تم تفعيل نسخة المعلم 👨‍🏫",
      description: "المستند يحتوي الآن على الإجابات النموذجية والشرح، مع الحفاظ الكامل على عنوانك كما كتبته.",
    });
  };

  // Print via iframe (matches Clean Editorial Masthead + 1-col / 2-col layout verbatim)
  const executeIframePrint = () => {
    if (!pages || pages.length === 0) {
      toast({ variant: "destructive", description: "لا توجد صفحات جاهزة للطباعة." });
      return;
    }

    const oldIframe = document.getElementById("memo-print-iframe");
    if (oldIframe && document.body.contains(oldIframe)) {
      document.body.removeChild(oldIframe);
    }

    const iframe = document.createElement("iframe");
    iframe.id = "memo-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast({ variant: "destructive", description: "تعذر فتح نافذة الطباعة." });
      return;
    }

    const cleanTitle = escapeMemoHtml(sanitizeMemoText(settings.headerText) || "مذكرة تدريبات وبنك أسئلة A4");
    const cleanSub = escapeMemoHtml(sanitizeMemoText(settings.subHeaderText) || "");
    const theme = getThemeConfig(settings.templateStyle);
    const isTwoCol = settings.layoutColumns === 2;
    const isRtlDoc = settings.contentDir === "rtl";
    const badgeText =
      settings.templateStyle === "exam"
        ? "ورقة اختبار رسمي"
        : settings.templateStyle === "tech"
          ? "بنك الأسئلة والتقييمات"
          : settings.templateStyle === "emerald"
            ? "التقييم الشامل والتدريبات"
            : "مذكرة تدريبات وبنك أسئلة";

    let htmlPages = "";
    pages.forEach((pageData, pageIdx) => {
      const isP1 = pageIdx === 0;
      const topPaddingMm = isP1 ? region.top : region.contTop;

      let pHeader = "";
      if (isP1 && settings.headerEnabled) {
        pHeader = `
          <div style="width:100%;margin-bottom:3mm;padding-bottom:2mm;border-bottom:${theme.headerBorder};color:#0f172a;box-sizing:border-box;">
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:1.4mm;font-size:7.8pt;font-weight:700;color:${theme.drSubTextColor};">
              <span>د. محمود المهدي • الحاسب الآلي والذكاء الاصطناعي</span>
              <span style="color:${settings.showAnswers ? "#92400e" : theme.accentColor};">${settings.showAnswers ? "نموذج إجابة المعلم" : badgeText}</span>
            </div>
            <div style="width:100%;padding:0 1mm;text-align:center;">
              <div style="font-size:12.5pt;font-weight:800;line-height:1.35;color:#0f172a;word-break:normal;overflow-wrap:anywhere;">${cleanTitle}</div>
              ${cleanSub ? `<div style="font-size:8.4pt;font-weight:500;margin-top:0.8mm;color:#475569;line-height:1.35;word-break:normal;overflow-wrap:anywhere;">${cleanSub}</div>` : ""}
            </div>
          </div>
        `;
      } else if (!isP1 && settings.continuationHeader === "minimal") {
        pHeader = `
          <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding-bottom:1.2mm;margin-bottom:2.8mm;border-bottom:1px solid ${theme.cardBorderColor};color:#475569;box-sizing:border-box;">
            <span style="font-size:7.8pt;font-weight:700;">${cleanTitle}</span>
            <span style="font-size:7.5pt;font-weight:600;">د. محمود المهدي</span>
          </div>
        `;
      }

      const pStudent = isP1 && settings.studentFields ? studentStripHtml : "";
      const col1Html = pageData.col1.map((item) => item.html).join("");
      const col2Html = pageData.col2.map((item) => item.html).join("");
      const questionsBody = isTwoCol
        ? `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6mm;align-items:start;width:100%;position:relative;">
             <div style="min-width:0;">${col1Html}</div>
             <div style="min-width:0;${pageData.col2.length > 0 ? `border-${isRtlDoc ? "right" : "left"}:1px solid #e2e8f0;padding-${isRtlDoc ? "right" : "left"}:3mm;` : ""}">${col2Html}</div>
           </div>`
        : col1Html;

      const displayPageNo = (settings.pageStart || 1) + pageIdx;
      const displayTotalPages = (settings.pageStart || 1) + pages.length - 1;
      const pageNumStr = settings.showTotalPages
        ? `صفحة ${displayPageNo} من ${displayTotalPages}`
        : `صفحة ${displayPageNo}`;
      const cleanFooter = escapeMemoHtml(sanitizeMemoText(settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي"));
      const footerJustify = settings.numPosition === "center" ? "center" : "space-between";
      const footerInner =
        settings.numPosition === "right"
          ? `<span style="font-weight:700;color:${theme.accentColor};">${pageNumStr}</span><span>${cleanFooter}</span>`
          : settings.numPosition === "center"
            ? `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5mm;"><span>${cleanFooter}</span><span style="font-weight:700;color:${theme.accentColor};">${pageNumStr}</span></div>`
            : `<span>${cleanFooter}</span><span style="font-weight:700;color:${theme.accentColor};">${pageNumStr}</span>`;

      htmlPages += `
        <div class="print-page" style="box-sizing:border-box;width:210mm;height:297mm;position:relative;page-break-after:always;padding:${topPaddingMm}mm ${region.right}mm ${region.bottom}mm ${region.left}mm;overflow:hidden;background:#ffffff;font-size:${settings.fontSize}pt;line-height:${settings.lineHeight};">
          ${pHeader}
          ${pStudent}
          <div style="width:100%;box-sizing:border-box;">
            ${questionsBody}
            ${pageData.trailerHtml || ""}
          </div>
          <div style="position:absolute;bottom:3.8mm;left:${region.left}mm;right:${region.right}mm;display:flex;justify-content:${footerJustify};align-items:center;font-size:7.6pt;font-weight:600;color:#64748b;border-top:1px solid #cbd5e1;padding-top:1.2mm;">
            ${footerInner}
          </div>
        </div>
      `;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${settings.contentDir}">
      <head>
        <title>${cleanTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: ${settings.fontSelect}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { page-break-after: always; break-after: page; }
          .print-page:last-child { page-break-after: avoid; break-after: avoid; }
        </style>
      </head>
      <body>
        ${htmlPages}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    doc.close();
  };

  const handlePrint = () => {
    executeIframePrint();
  };

  // Export to Microsoft Word (.doc) honoring Theme, Fonts, Margins, Option Layout, RTL/LTR, & Translations
  const handleExportWord = () => {
    if (arrangedQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة نشطة لتصديرها إلى ملف Word" });
      return;
    }

    const isRtl = settings.contentDir === "rtl";
    const theme = getThemeConfig(settings.templateStyle);
    const wordFont = resolveWordFontFamily(settings.fontSelect);
    const fontSizePt = settings.fontSize || 10.5;
    const lineH = settings.lineHeight || 1.5;
    const title = escapeMemoHtml(sanitizeMemoText(settings.headerText) || "مذكرة تدريبات وبنك أسئلة");
    const subTitle = escapeMemoHtml(sanitizeMemoText(settings.subHeaderText) || "");
    const cleanFooter = escapeMemoHtml(sanitizeMemoText(settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي"));
    const badgeLabel = settings.showAnswers
      ? isRtl ? "نموذج إجابة المعلم" : "Teacher Answer Key"
      : settings.templateStyle === "exam"
        ? isRtl ? "ورقة اختبار رسمي" : "Official Exam Paper"
        : isRtl ? "مذكرة تدريبات وبنك أسئلة" : "Study Sheet & Question Bank";

    const wordSpaceAfter =
      settings.density === "compact" ? "6pt" : settings.density === "comfortable" ? "13pt" : "9pt";
    const wordPaddingBottom =
      settings.density === "compact" ? "5pt" : settings.density === "comfortable" ? "10pt" : "7pt";
    const itemBorderRule =
      settings.cardStyle === "cards"
        ? `border: 1px solid ${theme.cardBorderColor}; padding: 7pt 9pt; background-color: #ffffff;`
        : settings.cardStyle === "dashed"
          ? `border-bottom: 1px dashed #cbd5e1; padding-bottom: ${wordPaddingBottom};`
          : settings.cardStyle === "lines"
            ? `border-bottom: 1px solid #e2e8f0; padding-bottom: ${wordPaddingBottom};`
            : `padding-bottom: 3pt;`;

    const maxToExport = settings.maxQuestions > 0 ? settings.maxQuestions : arrangedQuestions.length;
    const exportList = arrangedQuestions.slice(0, maxToExport);
    const isTwoCol = settings.layoutColumns === 2;

    let wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 21.0cm 29.7cm;
            margin: ${region.top}mm ${region.right}mm ${region.bottom + 4}mm ${region.left}mm;
            mso-header-margin: 6mm;
            mso-footer-margin: 6mm;
            mso-header: url("#h1");
            mso-footer: url("#f1");
            mso-title-page: yes;
            mso-page-orientation: portrait;
          }
          div.Section1 { page: Section1; }
          @page SectionCols {
            size: 21.0cm 29.7cm;
            margin: ${region.top}mm ${region.right}mm ${region.bottom + 4}mm ${region.left}mm;
            mso-columns: ${isTwoCol ? "2 not-even 6mm" : "1"};
          }
          table#hrdftrtbl { margin: 0in 0in 0in 900in; width: 1px; height: 1px; overflow: hidden; }
          body {
            font-family: ${wordFont};
            direction: ${isRtl ? "rtl" : "ltr"};
            text-align: ${isRtl ? "right" : "left"};
            font-size: ${fontSizePt}pt;
            line-height: ${lineH};
            color: #0f172a;
          }
          p { margin: 0 0 3pt 0; }
          .doc-header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4pt;
          }
          .doc-header-table td {
            padding-bottom: 3pt;
            font-size: 8.5pt;
            color: ${theme.drSubTextColor};
          }
          .doc-title-block {
            border-bottom: 1.5pt solid ${theme.accentColor};
            padding-bottom: 6pt;
            margin-bottom: 8pt;
            text-align: center;
          }
          .doc-title {
            font-size: ${Math.min(16, fontSizePt + 3.5)}pt;
            font-weight: bold;
            color: #0f172a;
            margin: 2pt 0;
            text-align: center;
          }
          .doc-subtitle {
            font-size: ${Math.max(8.5, fontSizePt - 1.5)}pt;
            color: #475569;
            margin: 0;
            text-align: center;
          }
          .student-box {
            width: 100%;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            margin-bottom: 10pt;
            border-collapse: collapse;
          }
          .student-box td {
            padding: 5pt 8pt;
            font-size: 9pt;
            border: 1px solid #cbd5e1;
            color: #1e293b;
          }
          .section-banner {
            margin: 10pt 0 6pt 0;
            padding: 3pt 0;
            border-bottom: 1.5pt solid ${theme.accentColor};
            font-size: ${fontSizePt}pt;
            font-weight: bold;
            color: ${theme.accentColor};
          }
          .question-item {
            margin-bottom: ${wordSpaceAfter};
            ${itemBorderRule}
            page-break-inside: avoid;
          }
          .question-statement {
            font-size: ${fontSizePt}pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 3pt;
          }
          .question-num {
            color: ${theme.accentColor};
            font-weight: bold;
          }
          .translation-line {
            margin-top: 2pt;
            margin-bottom: 3pt;
            font-size: ${Math.max(8.5, fontSizePt - 1)}pt;
            color: #64748b;
          }
          .options-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 2pt;
          }
          .options-table td {
            padding: 2pt 6pt;
            font-size: ${Math.max(9, fontSizePt - 0.5)}pt;
            vertical-align: top;
            color: #1e293b;
          }
          .opt-badge {
            font-weight: bold;
            color: ${theme.accentColor};
          }
          .answer-box {
            margin-top: 4pt;
            padding: 4pt 8pt;
            background-color: #f8fafc;
            border: 1px solid #86efac;
            font-size: ${Math.max(8.5, fontSizePt - 1)}pt;
            color: #166534;
          }
          .explanation-box {
            margin-top: 3pt;
            padding: 4pt 8pt;
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            font-size: ${Math.max(8, fontSizePt - 1.2)}pt;
            color: #78350f;
          }
          .ruled-line {
            border-bottom: 1px dashed #94a3b8;
            height: 18pt;
            margin-bottom: 4pt;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${settings.headerEnabled ? `
            <div class="doc-title-block" dir="${isRtl ? "rtl" : "ltr"}">
              <table class="doc-header-table" dir="${isRtl ? "rtl" : "ltr"}">
                <tr>
                  <td style="text-align: ${isRtl ? "right" : "left"};">
                    <strong>د. محمود المهدي • الحاسب الآلي والذكاء الاصطناعي</strong>
                  </td>
                  <td style="text-align: ${isRtl ? "left" : "right"}; font-weight: bold; color: ${theme.accentColor};">
                    ${badgeLabel}
                  </td>
                </tr>
              </table>
              <div class="doc-title">${title}</div>
              ${subTitle ? `<div class="doc-subtitle">${subTitle}</div>` : ""}
            </div>
          ` : ""}

          ${settings.studentFields ? `
            <table class="student-box" dir="${isRtl ? "rtl" : "ltr"}">
              <tr>
                <td style="width: 44%;"><strong>${isRtl ? "اسم الطالب:" : "Student Name:"}</strong> ...............................</td>
                <td style="width: 28%;"><strong>${isRtl ? "المجموعة:" : "Group:"}</strong> ..................</td>
                <td style="width: 28%;"><strong>${isRtl ? "التاريخ / الدرجة:" : "Date / Score:"}</strong> ...........</td>
              </tr>
            </table>
          ` : ""}

          <div class="questions-list">
    `;

    exportList.forEach(({ q, qNumber, sectionHeader }) => {
      const qIsArabic = isArabicText(q.statement);
      const qDir = qIsArabic ? "rtl" : "ltr";
      const qAlign = qIsArabic ? "right" : "left";
      const typeTag = settings.showQuestionType
        ? `<span style="font-size:8pt;color:${theme.secondaryAccent};">[${escapeMemoHtml(
            q.type === "MCQ"
              ? qIsArabic ? "اختيار من متعدد" : "Multiple Choice"
              : q.type === "TRUE_FALSE"
                ? qIsArabic ? "صواب أم خطأ" : "True / False"
                : q.type === "ESSAY"
                  ? qIsArabic ? "سؤال مقالي" : "Essay"
                  : qIsArabic ? "تعريف ومصطلح" : "Definition"
          )}]</span> `
        : "";

      if (sectionHeader) {
        wordContent += `<div class="section-banner" dir="${isRtl ? "rtl" : "ltr"}" style="text-align:${isRtl ? "right" : "left"};">${escapeMemoHtml(sectionHeader)}</div>`;
      }

      wordContent += `
        <div class="question-item" dir="${qDir}" style="text-align:${qAlign};">
          <div class="question-statement">
            <span class="question-num">${qNumber}.</span>&nbsp;${typeTag}${escapeMemoHtml(q.statement || q.prompt || "")}
          </div>
      `;

      if (settings.showTranslations && q.translation) {
        const trDir = isArabicText(q.translation) ? "rtl" : "ltr";
        wordContent += `<div class="translation-line" dir="${trDir}" style="text-align:${trDir === "rtl" ? "right" : "left"};">${escapeMemoHtml(q.translation)}</div>`;
      }

      const opts =
        q.options && q.options.length > 0
          ? q.options
          : q.type === "TRUE_FALSE"
            ? [{ text: qIsArabic ? "صواب" : "True" }, { text: qIsArabic ? "خطأ" : "False" }]
            : [];

      if (opts.length > 0) {
        const colCount = computeOptionColCount(opts, settings.optionLayout, isTwoCol ? 2 : 1);
        const colPct = colCount === 4 ? "25%" : colCount === 2 ? "50%" : "100%";
        wordContent += `<table class="options-table" dir="${qDir}">`;
        for (let i = 0; i < opts.length; i += colCount) {
          wordContent += `<tr>`;
          for (let c = 0; c < colCount; c++) {
            const opt = opts[i + c];
            if (opt) {
              const optIsAr = isArabicText(opt.text);
              const letter = optIsAr ? (ARABIC_LETTERS[i + c] ?? i + c + 1) : (ENGLISH_LETTERS[i + c] ?? String.fromCharCode(65 + i + c));
              wordContent += `<td style="width:${colPct};text-align:${optIsAr ? "right" : "left"};" dir="${optIsAr ? "rtl" : "ltr"}"><span class="opt-badge">${letter})</span> ${escapeMemoHtml(opt.text || "")}</td>`;
            } else {
              wordContent += `<td style="width:${colPct};"></td>`;
            }
          }
          wordContent += `</tr>`;
        }
        wordContent += `</table>`;
      }

      if (q.type === "ESSAY" && !settings.showAnswers && (settings.essayLines ?? 3) > 0) {
        wordContent += `<div style="margin-top:6pt;margin-bottom:4pt;">`;
        for (let l = 0; l < (settings.essayLines ?? 3); l++) {
          wordContent += `<div class="ruled-line"></div>`;
        }
        wordContent += `</div>`;
      }

      if (settings.showAnswers && q.answer) {
        const ansDir = isArabicText(q.answer) ? "rtl" : "ltr";
        wordContent += `<div class="answer-box" dir="${ansDir}" style="text-align:${ansDir === "rtl" ? "right" : "left"};"><strong>${ansDir === "rtl" ? "الإجابة النموذجية:" : "Model Answer:"}</strong> ${escapeMemoHtml(q.answer)}</div>`;
      }

      if (settings.showExplain && q.explanation) {
        const expDir = isArabicText(q.explanation) ? "rtl" : "ltr";
        wordContent += `<div class="explanation-box" dir="${expDir}" style="text-align:${expDir === "rtl" ? "right" : "left"};"><strong>${expDir === "rtl" ? "التوضيح:" : "Explanation:"}</strong> ${escapeMemoHtml(q.explanation)}</div>`;
      }

      wordContent += `</div>`;
    });

    if (settings.showAnswerSummary) {
      const objItems = exportList.filter((item) => item.q.type === "MCQ" || item.q.type === "TRUE_FALSE");
      if (objItems.length > 0) {
        wordContent += `<div style="margin-top:12pt;padding:8pt;background-color:${theme.softTint};border:1px solid ${theme.cardBorderColor};page-break-inside:avoid;" dir="${isRtl ? "rtl" : "ltr"}">
          <div style="font-weight:bold;color:${theme.accentColor};margin-bottom:6pt;">${isRtl ? "مفتاح الإجابات السريع" : "Quick Answer Key"}</div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">`;
        for (let i = 0; i < objItems.length; i += 5) {
          wordContent += `<tr>`;
          for (let c = 0; c < 5; c++) {
            const it = objItems[i + c];
            if (it) {
              const idx = it.q.options?.findIndex((o) => o.isCorrect) ?? -1;
              const optText = idx >= 0 ? it.q.options[idx]?.text || "" : it.q.answer || "";
              const optIsAr = isArabicText(optText);
              const letter = idx >= 0
                ? optIsAr ? (ARABIC_LETTERS[idx] ?? String(idx + 1)) : (ENGLISH_LETTERS[idx] ?? String.fromCharCode(65 + idx))
                : optText.slice(0, 12);
              wordContent += `<td style="width:20%;border:1px solid ${theme.cardBorderColor};padding:3pt 5pt;background:#fff;text-align:center;"><strong>${it.qNumber}:</strong> ${escapeMemoHtml(letter || "—")}</td>`;
            } else {
              wordContent += `<td style="width:20%;"></td>`;
            }
          }
          wordContent += `</tr>`;
        }
        wordContent += `</table></div>`;
      }
    }

    wordContent += `
          </div>

          <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <div style="mso-element:header" id="h1">
                  ${settings.continuationHeader === "minimal" ? `
                    <table style="width:100%;border-bottom:1px solid ${theme.cardBorderColor};font-size:8.5pt;color:#64748b;" dir="${isRtl ? "rtl" : "ltr"}">
                      <tr>
                        <td style="text-align:${isRtl ? "right" : "left"};">${title}</td>
                        <td style="text-align:${isRtl ? "left" : "right"};">د. محمود المهدي • Dr / Elmahdy</td>
                      </tr>
                    </table>
                  ` : `<p></p>`}
                </div>
              </td>
              <td>
                <div style="mso-element:footer" id="f1">
                  <table style="width:100%;border-top:1px solid #cbd5e1;font-size:8.5pt;color:#64748b;" dir="${isRtl ? "rtl" : "ltr"}">
                    <tr>
                      <td style="text-align:${settings.numPosition === "center" ? "center" : isRtl ? "right" : "left"};padding-top:3pt;">
                        ${cleanFooter} &nbsp;|&nbsp; ${isRtl ? "صفحة" : "Page"} <span style="mso-field-code:' PAGE '">1</span> ${settings.showTotalPages ? `${isRtl ? "من" : "of"} <span style="mso-field-code:' NUMPAGES '">1</span>` : ""}
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", wordContent], {
      type: "application/msword;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const cleanName = (settings.headerText || "مذكرة_أسئلة_A4").replace(/[/\\?%*:|"<>]/g, "_").slice(0, 45);
    link.download = `${cleanName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);

    toast({
      title: "تم تصدير ملف Word بنجاح 📄",
      description: "تم تطبيق القالب والخط والهوامش وتوزيع الأعمدة والترجمة بنجاح.",
    });
  };

  // Step 2 Batch Handlers
  const handleBalancedDistribution = () => {
    if (selectedLessons.length === 0 || selectedQuestionTypes.length === 0) return;
    const target = targetBatchCount > 0 ? targetBatchCount : 20;
    const totalSlots = selectedLessons.length * selectedQuestionTypes.length;
    const perSlotBase = Math.floor(target / Math.max(1, totalSlots));
    let remainder = target % Math.max(1, totalSlots);

    const nextAlloc: Record<string, { mcq: number; tf: number; essay: number }> = {};
    selectedLessons.forEach((l) => {
      const key = `${l.unit}:::${l.lesson}`;
      nextAlloc[key] = { mcq: 0, tf: 0, essay: 0 };

      if (selectedQuestionTypes.includes("MCQ")) {
        const extra = remainder > 0 ? 1 : 0;
        remainder = Math.max(0, remainder - extra);
        nextAlloc[key].mcq = Math.min(l.mcqCount ?? l.totalQuestions ?? 0, perSlotBase + extra);
      }
      if (selectedQuestionTypes.includes("TRUE_FALSE")) {
        const extra = remainder > 0 ? 1 : 0;
        remainder = Math.max(0, remainder - extra);
        nextAlloc[key].tf = Math.min(l.tfCount ?? 0, perSlotBase + extra);
      }
      if (selectedQuestionTypes.includes("ESSAY")) {
        const extra = remainder > 0 ? 1 : 0;
        remainder = Math.max(0, remainder - extra);
        nextAlloc[key].essay = Math.min(l.totalEssays ?? 0, perSlotBase + extra);
      }
    });

    setLessonAllocations(nextAlloc);
    toast({ title: "تم التوزيع المتوازن للأسئلة بنجاح ✓" });
  };

  const handleMaximizeAll = () => {
    if (selectedLessons.length === 0) return;
    const nextAlloc: Record<string, { mcq: number; tf: number; essay: number }> = {};
    selectedLessons.forEach((l) => {
      const key = `${l.unit}:::${l.lesson}`;
      nextAlloc[key] = {
        mcq: selectedQuestionTypes.includes("MCQ") ? l.mcqCount ?? l.totalQuestions ?? 0 : 0,
        tf: selectedQuestionTypes.includes("TRUE_FALSE") ? l.tfCount ?? 0 : 0,
        essay: selectedQuestionTypes.includes("ESSAY") ? l.totalEssays ?? 0 : 0,
      };
    });
    setLessonAllocations(nextAlloc);
    toast({ title: "تم تحديد كامل الأسئلة المتوفرة في الدروس ✓" });
  };

  const handleClearAllAllocations = () => {
    const nextAlloc: Record<string, { mcq: number; tf: number; essay: number }> = {};
    selectedLessons.forEach((l) => {
      const key = `${l.unit}:::${l.lesson}`;
      nextAlloc[key] = { mcq: 0, tf: 0, essay: 0 };
    });
    setLessonAllocations(nextAlloc);
  };

  // Compile & Fetch Real Questions from Database based on Exact Allocations
  const totalRequested = useMemo(() => {
    return Object.values(lessonAllocations).reduce(
      (sum, a) => sum + (a.mcq || 0) + (a.tf || 0) + (a.essay || 0),
      0,
    );
  }, [lessonAllocations]);

  const handleCompileAllocations = async () => {
    if (selectedLessons.length === 0) {
      toast({ variant: "destructive", description: "يرجى تحديد درس واحد على الأقل من الخطوة 1." });
      return;
    }
    if (totalRequested === 0) {
      toast({ variant: "destructive", description: "يرجى تحديد عدد الأسئلة المطلوبة (العدد الحالي 0)." });
      return;
    }

    try {
      setIsLoadingQuestions(true);
      const fetchTasks: Array<{ unit: string; lesson: string; type: "MCQ" | "TRUE_FALSE" | "ESSAY"; count: number }> = [];

      for (const item of selectedLessons) {
        const key = `${item.unit}:::${item.lesson}`;
        const alloc = lessonAllocations[key] || { mcq: 0, tf: 0, essay: 0 };
        if (selectedQuestionTypes.includes("MCQ") && alloc.mcq > 0) {
          fetchTasks.push({ unit: item.unit, lesson: item.lesson, type: "MCQ", count: alloc.mcq });
        }
        if (selectedQuestionTypes.includes("TRUE_FALSE") && alloc.tf > 0) {
          fetchTasks.push({ unit: item.unit, lesson: item.lesson, type: "TRUE_FALSE", count: alloc.tf });
        }
        if (selectedQuestionTypes.includes("ESSAY") && alloc.essay > 0) {
          fetchTasks.push({ unit: item.unit, lesson: item.lesson, type: "ESSAY", count: alloc.essay });
        }
      }

      const fetchedQuestions: any[] = [];
      const seenTexts = new Set<string>();

      for (const task of fetchTasks) {
        const params = new URLSearchParams({
          stage: selectedStageName,
          unit: task.unit,
          lesson: task.lesson,
          type: task.type,
        });
        const rows = await adminApi<any[]>(`/api/admin/learning/test-bank/questions?${params.toString()}`);
        if (Array.isArray(rows) && rows.length > 0) {
          const matching = rows.filter((r) => {
            const qObj = r.question || r;
            const detected = normalizeType(
              qObj.type ??
                r.type ??
                qObj.questionType ??
                r.questionType ??
                (qObj.definition
                  ? "DEFINITION"
                  : qObj.modelAnswer || r.modelAnswer
                    ? "ESSAY"
                    : qObj.options?.length === 2 || r.options?.length === 2
                      ? "TRUE_FALSE"
                      : qObj.options?.length > 2 || r.options?.length > 2
                        ? "MCQ"
                        : "ESSAY"),
            );
            return detected === task.type;
          });

          const shuffled = [...matching].sort(() => 0.5 - Math.random()).slice(0, task.count);
          for (const item of shuffled) {
            const qObj = item.question || item;
            const textKey = (
              qObj.statement ||
              qObj.prompt ||
              qObj.text ||
              item.statement ||
              item.prompt ||
              ""
            ).trim();
            if (textKey && !seenTexts.has(textKey)) {
              seenTexts.add(textKey);
              fetchedQuestions.push(item);
            }
          }
        }
      }

      if (!fetchedQuestions.length) {
        toast({
          variant: "destructive",
          description: "لم يتم العثور على أسئلة تطابق التوزيع المطلوب في بنك الأسئلة.",
        });
        return;
      }

      const normalized = fetchedQuestions.map((item, idx) => {
        const qObj = item.question || item;
        return normalizeQuestion(
          {
            ...item,
            ...qObj,
            id: item.id || `q-${idx}`,
            statement: qObj.prompt || qObj.statement || item.prompt || "",
            options: qObj.options || item.options || [],
            answer: qObj.correctAnswer ?? qObj.answer ?? item.answer ?? item.modelAnswer ?? "",
            explanation: qObj.explanation || item.explanation || "",
            translation: qObj.translation || item.translation || "",
            enabled: true,
          },
          idx,
        );
      });

      setQuestions(normalized);
      toast({
        title: "تم استخراج وتجميع الأسئلة بنجاح ✨",
        description: `تم توليد ${normalized.length} سؤال في المستند حسب التوزيع الدقيق.`,
      });
      setActiveStep("step4_questions");
      setMobileWorkspaceTab("preview");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في التجميع",
        description: err.message || "تعذر جلب الأسئلة حالياً.",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Step 4 Reordering and Editing
  const moveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    toast({ title: "تم حذف السؤال من المذكرة" });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Off-screen measurement holder */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -100,
        }}
      />

      {/* Slim Modern Header Bar */}
      <header className="no-print rounded-2xl bg-gradient-to-l from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-3.5 text-white shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Printer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black truncate">استوديو المذكرات والطباعة A4</h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                {questions.length} سؤال • {pages.length} صفحة A4
              </span>
            </div>
            {/* Direct Editable Document Title */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap sm:flex-nowrap">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">عنوان الورقة:</span>
              <div className="relative flex-1 min-w-[200px] max-w-xs sm:max-w-md">
                <input
                  type="text"
                  value={settings.headerText}
                  onChange={(e) => setSettings((s) => ({ ...s, headerText: e.target.value }))}
                  placeholder="اكتب عنوان ورقة الامتحان / المذكرة بحرية هنا..."
                  className="h-6.5 pr-2 pl-6 text-xs font-black rounded border border-slate-700 bg-slate-900/90 text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 w-full transition-all"
                  title="اكتب أو عدل اسم المستند بحرية تامة"
                />
                {settings.headerText && (
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, headerText: "" }))}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 text-xs font-bold cursor-pointer px-1"
                    title="تفريغ العنوان لكتابته بنفسك بحرية"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, headerText: "" }))}
                className="text-[10px] text-amber-300/80 hover:text-amber-200 hover:underline font-bold shrink-0 cursor-pointer bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
              >
                مسح وكتابة عنواني ✍️
              </button>
            </div>
          </div>
        </div>

        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={setStudentMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                !settings.showAnswers
                  ? "bg-primary text-white shadow-xs font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>نسخة الطالب</span>
            </button>
            <button
              type="button"
              onClick={setTeacherMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                settings.showAnswers
                  ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5 text-slate-950" />
              <span>نموذج المعلم</span>
            </button>
          </div>

          <Button
            type="button"
            onClick={handleExportWord}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 h-8 px-3 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Word (.doc)</span>
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-white font-black text-xs flex items-center gap-1.5 h-8 px-3.5 cursor-pointer shadow-md shadow-primary/20"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة / PDF (A4)</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (!questions.length) {
                toast({ variant: "destructive", description: "لا توجد أسئلة لنشرها كاختبار." });
                return;
              }
              const quizPayload = {
                title: settings.headerText || "اختبار جديد من استوديو المذكرات",
                questions: questions
                  .filter((q) => q.enabled)
                  .map((q) => {
                    const isEssay = q.type === "ESSAY" || (!q.options || q.options.length === 0);
                    const isTrueFalse = q.type === "TRUE_FALSE";
                    return {
                      prompt: q.statement || q.prompt || "",
                      options: isEssay ? [] : q.options?.map((o) => o.text) || [],
                      correctIndex: isEssay ? -1 : Math.max(0, q.options?.findIndex((o) => o.isCorrect) ?? 0),
                      explanation: q.explanation || "",
                      questionType: isEssay ? "essay" : isTrueFalse ? "true_false" : "mcq",
                    };
                  }),
              };
              sessionStorage.setItem("exam_wizard_import_payload", JSON.stringify(quizPayload));
              if (onNavigateToQuizzes) {
                onNavigateToQuizzes();
              } else {
                window.location.href = "/admin/quizzes";
              }
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-1.5 h-8 px-3 cursor-pointer"
            title="نشر هذا المحتوى كاختبار إلكتروني للطلاب على المنصة"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>نشر إلكتروني 🚀</span>
          </Button>
        </div>
      </header>

      {/* Mobile/Tablet Segment Switcher */}
      <div className="lg:hidden flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setMobileWorkspaceTab("config")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileWorkspaceTab === "config"
              ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
              : "text-muted-foreground"
          }`}
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          <span>إعدادات وتوزيع الأسئلة</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileWorkspaceTab("preview")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileWorkspaceTab === "preview"
              ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
              : "text-muted-foreground"
          }`}
        >
          <Eye className="h-3.5 w-3.5 text-emerald-600" />
          <span>معاينة المستند A4 ({pages.length} صفحة)</span>
        </button>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* RIGHT PANEL: Configuration Workspace (~34% width on desktop) */}
        <aside
          className={`no-print w-full lg:w-[36%] xl:w-[34%] shrink-0 space-y-4 ${
            mobileWorkspaceTab === "preview" ? "hidden lg:block" : ""
          }`}
        >
          {/* 4 Steps Stepper */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveStep("step1_source")}
              className={`py-2 px-1 text-[11px] font-black rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeStep === "step1_source"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>١. المنهج</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("step2_distribute")}
              className={`py-2 px-1 text-[11px] font-black rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeStep === "step2_distribute"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              <Shuffle className="h-3.5 w-3.5 shrink-0" />
              <span>٢. التوزيع</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("step3_design")}
              className={`py-2 px-1 text-[11px] font-black rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeStep === "step3_design"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span>٣. التنسيق</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("step4_questions")}
              className={`py-2 px-1 text-[11px] font-black rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeStep === "step4_questions"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5 shrink-0" />
              <span>٤. المراجعة ({questions.length})</span>
            </button>
          </div>

          {/* STEP 1: SOURCE AND CURRICULUM */}
          {activeStep === "step1_source" && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
              {/* Source Tabs */}
              <div className="flex border-b border-border pb-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContentSourceTab("curriculum")}
                  className={`text-xs font-bold pb-1 px-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    contentSourceTab === "curriculum"
                      ? "border-primary text-primary font-black"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>بنك المنهج</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentSourceTab("quizzes")}
                  className={`text-xs font-bold pb-1 px-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    contentSourceTab === "quizzes"
                      ? "border-primary text-primary font-black"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>اختبارات المنصة ({quizzes.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentSourceTab("external")}
                  className={`text-xs font-bold pb-1 px-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    contentSourceTab === "external"
                      ? "border-primary text-primary font-black"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>استيراد JSON</span>
                </button>
              </div>

              {/* Source A: CURRICULUM QUESTION BANK */}
              {contentSourceTab === "curriculum" && (
                <div className="space-y-3.5">
                  {/* Compact Hierarchical Filter Controls */}
                  <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border">
                    {/* Grade Selector */}
                    <div>
                      <label className="text-[11px] font-black text-foreground mb-1 block">
                        الصف الدراسي (البكالوريا):
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStageGradeFilter("2nd")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            stageGradeFilter === "2nd"
                              ? "bg-primary text-white font-black shadow-xs"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          تانية بكالوريا (الصف 2)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageGradeFilter("1st")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            stageGradeFilter === "1st"
                              ? "bg-primary text-white font-black shadow-xs"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          أولى بكالوريا (الصف 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageGradeFilter("other")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            stageGradeFilter === "other"
                              ? "bg-primary text-white font-black shadow-xs"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          مراحل أخرى
                        </button>
                      </div>
                    </div>

                    {/* Track Selector (Arabic vs Languages - completely isolated) */}
                    <div>
                      <label className="text-[11px] font-black text-foreground mb-1 block">
                        المسار التعليمي (عربي / لغات):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStageTrackFilter("ar")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            stageTrackFilter === "ar"
                              ? "bg-amber-600 text-white font-black shadow-xs"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          مدارس عربي (عام)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageTrackFilter("en")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            stageTrackFilter === "en"
                              ? "bg-blue-600 text-white font-black shadow-xs"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          مدارس لغات (English)
                        </button>
                      </div>
                    </div>

                    {/* Stage Name Summary Badge */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                      <span className="font-bold text-muted-foreground">المرحلة المحددة:</span>
                      <span className="font-extrabold text-primary truncate max-w-[200px]">
                        {selectedStageName || "جاري التحميل..."}
                      </span>
                    </div>
                  </div>

                  {/* Units and Lessons Compact Accordions */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {loadingTree && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        جاري تحميل وحدات ودروس بنك الأسئلة...
                      </div>
                    )}
                    {!loadingTree && stageUnits.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground bg-muted/20 rounded-xl">
                        لا توجد وحدات متوفرة لهذه المرحلة حالياً.
                      </div>
                    )}
                    {stageUnits.map((u: any) => {
                      const isExpanded = Boolean(expandedUnits[u.unit]);
                      const allLessonsSelected =
                        u.lessons &&
                        u.lessons.length > 0 &&
                        u.lessons.every((les: any) =>
                          selectedLessons.some((x) => x.unit === u.unit && x.lesson === les.lesson),
                        );

                      const toggleAllUnitLessons = () => {
                        if (!u.lessons) return;
                        if (allLessonsSelected) {
                          setSelectedLessons((prev) => prev.filter((x) => x.unit !== u.unit));
                        } else {
                          const newToAdd = u.lessons
                            .filter(
                              (les: any) =>
                                !selectedLessons.some(
                                  (x) => x.unit === u.unit && x.lesson === les.lesson,
                                ),
                            )
                            .map((les: any) => ({
                              unit: u.unit,
                              lesson: les.lesson,
                              totalQuestions: les.totalQuestions,
                              mcqCount: les.mcqCount ?? les.totalQuestions,
                              tfCount: les.tfCount ?? 0,
                              totalEssays: les.totalEssays ?? 0,
                            }));
                          setSelectedLessons((prev) => [...prev, ...newToAdd]);
                        }
                      };

                      return (
                        <div
                          key={u.unit}
                          className="rounded-xl border border-border bg-card overflow-hidden transition"
                        >
                          <div className="p-2.5 flex items-center justify-between gap-2 bg-muted/30">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedUnits((prev) => ({ ...prev, [u.unit]: !prev[u.unit] }))
                              }
                              className="flex items-center gap-2 min-w-0 flex-1 text-right cursor-pointer"
                            >
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <span className="text-xs font-black text-foreground truncate">
                                {u.unit}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                                {u.totalQuestions || 0} سؤال
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={toggleAllUnitLessons}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer shrink-0 ${
                                allLessonsSelected
                                  ? "bg-primary text-white"
                                  : "bg-background border border-border text-foreground hover:bg-muted"
                              }`}
                            >
                              {allLessonsSelected ? "إلغاء الوحدة" : "تحديد الوحدة"}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="p-2 space-y-1.5 bg-background border-t border-border">
                              {u.lessons?.map((les: any) => {
                                const isLessonSelected = selectedLessons.some(
                                  (x) => x.unit === u.unit && x.lesson === les.lesson,
                                );

                                const toggleLesson = () => {
                                  if (isLessonSelected) {
                                    setSelectedLessons((prev) =>
                                      prev.filter(
                                        (x) => !(x.unit === u.unit && x.lesson === les.lesson),
                                      ),
                                    );
                                  } else {
                                    setSelectedLessons((prev) => [
                                      ...prev,
                                      {
                                        unit: u.unit,
                                        lesson: les.lesson,
                                        totalQuestions: les.totalQuestions,
                                        mcqCount: les.mcqCount ?? les.totalQuestions,
                                        tfCount: les.tfCount ?? 0,
                                        totalEssays: les.totalEssays ?? 0,
                                      },
                                    ]);
                                  }
                                };

                                return (
                                  <div
                                    key={les.lesson}
                                    onClick={toggleLesson}
                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                                      isLessonSelected
                                        ? "bg-primary/10 border-primary/40 text-primary font-bold"
                                        : "bg-muted/10 border-border hover:bg-muted/40 text-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isLessonSelected}
                                        readOnly
                                        className="h-3.5 w-3.5 accent-primary pointer-events-none rounded"
                                      />
                                      <span className="truncate">{les.lesson}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono">
                                      <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" title="اختيار من متعدد">
                                        MCQ:{les.mcqCount || 0}
                                      </span>
                                      <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" title="صواب وخطأ">
                                        T/F:{les.tfCount || 0}
                                      </span>
                                      <span className="px-1 py-0.2 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" title="أسئلة مقالية">
                                        مقالي:{les.totalEssays || 0}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 1 Sticky Bottom Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">
                      تم تحديد <strong>{selectedLessons.length}</strong> دروس
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedLessons.length === 0}
                      onClick={() => setActiveStep("step2_distribute")}
                      className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-7 px-3 cursor-pointer"
                    >
                      <span>الانتقال لتوزيع الأسئلة ⬅</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Source B: PLATFORM QUIZZES */}
              {contentSourceTab === "quizzes" && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {quizzes.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      لا توجد اختبارات منشأة مسبقاً على المنصة.
                    </div>
                  ) : (
                    quizzes.map((qz) => (
                      <div
                        key={qz.id}
                        className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-foreground truncate">{qz.title}</h5>
                          <span className="text-[10px] text-muted-foreground">
                            {qz.questions?.length || 0} سؤال • {qz.stage || "عام"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!qz.questions || !qz.questions.length) {
                              toast({ variant: "destructive", description: "هذا الاختبار لا يحتوي على أسئلة." });
                              return;
                            }
                            const mapped = qz.questions.map(normalizeQuestion);
                            const cleanQuizTitle = sanitizeMemoText(qz.title);
                            setQuestions(mapped);
                            setSettings((s) => ({
                              ...s,
                              headerText: s.headerText && s.headerText !== DEFAULT_SETTINGS.headerText ? s.headerText : cleanQuizTitle,
                            }));
                            toast({ title: `تم تحميل ${mapped.length} سؤال من اختبار (${cleanQuizTitle})` });
                            setActiveStep("step4_questions");
                          }}
                          className="h-7 text-xs font-bold cursor-pointer"
                        >
                          تحميل
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Source C: EXTERNAL JSON IMPORT */}
              {contentSourceTab === "external" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    الصق مصفوفة JSON تحتوي على أسئلة (MCQ أو صواب وخطأ أو مقالي):
                  </p>
                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="[ { statement: '...', options: [...], answer: '...' } ]"
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-mono text-xs text-foreground focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonInput);
                        const sections = parseJsonSections(parsed);
                        if (sections.length > 0) {
                          setDetectedJsonSections(sections);
                          setSelectedSectionIds(sections.map((s) => s.id));
                          setShowJsonSectionPicker(true);
                        } else if (Array.isArray(parsed)) {
                          const mapped = parsed.map(normalizeQuestion);
                          setQuestions(mapped);
                          toast({ title: `تم استيراد ${mapped.length} سؤال بنجاح` });
                          setActiveStep("step4_questions");
                        } else {
                          toast({ variant: "destructive", description: "تنسيق JSON غير مدعوم." });
                        }
                      } catch (err: any) {
                        toast({ variant: "destructive", title: "خطأ JSON", description: err.message });
                      }
                    }}
                    className="w-full text-xs font-bold cursor-pointer"
                  >
                    معالجة واستيراد الأسئلة
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MULTI-TYPE SELECTION AND CUSTOM DISTRIBUTION [CRITICAL REQUIREMENT] */}
          {activeStep === "step2_distribute" && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div>
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />
                  <span>أنواع الأسئلة وتوزيعها الدقيق على الدروس</span>
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  حدد أنواع الأسئلة المطلوبة بالتزامن (MCQ + صواب وخطأ + مقالي)، وحدد الكميات لكل درس:
                </p>
              </div>

              {/* Independent Multi-Select Question Types Checkboxes */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
                <label className="text-[11px] font-black text-foreground block">
                  الأنواع المطلوبة في المستند (يمكن اختيار أكثر من نوع معاً):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      selectedQuestionTypes.includes("MCQ")
                        ? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes("MCQ")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionTypes((prev) => [...prev, "MCQ"]);
                        } else {
                          setSelectedQuestionTypes((prev) => prev.filter((t) => t !== "MCQ"));
                        }
                      }}
                      className="h-3.5 w-3.5 accent-blue-600 rounded"
                    />
                    <span>اختيار من متعدد</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      selectedQuestionTypes.includes("TRUE_FALSE")
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes("TRUE_FALSE")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionTypes((prev) => [...prev, "TRUE_FALSE"]);
                        } else {
                          setSelectedQuestionTypes((prev) => prev.filter((t) => t !== "TRUE_FALSE"));
                        }
                      }}
                      className="h-3.5 w-3.5 accent-amber-600 rounded"
                    />
                    <span>صواب أم خطأ</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      selectedQuestionTypes.includes("ESSAY")
                        ? "bg-violet-500/10 border-violet-500 text-violet-700 dark:text-violet-300"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes("ESSAY")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionTypes((prev) => [...prev, "ESSAY"]);
                        } else {
                          setSelectedQuestionTypes((prev) => prev.filter((t) => t !== "ESSAY"));
                        }
                      }}
                      className="h-3.5 w-3.5 accent-violet-600 rounded"
                    />
                    <span>أسئلة مقالية ✍️</span>
                  </label>
                </div>

                {/* Pool Availability Summary */}
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-1 border-t border-border/60 flex-wrap gap-1">
                  <span>المتوفر في الدروس المحددة:</span>
                  <div className="flex items-center gap-2 font-mono">
                    {selectedQuestionTypes.includes("MCQ") && (
                      <span className="text-blue-600 dark:text-blue-400">
                        MCQ: {selectedLessons.reduce((s, l) => s + (l.mcqCount ?? l.totalQuestions ?? 0), 0)}
                      </span>
                    )}
                    {selectedQuestionTypes.includes("TRUE_FALSE") && (
                      <span className="text-amber-600 dark:text-amber-400">
                        صواب/خطأ: {selectedLessons.reduce((s, l) => s + (l.tfCount ?? 0), 0)}
                      </span>
                    )}
                    {selectedQuestionTypes.includes("ESSAY") && (
                      <span className="text-violet-600 dark:text-violet-400">
                        مقالي: {selectedLessons.reduce((s, l) => s + (l.totalEssays ?? 0), 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Batch Distribution Bar */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/20 rounded-xl border border-border flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>العدد المستهدف:</span>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={targetBatchCount}
                    onChange={(e) => setTargetBatchCount(Number(e.target.value))}
                    className="w-14 h-7 text-center rounded border border-border bg-background font-mono text-xs font-bold"
                  />
                  <span>سؤال</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleBalancedDistribution}
                    className="h-7 text-[11px] font-bold cursor-pointer"
                  >
                    توزيع متوازن
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleMaximizeAll}
                    className="h-7 text-[11px] font-bold cursor-pointer"
                  >
                    سحب كل المتاح
                  </Button>
                  <button
                    type="button"
                    onClick={handleClearAllAllocations}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline px-1 cursor-pointer"
                  >
                    تصفير
                  </button>
                </div>
              </div>

              {/* Per-Lesson Custom Allocation List */}
              {selectedLessons.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl p-4">
                  لم تقم بتحديد أي دروس بعد.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveStep("step1_source")}
                    className="mt-2 block mx-auto text-xs font-bold cursor-pointer"
                  >
                    الرجوع لتحديد الدروس من المنهج
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedLessons.map((les) => {
                    const key = `${les.unit}:::${les.lesson}`;
                    const alloc = lessonAllocations[key] || { mcq: 0, tf: 0, essay: 0 };
                    const lesTotal = alloc.mcq + alloc.tf + alloc.essay;

                    const updateAlloc = (type: "mcq" | "tf" | "essay", val: number) => {
                      const cleanVal = Math.max(0, val);
                      setLessonAllocations((prev) => ({
                        ...prev,
                        [key]: {
                          ...alloc,
                          [type]: cleanVal,
                        },
                      }));
                    };

                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl border border-border bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-foreground truncate max-w-[200px]">
                            {les.lesson}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                            مجموع الدرس: {lesTotal} س
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          {selectedQuestionTypes.includes("MCQ") && (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>MCQ</span>
                                <span>(متاح:{les.mcqCount || 0})</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={les.mcqCount || 0}
                                value={alloc.mcq}
                                onChange={(e) => updateAlloc("mcq", Number(e.target.value))}
                                className={`w-full h-7 text-center rounded border font-mono text-xs font-bold ${
                                  alloc.mcq > (les.mcqCount || 0)
                                    ? "border-rose-500 bg-rose-50 text-rose-700"
                                    : "border-border bg-background"
                                }`}
                              />
                            </div>
                          )}

                          {selectedQuestionTypes.includes("TRUE_FALSE") && (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>صواب/خطأ</span>
                                <span>(متاح:{les.tfCount || 0})</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={les.tfCount || 0}
                                value={alloc.tf}
                                onChange={(e) => updateAlloc("tf", Number(e.target.value))}
                                className={`w-full h-7 text-center rounded border font-mono text-xs font-bold ${
                                  alloc.tf > (les.tfCount || 0)
                                    ? "border-rose-500 bg-rose-50 text-rose-700"
                                    : "border-border bg-background"
                                }`}
                              />
                            </div>
                          )}

                          {selectedQuestionTypes.includes("ESSAY") && (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>مقالي</span>
                                <span>(متاح:{les.totalEssays || 0})</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={les.totalEssays || 0}
                                value={alloc.essay}
                                onChange={(e) => updateAlloc("essay", Number(e.target.value))}
                                className={`w-full h-7 text-center rounded border font-mono text-xs font-bold ${
                                  alloc.essay > (les.totalEssays || 0)
                                    ? "border-rose-500 bg-rose-50 text-rose-700"
                                    : "border-border bg-background"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2 Execution Button */}
              <div className="pt-2 border-t border-border">
                <Button
                  type="button"
                  disabled={isLoadingQuestions || totalRequested === 0}
                  onClick={handleCompileAllocations}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>توليد وتجميع الأسئلة في المستند ({totalRequested} سؤال) ✨</span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: DESIGN AND FORMATTING */}
          {activeStep === "step3_design" && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div>
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>تنسيق المستند وعناوين وهوامش الطباعة</span>
                </h4>
              </div>

              {/* Document Header & Custom Titles */}
              <div className="space-y-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>عنوان وترويسة المستند المطبوع:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, headerText: "" }))}
                    className="text-[10px] text-muted-foreground hover:text-rose-600 font-bold cursor-pointer"
                  >
                    تفريغ العنوان ✕
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-foreground block mb-1">
                    العنوان الرئيسي للورقة (اكتب ماتريده بحرية تامة):
                  </span>
                  <input
                    type="text"
                    value={settings.headerText}
                    onChange={(e) => setSettings((s) => ({ ...s, headerText: e.target.value }))}
                    placeholder="اكتب العنوان المخصص هنا مثلاً: واجب منزلي شامل أو اختبار شهر نوفمبر..."
                    className="w-full h-8.5 px-3 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                    <span className="text-[10px] text-muted-foreground font-medium">اقتراحات سريعة:</span>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, headerText: "" }))}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-300 font-bold cursor-pointer hover:bg-rose-500 hover:text-white transition shadow-2xs"
                    >
                      مسح العنوان وكتابته بنفسي ✍️
                    </button>
                    {[
                      "واجب منزلي",
                      "اختبار تقييمي دوري",
                      "ورقة تدريبات وبنك أسئلة",
                      "مراجعة ليلة الامتحان",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, headerText: sug }))}
                        className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-primary hover:text-white font-bold cursor-pointer transition shadow-2xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-foreground block mb-1">
                    العنوان الفرعي وتفاصيل المنهج:
                  </span>
                  <input
                    type="text"
                    value={settings.subHeaderText}
                    onChange={(e) => setSettings((s) => ({ ...s, subHeaderText: e.target.value }))}
                    placeholder="مثال: د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي"
                    className="w-full h-8.5 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Clean Preset Reset */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="text-[11px] font-bold text-muted-foreground">تصميم مطبوع هادئ (A4 + Word)</span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      templateStyle: "minimal",
                      cardStyle: "none",
                      layoutColumns: 1,
                      fontSelect: DEFAULT_SETTINGS.fontSelect,
                      fontSize: 10.5,
                      lineHeight: 1.52,
                      density: "balanced",
                      topMm: 12,
                      continuationTopMm: 10,
                      bottomMm: 12,
                      rightMm: 13,
                      leftMm: 13,
                      _v2Margins: true,
                      _v3Editorial: true,
                    }))
                  }
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-primary hover:text-white font-bold cursor-pointer transition"
                >
                  استعادة التصميم النظيف ↺
                </button>
              </div>

              {/* Layout Columns Quick Switcher */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">تخطيط الأعمدة في صفحة A4:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, layoutColumns: 1 }))}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      (settings.layoutColumns ?? 1) === 1
                        ? "bg-primary text-white border-primary font-black"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    عمود واحد (رسمي للامتحان)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, layoutColumns: 2 }))}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      settings.layoutColumns === 2
                        ? "bg-primary text-white border-primary font-black"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    عمودان (مذكرة مراجعة مكثفة)
                  </button>
                </div>
              </div>

              {/* Template Style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">قالب وشكل الورقة (ينطبق على A4 وWord):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "minimal", label: "بسيط وأنيق" },
                      { id: "exam", label: "اختبار رسمي" },
                      { id: "tech", label: "أزرق هادئ" },
                      { id: "emerald", label: "أخضر أكاديمي" },
                      { id: "royal", label: "كلاسيك ذهبي" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, templateStyle: t.id }))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        settings.templateStyle === t.id
                          ? "bg-primary text-white font-black shadow-xs"
                          : "bg-muted/40 border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography & Fonts */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
                <label className="text-[11px] font-black text-foreground flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-primary" />
                  <span>الخط وتباعد الأسطر (A4 + Word):</span>
                </label>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="shrink-0">نوع الخط:</span>
                  <select
                    value={settings.fontSelect}
                    onChange={(e) => setSettings((s) => ({ ...s, fontSelect: e.target.value }))}
                    className="h-7 max-w-[195px] px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between gap-1.5">
                    <span>حجم الخط:</span>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                      className="h-7 px-2 rounded border border-border bg-background text-xs font-mono font-bold cursor-pointer"
                    >
                      {[9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz} pt
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span>تباعد الأسطر:</span>
                    <select
                      value={settings.lineHeight}
                      onChange={(e) => setSettings((s) => ({ ...s, lineHeight: Number(e.target.value) }))}
                      className="h-7 px-2 rounded border border-border bg-background text-xs font-mono font-bold cursor-pointer"
                    >
                      {[1.35, 1.45, 1.5, 1.6, 1.75].map((lh) => (
                        <option key={lh} value={lh}>
                          {lh}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>شكل الفاصل بين الأسئلة:</span>
                  <select
                    value={settings.cardStyle}
                    onChange={(e) => setSettings((s) => ({ ...s, cardStyle: e.target.value as any }))}
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="none">بدون خطوط — أسلوب الكتب (موصى به)</option>
                    <option value="lines">خط فاصل خفيف</option>
                    <option value="dashed">خط متقطع خفيف</option>
                    <option value="cards">بطاقة بإطار وصندوق رقم</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>اتجاه الورقة الافتراضي:</span>
                  <select
                    value={settings.contentDir}
                    onChange={(e) => setSettings((s) => ({ ...s, contentDir: e.target.value as any }))}
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="rtl">عربي (يمين ← يسار RTL)</option>
                    <option value="ltr">لغات (يسار ← يمين LTR)</option>
                  </select>
                </div>
              </div>

              {/* Question Presentation Settings */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
                <label className="text-[11px] font-black text-foreground block">
                  خيارات عرض الأسئلة والفراغات:
                </label>

                {/* Numbering Style */}
                <div className="flex items-center justify-between text-xs">
                  <span>نمط ترقيم الأسئلة:</span>
                  <select
                    value={settings.numberingStyle || "continuous"}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, numberingStyle: e.target.value as any }))
                    }
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="continuous">ترقيم مستمر (1..N)</option>
                    <option value="per_type">تجميع وترقيم لكل نوع (أولاً..ثانياً)</option>
                  </select>
                </div>

                {/* MCQ Columns */}
                <div className="flex items-center justify-between text-xs">
                  <span>توزيع خيارات MCQ:</span>
                  <select
                    value={settings.optionLayout}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, optionLayout: e.target.value as any }))
                    }
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="auto">توزيع تلقائي ذكي</option>
                    <option value="two">عمودين متجاورين</option>
                    <option value="four">4 أعمدة أفقية</option>
                    <option value="one">كل خيار في سطر مستقل</option>
                  </select>
                </div>

                {/* Essay Ruled Lines */}
                <div className="flex items-center justify-between text-xs">
                  <span>أسطر إجابة الأسئلة المقالية:</span>
                  <select
                    value={settings.essayLines ?? 3}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, essayLines: Number(e.target.value) }))
                    }
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="0">بدون أسطر (نصي فقط)</option>
                    <option value="2">سطرين مسطرين</option>
                    <option value="3">3 أسطر مسطرة (موصى به)</option>
                    <option value="4">4 أسطر مسطرة</option>
                    <option value="5">5 أسطر مسطرة</option>
                  </select>
                </div>

                {/* Density */}
                <div className="flex items-center justify-between text-xs">
                  <span>المسافة بين الأسئلة:</span>
                  <select
                    value={settings.density}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, density: e.target.value as any }))
                    }
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="compact">مضغوط (أقصى استيعاب)</option>
                    <option value="balanced">متوازن (الافتراضي الموصى به)</option>
                    <option value="comfortable">مريح ومتباعد</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>بداية ترقيم الأسئلة من:</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={settings.questionStart}
                    onChange={(e) => setSettings((s) => ({ ...s, questionStart: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-20 h-7 text-center rounded border border-border bg-background font-mono font-bold"
                  />
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">
                  هوامش الصفحة (بالمليمتر):
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">أعلى ص1</span>
                    <input
                      type="number"
                      min={6}
                      max={80}
                      value={settings.topMm}
                      onChange={(e) => setSettings((s) => ({ ...s, topMm: Number(e.target.value) }))}
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">أعلى ص2+</span>
                    <input
                      type="number"
                      min={6}
                      max={80}
                      value={settings.continuationTopMm}
                      onChange={(e) => setSettings((s) => ({ ...s, continuationTopMm: Number(e.target.value) }))}
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">أسفل</span>
                    <input
                      type="number"
                      min={8}
                      max={60}
                      value={settings.bottomMm}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, bottomMm: Number(e.target.value) }))
                      }
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">يمين</span>
                    <input
                      type="number"
                      min={6}
                      max={45}
                      value={settings.rightMm}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, rightMm: Number(e.target.value) }))
                      }
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">يسار</span>
                    <input
                      type="number"
                      min={6}
                      max={45}
                      value={settings.leftMm}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, leftMm: Number(e.target.value) }))
                      }
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Footer & Page Num */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div>
                  <span className="text-[11px] font-bold text-foreground block mb-1">نص التذييل (أسفل الورقة):</span>
                  <input
                    type="text"
                    value={settings.footerText}
                    onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
                    className="w-full h-7 px-2.5 rounded border border-border bg-background text-xs"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>ترويسة الصفحات التالية (ص2+):</span>
                  <select
                    value={settings.continuationHeader}
                    onChange={(e) => setSettings((s) => ({ ...s, continuationHeader: e.target.value as any }))}
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="minimal">شريط مختصر</option>
                    <option value="none">بدون ترويسة</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>موضع ترقيم الصفحات:</span>
                  <select
                    value={settings.numPosition}
                    onChange={(e) => setSettings((s) => ({ ...s, numPosition: e.target.value as any }))}
                    className="h-7 px-2 rounded border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="left">يسار</option>
                    <option value="center">وسط</option>
                    <option value="right">يمين</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>ترويسة أول صفحة:</span>
                  <input
                    type="checkbox"
                    checked={settings.headerEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, headerEnabled: e.target.checked }))}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>شريط بيانات الطالب في أول صفحة:</span>
                  <input
                    type="checkbox"
                    checked={settings.studentFields}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, studentFields: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>إظهار الترجمة العربية تحت أسئلة اللغات:</span>
                  <input
                    type="checkbox"
                    checked={settings.showTranslations}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showTranslations: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>إظهار شارة نوع السؤال (MCQ / مقالي):</span>
                  <input
                    type="checkbox"
                    checked={settings.showQuestionType}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showQuestionType: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>إظهار التفسير وسبب الإجابة:</span>
                  <input
                    type="checkbox"
                    checked={settings.showExplain}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showExplain: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>جدول مفتاح الإجابات السريع في نهاية المذكرة:</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.showAnswerSummary)}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showAnswerSummary: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: QUESTIONS MANAGEMENT AND REORDERING */}
          {activeStep === "step4_questions" && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-foreground">
                    إدارة وترتيب الأسئلة ({questions.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    الأسئلة النشطة في الطباعة: {activeQuestions.length}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddQuestionModal(true)}
                  className="h-7 text-xs font-bold bg-primary hover:bg-primary/90 text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة سؤال</span>
                </Button>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center justify-between gap-2 text-xs border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.map((q) => ({ ...q, enabled: true })))}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    تفعيل الكل
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.map((q) => ({ ...q, enabled: false })))}
                    className="text-muted-foreground hover:underline cursor-pointer"
                  >
                    تعطيل الكل
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من مسح جميع الأسئلة؟")) {
                      setQuestions([]);
                    }
                  }}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  مسح الكل
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    لا توجد أسئلة حالياً. استخدم الخطوة 1 و 2 لإضافة أسئلة.
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition ${
                        q.enabled
                          ? "bg-card border-border"
                          : "bg-muted/40 border-dashed border-border opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={q.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setQuestions((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, enabled: checked } : x)),
                              );
                            }}
                            className="h-3.5 w-3.5 accent-primary rounded cursor-pointer"
                          />
                          <span className="font-bold text-foreground">#{idx + 1}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              q.type === "MCQ"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                : q.type === "TRUE_FALSE"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                  : "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                            }`}
                          >
                            {q.type === "MCQ" ? "MCQ" : q.type === "TRUE_FALSE" ? "صواب/خطأ" : "مقالي"}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveQuestion(idx, idx - 1)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                            title="تقديم"
                          >
                            <MoveUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => moveQuestion(idx, idx + 1)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                            title="تأخير"
                          >
                            <MoveDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingQuestion({
                                index: idx,
                                data: {
                                  ...q,
                                  options: q.options ? [...q.options.map((o) => ({ ...o }))] : [],
                                },
                              })
                            }
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary cursor-pointer"
                            title="تعديل السؤال"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(idx)}
                            className="p-1 rounded hover:bg-rose-100 text-muted-foreground hover:text-rose-600 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-foreground line-clamp-2 leading-relaxed">
                        {q.statement}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Warnings box */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>ملاحظات التقسيم الذاتي:</span>
              </div>
              <ul className="list-disc pr-4 space-y-0.5 text-[11px]">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* LEFT PANEL: Live Document Preview (~66% width on desktop) */}
        <main
          className={`flex-1 min-w-0 w-full space-y-4 ${
            mobileWorkspaceTab === "config" ? "hidden lg:block" : ""
          }`}
        >
          {/* Live Preview Control Toolbar */}
          <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-3 text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span>
                  الصفحات: <strong className="font-mono">{pages.length}</strong>
                </span>
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  الأسئلة المعروضة: <strong className="font-mono">{activeQuestions.length}</strong>
                </span>
              </span>
            </div>

            {/* Pagination & Zoom Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Page Navigator */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAllPages(true)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    showAllPages
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  عرض الكل متتالي
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllPages(false)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    !showAllPages
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  صفحة صفحة
                </button>
              </div>

              {!showAllPages && pages.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold px-1.5">
                    {pageIndex + 1} / {pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={pageIndex >= pages.length - 1}
                    onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                    className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5 pl-2 border-r border-border mr-1">
                <input
                  type="range"
                  min="0.45"
                  max="1.2"
                  step="0.05"
                  value={scale}
                  onChange={(e) => {
                    setAutoScale(false);
                    setScale(parseFloat(e.target.value));
                  }}
                  className="w-16 h-1 accent-primary cursor-pointer"
                  title="التحكم في تكبير المعاينة"
                />
                <span className="text-[11px] font-mono text-muted-foreground min-w-[32px]">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoScale(true);
                  }}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted hover:text-primary cursor-pointer"
                  title="ملاءمة تلقائية لعرض الشاشة"
                >
                  ملاءمة
                </button>
              </div>
            </div>
          </div>

          {/* Rendered Scaled A4 Document Canvas */}
          <div
            ref={paperAreaRef}
            className="w-full bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-start overflow-auto border border-border min-h-[600px]"
          >
            {pages.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <FileQuestion className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">لا توجد أسئلة معروضة في المستند حالياً.</p>
              </div>
            ) : (
              (showAllPages ? pages : [pages[pageIndex] || { col1: [], col2: [] }]).map((pageData, pageOffset) => {
                const actualPageIdx = showAllPages ? pageOffset : pageIndex;
                const pageNumber = actualPageIdx + 1;
                const isP1 = actualPageIdx === 0;
                const isTwoCol = settings.layoutColumns === 2;
                const theme = getThemeConfig(settings.templateStyle);
                const badgeText =
                  settings.templateStyle === "exam"
                    ? "ورقة اختبار رسمي"
                    : settings.templateStyle === "tech"
                      ? "بنك الأسئلة والتقييمات"
                      : settings.templateStyle === "emerald"
                        ? "التقييم الشامل والتدريبات"
                        : "مذكرة تدريبات وبنك أسئلة";

                const topPaddingMm = isP1 ? region.top : region.contTop;

                const a4PixelW = Math.round((210 * 96) / 25.4);
                const a4PixelH = Math.round((297 * 96) / 25.4);
                const displayPageNo = (settings.pageStart || 1) + actualPageIdx;
                const displayTotalPages = (settings.pageStart || 1) + pages.length - 1;
                const pageNumLabel = settings.showTotalPages
                  ? `صفحة ${displayPageNo} من ${displayTotalPages}`
                  : `صفحة ${displayPageNo}`;

                return (
                  <div key={actualPageIdx} className="flex flex-col items-center gap-2 mb-8 last:mb-0">
                    <div className="no-print text-[11px] font-bold text-slate-400">
                      ورقة A4 — صفحة {pageNumber} من {pages.length}
                    </div>

                    {/* Scaled Wrapper */}
                    <div
                      className="shadow-2xl rounded-sm transition-all overflow-hidden"
                      style={{
                        width: `${Math.round(a4PixelW * scale)}px`,
                        height: `${Math.round(a4PixelH * scale)}px`,
                        direction: "ltr",
                      }}
                    >
                      <div
                        style={{
                          width: "210mm",
                          height: "297mm",
                          transform: `scale(${scale})`,
                          transformOrigin: "top left",
                          direction: settings.contentDir,
                          boxSizing: "border-box",
                          backgroundColor: "#ffffff",
                          color: "#0f172a",
                          fontFamily: settings.fontSelect,
                          fontSize: `${settings.fontSize}pt`,
                          lineHeight: `${settings.lineHeight}`,
                          padding: `${topPaddingMm}mm ${region.right}mm ${region.bottom}mm ${region.left}mm`,
                          position: "relative",
                        }}
                      >
                        {/* Clean Editorial Page 1 Masthead (Zero M-circles or heavy pill stickers) */}
                        {isP1 && settings.headerEnabled && (
                          <div
                            style={{
                              width: "100%",
                              marginBottom: "3mm",
                              paddingBottom: "2mm",
                              borderBottom: theme.headerBorder,
                              boxSizing: "border-box",
                              color: "#0f172a",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                marginBottom: "1.4mm",
                                fontSize: "7.8pt",
                                fontWeight: 700,
                                color: theme.drSubTextColor,
                              }}
                            >
                              <span>د. محمود المهدي • الحاسب الآلي والذكاء الاصطناعي</span>
                              <span style={{ color: settings.showAnswers ? "#92400e" : theme.accentColor }}>
                                {settings.showAnswers ? "نموذج إجابة المعلم" : badgeText}
                              </span>
                            </div>
                            <div style={{ width: "100%", padding: "0 1mm", textAlign: "center" }}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => {
                                  if (e.currentTarget.textContent?.includes("انقر هنا لكتابة عنوان الورقة")) {
                                    e.currentTarget.textContent = "";
                                  }
                                }}
                                onBlur={(e) => {
                                  const text = (e.currentTarget.textContent || "").trim();
                                  if (!text || text.includes("انقر هنا لكتابة عنوان الورقة")) {
                                    setSettings((s) => ({ ...s, headerText: "" }));
                                  } else {
                                    setSettings((s) => ({ ...s, headerText: sanitizeMemoText(text) }));
                                  }
                                }}
                                title="انقر هنا للكتابة وتعديل العنوان بحرية تامة مباشرة على الورقة"
                                style={{
                                  fontSize: "12.5pt",
                                  fontWeight: 800,
                                  lineHeight: 1.35,
                                  wordBreak: "normal",
                                  overflowWrap: "anywhere",
                                  cursor: "text",
                                  outline: "none",
                                  minHeight: "18px",
                                  textAlign: "center",
                                  color: sanitizeMemoText(settings.headerText) ? "#0f172a" : "#94a3b8",
                                  fontStyle: sanitizeMemoText(settings.headerText) ? "normal" : "italic",
                                }}
                                className="hover:bg-amber-500/10 focus:bg-amber-500/10 rounded px-1 -mx-1 transition-colors"
                              >
                                {sanitizeMemoText(settings.headerText) || "انقر هنا لكتابة عنوان الورقة بنفسك بحرية... ✍️"}
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent || "";
                                  setSettings((s) => ({ ...s, subHeaderText: text }));
                                }}
                                title="انقر هنا لتعديل العنوان الفرعي / المرحلة مباشرة على الورقة"
                                style={{
                                  fontSize: "8pt",
                                  fontWeight: 600,
                                  marginTop: "0.8mm",
                                  color: "#475569",
                                  lineHeight: 1.35,
                                  wordBreak: "normal",
                                  overflowWrap: "anywhere",
                                  cursor: "text",
                                  outline: "none",
                                  textAlign: "center",
                                }}
                                className="hover:bg-amber-500/10 focus:bg-amber-500/10 rounded px-1 -mx-1 transition-colors"
                              >
                                {sanitizeMemoText(settings.subHeaderText) || "انقر هنا لكتابة العنوان الفرعي / تفاصيل المذكرة"}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Continuation Header */}
                        {!isP1 && settings.continuationHeader === "minimal" && (
                          <div
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingBottom: "1.2mm",
                              marginBottom: "2.5mm",
                              borderBottom: `1px solid ${theme.cardBorderColor}`,
                              color: "#475569",
                              boxSizing: "border-box",
                            }}
                          >
                            <span style={{ fontSize: "8pt", fontWeight: 700 }}>
                              {sanitizeMemoText(settings.headerText)}
                            </span>
                            <span style={{ fontSize: "7.6pt", fontWeight: 700 }}>
                              د. محمود المهدي • Dr / Elmahdy
                            </span>
                          </div>
                        )}

                        {/* Student Strip */}
                        {isP1 && settings.studentFields && (
                          <div dangerouslySetInnerHTML={{ __html: studentStripHtml }} />
                        )}

                        {/* Questions List on this page (1 or 2 columns) */}
                        {isTwoCol ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "6mm",
                              alignItems: "start",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              {pageData.col1.map((item, itemIdx) => (
                                <div key={itemIdx} dangerouslySetInnerHTML={{ __html: item.html }} />
                              ))}
                            </div>
                            <div
                              style={{
                                minWidth: 0,
                                borderInlineStart: pageData.col2.length > 0 ? "1px solid #e2e8f0" : undefined,
                                paddingInlineStart: pageData.col2.length > 0 ? "3mm" : undefined,
                              }}
                            >
                              {pageData.col2.map((item, itemIdx) => (
                                <div key={itemIdx} dangerouslySetInnerHTML={{ __html: item.html }} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: "100%", boxSizing: "border-box" }}>
                            {pageData.col1.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                dangerouslySetInnerHTML={{ __html: item.html }}
                                style={{ width: "100%", boxSizing: "border-box" }}
                              />
                            ))}
                          </div>
                        )}

                        {pageData.trailerHtml && (
                          <div dangerouslySetInnerHTML={{ __html: pageData.trailerHtml }} />
                        )}

                        {/* Page Footer */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "3.5mm",
                            left: `${region.left}mm`,
                            right: `${region.right}mm`,
                            display: "flex",
                            justifyContent: settings.numPosition === "center" ? "center" : "space-between",
                            alignItems: "center",
                            fontSize: "7.5pt",
                            fontWeight: 600,
                            color: "#64748b",
                            borderTop: "1px solid #e2e8f0",
                            paddingTop: "1.2mm",
                          }}
                        >
                          {settings.numPosition === "right" ? (
                            <>
                              <span style={{ color: theme.accentColor, fontWeight: 700 }}>{pageNumLabel}</span>
                              <span>
                                {sanitizeMemoText(
                                  settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
                                )}
                              </span>
                            </>
                          ) : settings.numPosition === "center" ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4mm" }}>
                              <span>
                                {sanitizeMemoText(
                                  settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
                                )}
                              </span>
                              <span style={{ color: theme.accentColor, fontWeight: 700 }}>{pageNumLabel}</span>
                            </div>
                          ) : (
                            <>
                              <span>
                                {sanitizeMemoText(
                                  settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
                                )}
                              </span>
                              <span style={{ color: theme.accentColor, fontWeight: 700 }}>{pageNumLabel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* MODAL: Question Editor */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                <span>تعديل السؤال #{editingQuestion.index + 1}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">نوع السؤال:</label>
                <select
                  value={editingQuestion.data.type}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      data: { ...editingQuestion.data, type: e.target.value as any },
                    })
                  }
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold cursor-pointer"
                >
                  <option value="MCQ">اختيار من متعدد (MCQ)</option>
                  <option value="TRUE_FALSE">صواب أم خطأ (True/False)</option>
                  <option value="ESSAY">سؤال مقالي (Essay)</option>
                  <option value="DEFINITION">تعريف ومصطلح</option>
                  <option value="TEXT">ملاحظة / نص حر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">نص السؤال / المطلوب:</label>
                <textarea
                  rows={3}
                  value={editingQuestion.data.statement}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      data: { ...editingQuestion.data, statement: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Options for MCQ */}
              {editingQuestion.data.type === "MCQ" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold">خيارات الإجابة:</label>
                  {(editingQuestion.data.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-6 text-center">
                        {ARABIC_LETTERS[optIdx] ?? optIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const nextOpts = [...(editingQuestion.data.options || [])];
                          nextOpts[optIdx] = { ...opt, text: e.target.value };
                          setEditingQuestion({
                            ...editingQuestion,
                            data: { ...editingQuestion.data, options: nextOpts },
                          });
                        }}
                        className="flex-1 h-8 px-2 rounded border border-border bg-background text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextOpts = (editingQuestion.data.options || []).filter(
                            (_, i) => i !== optIdx,
                          );
                          setEditingQuestion({
                            ...editingQuestion,
                            data: { ...editingQuestion.data, options: nextOpts },
                          });
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextOpts = [
                        ...(editingQuestion.data.options || []),
                        { text: "", isCorrect: false, id: Date.now() },
                      ];
                      setEditingQuestion({
                        ...editingQuestion,
                        data: { ...editingQuestion.data, options: nextOpts },
                      });
                    }}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>إضافة خيار إضافي</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1">
                  {editingQuestion.data.type === "ESSAY"
                    ? "الإجابة النموذجية المقالية:"
                    : "الإجابة الصحيحة:"}
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.data.answer}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      data: { ...editingQuestion.data, answer: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">التفسير والتعليل العلمي:</label>
                <textarea
                  rows={2}
                  value={editingQuestion.data.explanation}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      data: { ...editingQuestion.data, explanation: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الترجمة الإنجليزية (إن وجدت):</label>
                <input
                  type="text"
                  value={editingQuestion.data.translation}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      data: { ...editingQuestion.data, translation: e.target.value },
                    })
                  }
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingQuestion(null)}
                className="cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const idx = editingQuestion.index;
                  setQuestions((prev) => {
                    const next = [...prev];
                    next[idx] = { ...editingQuestion.data };
                    return next;
                  });
                  setEditingQuestion(null);
                  toast({ title: "تم حفظ تعديلات السؤال بنجاح ✓" });
                }}
                className="cursor-pointer"
              >
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Custom Question */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>إضافة سؤال جديد للمذكرة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddQuestionModal(false)}
                className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const qType = form.qtype.value as any;
                const statement = form.statement.value.trim();
                const answer = form.answer.value.trim();
                const explanation = form.explanation.value.trim();

                let options: any[] = [];
                if (qType === "MCQ") {
                  options = [
                    { text: form.opt1?.value?.trim() || "", isCorrect: true },
                    { text: form.opt2?.value?.trim() || "", isCorrect: false },
                    { text: form.opt3?.value?.trim() || "", isCorrect: false },
                    { text: form.opt4?.value?.trim() || "", isCorrect: false },
                  ].filter((o) => o.text);
                } else if (qType === "TRUE_FALSE") {
                  options = [
                    { text: "صواب", isCorrect: answer.includes("صواب") },
                    { text: "خطأ", isCorrect: answer.includes("خطأ") },
                  ];
                }

                const newQ: NormalizedQuestion = {
                  id: `custom-${Date.now()}`,
                  type: qType,
                  statement,
                  options,
                  answer: answer || (options[0]?.text ?? ""),
                  explanation,
                  translation: "",
                  enabled: true,
                };

                setQuestions((prev) => [...prev, newQ]);
                setShowAddQuestionModal(false);
                toast({ title: "تمت إضافة السؤال بنجاح ✓" });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold mb-1">نوع السؤال:</label>
                <select
                  name="qtype"
                  defaultValue="MCQ"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold cursor-pointer"
                >
                  <option value="MCQ">اختيار من متعدد (MCQ)</option>
                  <option value="TRUE_FALSE">صواب أم خطأ (True/False)</option>
                  <option value="ESSAY">سؤال مقالي (Essay ✍️)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">نص السؤال *:</label>
                <textarea
                  name="statement"
                  required
                  rows={3}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs font-bold focus:outline-none"
                  placeholder="اكتب صيغة السؤال هنا..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">خيارات الاختيار من متعدد (إن وجد):</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="opt1"
                    placeholder="الخيار الصحيح (أ)"
                    className="h-8 px-2 rounded border border-border bg-background text-xs"
                  />
                  <input
                    type="text"
                    name="opt2"
                    placeholder="الخيار الثاني (ب)"
                    className="h-8 px-2 rounded border border-border bg-background text-xs"
                  />
                  <input
                    type="text"
                    name="opt3"
                    placeholder="الخيار الثالث (ج)"
                    className="h-8 px-2 rounded border border-border bg-background text-xs"
                  />
                  <input
                    type="text"
                    name="opt4"
                    placeholder="الخيار الرابع (د)"
                    className="h-8 px-2 rounded border border-border bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الإجابة النموذجية:</label>
                <input
                  type="text"
                  name="answer"
                  placeholder="نص الإجابة النموذجية..."
                  className="w-full h-8 px-2 rounded border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">التفسير أو التعليل العلمي:</label>
                <textarea
                  name="explanation"
                  rows={2}
                  placeholder="سبب صحة الإجابة..."
                  className="w-full p-2 rounded border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button type="submit" size="sm" className="bg-primary text-white cursor-pointer">
                  إضافة السؤال للمستند
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
