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
  options: { text: string; isCorrect: boolean }[];
  answer: string;
  explanation: string;
  translation: string;
  enabled: boolean;
  _source?: number;
}

interface MemoSettings {
  templateStyle: "royal" | "exam" | "minimal" | "custom";
  fitMode: "fill" | "contain" | "cover";
  topMm: number;
  bottomMm: number;
  rightMm: number;
  leftMm: number;
  headerEnabled: boolean;
  headerText: string;
  subHeaderText: string;
  guideView: boolean;
  showAnswers: boolean;
  showExplain: boolean;
  showTranslations: boolean;
  optionLayout: "two" | "one";
  showQuestionType: boolean;
  fontSelect: string;
  fontSize: number;
  lineHeight: number;
  contentDir: "rtl" | "ltr";
  questionStart: number;
  pageStart: number;
  maxQuestions: number;
  footerText: string;
  numPosition: "left" | "right" | "center";
  studentFields: boolean;
}

const DEFAULT_SETTINGS: MemoSettings = {
  templateStyle: "royal",
  fitMode: "fill",
  topMm: 36,
  bottomMm: 27,
  rightMm: 15,
  leftMm: 15,
  headerEnabled: true,
  headerText: "مذكرة التدريبات الشاملة وبنك الأسئلة",
  subHeaderText: "أكاديمية د. محمود المهدي | الحاسب الآلي والذكاء الاصطناعي",
  guideView: false,
  showAnswers: false,
  showExplain: false,
  showTranslations: true,
  optionLayout: "two",
  showQuestionType: false,
  fontSelect: "'Cairo', sans-serif",
  fontSize: 12.5,
  lineHeight: 1.6,
  contentDir: "rtl",
  questionStart: 1,
  pageStart: 1,
  maxQuestions: 0,
  footerText: "أكاديمية د. محمود المهدي | دليلك للتميز والدرجة النهائية",
  numPosition: "left",
  studentFields: true,
};

const SAMPLE_QUESTIONS: any[] = [
  {
    type: "MCQ",
    statement: "نص السؤال التجريبي الأول: اختر الإجابة الصحيحة من البدائل التالية المتعلقة بمفاهيم الذكاء الاصطناعي.",
    options: [
      { text: "الخوارزميات التقليدية فقط", isCorrect: false },
      { text: "تعلم الآلة والشبكات العصبية العميقة", isCorrect: true },
      { text: "أنظمة التخزين السحابي الساكنة", isCorrect: false },
      { text: "معالجات الرسوميات البسيطة", isCorrect: false },
    ],
    answer: "تعلم الآلة والشبكات العصبية العميقة",
    explanation: "تفسير توضيحي: الشبكات العصبية تمثل الركيزة الأساسية للتعلم العميق وتحليل البيانات المعقدة.",
  },
  {
    type: "MCQ",
    statement: "أي الاختيارات التالية يُمثّل الإجراء الأنسب لحماية الخصوصية الرقمية عند استخدام تقنيات الذكاء الاصطناعي؟",
    options: [
      "مشاركة كافة البيانات بدون قيود",
      "تطبيق التشفير الشامل وسياسات تقليل البيانات",
      "تعطيل جدران الحماية بالكامل",
      "استخدام كلمات مرور مكررة وسهلة",
    ],
    answer: "تطبيق التشفير الشامل وسياسات تقليل البيانات",
  },
  {
    type: "TRUE_FALSE",
    statement: "يساعد الذكاء الاصطناعي في تحليل البيانات الطبية والتنبؤ المبكر بالأمراض بدقة عالية.",
    options: ["صواب", "خطأ"],
    answer: "صواب",
  },
  {
    type: "ESSAY",
    statement: "اشرح باختصار أهمية الأخلاقيات الرقمية عند تصميم وتدريب نماذج الذكاء الاصطناعي التوليدي.",
    answer: "الإجابة النموذجية: لضمان العدالة، وتفادي التحيز والتمييز، وحماية الملكية الفكرية وسرية بيانات المستخدمين.",
  },
  {
    type: "MCQ",
    statement: "Which of the following is considered a primary objective of cybersecurity in modern computer systems?",
    translation: "أي مما يلي يُعد هدفاً رئيسياً للأمن السيبراني في أنظمة الحاسب الحديثة؟",
    options: [
      "Increasing power consumption",
      "Ensuring confidentiality, integrity, and availability (CIA triad)",
      "Deleting system log files automatically",
      "Overclocking central processing units",
    ],
    answer: "Ensuring confidentiality, integrity, and availability (CIA triad)",
    explanation: "Explanation: The CIA triad represents the foundational model of information security.",
  },
];

const ARABIC_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
const ENGLISH_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function normalizeType(x: any): "MCQ" | "TRUE_FALSE" | "ESSAY" | "DEFINITION" | "TEXT" {
  const t = String(x || "").toUpperCase().replace(/[\s-]+/g, "_");
  if (["MCQ", "MULTIPLE_CHOICE", "CHOICE", "MULTIPLECHOICE", "اختيار_من_متعدد"].includes(t)) return "MCQ";
  if (["TRUE_FALSE", "TRUEFALSE", "TF", "T_F", "صواب_وخطأ", "صح_وخطأ"].includes(t)) return "TRUE_FALSE";
  if (["ESSAY", "SHORT_ANSWER", "LONG_ANSWER", "مقالي"].includes(t)) return "ESSAY";
  if (["DEFINITION", "DEFINE", "تعريف"].includes(t)) return "DEFINITION";
  if (["TEXT", "PARAGRAPH", "NOTE", "CONTENT"].includes(t)) return "TEXT";
  return "MCQ";
}

function textValue(v: any): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object" && !Array.isArray(v)) {
    return String(v.text ?? v.value ?? v.label ?? v.statement ?? v.prompt ?? "");
  }
  return String(v);
}

function normalizeQuestion(raw: any, i: number): NormalizedQuestion {
  const statement = textValue(raw.statement ?? raw.prompt ?? raw.question ?? raw.questionText ?? raw.text ?? raw.definition ?? "");
  let opt = raw.options ?? raw.choices ?? raw.answers ?? [];
  if (!Array.isArray(opt)) {
    opt = Object.entries(opt).map(([k, v]) => ({ label: k, text: textValue(v) }));
  }
  const type = normalizeType(raw.type ?? raw.question_type ?? (raw.definition ? "DEFINITION" : raw.options || raw.choices ? "MCQ" : "ESSAY"));
  const options = opt.map((o: any, idx: number) => ({
    text: textValue(o),
    isCorrect:
      typeof o === "object" && o !== null
        ? Boolean(o.isCorrect ?? o.correct ?? (raw.correctIndex !== undefined && raw.correctIndex === idx))
        : raw.correctIndex !== undefined && raw.correctIndex === idx,
  }));
  let ans = raw.answer ?? raw.correctAnswer ?? raw.correct_answer ?? raw.modelAnswer ?? raw.model_answer ?? "";
  if (typeof ans === "number" && options[ans]) ans = options[ans].text;
  if (Array.isArray(ans)) ans = ans.map(textValue).join(" / ");
  if (typeof ans === "object" && ans !== null) ans = textValue(ans);
  if (!ans) {
    const correct = options.filter((x: any) => x.isCorrect).map((x: any) => x.text);
    if (correct.length) ans = correct.join(" / ");
  }
  return {
    id: raw.id ?? `q-${Date.now()}-${i}`,
    type,
    statement,
    options,
    answer: String(ans),
    explanation: textValue(raw.explanation ?? raw.reason ?? raw.justification ?? ""),
    translation: textValue(raw.translation ?? raw.arabicTranslation ?? raw.translation_ar ?? ""),
    enabled: raw.enabled !== false,
    _source: i,
  };
}

export interface MemoStudioTabProps {
  quizzes?: Array<{ id: number; title: string; category?: string; questions?: any[] }>;
  learningCourses?: Array<{ id: number; title: string; category?: string }>;
  adminApi: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export const MemoStudioTab: React.FC<MemoStudioTabProps> = ({
  quizzes = [],
  learningCourses = [],
  adminApi,
}) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<"content" | "design" | "export">("content");
  const [contentSourceTab, setContentSourceTab] = useState<"curriculum" | "quizzes" | "external">("curriculum");

  const [settings, setSettings] = useState<MemoSettings>(() => {
    try {
      const saved = localStorage.getItem("drelmahdy_memo_settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [questions, setQuestions] = useState<NormalizedQuestion[]>(() =>
    SAMPLE_QUESTIONS.map(normalizeQuestion),
  );
  const [backgroundImg, setBackgroundImg] = useState<string>("");
  const [bgFileName, setBgFileName] = useState<string>("");
  const [jsonInput, setJsonInput] = useState<string>("");

  // Curriculum Bank tree
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [selectedUnitName, setSelectedUnitName] = useState<string>("");
  const [selectedLessonName, setSelectedLessonName] = useState<string>("");
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [randomCount, setRandomCount] = useState<number>(20);

  // Pagination and view state
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [showAllPages, setShowAllPages] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(0.72);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewTab, setPreviewTab] = useState<"preview" | "questions_list">("preview");

  const paperAreaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Save settings locally
  useEffect(() => {
    try {
      localStorage.setItem("drelmahdy_memo_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage error", e);
    }
  }, [settings]);

  // Load Question Bank Tree properly
  const loadTree = async () => {
    try {
      setLoadingTree(true);
      const res = await adminApi<any>("/api/admin/learning/test-bank/tree");
      if (res && Array.isArray(res.tree) && res.tree.length > 0) {
        setTreeData(res.tree);
        // Default select stage with most questions
        const bestStage = [...res.tree].sort((a, b) => (b.totalQuestions || 0) - (a.totalQuestions || 0))[0];
        if (bestStage && !selectedStageName) {
          setSelectedStageName(bestStage.stage);
        }
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

  // Calculate region printable area in mm
  const region = useMemo(() => {
    const top = Math.max(15, Math.min(120, settings.topMm));
    let bottom = Math.max(15, Math.min(100, settings.bottomMm));
    let right = Math.max(7, Math.min(60, settings.rightMm));
    let left = Math.max(7, Math.min(60, settings.leftMm));
    if (top + bottom > 275) bottom = 275 - top;
    if (right + left > 180) {
      right = 15;
      left = 15;
    }
    return {
      top,
      bottom,
      left,
      right,
      width: 210 - left - right,
      height: 297 - top - bottom,
    };
  }, [settings.topMm, settings.bottomMm, settings.rightMm, settings.leftMm]);

  // Measure card height in mm using off-screen DOM
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
    if (settings.templateStyle === "exam") {
      return `<div style="background:#f8fafc;border:1.5px solid #0f172a;border-radius:2mm;padding:2.5mm 3.5mm;display:grid;grid-template-columns:repeat(4, 1fr);gap:2.5mm;font-size:9pt;color:#0f172a;margin-bottom:3.5mm;font-weight:bold;">
        <div>اسم الطالب: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #475569;"></span></div>
        <div>رقم الجلوس: <span style="display:inline-block;width:18mm;border-bottom:1px dotted #475569;"></span></div>
        <div>السنتر / المجموعة: <span style="display:inline-block;width:20mm;border-bottom:1px dotted #475569;"></span></div>
        <div style="text-align:left;color:#b45309;">الدرجة: [ &nbsp; / 50 &nbsp; ]</div>
      </div>`;
    }
    return `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2.5mm;padding:2.2mm 3.5mm;display:flex;gap:4mm;justify-content:space-between;flex-wrap:wrap;font-size:9pt;color:#1e293b;margin-bottom:3mm;">
      <span style="white-space:nowrap;flex:1;min-width:25mm;">اسم الطالب: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">السنتر / المجموعة: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">رقم الهاتف: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #64748b;"></span></span>
    </div>`;
  }, [settings.templateStyle]);

  // Card HTML generator
  const getCardHtml = (q: NormalizedQuestion, qNumber: number) => {
    const isRtl = settings.contentDir === "rtl";
    const letters = isRtl ? ARABIC_LETTERS : ENGLISH_LETTERS;

    const typeLabel = {
      MCQ: isRtl ? "اختر الإجابة الصحيحة" : "Multiple choice",
      TRUE_FALSE: isRtl ? "صواب أم خطأ" : "True / False",
      ESSAY: isRtl ? "سؤال مقالي" : "Essay",
      DEFINITION: isRtl ? "تعريف" : "Definition",
      TEXT: isRtl ? "ملاحظة" : "Note",
    }[q.type];

    if (q.type === "TEXT") {
      return `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:2.5mm;padding:3mm;white-space:pre-wrap;line-height:1.7;break-inside:avoid;">${q.statement}</div>`;
    }

    if (q.type === "DEFINITION") {
      return `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2.5mm;padding:2.5mm 3.5mm;break-inside:avoid;">
        <div style="font-weight:800;color:#0f172a;">${q.statement}</div>
        ${settings.showAnswers && q.answer ? `<div style="margin-top:1.5mm;white-space:pre-wrap;color:#334155;">${q.answer}</div>` : ""}
      </div>`;
    }

    const opts =
      q.options && q.options.length
        ? q.options
        : q.type === "TRUE_FALSE"
          ? [{ text: isRtl ? "صواب" : "True" }, { text: isRtl ? "خطأ" : "False" }]
          : [];

    const isSingleCol = settings.optionLayout === "one";
    const optionsHtml = opts.length
      ? `<div style="display:grid;grid-template-columns:${isSingleCol ? "1fr" : "repeat(2, minmax(0, 1fr))"};gap:1.5mm 4mm;margin-top:2mm;padding-inline-start:9.5mm;">
          ${opts
            .map(
              (o, i) => `
            <div style="display:flex;gap:2mm;align-items:flex-start;break-inside:avoid;">
              <span style="display:inline-grid;place-items:center;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:50%;height:5.2mm;min-width:5.2mm;font:bold 8pt Arial;color:#334155;">${letters[i] ?? i + 1}</span>
              <span style="flex:1;white-space:pre-wrap;overflow-wrap:anywhere;">${o.text}</span>
            </div>`,
            )
            .join("")}
        </div>`
      : "";

    return `<article style="border:1px solid #e2e8f0;border-${isRtl ? "right" : "left"}:3.5px solid #d97706;border-radius:2.5mm;padding:2.8mm 3.2mm;break-inside:avoid;page-break-inside:avoid;position:relative;background:rgba(255,255,255,0.98);word-break:normal;overflow-wrap:anywhere;">
      <div style="display:flex;align-items:flex-start;gap:2.2mm;min-width:0;">
        <span style="flex:0 0 auto;background:#0f172a;color:#fff;border-radius:1.8mm;min-width:7.5mm;height:7.5mm;display:grid;place-items:center;font:bold 10pt 'Cairo',Arial;line-height:1;">${qNumber}</span>
        <div style="min-width:0;flex:1;">
          ${settings.showQuestionType ? `<span style="display:inline-block;color:#64748b;font-family:'Cairo',Arial;font-size:7.5pt;font-weight:700;margin-bottom:0.8mm;">${typeLabel}</span>` : ""}
          <div style="white-space:pre-wrap;font-weight:700;line-height:inherit;">${q.statement || "—"}</div>
          ${settings.showTranslations && q.translation ? `<div style="white-space:pre-wrap;color:#475569;border-${isRtl ? "right" : "left"}:2px solid #94a3b8;padding-${isRtl ? "right" : "left"}:2mm;margin-top:1.8mm;font-size:0.92em;">${q.translation}</div>` : ""}
        </div>
      </div>
      ${optionsHtml}
      ${settings.showAnswers && q.answer ? `<div style="background:#f0fdf4;border-${isRtl ? "right" : "left"}:2px solid #16a34a;border-radius:1.5mm;margin-top:2mm;margin-inline-start:9.5mm;padding:1.5mm 3mm;font-size:0.92em;color:#166534;white-space:pre-wrap;"><span style="font-weight:bold;">${isRtl ? "الإجابة النموذجية:" : "Answer:"}</span> ${q.answer}</div>` : ""}
      ${settings.showExplain && q.explanation ? `<div style="background:#fefce8;border-${isRtl ? "right" : "left"}:2px solid #ca8a04;border-radius:1.5mm;margin-top:1.5mm;margin-inline-start:9.5mm;padding:1.5mm 3mm;font-size:0.88em;color:#854d0e;white-space:pre-wrap;"><span style="font-weight:bold;">${isRtl ? "التفسير:" : "Explanation:"}</span> ${q.explanation}</div>` : ""}
    </article>`;
  };

  // Compile active enabled questions
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => q.enabled);
  }, [questions]);

  // Compile pages dynamically based on measured heights
  const pages = useMemo(() => {
    const warns: string[] = [];
    const max = settings.maxQuestions || 99999;
    const areaH = region.height;
    const all: Array<Array<{ html: string; h: number; qNumber: number }>> = [];
    let current: Array<{ html: string; h: number; qNumber: number }> = [];
    let usedH = 0;
    let count = 0;
    const gap = 3.2;

    const studentH = settings.studentFields ? measureHeight(studentStripHtml, region.width) : 0;

    const flush = () => {
      if (current.length) {
        all.push(current);
        current = [];
        usedH = 0;
        count = 0;
      }
    };

    activeQuestions.forEach((q, i) => {
      const isQuestion = !["TEXT", "DEFINITION"].includes(q.type);
      const actualN =
        settings.questionStart +
        activeQuestions.slice(0, i).filter((x) => !["TEXT", "DEFINITION"].includes(x.type)).length;
      const html = getCardHtml(q, actualN);
      const h = measureHeight(html, region.width);

      const isFirstPage = all.length === 0;
      let firstOffset = isFirstPage && settings.studentFields ? studentH + gap : 0;
      let addedGap = count === 0 ? 0 : gap;

      if (count >= max || usedH + addedGap + h + firstOffset > areaH + 0.1) {
        if (current.length) flush();
        firstOffset = all.length === 0 && settings.studentFields ? studentH + gap : 0;
        addedGap = 0;
      }

      if (h + firstOffset > areaH + 0.1) {
        warns.push(
          `السؤال ${actualN} أطول من المساحة المتاحة في صفحة A4 (${Math.ceil(h)} مم). يُنصح بتقليل حجم الخط أو زيادة الهوامش.`,
        );
      }

      current.push({ html, h, qNumber: actualN });
      usedH += addedGap + h;
      count++;
    });

    flush();
    if (all.length === 0) all.push([]);
    setWarnings(warns);
    return all;
  }, [activeQuestions, settings, region, studentStripHtml]);

  // Adjust display scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (!paperAreaRef.current) return;
      const containerW = paperAreaRef.current.clientWidth;
      if (!containerW) return;
      const a4WidthPx = (210 * 96) / 25.4; // ~793.7px
      const calculated = Math.max(0.35, Math.min(0.85, (containerW - 32) / a4WidthPx));
      setScale(calculated);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Quick mode presets: Student vs Teacher
  const setStudentMode = () => {
    setSettings((prev) => ({
      ...prev,
      showAnswers: false,
      showExplain: false,
      studentFields: true,
      headerText: prev.headerText.includes("المعلم")
        ? prev.headerText.replace("المعلم", "الطلاب")
        : prev.headerText,
    }));
    toast({ title: "تم تفعيل نمط (نسخة الطالب)", description: "تم إخفاء الإجابات والتفسيرات وتفعيل شريط اسم الطالب." });
  };

  const setTeacherMode = () => {
    setSettings((prev) => ({
      ...prev,
      showAnswers: true,
      showExplain: true,
      studentFields: false,
      headerText: prev.headerText.includes("الطلاب")
        ? prev.headerText.replace("الطلاب", "المعلم")
        : `${prev.headerText} [نموذج الإجابة]`,
    }));
    toast({ title: "تم تفعيل نمط (نسخة المعلم)", description: "تم إظهار الإجابات النموذجية والتفسيرات الكاملة لكل سؤال." });
  };

  // Import JSON handler
  const handleImportJson = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data && data.settings && typeof data.settings === "object") {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      let entries: any[] = [];
      if (Array.isArray(data)) {
        entries = data;
      } else if (data && typeof data === "object") {
        entries = data.questions || data.items || [];
      }
      if (!entries.length) {
        toast({ variant: "destructive", title: "تنبيه", description: "لم يتم العثور على أي أسئلة داخل ملف JSON." });
        return;
      }
      const normalized = entries.map(normalizeQuestion);
      setQuestions(normalized);
      setPageIndex(0);
      toast({ title: "تم استيراد الأسئلة بنجاح!", description: `تم استخراج ${normalized.length} سؤال وجارٍ التنسيق.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في قراءة JSON", description: e.message });
    }
  };

  // Load from Quiz
  const handleLoadFromQuiz = (quiz: any) => {
    if (!quiz || !quiz.questions?.length) {
      toast({ variant: "destructive", description: "هذا الاختبار لا يحتوي على أسئلة متاحة." });
      return;
    }
    const normalized = quiz.questions.map((q: any, idx: number) => normalizeQuestion(q, idx));
    setQuestions(normalized);
    setPageIndex(0);
    setSettings((prev) => ({
      ...prev,
      templateStyle: "exam",
      headerText: quiz.title || prev.headerText,
      subHeaderText: `امتحان رسمي · المدة: ${quiz.durationMinutes ? `${quiz.durationMinutes} دقيقة` : "مفتوح"} · درجة النجاح: ${quiz.passingScore}%`,
    }));
    toast({ title: `تم تحميل ${normalized.length} سؤال من اختبار: ${quiz.title}` });
  };

  // Load from Question Bank (Specific Unit or Lesson, or entire Unit)
  const handleLoadFromBank = async (unitName: string, lessonName?: string, countLimit?: number) => {
    if (!selectedStageName || !unitName) return;
    try {
      setIsLoadingQuestions(true);
      const params = new URLSearchParams({ stage: selectedStageName, unit: unitName });
      if (lessonName && lessonName !== "all") {
        params.set("lesson", lessonName);
      }
      const res = await adminApi<any[]>(`/api/admin/learning/test-bank/questions?${params.toString()}`);
      if (!res || !res.length) {
        toast({ variant: "destructive", description: "لم يتم العثور على أسئلة في بنك الأسئلة لهذا التحديد." });
        return;
      }

      let selectedRows = res;
      if (countLimit && countLimit > 0 && countLimit < res.length) {
        // Pick random subset
        const shuffled = [...res].sort(() => 0.5 - Math.random());
        selectedRows = shuffled.slice(0, countLimit);
      }

      const mapped = selectedRows.map((item, idx) => {
        const qObj = item.question || item;
        return normalizeQuestion(
          {
            ...qObj,
            id: item.id || `q-${idx}`,
            statement: qObj.prompt || qObj.statement || item.prompt || "",
            options: qObj.options || item.options || [],
            answer: qObj.correctAnswer || item.answer || "",
            explanation: qObj.explanation || item.explanation || "",
            translation: qObj.translation || item.translation || "",
          },
          idx,
        );
      });

      setQuestions(mapped);
      setPageIndex(0);
      setSettings((prev) => ({
        ...prev,
        contentDir: selectedStageName.toLowerCase().includes("لغات") || selectedStageName.toLowerCase().includes("lang") ? "ltr" : "rtl",
        headerText: lessonName && lessonName !== "all" ? `${unitName} - ${lessonName}` : unitName,
        subHeaderText: `أكاديمية د. محمود المهدي · ${selectedStageName.replace(/·/g, "•")}`,
      }));

      toast({
        title: "تم جلب وتنسيق الأسئلة بنجاح!",
        description: `تم سحب ${mapped.length} سؤال من أصل ${res.length} سؤال متاح.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في جلب الأسئلة", description: err.message });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Toggle single question enabled
  const toggleQuestionEnabled = (idx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, enabled: !q.enabled } : q)),
    );
  };

  // Remove question
  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Print execution
  const handlePrint = () => {
    window.print();
  };

  // Selected stage in bank tree
  const activeTreeStage = treeData.find((st) => st.stage === selectedStageName);
  const stageUnits = activeTreeStage?.units || [];

  return (
    <div className="space-y-6" dir="rtl">
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

      {/* Top Header / Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-slate-900 via-blue-950 to-slate-900 p-5 text-white shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">استوديو المذكرات والطباعة الاحترافية A4</h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                جاهز للطباعة والتصدير
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              صمّم ونظّم واطبع مذكرات الوحدات، أوراق العمل، والامتحانات الرسمية بضغطة زر واحدة.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={setStudentMode}
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold"
          >
            🎓 نسخة الطالب (بدون إجابات)
          </Button>
          <Button
            type="button"
            onClick={setTeacherMode}
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold"
          >
            👨‍🏫 نسخة المعلم (مع الإجابات)
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-white font-extrabold text-xs flex items-center gap-2 px-5 py-2.5 shadow-lg shadow-primary/20"
          >
            <Printer className="h-4 w-4" />
            طباعة / تصدير PDF
          </Button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Config & Content Picker (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* Main Studio Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep("content")}
              className={`rounded-lg py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeStep === "content"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              ١. مصدر الأسئلة
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("design")}
              className={`rounded-lg py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeStep === "design"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              ٢. القالب والشكل
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("export")}
              className={`rounded-lg py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeStep === "export"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              ٣. الخط والترقيم
            </button>
          </div>

          {/* STEP 1: CONTENT SOURCE */}
          {activeStep === "content" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              {/* Content Sub-tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContentSourceTab("curriculum")}
                  className={`text-xs font-bold pb-1.5 px-2.5 border-b-2 transition ${
                    contentSourceTab === "curriculum"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📚 من بنك أسئلة المنهج
                </button>
                <button
                  type="button"
                  onClick={() => setContentSourceTab("quizzes")}
                  className={`text-xs font-bold pb-1.5 px-2.5 border-b-2 transition ${
                    contentSourceTab === "quizzes"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📝 من اختبارات المنصة ({quizzes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setContentSourceTab("external")}
                  className={`text-xs font-bold pb-1.5 px-2.5 border-b-2 transition ${
                    contentSourceTab === "external"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📥 إدخال خارجي (JSON)
                </button>
              </div>

              {/* Source A: CURRICULUM BANK */}
              {contentSourceTab === "curriculum" && (
                <div className="space-y-4">
                  {/* Stage Selector Cards */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      اختر المرحلة / المسار الدراسي:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {treeData.map((st) => {
                        const isSelected = selectedStageName === st.stage;
                        const isLanguages = st.stage.toLowerCase().includes("لغات") || st.stage.toLowerCase().includes("languages");
                        return (
                          <button
                            key={st.stage}
                            type="button"
                            onClick={() => {
                              setSelectedStageName(st.stage);
                              setSelectedUnitName("");
                              setSelectedLessonName("");
                            }}
                            className={`rounded-xl border p-3 text-right transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs"
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-extrabold truncate">
                                {isLanguages ? "🇬🇧 لغات" : "🇪🇬 عربي"}
                              </span>
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {st.totalQuestions} سؤال
                              </span>
                            </div>
                            <span className="block text-xs font-bold text-foreground line-clamp-1">
                              {st.stage}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Units of selected stage */}
                  {selectedStageName && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          الوحدات التعليمية المتاحة ({stageUnits.length}):
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <span>توليد عشوائي:</span>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={randomCount}
                            onChange={(e) => setRandomCount(Number(e.target.value))}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-center font-mono text-xs dark:bg-slate-800 dark:border-slate-700"
                          />
                          <span>سؤال</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {stageUnits.map((u: any) => {
                          const isUnitActive = selectedUnitName === u.unit;
                          return (
                            <div
                              key={u.unit}
                              className={`rounded-xl border transition-all ${
                                isUnitActive
                                  ? "border-primary/50 bg-primary/5 shadow-xs"
                                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40"
                              }`}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                      {u.unit}
                                    </h5>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {u.totalQuestions} سؤال متاح · {u.lessons?.length || 0} دروس
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isLoadingQuestions}
                                      onClick={() => handleLoadFromBank(u.unit, undefined, randomCount)}
                                      className="h-7 px-2.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1"
                                      title={`اختيار ${randomCount} سؤال عشوائي من الوحدة`}
                                    >
                                      <Shuffle className="h-3 w-3" />
                                      {randomCount} سؤال عشوائي
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isLoadingQuestions}
                                      onClick={() => handleLoadFromBank(u.unit)}
                                      className="h-7 px-2.5 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white"
                                    >
                                      الوحدة كاملة ({u.totalQuestions})
                                    </Button>
                                  </div>
                                </div>

                                {/* Lessons pills inside unit */}
                                {u.lessons && u.lessons.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 self-center">الدروس:</span>
                                    {u.lessons.map((les: any) => (
                                      <button
                                        key={les.lesson}
                                        type="button"
                                        disabled={isLoadingQuestions}
                                        onClick={() => handleLoadFromBank(u.unit, les.lesson)}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                      >
                                        {les.lesson} ({les.totalQuestions})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Source B: PLATFORM QUIZZES */}
              {contentSourceTab === "quizzes" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">اختر امتحاناً منشورا لتحويله فوراً لورقة امتحان رسمية A4 جاهزة للطباعة:</p>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => handleLoadFromQuiz(q)}
                        className="rounded-xl border border-slate-200 p-3 hover:border-primary/40 hover:bg-primary/5 transition cursor-pointer flex items-center justify-between dark:border-slate-700"
                      >
                        <div>
                          <strong className="block text-xs font-bold text-foreground">{q.title}</strong>
                          <span className="text-[11px] text-muted-foreground">
                            {q.category || "عام"} · {q.questions?.length || 0} أسئلة
                          </span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs font-bold">
                          تحويل لامتحان ورقي ←
                        </Button>
                      </div>
                    ))}
                    {quizzes.length === 0 && (
                      <p className="p-4 text-center text-xs text-slate-400">لا توجد اختبارات مسجلة حالياً.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Source C: EXTERNAL JSON */}
              {contentSourceTab === "external" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">الصق محتوى JSON مباشرة أو ارفع ملف أسئلة خارجي:</p>
                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    dir="ltr"
                    placeholder='[{"statement": "سؤال...", "options": ["أ", "ب"], "answer": "أ"}]'
                    className="w-full rounded-lg border border-slate-300 p-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-900 dark:border-slate-700"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleImportJson(jsonInput)}
                      className="text-xs font-bold"
                    >
                      استيراد الأسئلة
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const s = JSON.stringify(SAMPLE_QUESTIONS, null, 2);
                        setJsonInput(s);
                        handleImportJson(s);
                      }}
                      className="text-xs font-bold"
                    >
                      تحميل نموذج تجريبي
                    </Button>
                  </div>
                </div>
              )}

              {/* General Content Toggles */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">خيارات العرض السريعة:</h5>
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>إظهار الإجابة النموذجية (Answer Box)</span>
                  <input
                    type="checkbox"
                    checked={settings.showAnswers}
                    onChange={(e) => setSettings({ ...settings, showAnswers: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>إظهار التفسير وسبب الإجابة (Explanation)</span>
                  <input
                    type="checkbox"
                    checked={settings.showExplain}
                    onChange={(e) => setSettings({ ...settings, showExplain: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>إظهار الترجمة (عند توفرها بالأسئلة الإنجليزية)</span>
                  <input
                    type="checkbox"
                    checked={settings.showTranslations}
                    onChange={(e) => setSettings({ ...settings, showTranslations: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>توزيع اختيارات MCQ:</span>
                  <select
                    value={settings.optionLayout}
                    onChange={(e) => setSettings({ ...settings, optionLayout: e.target.value as "two" | "one" })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="two">عمودين (توفير مساحة الورق)</option>
                    <option value="one">خيار تلو الآخر (رأسي)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DESIGN & TEMPLATES */}
          {activeStep === "design" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  قالب الورقة وشكل الترويسة المدمج
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">اختر ستايل الترويسة الرسمي أو ارفع إطارك الخاص.</p>
              </div>

              {/* Preset Template Styles */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "royal", title: "👑 الملكي (أكاديمية د. محمود)", desc: "ترويسة كحلية وذهبية رسمية" },
                  { id: "exam", title: "📋 ورقة امتحان رسمي", desc: "جدول درجات وتوقيع المصحح" },
                  { id: "minimal", title: "✨ البسيط العصري", desc: "خطوط ناعمة ومساحات واسعة" },
                  { id: "custom", title: "🖼️ خلفية خاصة مخصصة", desc: "رفع صورة A4 من جهازك" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, templateStyle: t.id as any })}
                    className={`rounded-xl border p-3 text-right transition cursor-pointer ${
                      settings.templateStyle === t.id
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40"
                    }`}
                  >
                    <strong className="block text-xs font-bold">{t.title}</strong>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{t.desc}</span>
                  </button>
                ))}
              </div>

              {/* Custom Image Upload if custom selected */}
              {settings.templateStyle === "custom" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/40">
                    <Upload className="h-6 w-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {bgFileName || "ارفع تصميم الخلفية / الإطار (A4)"}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP أو SVG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBgFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => setBackgroundImg(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {backgroundImg && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBackgroundImg("");
                        setBgFileName("");
                      }}
                      className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      إزالة صورة الخلفية
                    </Button>
                  )}
                </div>
              )}

              {/* Margins in mm */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    هوامش الكتابة بالمليمتر (لعدم تغطية الهيدر والفوتر):
                  </label>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, guideView: !settings.guideView })}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      settings.guideView
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {settings.guideView ? "إخفاء الخطوط الإرشادية" : "إظهار حدود الكتابة"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">من الأعلى (mm)</label>
                    <input
                      type="number"
                      min="15"
                      max="100"
                      value={settings.topMm}
                      onChange={(e) => setSettings({ ...settings, topMm: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">من الأسفل (mm)</label>
                    <input
                      type="number"
                      min="15"
                      max="90"
                      value={settings.bottomMm}
                      onChange={(e) => setSettings({ ...settings, bottomMm: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">من اليمين (mm)</label>
                    <input
                      type="number"
                      min="7"
                      max="50"
                      value={settings.rightMm}
                      onChange={(e) => setSettings({ ...settings, rightMm: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">من اليسار (mm)</label>
                    <input
                      type="number"
                      min="7"
                      max="50"
                      value={settings.leftMm}
                      onChange={(e) => setSettings({ ...settings, leftMm: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Header Text Settings */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>إظهار شريط عنوان أعلى كل صفحة</span>
                  <input
                    type="checkbox"
                    checked={settings.headerEnabled}
                    onChange={(e) => setSettings({ ...settings, headerEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
                {settings.headerEnabled && (
                  <>
                    <input
                      type="text"
                      value={settings.headerText}
                      onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                      placeholder="عنوان المذكرة الرئيسي"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={settings.subHeaderText}
                      onChange={(e) => setSettings({ ...settings, subHeaderText: e.target.value })}
                      placeholder="العنوان الفرعي أو اسم الأكاديمية"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: TYPOGRAPHY & NUMBERING */}
          {activeStep === "export" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  إعدادات الخط والترقيم والطباعة
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">اضبط أبعاد الخط وترقيم الصفحات قبل الطباعة.</p>
              </div>

              {/* Font Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الخط:
                </label>
                <select
                  value={settings.fontSelect}
                  onChange={(e) => setSettings({ ...settings, fontSelect: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="'Cairo', sans-serif">Cairo (كايرو - الافتراضي للمنصة)</option>
                  <option value="'Tajawal', sans-serif">Tajawal (تجوال)</option>
                  <option value="'Almarai', sans-serif">Almarai (المراعي)</option>
                  <option value="'Noto Naskh Arabic', serif">Noto Naskh Arabic (نسخ كلاسيكي)</option>
                  <option value="'Amiri', serif">Amiri (أميري)</option>
                  <option value="Arial, sans-serif">Arial</option>
                </select>
              </div>

              {/* Font size & line height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>حجم الخط:</span>
                    <span className="font-mono">{settings.fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="18"
                    step="0.5"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>تباعد الأسطر:</span>
                    <span className="font-mono">{settings.lineHeight}</span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.05"
                    value={settings.lineHeight}
                    onChange={(e) => setSettings({ ...settings, lineHeight: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {/* Content Direction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اتجاه النص والأسئلة:
                </label>
                <select
                  value={settings.contentDir}
                  onChange={(e) => setSettings({ ...settings, contentDir: e.target.value as "rtl" | "ltr" })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="rtl">عربي (من اليمين لليسار RTL)</option>
                  <option value="ltr">لغات / Languages (من اليسار لليمين LTR)</option>
                </select>
              </div>

              {/* Numbering */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">أول رقم سؤال</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.questionStart}
                      onChange={(e) => setSettings({ ...settings, questionStart: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">أول رقم صفحة</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.pageStart}
                      onChange={(e) => setSettings({ ...settings, pageStart: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">تذييل الصفحة (Footer):</label>
                  <input
                    type="text"
                    value={settings.footerText}
                    onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-2">
                  <span>شريط بيانات الطالب في أول صفحة (الاسم / السنتر / الهاتف)</span>
                  <input
                    type="checkbox"
                    checked={settings.studentFields}
                    onChange={(e) => setSettings({ ...settings, studentFields: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
              </div>

              {/* Print Button */}
              <Button
                type="button"
                onClick={handlePrint}
                className="w-full bg-primary hover:bg-primary/90 text-white font-extrabold py-3 text-sm shadow-md"
              >
                <Printer className="h-4 w-4 ml-2" />
                تصدير وطباعة المذكرة A4 الآن
              </Button>
            </div>
          )}

          {/* Warnings box if any */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>ملاحظات التقسيم ({warnings.length}):</span>
              </div>
              <ul className="list-disc pr-4 space-y-1 text-[11px]">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Live A4 Workspace & Question Manager (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Workspace Stats & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span>الصفحات A4: <strong className="font-mono text-foreground">{pages.length}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>الأسئلة النشطة: <strong className="font-mono text-foreground">{activeQuestions.length}</strong> / {questions.length}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                    previewTab === "preview"
                      ? "bg-white text-primary shadow-xs dark:bg-slate-900"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  📄 المعاينة الحية
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("questions_list")}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                    previewTab === "questions_list"
                      ? "bg-white text-primary shadow-xs dark:bg-slate-900"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  📋 إدارة الأسئلة ({questions.length})
                </button>
              </div>

              {previewTab === "preview" && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAllPages(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      showAllPages
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    كل الصفحات
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllPages(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      !showAllPages
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    صفحة واحدة
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QUESTIONS LIST MANAGER VIEW */}
          {previewTab === "questions_list" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    الأسئلة المحملة داخل المذكرة ({questions.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">يمكنك استبعاد أو حذف أي سؤال بنقرة واحدة قبل الطباعة.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuestions((prev) => prev.map((q) => ({ ...q, enabled: true })))}
                    className="h-7 text-xs font-bold"
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuestions((prev) => prev.filter((q) => q.enabled))}
                    className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    حذف المستبعد
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={`rounded-xl border p-3 transition flex items-start gap-3 ${
                      q.enabled
                        ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        : "border-slate-200/50 bg-slate-50 opacity-50 dark:bg-slate-800/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleQuestionEnabled(idx)}
                      className="mt-0.5 text-primary cursor-pointer"
                    >
                      {q.enabled ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-slate-400" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                          #{idx + 1}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800">
                          {q.type}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 line-clamp-2 dark:text-slate-200">
                        {q.statement}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="حذف هذا السؤال"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE PREVIEW VIEW */}
          {previewTab === "preview" && (
            <>
              {/* Single page stepper */}
              {!showAllPages && pages.length > 1 && (
                <div className="flex items-center justify-center gap-4 bg-white rounded-full border border-slate-200 p-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={pageIndex === 0}
                    className="h-8 w-8 rounded-full p-0"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <span className="text-xs font-bold font-mono">
                    صفحة {pageIndex + 1} من {pages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                    disabled={pageIndex === pages.length - 1}
                    className="h-8 w-8 rounded-full p-0"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Sheets Render Container */}
              <div
                ref={paperAreaRef}
                className="memo-print-root flex flex-col items-center gap-8 p-4 bg-slate-100/90 rounded-2xl border border-slate-200/90 min-h-[600px] overflow-auto dark:bg-slate-950/50 dark:border-slate-800"
              >
                {(showAllPages ? pages : [pages[pageIndex] || []]).map((pageItems, idx) => {
                  const actualPageIdx = showAllPages ? idx : pageIndex;
                  const pageNumber = settings.pageStart + actualPageIdx;
                  const isRtl = settings.contentDir === "rtl";

                  return (
                    <div key={actualPageIdx} className="flex flex-col items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-400">
                        ورقة A4 — صفحة {pageNumber}
                      </div>

                      {/* Outer Scaled Shell for Screen Preview */}
                      <div
                        className="memo-page-shell relative bg-white shadow-2xl rounded-sm"
                        style={{
                          width: `${(210 * 96) / 25.4 * scale}px`,
                          height: `${(297 * 96) / 25.4 * scale}px`,
                          overflow: "hidden",
                        }}
                      >
                        {/* Inner Exact 210mm x 297mm A4 Sheet */}
                        <div
                          className="memo-sheet absolute top-0 left-0"
                          dir={settings.contentDir}
                          style={{
                            width: "210mm",
                            height: "297mm",
                            transform: `scale(${scale})`,
                            transformOrigin: "top left",
                            fontFamily: settings.fontSelect,
                            fontSize: `${settings.fontSize}pt`,
                            lineHeight: settings.lineHeight,
                            color: "#0f172a",
                            backgroundColor: "#ffffff",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          {/* Template Styling Decorators */}
                          {settings.templateStyle === "royal" && (
                            <>
                              {/* Royal Top Border & Accents */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "4mm",
                                  backgroundColor: "#0f172a",
                                  borderBottom: "1.5mm solid #d97706",
                                  zIndex: 2,
                                }}
                              />
                            </>
                          )}

                          {settings.templateStyle === "exam" && (
                            <div
                              style={{
                                position: "absolute",
                                inset: "6mm",
                                border: "1.5px solid #0f172a",
                                pointerEvents: "none",
                                zIndex: 0,
                              }}
                            />
                          )}

                          {/* Custom background image if present */}
                          {settings.templateStyle === "custom" && backgroundImg && (
                            <img
                              src={backgroundImg}
                              alt=""
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: settings.fitMode,
                                zIndex: 0,
                              }}
                            />
                          )}

                          {/* Top Header */}
                          {settings.headerEnabled && (
                            <div
                              style={{
                                position: "absolute",
                                top: "11mm",
                                right: `${region.right}mm`,
                                left: `${region.left}mm`,
                                height: "14mm",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderBottom: settings.templateStyle === "royal" ? "2px solid #d97706" : "1px solid #cbd5e1",
                                zIndex: 1,
                                color: "#0f172a",
                              }}
                            >
                              <div>
                                <span style={{ fontSize: "11.5pt", fontWeight: 900, display: "block" }}>
                                  {settings.headerText}
                                </span>
                                <span style={{ fontSize: "8pt", color: "#64748b", fontWeight: 600 }}>
                                  {settings.subHeaderText}
                                </span>
                              </div>
                              <div style={{ textAlign: isRtl ? "left" : "right" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "1mm 3mm",
                                    borderRadius: "1.5mm",
                                    backgroundColor: "#0f172a",
                                    color: "#ffffff",
                                    fontSize: "8pt",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {settings.templateStyle === "exam" ? "ورقة امتحان" : "مذكرة تدريبات"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Visual guide overlay */}
                          {settings.guideView && (
                            <div
                              style={{
                                position: "absolute",
                                top: `${region.top}mm`,
                                bottom: `${region.bottom}mm`,
                                right: `${region.right}mm`,
                                left: `${region.left}mm`,
                                border: "1px dashed #b9a05d",
                                backgroundColor: "rgba(224,196,113,0.05)",
                                zIndex: 2,
                                pointerEvents: "none",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  background: "#eed9a5",
                                  color: "#624b1d",
                                  fontSize: "9px",
                                  padding: "1px 4px",
                                }}
                              >
                                مساحة الكتابة
                              </span>
                            </div>
                          )}

                          {/* Body Content Area */}
                          <div
                            style={{
                              position: "absolute",
                              top: `${region.top}mm`,
                              bottom: `${region.bottom}mm`,
                              right: `${region.right}mm`,
                              left: `${region.left}mm`,
                              zIndex: 1,
                              overflow: "visible",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "3mm" }}>
                              {actualPageIdx === 0 && settings.studentFields && (
                                <div dangerouslySetInnerHTML={{ __html: studentStripHtml }} />
                              )}
                              {pageItems.map((item, itemIdx) => (
                                <div key={itemIdx} dangerouslySetInnerHTML={{ __html: item.html }} />
                              ))}
                            </div>
                          </div>

                          {/* Footer text */}
                          {settings.footerText && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "7mm",
                                left: `${region.left}mm`,
                                right: `${region.right}mm`,
                                height: "9mm",
                                borderTop: "1px solid #cbd5e1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                font: "bold 9pt Arial, sans-serif",
                                color: "#475569",
                                zIndex: 1,
                              }}
                            >
                              {settings.footerText}
                            </div>
                          )}

                          {/* Page number */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: "7.5mm",
                              ...(settings.numPosition === "center"
                                ? { left: "50%", transform: "translateX(-50%)" }
                                : settings.numPosition === "right"
                                  ? { right: `${region.right}mm` }
                                  : { left: `${region.left}mm` }),
                              minWidth: "9mm",
                              height: "8mm",
                              padding: "0 2.5mm",
                              backgroundColor: "#0f172a",
                              borderRadius: "1.5mm",
                              textAlign: "center",
                              font: "bold 9.5pt Arial, sans-serif",
                              lineHeight: "8mm",
                              color: "#f59e0b",
                              zIndex: 1,
                            }}
                          >
                            {pageNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scoped Media Print Styling */}
      <style>{`
        @media print {
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          header, nav, aside, .topbar, button, .no-print,
          [role="tablist"], [data-radix-portal] {
            display: none !important;
          }
          .memo-print-root {
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          .memo-page-shell {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .memo-sheet {
            transform: none !important;
            position: relative !important;
            width: 210mm !important;
            height: 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
