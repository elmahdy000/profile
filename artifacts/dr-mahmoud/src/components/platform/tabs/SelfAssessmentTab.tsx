import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Play,
  Layers,
  Phone,
  User,
  Zap,
  MessageCircle,
  Send,
  ArrowRight,
  FileCheck2,
  Lock,
  AlertTriangle,
  MapPin,
  Building2,
  GraduationCap,
  Settings,
  Check,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";

interface StageTaxonomy {
  stage: string;
  track: "ar" | "en";
  totalQuestions: number;
  units: Array<{
    unit: string;
    totalQuestions: number;
    lessons: Array<{
      lesson: string;
      totalQuestions: number;
    }>;
  }>;
}

interface QuestionClient {
  index: number;
  prompt: string;
  options: string[];
  imageUrl?: string;
  points: number;
}

interface ReviewDetail {
  questionIndex: number;
  prompt: string;
  options: string[];
  selectedOption: number;
  correctOption: number;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  imageUrl?: string;
}

interface EligibilityData {
  canTakeTest?: boolean;
  isEnrolled?: boolean;
  isFreeTrial?: boolean;
  remainingPaid?: number;
  packageCost?: number;
  packageAttempts?: number;
  requiresTopup?: boolean;
  message?: string;
  studentId?: number;
  studentName?: string;
  studentPhone?: string;
  studentGrade?: string;
  studentTrack?: string;
  unlimited?: boolean;
  needPhone?: boolean;
}

function parseUnitOrder(name: string): number {
  if (!name) return 999;
  const s = name.toLowerCase();
  if (/(\b1\b|الأولى|الاولى|unit\s*1|first)/i.test(s)) return 1;
  if (/(\b2\b|الثانية|التانية|unit\s*2|second)/i.test(s)) return 2;
  if (/(\b3\b|الثالثة|التالتة|unit\s*3|third)/i.test(s)) return 3;
  if (/(\b4\b|الرابعة|الرابعه|unit\s*4|fourth)/i.test(s)) return 4;
  if (/(\b5\b|الخامسة|الخامسه|unit\s*5|fifth)/i.test(s)) return 5;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10);
  return 99;
}

function parseLessonOrder(name: string): number {
  if (name.includes("شامل") || name.toLowerCase().includes("comprehensive")) return 9999;
  const matchDash = name.match(/(\d+)\s*[-_.]\s*(\d+)/);
  if (matchDash) {
    return parseInt(matchDash[1], 10) * 100 + parseInt(matchDash[2], 10);
  }
  const arabicNumbers: Record<string, number> = {
    "الاول": 1,
    "الأول": 1,
    "الاولى": 1,
    "الأولى": 1,
    "الثانى": 2,
    "الثاني": 2,
    "الثانية": 2,
    "التانية": 2,
    "الثالث": 3,
    "الثالثة": 3,
    "الرابع": 4,
    "الرابعة": 4,
    "الخامس": 5,
    "الخامسة": 5,
  };
  const matchSingle = name.match(/\b(\d+)\b/);
  if (matchSingle) {
    return parseInt(matchSingle[1], 10) * 10;
  }
  for (const [word, num] of Object.entries(arabicNumbers)) {
    if (name.includes(word)) return num * 10;
  }
  return 50;
}

function isEnglishQuestion(prompt?: string, options?: string[]): boolean {
  const allText = ((prompt || "") + " " + (options || []).join(" ")).trim();
  const arabicMatches = allText.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = allText.match(/[a-zA-Z]/g) || [];
  return latinMatches.length > arabicMatches.length;
}

const EGYPT_GOVERNORATES: Record<string, string[]> = {
  "القاهرة": ["مدينة نصر", "المعادي", "مصر الجديدة", "التجمع الخامس", "حلوان", "شبرا", "وسط البلد", "المرج", "المطرية", "عين شمس", "الزيتون", "النزهة", "المقطم", "الوايلي", "الساحل", "الزمالك", "العباسية", "بدر", "الشروق", "مدينتي", "الرحاب"],
  "الجيزة": ["الدقي", "المهندسين", "العجوزة", "الهرم", "فيصل", "6 أكتوبر", "الشيخ زايد", "العمرانية", "بولاق الدكرور", "الحوامدية", "أوسيم", "البدرشين", "الصف", "أطفيح", "كرداسة", "أبو النمرس"],
  "الإسكندرية": ["سموحة", "ميامي", "سيدي بشر", "لوران", "الإبراهيمية", "العجمي", "العامرية", "المنتزه", "الرمل", "محرم بك", "المنشية", "سيدي جابر", "جناكليس", "كفر عبده", "برج العرب"],
  "القليوبية": ["بنها", "شبرا الخيمة", "قليوب", "القناطر الخيرية", "الخانكة", "طوخ", "كفر شكر", "العبور", "شبين القناطر", "قها"],
  "الدقهلية": ["المنصورة", "ميت غمر", "السنبلاوين", "دكرنس", "طلخا", "بلقاس", "شربين", "المنزلة", "أجا", "بني عبيد", "منية النصر", "نبروه", "الجمالية"],
  "الشرقية": ["الزقازيق", "العاشر من رمضان", "بلبيس", "منيا القمح", "فاقوس", "أبو حماد", "ديرب نجم", "ههيا", "الحسينية", "أبو كبير", "كفر صقر", "مشتول السوق", "الإبراهيمية"],
  "الغربية": ["طنطا", "المحلة الكبرى", "كفر الزيات", "زفتى", "بسيون", "سمنود", "قطور", "السنطة"],
  "المنوفية": ["شبين الكوم", "منوف", "أشمون", "قويسنا", "بركة السبع", "تلا", "الشهداء", "السادات", "سرس الليان"],
  "البحيرة": ["دمنهور", "كفر الدوار", "إيتاي البارود", "أبو حمص", "حوش عيسى", "رشيد", "إدكو", "الدلنجات", "وادي النطرون", "كوم حمادة", "شبراخيت", "المحمودية"],
  "كفر الشيخ": ["كفر الشيخ", "دسوق", "فوه", "مطوبس", "بيلا", "الحامول", "سيدي سالم", "الرياض", "قلين", "بلطيم"],
  "دمياط": ["دمياط", "دمياط الجديدة", "رأس البر", "كفر سعد", "فارسكور", "الزرقا", "كفر البطيخ", "السرو", "ميت أبو غالب"],
  "بورسعيد": ["حي الشرق", "حي العرب", "حي المناخ", "حي الزهور", "بورفؤاد", "حي الضواحي", "حي الجنوب"],
  "الإسماعيلية": ["الإسماعيلية", "فايد", "القنطرة شرق", "القنطرة غرب", "التل الكبير", "أبو صوير", "القصاصين"],
  "السويس": ["حي السويس", "حي الأربعين", "حي فيصل", "حي عتاقة", "الجناين"],
  "بني سويف": ["بني سويف", "ناصر", "ببا", "الواسطى", "إهناسيا", "الفشن", "سمسطا", "بني سويف الجديدة"],
  "الفيوم": ["الفيوم", "إطسا", "طامية", "سنورس", "أبشواي", "يوسف الصديق", "الفيوم الجديدة"],
  "المنيا": ["المنيا", "ملوي", "بني مزار", "مغاغة", "سمالوط", "أبو قرقاص", "مطاي", "دير مواس", "العدوة", "المنيا الجديدة"],
  "أسيوط": ["أسيوط", "ديروط", "القوصية", "منفلوط", "أبنوب", "الفتح", "صدفا", "الغنايم", "ساحل سليم", "البداري", "أسيوط الجديدة"],
  "سوهاج": ["سوهاج", "أخميم", "طهطا", "جرجا", "المراغة", "طما", "المنشأة", "البلينا", "دار السلام", "جهينة", "سوهاج الجديدة", "ساقلتة"],
  "قنا": ["قنا", "نجع حمادي", "دشنا", "قوص", "فرشوط", "أبو تشت", "الوقف", "نقادة", "قفط", "قنا الجديدة"],
  "الأقصر": ["الأقصر", "إسنا", "أرمنت", "القرنة", "الزينية", "البياضية", "الطود", "طيبة الجديدة"],
  "أسوان": ["أسوان", "إدفو", "كوم أمبو", "دراو", "نصر النوبة", "أسوان الجديدة", "كلابشة"],
  "البحر الأحمر": ["الغردقة", "رأس غارب", "سفاجا", "القصير", "مرسى علم", "شلاتين", "حلايب"],
  "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"],
  "مطروح": ["مرسى مطروح", "الحمام", "العلمين", "الضبعة", "النجيلة", "براني", "السلوم", "سيوة"],
  "شمال سيناء": ["العريش", "الشيخ زويد", "رفح", "بئر العبد", "الحسنة", "نخل"],
  "جنوب سيناء": ["شرم الشيخ", "طور سيناء", "دهب", "نويبع", "طابا", "رأس سدر", "سانت كاترين", "أبو رديس", "أبو زنيمة"]
};

function formatUnitLabel(unitName: string): string {
  return unitName;
}

export function SelfAssessmentTab({
  student,
  onBackToDashboard,
}: {
  student?: Student | null;
  onBackToDashboard?: () => void;
}) {
  const { toast } = useToast();

  // Mode: "setup" | "taking" | "results"
  const [step, setStep] = useState<"setup" | "taking" | "results">("setup");

  // Taxonomy & eligibility
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [stages, setStages] = useState<StageTaxonomy[]>([]);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [selectedUnitName, setSelectedUnitName] = useState<string>("");
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]); // empty = whole unit
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(45); // default 45 mins matching mockup
  const [isUntimed, setIsUntimed] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Guest details (if not logged in)
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestGovernorate, setGuestGovernorate] = useState(student?.governorate || "");
  const [guestCity, setGuestCity] = useState(student?.city || "");
  const [customCity, setCustomCity] = useState("");
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<EligibilityData>({});

  // Active quiz session
  const [generating, setGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(600);
  const [totalSecondsSpent, setTotalSecondsSpent] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [score, setScore] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [passed, setPassed] = useState<boolean>(false);
  const [reviewDetails, setReviewDetails] = useState<ReviewDetail[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Check if enrolled student
  const isEnrolled = Boolean(student || eligibilityData.isEnrolled);

  // Language track calculation
  const isStudentLanguages = Boolean(
    (student?.languageTrack && (student.languageTrack.toLowerCase().includes("lang") || student.languageTrack.includes("لغات"))) ||
    (student?.academicTrack && (student.academicTrack.toLowerCase().includes("lang") || student.academicTrack.includes("لغات"))) ||
    (student?.schoolType && (student.schoolType.toLowerCase().includes("lang") || student.schoolType.includes("لغات"))) ||
    (student?.grade && (student.grade.toLowerCase().includes("لغات") || student.grade.toLowerCase().includes("languages"))) ||
    (eligibilityData?.studentTrack === "en")
  );

  // 1. Fetch Taxonomy on Mount
  const loadTaxonomy = async (targetPhone?: string) => {
    try {
      setTaxonomyLoading(true);
      const p = targetPhone || student?.phone || "";
      const url = `/api/learning/self-assessment/taxonomy${p ? `?phone=${encodeURIComponent(p)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.stages && data.stages.length > 0) {
        setStages(data.stages);

        const defaultStage = data.stages[0];
        setSelectedStageName(defaultStage.stage);
        if (defaultStage.units.length > 0) {
          const sortedUnits = defaultStage.units.slice().sort((a: any, b: any) => parseUnitOrder(a.unit) - parseUnitOrder(b.unit));
          setSelectedUnitName(sortedUnits[0].unit);
          setSelectedLessons([]);
        }
      }
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر تحميل قائمة المنهج والوحدات" });
    } finally {
      setTaxonomyLoading(false);
    }
  };

  useEffect(() => {
    void loadTaxonomy();
  }, [student]);

  // 2. Check Eligibility (if student or when guest phone entered)
  const checkEligibility = async (phoneToCheck?: string) => {
    try {
      const qPhone = phoneToCheck !== undefined ? phoneToCheck : guestPhone;
      const url = `/api/learning/self-assessment/eligibility${qPhone ? `?phone=${encodeURIComponent(qPhone)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setEligibilityData(data);
      setEligibilityChecked(true);

      if (data.isEnrolled) {
        if (data.studentName) setGuestName(data.studentName);
        if (data.governorate) setGuestGovernorate(data.governorate);
        if (data.city) setGuestCity(data.city);
        void loadTaxonomy(qPhone);
      }

      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (student) {
      if (student.governorate) setGuestGovernorate(student.governorate);
      if (student.city) setGuestCity(student.city);
      void checkEligibility("");
    }
  }, [student]);

  // Timer Effect during Test Taking
  useEffect(() => {
    if (step !== "taking") return;
    const timer = setInterval(() => {
      setTotalSecondsSpent((prev) => prev + 1);
      if (!isUntimed) {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            void handleSubmitTest(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [step, isUntimed]);

  // Selected Stage & Unit Objects
  const currentStageObj = stages.find((s) => s.stage === selectedStageName) || stages[0];
  const currentUnitObj = currentStageObj?.units.find((u) => u.unit === selectedUnitName);

  // Auto-select first sorted unit if current selectedUnitName is invalid or missing in active stage
  useEffect(() => {
    if (currentStageObj && currentStageObj.units && currentStageObj.units.length > 0) {
      const exists = currentStageObj.units.some((u) => u.unit === selectedUnitName);
      if (!exists) {
        const sortedUnits = currentStageObj.units.slice().sort((a, b) => parseUnitOrder(a.unit) - parseUnitOrder(b.unit));
        setSelectedUnitName(sortedUnits[0].unit);
        setSelectedLessons([]);
      }
    }
  }, [currentStageObj, selectedUnitName]);

  // Total available questions in selected unit/lessons
  const availableQuestionsCount = React.useMemo(() => {
    if (!currentUnitObj) return 0;
    if (selectedLessons.length === 0) {
      return currentUnitObj.totalQuestions || 0;
    }
    return currentUnitObj.lessons
      .filter((l) => selectedLessons.includes(l.lesson))
      .reduce((sum, l) => sum + (l.totalQuestions || 0), 0);
  }, [currentUnitObj, selectedLessons]);

  // Toggle Lesson Selection
  const toggleLesson = (lessonName: string) => {
    if (selectedLessons.includes(lessonName)) {
      setSelectedLessons(selectedLessons.filter((l) => l !== lessonName));
    } else {
      setSelectedLessons([...selectedLessons, lessonName]);
    }
  };

  // Start Exam
  const handleStartExam = async () => {
    if (!selectedUnitName) {
      toast({ variant: "destructive", description: "يرجى اختيار الوحدة أولاً" });
      return;
    }

    if (!student && (!guestPhone || guestPhone.trim().length < 10)) {
      toast({ variant: "destructive", description: "يرجى كتابة رقم الهاتف للمتابعة" });
      return;
    }

    setGenerating(true);
    try {
      const finalCity = guestCity === "أخرى" ? customCity : guestCity;
      const res = await fetch("/api/learning/self-assessment/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: selectedStageName,
          unit: selectedUnitName,
          lessons: selectedLessons.length > 0 ? selectedLessons : ["all"],
          count: questionCount,
          phone: guestPhone,
          studentName: guestName,
          governorate: guestGovernorate,
          city: finalCity,
          durationMinutes: selectedDurationMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresTopup) {
          setEligibilityData({
            canTakeTest: false,
            requiresTopup: true,
            packageCost: 50,
            packageAttempts: 3,
            message: data.error,
          });
        }
        throw new Error(data.error || "تعذر بدء الاختبار");
      }

      setSessionId(data.sessionId);
      setQuestions(data.questions || []);
      setAnswers({});
      setCurrentQIndex(0);
      const dur = typeof data.durationMinutes === "number" ? data.durationMinutes : selectedDurationMinutes;
      setIsUntimed(dur === 0);
      setTimeRemainingSeconds(dur > 0 ? dur * 60 : 0);
      setTotalSecondsSpent(0);
      setStep("taking");
      window.scrollTo({ top: 0, behavior: "smooth" });

      toast({
        title: "بدأ الاختبار بالتوفيق! 🎯",
        description: `تم سحب ${data.questionsCount} سؤال للتقييم الذاتي (${dur === 0 ? "وقت مفتوح" : `${dur} دقيقة`}).`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "تنبيه",
        description: (err as Error).message,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Submit Test
  const handleSubmitTest = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learning/self-assessment/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers,
          timeSpentSeconds: totalSecondsSpent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تسليم الاختبار");

      setScore(data.score || 0);
      setTotalPoints(data.totalPoints || 0);
      setPercentage(data.percentage || 0);
      setPassed(Boolean(data.passed));
      const rList = data.review || data.details || [];
      setReviewDetails(rList);
      setShowSubmitModal(false);
      setStep("results");
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (isAuto) {
        toast({ title: "انتهى الوقت", description: "تم تسليم إجاباتك وإظهار تقرير التقييم الذاتي." });
      } else {
        toast({ title: "تم تسليم الاختبار بنجاح! 🌟", description: `نتيجتك: ${data.percentage}%` });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ في التسليم",
        description: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Filtered review questions
  const displayedReview = showOnlyErrors
    ? reviewDetails.filter((item) => !item.isCorrect)
    : reviewDetails;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* ────────────────── STEP 1: SETUP ────────────────── */}
      {step === "setup" && (
        <div className="space-y-6">
          {/* Header Hero Banner matching Mockup */}
          <div className="rounded-3xl border border-blue-900/40 bg-gradient-to-r from-[#0B1536] via-[#102464] to-[#14328E] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 flex-1 text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/30 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  خدمة التقييم الذاتي الفوري لطلبة المدارس ✨
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-snug">
                  اختبر نفسك وقيّم مستواك <br className="hidden sm:inline" />
                  في أي وحدة أو درس 🎯
                </h1>
                <p className="text-blue-100/80 text-xs sm:text-sm max-w-xl leading-relaxed">
                  اختر الوحدة أو الدرس الذي ترغب في مراجعته، وسيقوم النظام باختبار مخصص فوراً من بنك الأسئلة مع إظهار درجتك وتوضيح الإجابات الصحيحة وشرح تفصيلي لكل سؤال لتتعلم بثقة أكبر.
                </p>

                {/* 4 Feature Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white backdrop-blur-xs transition">
                    <Layers className="h-3.5 w-3.5 text-blue-300" /> اختبارات مخصصة
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white backdrop-blur-xs transition">
                    <Zap className="h-3.5 w-3.5 text-amber-300" /> تقييم فوري
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white backdrop-blur-xs transition">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-300" /> إجابات تفصيلية
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white backdrop-blur-xs transition">
                    <GraduationCap className="h-3.5 w-3.5 text-purple-300" /> تعلم أكثر بثقة
                  </span>
                </div>
              </div>

              {/* Visual Decorative Graphic Card */}
              <div className="hidden md:flex flex-col items-center justify-center p-3 relative shrink-0">
                <div className="w-56 h-48 rounded-2xl bg-gradient-to-tr from-blue-700/40 via-indigo-600/30 to-white/10 border border-white/20 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative">
                  <div className="flex items-center justify-between">
                    <span className="h-8 w-8 rounded-xl bg-blue-500/40 flex items-center justify-center text-white shadow-inner">
                      <GraduationCap className="h-5 w-5 text-cyan-200" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                      دقة 100%
                    </span>
                  </div>
                  <div className="space-y-2 py-2">
                    <div className="h-2 w-3/4 bg-white/40 rounded-full" />
                    <div className="h-2 w-1/2 bg-white/25 rounded-full" />
                    <div className="h-2 w-5/6 bg-blue-400/40 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-bold text-blue-100">
                    <span>بنك أسئلة متكامل</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Info Card (بيانات الطالب لاختيار التقييم الذاتي) */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm relative overflow-hidden space-y-4">
            {/* Top Badge */}
            <div className="flex justify-center -mt-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-xs">
                <User className="h-3.5 w-3.5" />
                {isEnrolled ? "طالب مسجل بالمنصة 🎉" : "طالب جديد 👤+"}
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                بيانات الطالب لاختيار التقييم الذاتي
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                أول خطوة لبدء تجربة تقييم مخصصة لك وفقاً لخطتك التعليمية
              </p>
            </div>

            {/* 4 Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {/* 1. اسم الطالب */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  اسم الطالب
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="ادخل اسمك الثلاثي"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="pr-9 h-11 rounded-xl text-xs border-slate-200 dark:border-slate-800 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2. رقم الهاتف */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  رقم الهاتف (للتواصل/الإستشاري)
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="tel"
                    placeholder="مثال: 01012345678"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      if (e.target.value.length >= 11) {
                        void checkEligibility(e.target.value);
                      }
                    }}
                    className="pr-9 h-11 rounded-xl text-xs border-slate-200 dark:border-slate-800 text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* 3. المحافظة */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  المحافظة
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={guestGovernorate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGuestGovernorate(val);
                      setGuestCity("");
                      setCustomCity("");
                    }}
                    className="w-full h-11 pr-9 pl-3 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                  >
                    <option value="">اختر المحافظة</option>
                    {Object.keys(EGYPT_GOVERNORATES).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none -rotate-90" />
                </div>
              </div>

              {/* 4. المدينة */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  المدينة
                </label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  {guestGovernorate && EGYPT_GOVERNORATES[guestGovernorate]?.length > 0 ? (
                    <select
                      value={guestCity}
                      onChange={(e) => setGuestCity(e.target.value)}
                      className="w-full h-11 pr-9 pl-3 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                    >
                      <option value="">اختر المدينة</option>
                      {EGYPT_GOVERNORATES[guestGovernorate].map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                      <option value="أخرى">أخرى / كتابة يدوية...</option>
                    </select>
                  ) : (
                    <Input
                      type="text"
                      placeholder="ادخل المدينة"
                      value={guestCity}
                      onChange={(e) => setGuestCity(e.target.value)}
                      className="pr-9 h-11 rounded-xl text-xs border-slate-200 dark:border-slate-800"
                    />
                  )}
                  {guestGovernorate && EGYPT_GOVERNORATES[guestGovernorate]?.length > 0 && (
                    <ChevronLeft className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none -rotate-90" />
                  )}
                </div>
                {guestCity === "أخرى" && (
                  <Input
                    type="text"
                    placeholder="اكتب اسم مدينتك..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="h-9 mt-1 rounded-xl text-xs border-slate-200 dark:border-slate-800"
                  />
                )}
              </div>
            </div>

            {/* Eligibility Alert Status if applicable */}
            {eligibilityChecked && (
              <div className="pt-2">
                {eligibilityData.canTakeTest ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{eligibilityData.message || "محاولتك جاهزة ومتاحة الآن!"}</span>
                  </div>
                ) : eligibilityData.requiresTopup ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>انتهت محاولتك المجانية</span>
                    </div>
                    <p className="leading-relaxed">
                      يمكنك شحن باقة <strong>(3 محاولات بـ 50 جنيه فقط)</strong> لمواصلة التقييم الذاتي
                      وحفظ نتائجك. يتم التفعيل الفوري من المساعد أو الأدمن.
                    </p>
                    <div className="pt-2">
                      <a
                        href="https://wa.me/201061803732?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A8%D8%A7%D9%82%D8%A9%203%20%D9%85%D8%AD%D8%A7%D9%88%D9%84%D8%A7%D8%AA%20%D8%AA%D9%82%D9%8A%D9%8A%D9%85%20%D8%B0%D8%A7%D8%AA%D9%8A%20(50%20%D8%AC%D9%86%D9%8A%D9%87)"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        تواصل مع المساعد لتفعيل الباقة
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Stepper Progress Bar matching Mockup */}
          <div className="relative py-2">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-blue-200 dark:bg-blue-900/60 -translate-y-1/2 z-0" />
            <div className="relative z-10 flex items-center justify-between max-w-3xl mx-auto px-4">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/30">
                  1
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  المرحلة والمسار التعليمي
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 text-blue-600 font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الوحدة الدراسية
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-400 text-blue-500 font-bold text-xs flex items-center justify-center shadow-xs">
                  3
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  نطاق الاختبار (الوحدة أو الدروس)
                </span>
              </div>
            </div>
          </div>

          {/* 3 Selection Column Cards matching Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ── CARD 1: Stage & Track ── */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">1</span>
                    المرحلة والمسار التعليمي
                  </div>
                  <p className="text-[11px] text-slate-400">اختر المرحلة الدراسية ثم المسار المناسب</p>
                </div>
              </div>

              {taxonomyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">جاري تحميل المسارات...</div>
              ) : isEnrolled ? (
                <div className="p-3.5 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-right space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                      {isStudentLanguages ? "🇬🇧 مسار اللغات (Languages)" : "🇪🇬 مسار عام (عربي)"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      معتمد
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {selectedStageName || stages[0]?.stage}
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    ✓ مثبت تلقائياً طبقاً لاشتراكك بالمنصة.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stages.map((st) => {
                    const isSelected = selectedStageName === st.stage;
                    return (
                      <button
                        key={st.stage}
                        type="button"
                        onClick={() => {
                          setSelectedStageName(st.stage);
                          if (st.units.length > 0) {
                            const sortedUnits = st.units.slice().sort((a, b) => parseUnitOrder(a.unit) - parseUnitOrder(b.unit));
                            setSelectedUnitName(sortedUnits[0].unit);
                            setSelectedLessons([]);
                          }
                        }}
                        className={`w-full text-right p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 hover:border-blue-200 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                            <span>{st.track === "en" ? "🇬🇧 GB (Languages)" : "🇪🇬 EG عام (عربي)"}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            المرحلة: {st.stage}
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">
                            المسار: {st.track === "en" ? "دروس (Languages)" : "دروس عربي"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── CARD 2: Unit Selection ── */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">2</span>
                    الوحدة الدراسية
                  </div>
                  <p className="text-[11px] text-slate-400">اختر الوحدة المطلوبة من المنهج</p>
                </div>
              </div>

              {!currentStageObj || currentStageObj.units.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">لا توجد وحدات متاحة لهذا المسار</div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                  {(currentStageObj.units || [])
                    .slice()
                    .sort((a, b) => parseUnitOrder(a.unit) - parseUnitOrder(b.unit))
                    .map((u) => {
                    const isSelected = selectedUnitName === u.unit;
                    return (
                      <button
                        key={u.unit}
                        type="button"
                        onClick={() => {
                          setSelectedUnitName(u.unit);
                          setSelectedLessons([]);
                        }}
                        className={`w-full text-right p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 hover:border-blue-200 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                            {formatUnitLabel(u.unit)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            يتضمن {u.lessons.length} دروس رئيسية
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {u.totalQuestions} سؤال
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── CARD 3: Exam Scope (Unit or Lessons) ── */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">3</span>
                    نطاق الاختبار (الوحدة أو الدروس)
                  </div>
                  <p className="text-[11px] text-slate-400">حدد نطاق الاختبار من الوحدة المختارة</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
                {/* Option 1: Whole unit */}
                <button
                  type="button"
                  onClick={() => setSelectedLessons([])}
                  className={`w-full text-right p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 ${
                    selectedLessons.length === 0
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span>🌟 شامل الوحدة بالكامل (كل الدروس)</span>
                  </div>
                  {selectedLessons.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                </button>

                {/* Individual Lessons */}
                {(currentUnitObj?.lessons || [])
                  .slice()
                  .sort((a, b) => parseLessonOrder(a.lesson) - parseLessonOrder(b.lesson))
                  .map((les) => {
                    const isChecked = selectedLessons.includes(les.lesson);
                    return (
                      <button
                        key={les.lesson}
                        type="button"
                        onClick={() => toggleLesson(les.lesson)}
                        className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 text-xs ${
                          isChecked
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                            : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded h-4 w-4 text-blue-600 pointer-events-none shrink-0"
                          />
                          <span className="truncate">{les.lesson}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                          {les.totalQuestions} سؤال
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Exam Settings Card (إعدادات الاختبار) matching Mockup */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">إعدادات الاختبار</h3>
                <p className="text-xs text-slate-400">حدد عدد الأسئلة والوقت المخصص للاختبار</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question Count (Right Side in RTL) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    عدد الأسئلة المطلوبة:
                  </label>
                  {availableQuestionsCount > 0 && (
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                      النتائج في نطاق اختبار {availableQuestionsCount} سؤال
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[10, 20, 30, 50].map((num) => {
                    const isSelected = questionCount === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`h-9 px-4 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {num} سؤال
                      </button>
                    );
                  })}

                  {availableQuestionsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestionCount(Math.min(availableQuestionsCount, 200))}
                      className={`h-9 px-4 rounded-xl text-xs font-bold border transition-all ${
                        questionCount === Math.min(availableQuestionsCount, 200)
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                          : "border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                      }`}
                    >
                      🌟 كل الأسئلة المتاحة ({Math.min(availableQuestionsCount, 200)})
                    </button>
                  )}
                </div>

                {/* Custom Count Input */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 whitespace-nowrap">أو عدد رقماً مخصص:</span>
                  <Input
                    type="number"
                    min={1}
                    max={Math.min(availableQuestionsCount || 200, 200)}
                    value={questionCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        const maxLimit = Math.min(availableQuestionsCount || 200, 200);
                        setQuestionCount(Math.max(1, Math.min(val, maxLimit)));
                      }
                    }}
                    className="h-8 w-20 text-center font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <span className="text-[11px] text-slate-400">
                    (من 1 إلى {Math.min(availableQuestionsCount || 200, 200)} سؤال)
                  </span>
                </div>
              </div>

              {/* Exam Duration (Left Side in RTL) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  توقيت الاختبار (بالدقيقة):
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {[10, 15, 20, 30, 45, 60].map((dur) => {
                    const isSelected = selectedDurationMinutes === dur && !isUntimed;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setSelectedDurationMinutes(dur);
                          setIsUntimed(false);
                        }}
                        className={`h-9 px-3.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {dur} د
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDurationMinutes(0);
                      setIsUntimed(true);
                    }}
                    className={`h-9 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isUntimed || selectedDurationMinutes === 0
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>وقت مفتوح (بدون توقيت)</span>
                    <InfinityIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width Start Exam Button matching Mockup */}
          <div className="space-y-2 text-center pt-2">
            <Button
              size="lg"
              disabled={generating || !selectedUnitName}
              onClick={handleStartExam}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-base shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <>جاري تحضير أسئلة الاختبار...</>
              ) : (
                <>
                  <span>ابدأ اختبار التقييم الذاتي الآن</span>
                  <Play className="h-5 w-5 fill-white" />
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              سيتم توليد اختبار مخصص يتضمن{" "}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">{questionCount} سؤال</strong>{" "}
              في{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {selectedDurationMinutes === 0 ? "وقت مفتوح" : `${selectedDurationMinutes} دقيقة أقصى`}
              </strong>{" "}
              🏆
            </p>
          </div>
        </div>
      )}

      {/* ────────────────── STEP 2: TAKING THE TEST ────────────────── */}
      {step === "taking" && questions.length > 0 && (
        <div className="space-y-5">
          {/* Top Bar: Progress & Timer */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center justify-between gap-4 sticky top-4 z-30">
            <div className="flex items-center gap-2.5">
              <span className="h-8 px-3 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs flex items-center">
                سؤال {currentQIndex + 1} من {questions.length}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {Object.keys(answers).length} إجابة مكتملة
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isUntimed ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold bg-blue-50/80 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>الوقت المنقضي: {formatTimer(totalSecondsSpent)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-sans mr-1">وقت مفتوح</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                    timeRemainingSeconds < 120
                      ? "bg-red-50 border-red-200 text-red-600 animate-pulse dark:bg-red-950/40 dark:border-red-800"
                      : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>الوقت المتبقي: {formatTimer(timeRemainingSeconds)}</span>
                </div>
              )}

              <Button
                variant="default"
                size="sm"
                disabled={submitting}
                onClick={() => setShowSubmitModal(true)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-xs"
              >
                {submitting ? "جاري التصحيح..." : "تسليم الاختبار 🏁"}
              </Button>
            </div>
          </div>

          {/* Question Navigator Dots */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 shadow-xs flex flex-wrap items-center gap-1.5 justify-center">
            {questions.map((q, idx) => {
              const isAnswered = answers[idx] !== undefined;
              const isCurrent = currentQIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "ring-2 ring-blue-600 bg-blue-600 text-white shadow-xs"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = questions[currentQIndex];
            const currentAnswer = answers[currentQIndex];
            const isEng = isEnglishQuestion(currentQ.prompt, currentQ.options);

            return (
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span>السؤال رقم #{currentQIndex + 1}</span>
                    <span>1 درجة</span>
                  </div>

                  <h2
                    dir={isEng ? "ltr" : "rtl"}
                    className={`text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed break-words whitespace-pre-line ${
                      isEng ? "text-left font-sans" : "text-right"
                    }`}
                  >
                    {currentQ.prompt}
                  </h2>

                  {currentQ.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-w-md mx-auto my-3">
                      <img src={currentQ.imageUrl} alt="سؤال" className="w-full h-auto object-contain" />
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-3 pt-2" dir={isEng ? "ltr" : "rtl"}>
                  {currentQ.options.map((optionText, optIdx) => {
                    const isSelected = currentAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQIndex]: optIdx })}
                        dir={isEng ? "ltr" : "rtl"}
                        className={`w-full ${
                          isEng ? "text-left font-sans" : "text-right"
                        } p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 font-semibold shadow-xs"
                            : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="leading-relaxed flex-1" dir={isEng ? "ltr" : "rtl"}>{optionText}</span>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Prev / Next Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                    className="rounded-xl text-xs"
                  >
                    <ChevronRight className="h-4 w-4 ml-1" /> السابق
                  </Button>

                  {currentQIndex < questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs px-5"
                    >
                      التالي <ChevronLeft className="h-4 w-4 mr-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => setShowSubmitModal(true)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 font-bold"
                    >
                      تسليم الاختبار وعرض النتيجة
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ────────────────── STEP 3: RESULTS & EXPLANATIONS ────────────────── */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Result Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950 text-blue-600 shadow-inner mx-auto">
              <Award className="h-10 w-10 text-blue-600" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تقرير نتيجة التقييم الذاتي
              </h2>
              <p className="text-xs text-slate-500">
                الوحدة: {selectedUnitName} • عدد الأسئلة: {reviewDetails.length}
              </p>
            </div>

            {/* Score & Percentage */}
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-black text-blue-600 block">
                  {percentage}%
                </span>
                <span className="text-xs text-slate-400 font-semibold">النسبة المئوية</span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-200 block">
                  {score} / {totalPoints}
                </span>
                <span className="text-xs text-slate-400 font-semibold">إجمالي الدرجات</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("setup")}
                className="rounded-2xl text-xs font-bold"
              >
                <RotateCcw className="h-4 w-4 ml-1.5" />
                إجراء تقييم ذاتي جديد
              </Button>

              <Button
                variant={showOnlyErrors ? "default" : "outline"}
                onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                className="rounded-2xl text-xs font-bold"
              >
                {showOnlyErrors ? "عرض كل الأسئلة" : "عرض الأخطاء فقط ❌"}
              </Button>
            </div>
          </div>

          {/* Questions Review List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-blue-600" />
              مراجعة الأسئلة والشروحات التفصيلية ({displayedReview.length} سؤال معروض):
            </h3>

            {displayedReview.map((rev) => {
              const isRevEng = isEnglishQuestion(rev.prompt, rev.options);
              return (
              <div
                key={rev.questionIndex}
                className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all ${
                  rev.isCorrect
                    ? "border-emerald-200 bg-white dark:bg-slate-900 dark:border-emerald-900/40"
                    : "border-red-200 bg-red-50/20 dark:bg-slate-900 dark:border-red-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600">
                      #{rev.questionIndex + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        rev.isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {rev.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> إجابة صحيحة (+1)
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> إجابة غير صحيحة (0)
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <h4
                  dir={isRevEng ? "ltr" : "rtl"}
                  className={`text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed break-words whitespace-pre-line ${
                    isRevEng ? "text-left font-sans" : "text-right"
                  }`}
                >
                  {rev.prompt}
                </h4>

                {/* Options with Highlight */}
                <div className="space-y-2 pt-1" dir={isRevEng ? "ltr" : "rtl"}>
                  {rev.options.map((opt, oIdx) => {
                    const isSelected = rev.selectedOption === oIdx;
                    const isTrueCorrect = rev.correctOption === oIdx;

                    let optClass = "border-slate-200 dark:border-slate-800 text-slate-600 bg-white dark:bg-slate-800/40";
                    if (isTrueCorrect) {
                      optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold";
                    } else if (isSelected && !rev.isCorrect) {
                      optClass = "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 line-through";
                    }

                    return (
                      <div
                        key={oIdx}
                        dir={isRevEng ? "ltr" : "rtl"}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${
                          isRevEng ? "text-left font-sans" : "text-right"
                        } ${optClass}`}
                      >
                        <span className="leading-relaxed flex-1" dir={isRevEng ? "ltr" : "rtl"}>{opt}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                              إجابتك
                            </span>
                          )}
                          {isTrueCorrect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold">
                              الصحيحة ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Explanation */}
                {rev.explanation && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/40 p-4 space-y-1.5 text-xs text-blue-950 dark:text-blue-200">
                    <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <HelpCircle className="h-3.5 w-3.5" />
                      الشرح التوضيحي للحل الصحيح:
                    </div>
                    <p dir="auto" className="leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                      {rev.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ────────────────── SUBMISSION CONFIRMATION MODAL ────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تأكيد تسليم الاختبار
                </h3>
                <p className="text-xs text-slate-500">
                  هل انتهيت وترغب في إنهاء الاختبار وتصحيح إجاباتك الآن؟
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span>إجمالي عدد الأسئلة:</span>
                <span className="font-bold">{questions.length} سؤال</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                <span>الأسئلة التي تمت الإجابة عليها:</span>
                <span className="font-bold font-mono">
                  {Object.keys(answers).length} من {questions.length}
                </span>
              </div>
              {Object.keys(answers).length < questions.length && (
                <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                  <span>أسئلة لم تتم الإجابة عليها:</span>
                  <span className="font-bold font-mono">
                    {questions.length - Object.keys(answers).length} سؤال
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>الوقت المستغرق حتى الآن:</span>
                <span className="font-bold font-mono">{formatTimer(totalSecondsSpent)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Button
                variant="default"
                disabled={submitting}
                onClick={() => void handleSubmitTest(false)}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-sm"
              >
                {submitting ? "جاري التصحيح وحساب النتيجة..." : "نعم، تسليم الاختبار والنتيجة 🏁"}
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl text-xs h-10 px-4"
              >
                متابعة الحل
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
