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
  cardStyle: "lines" | "cards" | "dashed";
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
}

const DEFAULT_SETTINGS: MemoSettings = {
  templateStyle: "royal",
  fitMode: "fill",
  topMm: 34,
  continuationTopMm: 12,
  bottomMm: 10,
  rightMm: 12,
  leftMm: 12,
  headerEnabled: true,
  continuationHeader: "minimal",
  headerText: "مذكرة التدريبات الشاملة وبنك الأسئلة",
  subHeaderText: "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
  guideView: false,
  showAnswers: false,
  showExplain: false,
  showTranslations: true,
  optionLayout: "auto",
  cardStyle: "lines",
  density: "balanced",
  showQuestionType: false,
  fontSelect: "'Cairo', sans-serif",
  fontSize: 11.5,
  lineHeight: 1.55,
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
};

// Global sanitizer to purge any "أكاديمية" or legacy titles from strings
export const sanitizeMemoText = (txt: string) => {
  return (txt || "")
    .replace(/أكاديمية\s*/g, "")
    .replace(/خبير وموجه[^•|]+/g, "")
    .trim();
};

interface ThemeConfig {
  accentColor: string;
  secondaryAccent: string;
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
        cardBorderColor: "#e2e8f0",
        cardBorderRight: "3px solid #0f172a",
        numBadgeBg: "#0f172a",
        numBadgeColor: "#ffffff",
        numBadgeBorder: "none",
        headerBorder: "2.5px solid #0f172a",
        headerTopAccent: "#0f172a",
        badgeBg: "#0f172a",
        badgeColor: "#ffffff",
        badgeBorder: "none",
        sealBg: "#f8fafc",
        sealBorder: "1.5px solid #0f172a",
        sealShadow: "none",
        crestBg: "#0f172a",
        crestBorder: "1px solid #0f172a",
        crestColor: "#ffffff",
        drTextColor: "#0f172a",
        drSubTextColor: "#475569",
        drPillBg: "#f1f5f9",
        drPillColor: "#0f172a",
        drPillBorder: "1px solid #cbd5e1",
        pageNumberBg: "#0f172a",
        pageNumberColor: "#ffffff",
        pageNumberBorder: "none",
      };
    case "tech":
      return {
        accentColor: "#0284c7",
        secondaryAccent: "#0369a1",
        cardBorderColor: "#e0f2fe",
        cardBorderRight: "3px solid #0284c7",
        numBadgeBg: "linear-gradient(135deg, #0284c7, #0369a1)",
        numBadgeColor: "#ffffff",
        numBadgeBorder: "none",
        headerBorder: "2px solid #0284c7",
        headerTopAccent: "linear-gradient(90deg, #0284c7, #38bdf8, #0284c7)",
        badgeBg: "linear-gradient(135deg, #0284c7, #0369a1)",
        badgeColor: "#ffffff",
        badgeBorder: "1px solid #38bdf8",
        sealBg: "#f0f9ff",
        sealBorder: "2px solid #0284c7",
        sealShadow: "0 0 10px rgba(2, 132, 199, 0.15)",
        crestBg: "linear-gradient(135deg, #0284c7, #075985)",
        crestBorder: "1.5px solid #38bdf8",
        crestColor: "#ffffff",
        drTextColor: "#0369a1",
        drSubTextColor: "#0284c7",
        drPillBg: "#e0f2fe",
        drPillColor: "#0369a1",
        drPillBorder: "1px solid #bae6fd",
        pageNumberBg: "linear-gradient(135deg, #0284c7, #0369a1)",
        pageNumberColor: "#ffffff",
        pageNumberBorder: "1px solid #38bdf8",
      };
    case "emerald":
      return {
        accentColor: "#059669",
        secondaryAccent: "#047857",
        cardBorderColor: "#d1fae5",
        cardBorderRight: "3px solid #059669",
        numBadgeBg: "linear-gradient(135deg, #059669, #047857)",
        numBadgeColor: "#ffffff",
        numBadgeBorder: "none",
        headerBorder: "2px solid #059669",
        headerTopAccent: "linear-gradient(90deg, #059669, #34d399, #059669)",
        badgeBg: "linear-gradient(135deg, #059669, #047857)",
        badgeColor: "#ffffff",
        badgeBorder: "1px solid #6ee7b7",
        sealBg: "#ecfdf5",
        sealBorder: "2px solid #059669",
        sealShadow: "0 0 10px rgba(5, 150, 105, 0.15)",
        crestBg: "linear-gradient(135deg, #059669, #065f46)",
        crestBorder: "1.5px solid #6ee7b7",
        crestColor: "#ffffff",
        drTextColor: "#047857",
        drSubTextColor: "#059669",
        drPillBg: "#d1fae5",
        drPillColor: "#047857",
        drPillBorder: "1px solid #a7f3d0",
        pageNumberBg: "linear-gradient(135deg, #059669, #047857)",
        pageNumberColor: "#ffffff",
        pageNumberBorder: "1px solid #6ee7b7",
      };
    case "minimal":
      return {
        accentColor: "#334155",
        secondaryAccent: "#64748b",
        cardBorderColor: "#e2e8f0",
        cardBorderRight: "2px solid #64748b",
        numBadgeBg: "#f1f5f9",
        numBadgeColor: "#0f172a",
        numBadgeBorder: "1px solid #cbd5e1",
        headerBorder: "1px solid #cbd5e1",
        headerTopAccent: "#64748b",
        badgeBg: "#f1f5f9",
        badgeColor: "#334155",
        badgeBorder: "1px solid #cbd5e1",
        sealBg: "#ffffff",
        sealBorder: "1px solid #cbd5e1",
        sealShadow: "none",
        crestBg: "#f8fafc",
        crestBorder: "1px solid #cbd5e1",
        crestColor: "#334155",
        drTextColor: "#1e293b",
        drSubTextColor: "#64748b",
        drPillBg: "#f8fafc",
        drPillColor: "#334155",
        drPillBorder: "1px solid #e2e8f0",
        pageNumberBg: "#f1f5f9",
        pageNumberColor: "#334155",
        pageNumberBorder: "1px solid #cbd5e1",
      };
    case "royal":
    default:
      return {
        accentColor: "#b45309",
        secondaryAccent: "#92400e",
        cardBorderColor: "#fef3c7",
        cardBorderRight: "3px solid #b45309",
        numBadgeBg: "linear-gradient(135deg, #b45309, #78350f)",
        numBadgeColor: "#ffffff",
        numBadgeBorder: "none",
        headerBorder: "2px solid #b45309",
        headerTopAccent: "linear-gradient(90deg, #b45309, #f59e0b, #b45309)",
        badgeBg: "linear-gradient(135deg, #b45309, #92400e)",
        badgeColor: "#ffffff",
        badgeBorder: "1px solid #fbbf24",
        sealBg: "#fffbeb",
        sealBorder: "2px solid #b45309",
        sealShadow: "0 0 10px rgba(180, 83, 9, 0.15)",
        crestBg: "linear-gradient(135deg, #b45309, #78350f)",
        crestBorder: "1.5px solid #f59e0b",
        crestColor: "#ffffff",
        drTextColor: "#92400e",
        drSubTextColor: "#b45309",
        drPillBg: "#fef3c7",
        drPillColor: "#92400e",
        drPillBorder: "1px solid #fde68a",
        pageNumberBg: "linear-gradient(135deg, #b45309, #92400e)",
        pageNumberColor: "#ffffff",
        pageNumberBorder: "1px solid #fbbf24",
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

  // Printable region in mm
  const region = useMemo(() => {
    let top = Math.max(12, Math.min(120, settings.topMm));
    if (settings.headerEnabled && top < 32) top = 32;
    let bottom = Math.max(8, Math.min(100, settings.bottomMm));
    let right = Math.max(6, Math.min(50, settings.rightMm));
    let left = Math.max(6, Math.min(50, settings.leftMm));
    return {
      top,
      bottom,
      right,
      left,
      width: 210 - right - left,
      height: 297 - top - bottom,
    };
  }, [settings.topMm, settings.bottomMm, settings.rightMm, settings.leftMm, settings.headerEnabled]);

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

  // Student header strip HTML
  const studentStripHtml = useMemo(() => {
    const theme = getThemeConfig(settings.templateStyle);
    if (settings.templateStyle === "exam") {
      return `<div style="background:#f8fafc;border:1.5px solid #0f172a;border-radius:2mm;padding:2.5mm 3.5mm;display:grid;grid-template-columns:repeat(4, 1fr);gap:2.5mm;font-size:9pt;color:#0f172a;margin-bottom:3.5mm;font-weight:bold;">
        <div>اسم الطالب: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #475569;"></span></div>
        <div>رقم الجلوس: <span style="display:inline-block;width:18mm;border-bottom:1px dotted #475569;"></span></div>
        <div>السنتر / المجموعة: <span style="display:inline-block;width:20mm;border-bottom:1px dotted #475569;"></span></div>
        <div style="text-align:left;color:#b45309;">الدرجة: [ &nbsp; / 50 &nbsp; ]</div>
      </div>`;
    }
    return `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-${settings.contentDir === "rtl" ? "right" : "left"}:3.5px solid ${theme.accentColor};border-radius:2.5mm;padding:2.2mm 3.5mm;display:flex;gap:4mm;justify-content:space-between;flex-wrap:wrap;font-size:9pt;color:#1e293b;margin-bottom:3mm;">
      <span style="white-space:nowrap;flex:1;min-width:25mm;">اسم الطالب: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">السنتر / المجموعة: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">رقم الهاتف: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
    </div>`;
  }, [settings.templateStyle, settings.contentDir]);

  // Card HTML generator with support for mixed question types and ruled essay lines
  const getCardHtml = (q: NormalizedQuestion, qNumber: number) => {
    const theme = getThemeConfig(settings.templateStyle);
    const stmtIsArabic = isArabicText(q.statement);
    const stmtDir = stmtIsArabic ? "rtl" : "ltr";
    const stmtAlign = stmtIsArabic ? "right" : "left";

    const typeLabel = {
      MCQ: stmtIsArabic ? "اختر الإجابة الصحيحة" : "Multiple choice",
      TRUE_FALSE: stmtIsArabic ? "صواب أم خطأ" : "True / False",
      ESSAY: stmtIsArabic ? "سؤال مقالي" : "Essay",
      DEFINITION: stmtIsArabic ? "تعريف ومصطلح" : "Definition",
      TEXT: stmtIsArabic ? "ملاحظة هامة" : "Note",
    }[q.type];

    const densityConfig = {
      compact: { pad: "1.2mm 1.5mm", gap: "1.0mm 2.0mm", qGap: "2.0mm" },
      balanced: { pad: "1.8mm 2.2mm", gap: "1.4mm 3.0mm", qGap: "2.8mm" },
      comfortable: { pad: "2.6mm 3.0mm", gap: "1.8mm 4.0mm", qGap: "4.0mm" },
    }[settings.density || "balanced"];

    if (q.type === "TEXT") {
      return `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:2mm;padding:2mm;white-space:pre-wrap;line-height:1.55;break-inside:avoid;direction:${stmtDir};text-align:${stmtAlign};">${q.statement}</div>`;
    }

    if (q.type === "DEFINITION") {
      const defAnsIsArabic = isArabicText(q.answer);
      return `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2mm;padding:2mm 2.5mm;break-inside:avoid;direction:${stmtDir};text-align:${stmtAlign};">
        <div style="font-weight:800;color:#0f172a;">${q.statement}</div>
        ${settings.showAnswers && q.answer ? `<div style="margin-top:1.2mm;white-space:pre-wrap;color:#334155;direction:${defAnsIsArabic ? "rtl" : "ltr"};text-align:${defAnsIsArabic ? "right" : "left"};">${q.answer}</div>` : ""}
      </div>`;
    }

    const opts =
      q.options && q.options.length
        ? q.options
        : q.type === "TRUE_FALSE"
          ? [{ text: stmtIsArabic ? "صواب" : "True" }, { text: stmtIsArabic ? "خطأ" : "False" }]
          : [];

    let colStyle = "grid-template-columns: repeat(2, minmax(0, 1fr));";
    if (settings.optionLayout === "auto") {
      const maxLen = Math.max(...opts.map((o) => (o.text || "").trim().length), 0);
      if (maxLen <= 18 && opts.length <= 4) {
        colStyle = "grid-template-columns: repeat(4, minmax(0, 1fr));";
      } else if (maxLen <= 48) {
        colStyle = "grid-template-columns: repeat(2, minmax(0, 1fr));";
      } else {
        colStyle = "grid-template-columns: 1fr;";
      }
    } else if (settings.optionLayout === "four") {
      colStyle = "grid-template-columns: repeat(4, minmax(0, 1fr));";
    } else if (settings.optionLayout === "two") {
      colStyle = "grid-template-columns: repeat(2, minmax(0, 1fr));";
    } else if (settings.optionLayout === "one") {
      colStyle = "grid-template-columns: 1fr;";
    }

    const optionsHtml = opts.length
      ? `<div style="display:grid;${colStyle}gap:${densityConfig.gap};margin-top:1.4mm;padding-inline-start:7.5mm;">
          ${opts
        .map((o, i) => {
          const optIsArabic = isArabicText(o.text);
          const optDir = optIsArabic ? "rtl" : "ltr";
          const optAlign = optIsArabic ? "right" : "left";
          const letter = optIsArabic
            ? (ARABIC_LETTERS[i] ?? i + 1)
            : (ENGLISH_LETTERS[i] ?? String.fromCharCode(65 + i));
          return `
            <div style="display:flex;gap:1.5mm;align-items:flex-start;break-inside:avoid;direction:${optDir};text-align:${optAlign};">
              <span style="display:inline-grid;place-items:center;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:50%;height:4.4mm;min-width:4.4mm;font:bold 7pt Arial;color:#334155;flex-shrink:0;">${letter}</span>
              <span style="flex:1;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4;direction:${optDir};">${o.text}</span>
            </div>`;
        })
        .join("")}
        </div>`
      : "";

    // Blank lined space for student handwritten essay answers
    const essayRuledLinesHtml =
      q.type === "ESSAY" && !settings.showAnswers && (settings.essayLines ?? 3) > 0
        ? `<div style="margin-top:2.2mm;margin-bottom:1mm;padding-inline-start:7.5mm;display:flex;flex-direction:column;gap:3.2mm;">
            ${Array.from({ length: settings.essayLines ?? 3 })
              .map(
                () =>
                  `<div style="border-bottom:1px dotted #94a3b8;width:100%;height:3.5mm;"></div>`,
              )
              .join("")}
          </div>`
        : "";

    let containerStyle = "";
    if (settings.cardStyle === "lines") {
      containerStyle = `border-bottom: 1px solid ${theme.cardBorderColor}; padding: ${densityConfig.pad}; padding-bottom: 1.5mm; margin-bottom: 0.5mm; background: transparent;`;
    } else if (settings.cardStyle === "dashed") {
      containerStyle = `border-bottom: 1px dashed #cbd5e1; padding: ${densityConfig.pad}; padding-bottom: 1.5mm; margin-bottom: 0.5mm; background: transparent;`;
    } else {
      containerStyle = `border: 1px solid ${theme.cardBorderColor}; border-${stmtIsArabic ? "right" : "left"}: ${theme.cardBorderRight}; border-radius: 2mm; padding: ${densityConfig.pad}; background: rgba(255,255,255,0.98);`;
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

    return `<article style="box-sizing:border-box;width:100%;max-width:100%;${containerStyle}break-inside:avoid;page-break-inside:avoid;position:relative;word-break:normal;overflow-wrap:anywhere;direction:${stmtDir};">
      <div style="display:flex;align-items:flex-start;gap:2mm;min-width:0;width:100%;box-sizing:border-box;direction:${stmtDir};">
        <span style="flex:0 0 auto;background:${theme.numBadgeBg};color:${theme.numBadgeColor};border:${theme.numBadgeBorder};border-radius:1.5mm;min-width:6.2mm;height:6.2mm;display:grid;place-items:center;font:bold 9pt 'Cairo',Arial;line-height:1;">${qNumber}</span>
        <div style="min-width:0;flex:1;box-sizing:border-box;text-align:${stmtAlign};">
          ${settings.showQuestionType ? `<span style="display:inline-block;color:#64748b;font-family:'Cairo',Arial;font-size:7pt;font-weight:700;margin-bottom:0.5mm;">${typeLabel}</span>` : ""}
          <div style="white-space:pre-wrap;font-weight:700;line-height:inherit;overflow-wrap:anywhere;direction:${stmtDir};text-align:${stmtAlign};">${q.statement || "—"}</div>
          ${settings.showTranslations && q.translation ? `<div style="white-space:pre-wrap;color:#475569;border-${stmtIsArabic ? "right" : "left"}:2px solid #94a3b8;padding-${stmtIsArabic ? "right" : "left"}:2mm;margin-top:1.2mm;font-size:0.92em;overflow-wrap:anywhere;direction:${transDir};text-align:${transAlign};">${q.translation}</div>` : ""}
        </div>
      </div>
      ${optionsHtml}
      ${essayRuledLinesHtml}
      ${settings.showAnswers && q.answer ? `<div style="box-sizing:border-box;background:#f0fdf4;border-${stmtIsArabic ? "right" : "left"}:2px solid #16a34a;border-radius:1.5mm;margin-top:1.4mm;margin-inline-start:7.5mm;padding:1.2mm 2.2mm;font-size:0.9em;color:#166534;white-space:pre-wrap;overflow-wrap:anywhere;direction:${ansDir};text-align:${ansAlign};"><span style="font-weight:bold;">${ansIsArabic ? "الإجابة النموذجية:" : "Model Answer:"}</span> ${q.answer}</div>` : ""}
      ${settings.showExplain && q.explanation ? `<div style="box-sizing:border-box;background:#fefce8;border-${stmtIsArabic ? "right" : "left"}:2px solid #ca8a04;border-radius:1.5mm;margin-top:1.0mm;margin-inline-start:7.5mm;padding:1.2mm 2.2mm;font-size:0.86em;color:#854d0e;white-space:pre-wrap;overflow-wrap:anywhere;direction:${expDir};text-align:${expAlign};"><span style="font-weight:bold;">${expIsArabic ? "التفسير والتعليل:" : "Explanation:"}</span> ${q.explanation}</div>` : ""}
    </article>`;
  };

  // Compile active enabled questions
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => q.enabled);
  }, [questions]);

  // Dynamic height measurements for headers
  const p1HeaderMeasuredH = useMemo(() => {
    if (!settings.headerEnabled) return 0;
    const badgeText =
      settings.templateStyle === "exam"
        ? "ورقة اختبار رسمي معتمد"
        : settings.templateStyle === "tech"
          ? "بنك الأسئلة والتقييمات"
          : settings.templateStyle === "emerald"
            ? "التقييم الشامل والتدريبات"
            : "مذكرة تدريبات وبنك أسئلة";
    const cleanTitle = sanitizeMemoText(settings.headerText);
    const cleanSub = sanitizeMemoText(settings.subHeaderText);

    const testHtml = `
      <div style="width:100%;margin-bottom:2.5mm;color:#0f172a;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:2mm;">
          <div style="display:flex;align-items:center;gap:2.5mm;padding:1.2mm 3.2mm;">
            <div style="width:7.5mm;height:7.5mm;border-radius:50%;"></div>
            <div style="display:flex;flex-direction:column;">
              <span style="font-size:9.5pt;font-weight:900;">د. محمود المهدي Dr / Elmahdy</span>
              <span style="font-size:6.8pt;font-weight:700;">الحاسب الآلي والذكاء الاصطناعي</span>
            </div>
          </div>
          <div><span style="padding:1.2mm 3.5mm;font-size:8pt;font-weight:800;">${badgeText}</span></div>
        </div>
        <div style="width:100%;padding:0 0.5mm;">
          <div style="font-size:11pt;font-weight:900;line-height:1.35;word-break:normal;overflow-wrap:anywhere;">${cleanTitle}</div>
          ${cleanSub ? `<div style="font-size:7.8pt;font-weight:600;margin-top:1.2mm;line-height:1.4;word-break:normal;overflow-wrap:anywhere;">${cleanSub}</div>` : ""}
        </div>
      </div>
    `;
    return measureHeight(testHtml, region.width);
  }, [settings.headerEnabled, settings.templateStyle, settings.headerText, settings.subHeaderText, region.width]);

  const contHeaderMeasuredH = useMemo(() => {
    if (settings.continuationHeader !== "minimal") return 0;
    const cleanTitle = sanitizeMemoText(settings.headerText);
    const testHtml = `
      <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding-bottom:1.4mm;margin-bottom:2.5mm;border-bottom:1.2px solid #000;box-sizing:border-box;">
        <span style="font-size:8.5pt;font-weight:800;">${cleanTitle}</span>
        <span style="font-size:8pt;font-weight:800;">د. محمود المهدي • Dr / Elmahdy</span>
      </div>
    `;
    return measureHeight(testHtml, region.width);
  }, [settings.continuationHeader, settings.headerText, region.width]);

  // Content-Aware A4 Pagination Engine: Zero Cutoffs & Slicing Protection
  const pages = useMemo(() => {
    const warns: string[] = [];
    const max = settings.maxQuestions || 99999;
    const densityGap = {
      compact: 2.0,
      balanced: 2.8,
      comfortable: 4.0,
    }[settings.density || "balanced"];

    const studentH = settings.studentFields ? measureHeight(studentStripHtml, region.width) : 0;
    const safetyBuffer = 4.0;

    const p1Top = settings.headerEnabled ? 7.5 : (settings.topMm || 12);
    const p1AvailableH =
      297 -
      p1Top -
      (settings.headerEnabled ? p1HeaderMeasuredH + 2.5 : 0) -
      (settings.studentFields ? studentH + densityGap : 0) -
      settings.bottomMm -
      safetyBuffer;

    const contTop =
      settings.continuationHeader === "minimal"
        ? 5.5
        : settings.continuationHeader === "none"
          ? settings.topMm || 7.5
          : settings.topMm || 12;
    const contAvailableH =
      297 -
      contTop -
      (settings.continuationHeader === "minimal" ? contHeaderMeasuredH + 2.5 : 0) -
      settings.bottomMm -
      safetyBuffer;

    const all: Array<Array<{ html: string; h: number; qNumber: number; rawQuestion?: any; qIndex?: number }>> = [];
    let current: Array<{ html: string; h: number; qNumber: number; rawQuestion?: any; qIndex?: number }> = [];
    let currentUsedH = 0;
    let count = 0;

    for (let idx = 0; idx < activeQuestions.length; idx++) {
      const q = activeQuestions[idx];
      const qNumber = settings.questionStart + count;
      const html = getCardHtml(q, qNumber);
      const h = measureHeight(html, region.width);

      const isFirstPage = all.length === 0;
      const targetAvailableH = isFirstPage ? p1AvailableH : contAvailableH;
      const gap = current.length === 0 ? 0 : densityGap;

      if (count >= max || (current.length > 0 && currentUsedH + gap + h > targetAvailableH)) {
        if (current.length) {
          all.push(current);
          current = [];
          currentUsedH = 0;
        }
      }

      const effectiveTargetH = all.length === 0 ? p1AvailableH : contAvailableH;
      if (h > effectiveTargetH) {
        warns.push(
          `السؤال #${qNumber} طويل جداً (${Math.round(h)}mm) وقد يستهلك مساحة الصفحة بمفرده. يُنصح بتقليل طول الفقرة.`,
        );
      }

      current.push({ html, h, qNumber, rawQuestion: q, qIndex: idx });
      currentUsedH += (current.length === 1 ? 0 : densityGap) + h;
      count++;

      if (count >= max) break;
    }

    if (current.length) {
      all.push(current);
    }

    setWarnings(warns);
    return all;
  }, [
    activeQuestions,
    settings,
    region.width,
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

  // Print via iframe
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

    const cleanTitle = sanitizeMemoText(settings.headerText) || "مذكرة تدريبات وبنك أسئلة A4";
    const cleanSub = sanitizeMemoText(settings.subHeaderText) || "";
    const theme = getThemeConfig(settings.templateStyle);
    const badgeText =
      settings.templateStyle === "exam"
        ? "ورقة اختبار رسمي معتمد"
        : settings.templateStyle === "tech"
          ? "بنك الأسئلة والتقييمات"
          : settings.templateStyle === "emerald"
            ? "التقييم الشامل والتدريبات"
            : "مذكرة تدريبات وبنك أسئلة";

    let htmlPages = "";
    pages.forEach((pageItems, pageIdx) => {
      const isP1 = pageIdx === 0;
      const topPaddingMm = isP1
        ? settings.headerEnabled
          ? 7.5
          : settings.topMm || 12
        : settings.continuationHeader === "minimal"
          ? 5.5
          : settings.continuationHeader === "none"
            ? settings.topMm || 7.5
            : settings.topMm || 12;

      let pHeader = "";
      if (isP1 && settings.headerEnabled) {
        pHeader = `
          <div style="width:100%;margin-bottom:2.5mm;color:#0f172a;box-sizing:border-box;">
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:2mm;">
              <div style="display:flex;align-items:center;gap:2.5mm;background:${theme.sealBg};border:1.2px solid ${theme.sealBorder};border-radius:2.5mm;padding:1.2mm 3.2mm;">
                <div style="width:7.5mm;height:7.5mm;border-radius:50%;background:${theme.crestBg};border:${theme.crestBorder};color:${theme.crestColor};display:grid;place-items:center;font-weight:900;font-size:7pt;">M</div>
                <div style="display:flex;flex-direction:column;">
                  <span style="font-size:9.5pt;font-weight:900;color:${theme.drTextColor};">د. محمود المهدي Dr / Elmahdy</span>
                  <span style="font-size:6.8pt;font-weight:700;color:${theme.drSubTextColor};">الحاسب الآلي والذكاء الاصطناعي</span>
                </div>
              </div>
              <div><span style="background:${settings.showAnswers ? "#FEF3C7" : theme.badgeBg};color:${settings.showAnswers ? "#92400E" : theme.badgeColor};border:${settings.showAnswers ? "1px solid #FCD34D" : theme.badgeBorder};padding:1.2mm 3.5mm;border-radius:1.5mm;font-size:8pt;font-weight:800;">${settings.showAnswers ? "نموذج إجابة المعلم" : badgeText}</span></div>
            </div>
            <div style="width:100%;padding:0 0.5mm;">
              <div style="font-size:11pt;font-weight:900;line-height:1.35;word-break:normal;overflow-wrap:anywhere;">${cleanTitle}</div>
              ${cleanSub ? `<div style="font-size:7.8pt;font-weight:600;margin-top:1.2mm;color:#475569;line-height:1.4;word-break:normal;overflow-wrap:anywhere;">${cleanSub}</div>` : ""}
            </div>
          </div>
        `;
      } else if (!isP1 && settings.continuationHeader === "minimal") {
        pHeader = `
          <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding-bottom:1.4mm;margin-bottom:2.5mm;border-bottom:1.2px solid #000;box-sizing:border-box;">
            <span style="font-size:8.5pt;font-weight:800;">${cleanTitle}</span>
            <span style="font-size:8pt;font-weight:800;">د. محمود المهدي • Dr / Elmahdy</span>
          </div>
        `;
      }

      const pStudent = isP1 && settings.studentFields ? studentStripHtml : "";
      const questionsBody = pageItems.map((item) => item.html).join("");
      const pageNumStr = settings.showTotalPages
        ? `صفحة ${pageIdx + 1} من ${pages.length}`
        : `صفحة ${pageIdx + 1}`;

      htmlPages += `
        <div class="print-page" style="box-sizing:border-box;width:210mm;height:297mm;position:relative;page-break-after:always;padding:${topPaddingMm}mm ${settings.rightMm}mm ${settings.bottomMm}mm ${settings.leftMm}mm;overflow:hidden;background:#ffffff;">
          ${pHeader}
          ${pStudent}
          <div style="width:100%;box-sizing:border-box;">
            ${questionsBody}
          </div>
          <div style="position:absolute;bottom:3.5mm;left:${settings.leftMm}mm;right:${settings.rightMm}mm;display:flex;justify-content:space-between;align-items:center;font-size:7.5pt;font-weight:bold;color:#64748b;border-top:1px solid #cbd5e1;padding-top:1.2mm;">
            <span>${sanitizeMemoText(settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي")}</span>
            <span style="background:${theme.pageNumberBg};color:${theme.pageNumberColor};padding:0.8mm 2.2mm;border-radius:1mm;">${pageNumStr}</span>
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

  // Export to Microsoft Word (.doc)
  const handleExportWord = () => {
    if (questions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة لتصديرها إلى ملف Word" });
      return;
    }

    const isRtl = settings.contentDir === "rtl";
    const title = sanitizeMemoText(settings.headerText) || "مذكرة تدريبات وبنك أسئلة";
    const subTitle = sanitizeMemoText(settings.subHeaderText) || "";

    let wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page Section1 {
            size: 21.0cm 29.7cm;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
            mso-page-orientation: portrait;
          }
          div.Section1 { page: Section1; }
          body {
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: ${isRtl ? "rtl" : "ltr"};
            text-align: ${isRtl ? "right" : "left"};
            font-size: 11pt;
            line-height: 1.5;
            color: #0f172a;
          }
          .doc-header-table {
            width: 100%;
            border-bottom: 2px solid #d97706;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .doc-title {
            font-size: 15pt;
            font-weight: bold;
            color: #0f172a;
            margin: 6px 0 2px 0;
            text-align: center;
          }
          .doc-subtitle {
            font-size: 10.5pt;
            color: #64748b;
            margin: 0 0 10px 0;
            text-align: center;
          }
          .student-box {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            margin-bottom: 16px;
            border-collapse: collapse;
          }
          .student-box td {
            padding: 6px 10px;
            font-size: 10pt;
            border: 1px solid #e2e8f0;
          }
          .question-item {
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #cbd5e1;
            page-break-inside: avoid;
          }
          .question-statement {
            font-size: 11.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 8px;
          }
          .question-badge {
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9.5pt;
            margin-left: 6px;
          }
          .options-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 6px;
          }
          .options-table td {
            padding: 5px 8px;
            font-size: 10.5pt;
            vertical-align: top;
          }
          .opt-badge {
            font-weight: bold;
            color: #0284c7;
            display: inline-block;
            width: 24px;
          }
          .answer-box {
            margin-top: 6px;
            padding: 6px 10px;
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            font-size: 10pt;
            color: #166534;
            border-radius: 4px;
          }
          .explanation-box {
            margin-top: 4px;
            padding: 6px 10px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            font-size: 9.5pt;
            color: #475569;
            border-radius: 4px;
          }
          .ruled-line {
            border-bottom: 1px dotted #94a3b8;
            height: 22px;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <table class="doc-header-table" dir="${isRtl ? "rtl" : "ltr"}">
            <tr>
              <td style="text-align: ${isRtl ? "right" : "left"}; vertical-align: middle;">
                <strong style="font-size: 13pt; color: #0f172a;">د. محمود المهدي</strong><br>
                <span style="font-size: 9pt; color: #d97706; font-weight: bold;">الحاسب الآلي والذكاء الاصطناعي • Dr / Elmahdy</span>
              </td>
              <td style="text-align: ${isRtl ? "left" : "right"}; vertical-align: middle;">
                <span style="background-color: #0f172a; color: #ffffff; padding: 4px 10px; font-size: 9.5pt; font-weight: bold; border-radius: 4px;">
                  ${settings.templateStyle === "exam" ? "ورقة اختبار رسمي" : "مذكرة تدريبات وبنك أسئلة"}
                </span>
              </td>
            </tr>
          </table>

          <div class="doc-title">${title}</div>
          ${subTitle ? `<div class="doc-subtitle">${subTitle}</div>` : ""}

          ${settings.studentFields ? `
            <table class="student-box" dir="${isRtl ? "rtl" : "ltr"}">
              <tr>
                <td style="width: 50%;"><strong>اسم الطالب:</strong> ................................................................</td>
                <td style="width: 25%;"><strong>السنتر / المجموعة:</strong> ..........................</td>
                <td style="width: 25%;"><strong>رقم الهاتف:</strong> ............................</td>
              </tr>
            </table>
          ` : ""}

          <div class="questions-list">
    `;

    activeQuestions.forEach((q, idx) => {
      const qNum = settings.questionStart + idx;
      wordContent += `
        <div class="question-item">
          <div class="question-statement">
            <span class="question-badge">(${qNum})</span>
            ${q.statement || q.prompt || ""}
          </div>
      `;

      if (q.options && q.options.length > 0) {
        wordContent += `<table class="options-table" dir="${isRtl ? "rtl" : "ltr"}">`;
        for (let i = 0; i < q.options.length; i += 2) {
          const letter1 = isRtl ? (ARABIC_LETTERS[i] ?? i + 1) : (ENGLISH_LETTERS[i] ?? String.fromCharCode(65 + i));
          const letter2 = isRtl ? (ARABIC_LETTERS[i + 1] ?? i + 2) : (ENGLISH_LETTERS[i + 1] ?? String.fromCharCode(65 + i + 1));
          wordContent += `<tr>`;
          wordContent += `<td style="width: 50%;"><span class="opt-badge">(${letter1})</span> ${q.options[i].text || ""}</td>`;
          if (q.options[i + 1]) {
            wordContent += `<td style="width: 50%;"><span class="opt-badge">(${letter2})</span> ${q.options[i + 1].text || ""}</td>`;
          } else {
            wordContent += `<td></td>`;
          }
          wordContent += `</tr>`;
        }
        wordContent += `</table>`;
      }

      if (q.type === "ESSAY" && !settings.showAnswers && (settings.essayLines ?? 3) > 0) {
        wordContent += `<div style="margin-top: 8px; margin-bottom: 10px; padding-right: 20px;">`;
        for (let l = 0; l < (settings.essayLines ?? 3); l++) {
          wordContent += `<div class="ruled-line"></div>`;
        }
        wordContent += `</div>`;
      }

      if (settings.showAnswers && q.answer) {
        wordContent += `<div class="answer-box"><strong>الإجابة النموذجية:</strong> ${q.answer}</div>`;
      }

      if (settings.showExplain && q.explanation) {
        wordContent += `<div class="explanation-box"><strong>التفسير والتعليل:</strong> ${q.explanation}</div>`;
      }

      wordContent += `</div>`;
    });

    wordContent += `
          </div>
          <div style="margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9pt; color: #64748b; text-align: center;">
            ${sanitizeMemoText(settings.footerText || "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي")}
          </div>
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

    toast({
      title: "تم تصدير ملف Word بنجاح 📄",
      description: "يمكنك الآن فتح الملف مباشرة في Microsoft Word والتعديل عليه بكل سهولة.",
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
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">عنوان الورقة:</span>
              <input
                type="text"
                value={settings.headerText}
                onChange={(e) => setSettings((s) => ({ ...s, headerText: e.target.value }))}
                placeholder="اكتب عنوان ورقة الامتحان / المذكرة بحرية هنا..."
                className="h-6 px-2 text-xs font-black rounded border border-slate-700 bg-slate-900/90 text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 w-full min-w-[180px] max-w-xs sm:max-w-md transition-all"
                title="اكتب أو عدل اسم المستند بحرية تامة"
              />
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
                            setQuestions(mapped);
                            setSettings((s) => ({ ...s, headerText: qz.title }));
                            toast({ title: `تم تحميل ${mapped.length} سؤال من اختبار (${qz.title})` });
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

              {/* Template Style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">قالب وشكل الورقة:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "royal", label: "ملكي راقي" },
                      { id: "exam", label: "اختبار رسمي" },
                      { id: "tech", label: "تقني وعصري" },
                      { id: "emerald", label: "زمردي" },
                      { id: "minimal", label: "بسيط وأنيق" },
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

              {/* Question Presentation Settings */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
                <label className="text-[11px] font-black text-foreground block">
                  خيارات عرض الأسئلة والخيارات:
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
                    <option value="per_type">ترقيم مستقل لكل نوع</option>
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
                  <span>كثافة الأسطر والتباعد:</span>
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
              </div>

              {/* Margins */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">
                  هوامش الصفحة (بالمليمتر):
                </label>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">أعلى</span>
                    <input
                      type="number"
                      min={10}
                      max={80}
                      value={settings.topMm}
                      onChange={(e) => setSettings((s) => ({ ...s, topMm: Number(e.target.value) }))}
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">أسفل</span>
                    <input
                      type="number"
                      min={6}
                      max={50}
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
                      max={40}
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
                      max={40}
                      value={settings.leftMm}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, leftMm: Number(e.target.value) }))
                      }
                      className="w-full h-7 text-center rounded border border-border bg-background font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-border">
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
              (showAllPages ? pages : [pages[pageIndex] || []]).map((pageItems, pageOffset) => {
                const actualPageIdx = showAllPages ? pageOffset : pageIndex;
                const pageNumber = actualPageIdx + 1;
                const isP1 = actualPageIdx === 0;
                const theme = getThemeConfig(settings.templateStyle);
                const badgeText =
                  settings.templateStyle === "exam"
                    ? "ورقة اختبار رسمي معتمد"
                    : settings.templateStyle === "tech"
                      ? "بنك الأسئلة والتقييمات"
                      : settings.templateStyle === "emerald"
                        ? "التقييم الشامل والتدريبات"
                        : "مذكرة تدريبات وبنك أسئلة";

                const topPaddingMm = isP1
                  ? settings.headerEnabled
                    ? 7.5
                    : settings.topMm || 12
                  : settings.continuationHeader === "minimal"
                    ? 5.5
                    : settings.continuationHeader === "none"
                      ? settings.topMm || 7.5
                      : settings.topMm || 12;

                const a4PixelW = Math.round((210 * 96) / 25.4);
                const a4PixelH = Math.round((297 * 96) / 25.4);

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
                          padding: `${topPaddingMm}mm ${settings.rightMm}mm ${settings.bottomMm}mm ${settings.leftMm}mm`,
                          position: "relative",
                        }}
                      >
                        {/* Page 1 Header */}
                        {isP1 && settings.headerEnabled && (
                          <div
                            style={{
                              width: "100%",
                              marginBottom: "2.5mm",
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
                                marginBottom: "2mm",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2.5mm",
                                  background: theme.sealBg,
                                  border: `1.2px solid ${theme.sealBorder}`,
                                  borderRadius: "2.5mm",
                                  padding: "1.2mm 3.2mm",
                                }}
                              >
                                <div
                                  style={{
                                    width: "7.5mm",
                                    height: "7.5mm",
                                    borderRadius: "50%",
                                    background: theme.crestBg,
                                    border: theme.crestBorder,
                                    color: theme.crestColor,
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 900,
                                    fontSize: "7pt",
                                  }}
                                >
                                  M
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span
                                    style={{
                                      fontSize: "9.5pt",
                                      fontWeight: 900,
                                      color: theme.drTextColor,
                                    }}
                                  >
                                    د. محمود المهدي Dr / Elmahdy
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "6.8pt",
                                      fontWeight: 700,
                                      color: theme.drSubTextColor,
                                    }}
                                  >
                                    الحاسب الآلي والذكاء الاصطناعي
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span
                                  style={{
                                    background: settings.showAnswers ? "#FEF3C7" : theme.badgeBg,
                                    color: settings.showAnswers ? "#92400E" : theme.badgeColor,
                                    border: settings.showAnswers ? "1px solid #FCD34D" : theme.badgeBorder,
                                    padding: "1.2mm 3.5mm",
                                    borderRadius: "1.5mm",
                                    fontSize: "8pt",
                                    fontWeight: 800,
                                  }}
                                >
                                  {settings.showAnswers ? "نموذج إجابة المعلم 👨‍🏫" : badgeText}
                                </span>
                              </div>
                            </div>
                            <div style={{ width: "100%", padding: "0 0.5mm" }}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent || "";
                                  setSettings((s) => ({ ...s, headerText: text }));
                                }}
                                title="انقر هنا للكتابة وتعديل العنوان مباشرة على الورقة"
                                style={{
                                  fontSize: "11pt",
                                  fontWeight: 900,
                                  lineHeight: 1.35,
                                  wordBreak: "normal",
                                  overflowWrap: "anywhere",
                                  cursor: "text",
                                  outline: "none",
                                }}
                                className="hover:bg-amber-500/10 focus:bg-amber-500/10 rounded px-1 -mx-1 transition-colors"
                              >
                                {sanitizeMemoText(settings.headerText)}
                              </div>
                              {settings.subHeaderText && (
                                <div
                                  style={{
                                    fontSize: "7.8pt",
                                    fontWeight: 600,
                                    marginTop: "1.2mm",
                                    color: "#475569",
                                    lineHeight: 1.4,
                                    wordBreak: "normal",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {sanitizeMemoText(settings.subHeaderText)}
                                </div>
                              )}
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
                              paddingBottom: "1.4mm",
                              marginBottom: "2.5mm",
                              borderBottom: "1.2px solid #000",
                              boxSizing: "border-box",
                            }}
                          >
                            <span style={{ fontSize: "8.5pt", fontWeight: 800 }}>
                              {sanitizeMemoText(settings.headerText)}
                            </span>
                            <span style={{ fontSize: "8pt", fontWeight: 800 }}>
                              د. محمود المهدي • Dr / Elmahdy
                            </span>
                          </div>
                        )}

                        {/* Student Strip */}
                        {isP1 && settings.studentFields && (
                          <div dangerouslySetInnerHTML={{ __html: studentStripHtml }} />
                        )}

                        {/* Questions List on this page */}
                        <div style={{ width: "100%", boxSizing: "border-box" }}>
                          {pageItems.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              dangerouslySetInnerHTML={{ __html: item.html }}
                              style={{ width: "100%", boxSizing: "border-box" }}
                            />
                          ))}
                        </div>

                        {/* Page Footer */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "3.5mm",
                            left: `${settings.leftMm}mm`,
                            right: `${settings.rightMm}mm`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "7.5pt",
                            fontWeight: "bold",
                            color: "#64748b",
                            borderTop: "1px solid #cbd5e1",
                            paddingTop: "1.2mm",
                          }}
                        >
                          <span>
                            {sanitizeMemoText(
                              settings.footerText ||
                                "د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
                            )}
                          </span>
                          <span
                            style={{
                              background: theme.pageNumberBg,
                              color: theme.pageNumberColor,
                              padding: "0.8mm 2.2mm",
                              borderRadius: "1mm",
                            }}
                          >
                            صفحة {pageNumber} من {pages.length}
                          </span>
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
