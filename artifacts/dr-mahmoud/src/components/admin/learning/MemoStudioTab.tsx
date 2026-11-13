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
  type: "MCQ" | "TRUE_FALSE" | "ESSAY" | "DEFINITION" | "TEXT";
  statement: string;
  options: { text: string; isCorrect: boolean }[];
  answer: string;
  explanation: string;
  translation: string;
  _source?: number;
}

interface MemoSettings {
  fitMode: "fill" | "contain" | "cover";
  topMm: number;
  bottomMm: number;
  rightMm: number;
  leftMm: number;
  headerEnabled: boolean;
  headerText: string;
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
  fitMode: "fill",
  topMm: 34,
  bottomMm: 27,
  rightMm: 15,
  leftMm: 15,
  headerEnabled: true,
  headerText: "مذكرة الأسئلة والتدريبات النموذجية",
  guideView: false,
  showAnswers: false,
  showExplain: false,
  showTranslations: true,
  optionLayout: "two",
  showQuestionType: false,
  fontSelect: "'Cairo', sans-serif",
  fontSize: 13,
  lineHeight: 1.65,
  contentDir: "rtl",
  questionStart: 1,
  pageStart: 1,
  maxQuestions: 0,
  footerText: "أكاديمية د. محمود المهدي | Dr. Mahmoud Elmahdy",
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

function flatQuestions(root: any): any[] {
  if (Array.isArray(root)) return root.flatMap(flatQuestions);
  if (!root || typeof root !== "object") return [];
  const keys = ["questions", "items", "mcq", "essay", "true_false", "trueFalse", "definitions", "content", "lessons", "units", "sections", "chapters", "topics", "data"];
  const out: any[] = [];
  if (
    root.statement !== undefined ||
    root.question !== undefined ||
    root.questionText !== undefined ||
    root.prompt !== undefined ||
    root.text !== undefined ||
    root.definition !== undefined ||
    (root.type !== undefined && root.options !== undefined)
  ) {
    return [root];
  }
  for (const k of keys) {
    if (root[k] !== undefined && typeof root[k] === "object") {
      const a = flatQuestions(root[k]);
      out.push(...a);
    }
  }
  return out;
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
    type,
    statement,
    options,
    answer: String(ans),
    explanation: textValue(raw.explanation ?? raw.reason ?? raw.justification ?? ""),
    translation: textValue(raw.translation ?? raw.arabicTranslation ?? raw.translation_ar ?? ""),
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
  const [activeStep, setActiveStep] = useState<"design" | "content" | "export">("content");
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

  // Bank tree integration
  const [bankTree, setBankTree] = useState<any[]>([]);
  const [loadingBankTree, setLoadingBankTree] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Pagination and view state
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [showAllPages, setShowAllPages] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(0.75);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  // Load Question Bank Tree on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingBankTree(true);
        const res = await adminApi<any>("/api/admin/learning/test-bank/tree");
        if (mounted && res && Array.isArray(res.stages)) {
          setBankTree(res.stages);
        }
      } catch (err) {
        console.warn("Could not load question bank tree", err);
      } finally {
        if (mounted) setLoadingBankTree(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [adminApi]);

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
    return `<div style="background:#f6f7f9;border:1px solid #dbe2eb;border-radius:3mm;padding:2.5mm 3.5mm;display:flex;gap:4mm;justify-content:space-between;flex-wrap:wrap;font-size:9.5pt;color:#334a65;margin-bottom:3mm;">
      <span style="white-space:nowrap;flex:1;min-width:25mm;">اسم الطالب: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #8fa0b5;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">المجموعة / السنتر: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #8fa0b5;"></span></span>
      <span style="white-space:nowrap;flex:1;min-width:25mm;">رقم الهاتف: <span style="display:inline-block;width:25mm;border-bottom:1px dotted #8fa0b5;"></span></span>
    </div>`;
  }, []);

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
      return `<div style="background:#ffffff;border:1px solid #e3e9f3;border-radius:3mm;padding:3.5mm;white-space:pre-wrap;line-height:1.8;break-inside:avoid;">${q.statement}</div>`;
    }

    if (q.type === "DEFINITION") {
      return `<div style="background:#f9fbff;border:1px solid #dae4f1;border-radius:3mm;padding:3mm 4mm;break-inside:avoid;">
        <div style="font-weight:800;color:#162b49;">${q.statement}</div>
        ${settings.showAnswers && q.answer ? `<div style="margin-top:1.5mm;white-space:pre-wrap;">${q.answer}</div>` : ""}
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
      ? `<div style="display:grid;grid-template-columns:${isSingleCol ? "1fr" : "repeat(2, minmax(0, 1fr))"};gap:1.5mm 4mm;margin-top:2.2mm;padding-inline-start:10.5mm;">
          ${opts
            .map(
              (o, i) => `
            <div style="display:flex;gap:2mm;align-items:flex-start;break-inside:avoid;">
              <span style="display:inline-grid;place-items:center;background:#f1f5fa;border:1px solid #d9e1eb;border-radius:50%;height:5.5mm;min-width:5.5mm;font:bold 8pt Arial;color:#345273;">${letters[i] ?? i + 1}</span>
              <span style="flex:1;white-space:pre-wrap;overflow-wrap:anywhere;">${o.text}</span>
            </div>`,
            )
            .join("")}
        </div>`
      : "";

    return `<article style="border:1px solid #e4e8ef;border-${isRtl ? "right" : "left"}:3.5px solid #c39945;border-radius:3mm;padding:3mm 3.5mm;break-inside:avoid;page-break-inside:avoid;position:relative;background:rgba(255,255,255,0.95);word-break:normal;overflow-wrap:anywhere;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="display:flex;align-items:flex-start;gap:2.5mm;min-width:0;">
        <span style="flex:0 0 auto;background:#162b49;color:#fff;border-radius:2mm;min-width:8.5mm;height:8.5mm;display:grid;place-items:center;font:bold 11pt 'Cairo',Arial;line-height:1;">${qNumber}</span>
        <div style="min-width:0;flex:1;">
          ${settings.showQuestionType ? `<span style="display:inline-block;color:#7b8797;font-family:'Cairo',Arial;font-size:8pt;font-weight:700;margin-bottom:1mm;">${typeLabel}</span>` : ""}
          <div style="white-space:pre-wrap;font-weight:700;line-height:inherit;">${q.statement || "—"}</div>
          ${settings.showTranslations && q.translation ? `<div style="white-space:pre-wrap;color:#526d85;border-${isRtl ? "right" : "left"}:2px solid #d6e5f3;padding-${isRtl ? "right" : "left"}:2mm;margin-top:2mm;font-size:0.92em;">${q.translation}</div>` : ""}
        </div>
      </div>
      ${optionsHtml}
      ${settings.showAnswers && q.answer ? `<div style="background:#f1f7f0;border-${isRtl ? "right" : "left"}:2px solid #5c9865;border-radius:1.5mm;margin-top:2.2mm;margin-inline-start:10.5mm;padding:1.5mm 3mm;font-size:0.94em;color:#285b32;white-space:pre-wrap;"><span style="font-weight:bold;">${isRtl ? "الإجابة النموذجية:" : "Answer:"}</span> ${q.answer}</div>` : ""}
      ${settings.showExplain && q.explanation ? `<div style="background:#faf8f3;border-${isRtl ? "right" : "left"}:2px solid #bba060;border-radius:1.5mm;margin-top:1.8mm;margin-inline-start:10.5mm;padding:1.5mm 3mm;font-size:0.90em;color:#5b4b31;white-space:pre-wrap;"><span style="font-weight:bold;">${isRtl ? "التفسير:" : "Explanation:"}</span> ${q.explanation}</div>` : ""}
    </article>`;
  };

  // Compile pages dynamically based on measured heights
  const pages = useMemo(() => {
    const warns: string[] = [];
    const max = settings.maxQuestions || 99999;
    const areaH = region.height;
    const all: Array<Array<{ html: string; h: number; qNumber: number }>> = [];
    let current: Array<{ html: string; h: number; qNumber: number }> = [];
    let usedH = 0;
    let count = 0;
    const gap = 3.5;

    const studentH = settings.studentFields ? measureHeight(studentStripHtml, region.width) : 0;

    const flush = () => {
      if (current.length) {
        all.push(current);
        current = [];
        usedH = 0;
        count = 0;
      }
    };

    questions.forEach((q, i) => {
      const isQuestion = !["TEXT", "DEFINITION"].includes(q.type);
      const actualN =
        settings.questionStart +
        questions.slice(0, i).filter((x) => !["TEXT", "DEFINITION"].includes(x.type)).length;
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
  }, [questions, settings, region, studentStripHtml]);

  // Adjust display scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (!paperAreaRef.current) return;
      const containerW = paperAreaRef.current.clientWidth;
      if (!containerW) return;
      const a4WidthPx = (210 * 96) / 25.4; // ~793.7px
      const calculated = Math.max(0.35, Math.min(0.9, (containerW - 32) / a4WidthPx));
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
    toast({ title: "تم تفعيل نمط (نسخة الطالب)", description: "تم إخفاء الإجابات النموذجية والتفسيرات وتفعيل شريط اسم الطالب." });
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
    toast({ title: "تم تفعيل نمط (نسخة المعلم / نموذج الإجابة)", description: "تم إظهار الإجابات النموذجية والتفسيرات الكاملة لكل سؤال." });
  };

  // Import JSON handler
  const handleImportJson = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data && data.settings && typeof data.settings === "object") {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      const entries = flatQuestions(data);
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
  const handleLoadFromQuiz = (quizIdStr: string) => {
    setSelectedQuizId(quizIdStr);
    if (!quizIdStr) return;
    const target = quizzes.find((q) => String(q.id) === quizIdStr);
    if (!target || !target.questions?.length) {
      toast({ variant: "destructive", description: "هذا الاختبار لا يحتوي على أسئلة متاحة." });
      return;
    }
    const normalized = target.questions.map((q, idx) => normalizeQuestion(q, idx));
    setQuestions(normalized);
    setPageIndex(0);
    setSettings((prev) => ({
      ...prev,
      headerText: target.title || prev.headerText,
    }));
    toast({ title: `تم تحميل ${normalized.length} سؤال من اختبار: ${target.title}` });
  };

  // Load from Question Bank Lesson
  const handleLoadFromBankLesson = async (stage: string, unit: string, lesson: string) => {
    if (!stage || !unit || !lesson) return;
    try {
      setIsLoadingQuestions(true);
      const params = new URLSearchParams({ stage, unit, lesson });
      const res = await adminApi<any[]>(`/api/admin/learning/test-bank/questions?${params.toString()}`);
      if (!res || !res.length) {
        toast({ variant: "destructive", description: "لم يتم العثور على أسئلة لهذا الدرس في بنك الأسئلة." });
        return;
      }
      const mapped = res.map((item, idx) => {
        const qObj = item.question || item;
        return normalizeQuestion(
          {
            ...qObj,
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
        headerText: `${unit} - ${lesson}`,
      }));
      toast({ title: `تم تحميل ${mapped.length} سؤال من بنك الأسئلة بنجاح!` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في جلب الأسئلة", description: err.message });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Print execution
  const handlePrint = () => {
    window.print();
  };

  // Units and lessons helper from bankTree
  const currentStageObj = bankTree.find((s) => s.stage === selectedStage);
  const currentUnits = currentStageObj?.units || [];
  const currentUnitObj = currentUnits.find((u: any) => u.unit === selectedUnit);
  const currentLessons = currentUnitObj?.lessons || [];

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
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">استوديو المذكرات والطباعة الاحترافية</h2>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                A4 جاهز للطباعة
              </span>
            </div>
            <p className="text-xs text-slate-300">
              حوّل أي درس أو اختبار إلى مذكرة ورقية منسقة فوراً بجودة طباعة فائقة مع قوالب وهوامش ذكية.
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

      {/* Main Grid: Control Sidebar (380px) + Live Preview Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Sidebar (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Steps Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep("content")}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                activeStep === "content"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              ١. المحتوى
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("design")}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                activeStep === "design"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              ٢. القالب والهوامش
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("export")}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                activeStep === "export"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              ٣. الخط والترقيم
            </button>
          </div>

          {/* STEP 1: Content Loading & Management */}
          {activeStep === "content" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  جلب مباشر من بنك الأسئلة أو الاختبارات
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">اختر المحتوى ليتم تحويله فوراً لصفحات A4.</p>
              </div>

              {/* Bank tree pickers */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  من بنك أسئلة المنهج:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={selectedStage}
                    onChange={(e) => {
                      setSelectedStage(e.target.value);
                      setSelectedUnit("");
                      setSelectedLesson("");
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    <option value="">-- اختر المرحلة الدراسية --</option>
                    {bankTree.map((st) => (
                      <option key={st.stage} value={st.stage}>
                        🎓 {st.stage} ({st.totalQuestions} سؤال)
                      </option>
                    ))}
                  </select>

                  {selectedStage && currentUnits.length > 0 && (
                    <select
                      value={selectedUnit}
                      onChange={(e) => {
                        setSelectedUnit(e.target.value);
                        setSelectedLesson("");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="">-- اختر الوحدة التعليمية --</option>
                      {currentUnits.map((u: any) => (
                        <option key={u.unit} value={u.unit}>
                          📖 {u.unit} ({u.totalQuestions} سؤال)
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedUnit && currentLessons.length > 0 && (
                    <select
                      value={selectedLesson}
                      onChange={(e) => setSelectedLesson(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="">-- اختر الدرس لتحميل أسئلته --</option>
                      {currentLessons.map((l: any) => (
                        <option key={l.lesson} value={l.lesson}>
                          ✍️ {l.lesson} ({l.totalQuestions} سؤال)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedStage && selectedUnit && selectedLesson && (
                  <Button
                    type="button"
                    disabled={isLoadingQuestions}
                    onClick={() => handleLoadFromBankLesson(selectedStage, selectedUnit, selectedLesson)}
                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs"
                  >
                    {isLoadingQuestions ? "جارٍ جلب الأسئلة..." : `تحميل أسئلة «${selectedLesson}»`}
                  </Button>
                )}
              </div>

              {/* Or Load from Quizzes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أو تحميل من اختبارات المنصة المتاحة:
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => handleLoadFromQuiz(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="">-- اختر اختبار لتحميل أسئلته --</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      📝 {q.title} ({q.questions?.length || 0} سؤال)
                    </option>
                  ))}
                </select>
              </div>

              {/* External JSON Upload / Paste */}
              <details className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/20">
                <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  استيراد أو لصق ملف أسئلة JSON خارجي
                </summary>
                <div className="mt-3 space-y-3">
                  <textarea
                    rows={4}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    dir="ltr"
                    placeholder='[{"statement": "سؤال...", "options": ["أ", "ب"], "answer": "أ"}]'
                    className="w-full rounded-lg border border-slate-300 p-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleImportJson(jsonInput)}
                      className="text-xs font-bold"
                    >
                      تطبيق JSON
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
              </details>

              {/* Question Toggles */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">خيارات إظهار المحتوى:</h5>
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
                  <span>إظهار الترجمة (إذا كان السؤال باللغة الإنجليزية)</span>
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
                    <option value="two">عمودين (مدمج)</option>
                    <option value="one">خيار تلو الآخر (رأسي)</option>
                  </select>
                </div>
              </div>

              {/* Questions count summary */}
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                <span>الأسئلة المحملة حالياً:</span>
                <span className="font-mono text-sm">{questions.length} سؤال</span>
              </div>
            </div>
          )}

          {/* STEP 2: Design Canvas & Margins */}
          {activeStep === "design" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  قالب الورقة وصورة الخلفية (Letterhead)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">ارفع إطار المذكرة أو لوجو الأكاديمية بدقة A4.</p>
              </div>

              {/* Background Upload */}
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/40">
                  <Upload className="h-6 w-6 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {bgFileName || "ارفع تصميم الإطار / الخلفية"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP أو SVG لورقة A4</span>
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

              {/* Fit Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  طريقة ملء الصورة:
                </label>
                <select
                  value={settings.fitMode}
                  onChange={(e) => setSettings({ ...settings, fitMode: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="fill">ملء صفحة A4 بالكامل (تمدد دقيق)</option>
                  <option value="contain">احتواء كامل بدون قص (Contain)</option>
                  <option value="cover">ملء الصفحة مع قص الزيادات (Cover)</option>
                </select>
              </div>

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

              {/* Header Text */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                  <input
                    type="text"
                    value={settings.headerText}
                    onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                    placeholder="عنوان المذكرة"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Typography, Numbering & Student Strip */}
          {activeStep === "export" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  الخط والتنسيق والترقيم
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">تخصيص نمط الخط وأرقام الأسئلة والصفحات.</p>
              </div>

              {/* Font Family */}
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

              {/* Language Direction */}
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
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    الحد الأقصى للأسئلة في الصفحة (0 = تلقائي ذكي):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={settings.maxQuestions}
                    onChange={(e) => setSettings({ ...settings, maxQuestions: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:border-slate-700"
                  />
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
                تصدير وطباعة المذكرة الآن
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

        {/* Live A4 Workspace (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Workspace Stats & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span>الصفحات: {pages.length}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>الأسئلة: {questions.length}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllPages(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  showAllPages
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                عرض كل الصفحات
              </button>
              <button
                type="button"
                onClick={() => setShowAllPages(false)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  !showAllPages
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                صفحة واحدة
              </button>
            </div>
          </div>

          {/* Single page stepper if single mode */}
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
                        color: "#162b49",
                        backgroundColor: "#ffffff",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {/* Background image if present */}
                      {backgroundImg && (
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
                            top: "12mm",
                            right: `${region.right}mm`,
                            left: `${region.left}mm`,
                            height: "14mm",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: "1.5px solid #e2d4b4",
                            zIndex: 1,
                            color: "#162b49",
                          }}
                        >
                          <span style={{ fontSize: "12pt", fontWeight: 800 }}>{settings.headerText}</span>
                          <span style={{ fontSize: "9pt", color: "#8791a0" }}>
                            {isRtl ? "أسئلة وتدريبات" : "Questions & Exercises"}
                          </span>
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "3.5mm" }}>
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
                            bottom: "8mm",
                            left: `${region.left}mm`,
                            right: `${region.right}mm`,
                            height: "10mm",
                            borderTop: "1px solid #dce3ec",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            font: "bold 9.5pt Arial, sans-serif",
                            color: "#162b49",
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
                          bottom: "8.5mm",
                          ...(settings.numPosition === "center"
                            ? { left: "50%", transform: "translateX(-50%)" }
                            : settings.numPosition === "right"
                              ? { right: `${region.right}mm` }
                              : { left: `${region.left}mm` }),
                          minWidth: "10mm",
                          height: "8.5mm",
                          padding: "0 2.5mm",
                          backgroundColor: "#162b49",
                          borderRadius: "2mm",
                          textAlign: "center",
                          font: "bold 10pt Arial, sans-serif",
                          lineHeight: "8.5mm",
                          color: "#c39945",
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
          /* Hide non-print areas */
          header, nav, aside, .topbar, button, .no-print,
          [role="tablist"], [data-radix-portal] {
            display: none !important;
          }
          /* Show print sheet */
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
