import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wifi,
  WifiOff,
  FolderDown,
  BookOpen,
  HelpCircle,
  HardDrive,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  getSavedLessonsOffline,
  getSavedQuestionsOffline,
  removeLessonOffline,
  removeQuestionOffline,
  clearOfflineVault,
  syncVaultWithAccount,
  downloadStarterPack,
  type OfflineSavedLesson,
  type OfflineSavedQuestion,
} from "@/lib/offlineStorage";
import { OfflineLessonModal } from "../OfflineLessonModal";

interface OfflineVaultTabProps {
  onBackToDashboard?: () => void;
  onNavigateToLessons?: () => void;
}

type VaultSubTab = "lessons" | "questions" | "storage";

export const OfflineVaultTab: React.FC<OfflineVaultTabProps> = ({
  onBackToDashboard,
  onNavigateToLessons,
}) => {
  const { toast } = useToast();
  const { isOnline, forceOfflineMode, isEffectivelyOffline, toggleForceOfflineMode, metrics, refreshMetrics } =
    useNetworkStatus();

  const [activeTab, setActiveTab] = useState<VaultSubTab>("lessons");
  const [lessons, setLessons] = useState<OfflineSavedLesson[]>([]);
  const [questions, setQuestions] = useState<OfflineSavedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDownloadingStarterPack, setIsDownloadingStarterPack] = useState<boolean>(false);

  // Active Offline Lesson Modal
  const [selectedLessonForModal, setSelectedLessonForModal] = useState<OfflineSavedLesson | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("all");

  // Questions interactive practice state
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<string | number, { selected: any; checked: boolean }>
  >({});

  const loadLocalVaultData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [savedLessons, savedQuestions] = await Promise.all([
        getSavedLessonsOffline(),
        getSavedQuestionsOffline(),
      ]);
      setLessons(savedLessons);
      setQuestions(savedQuestions);
      await refreshMetrics();
    } catch (err) {
      console.error("Failed to load offline vault data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshMetrics]);

  useEffect(() => {
    void loadLocalVaultData();

    const handleVaultChange = () => {
      void loadLocalVaultData();
    };

    window.addEventListener("dr_offline_vault_changed", handleVaultChange);
    return () => {
      window.removeEventListener("dr_offline_vault_changed", handleVaultChange);
    };
  }, [loadLocalVaultData]);

  // Sync with Cloud Account
  const handleSyncAccount = async () => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        description: "أنت غير متصل بالإنترنت حالياً. يلزم توفر اتصال لمزامنة المحفظة مع حسابك السحابي.",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { syncedLessons, syncedQuestions } = await syncVaultWithAccount();
      await loadLocalVaultData();
      toast({
        description: `تمت مزامنة محفظتك بنجاح (${syncedLessons} درس، ${syncedQuestions} سؤال تم تحديثها من حسابك).`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message || "حدث خطأ أثناء مزامنة المحفظة مع الحساب.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Download Starter Pack
  const handleDownloadStarterPack = async () => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        description: "يلزم الاتصال بالإنترنت أول مرة فقط لتحميل حزمة المذاكرة للأوفلاين.",
      });
      return;
    }

    setIsDownloadingStarterPack(true);
    try {
      const res = await downloadStarterPack();
      toast({
        title: "تم تجهيز حزمة البداية السريعة ⚡",
        description: `تم حفظ ${res.savedLessons} درساً و ${res.savedQuestions} سؤالاً كاملاً في جهازك للمذاكرة بدون إنترنت.`,
      });
      await loadLocalVaultData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء تحميل الحزمة السريعة.",
      });
    } finally {
      setIsDownloadingStarterPack(false);
    }
  };

  // Remove Lesson
  const handleRemoveLesson = async (lessonId: number, lessonTitle: string) => {
    if (!confirm(`هل أنت متأكد من حذف درس "${lessonTitle}" من محفظة الأوفلاين؟`)) return;
    await removeLessonOffline(lessonId);
    await loadLocalVaultData();
    toast({
      description: `تم حذف الدرس من المحفظة المحلية.`,
    });
  };

  // Remove Question
  const handleRemoveQuestion = async (qId: string | number) => {
    await removeQuestionOffline(qId);
    await loadLocalVaultData();
    toast({
      description: `تم حذف السؤال من محفظة الأسئلة.`,
    });
  };

  // Clear entire vault
  const handleClearAll = async () => {
    if (!confirm("هل أنت متأكد من مسح جميع محتويات محفظة الأوفلاين المحفوظة محلياً على جهازك؟")) return;
    await clearOfflineVault();
    await loadLocalVaultData();
    toast({
      description: "تم تفريغ محفظة الأوفلاين المحلية بنجاح.",
    });
  };

  // Filtered Lessons
  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return lessons;
    const q = searchQuery.toLowerCase().trim();
    return lessons.filter(
      (l) =>
        l.title?.toLowerCase().includes(q) ||
        l.unit?.toLowerCase().includes(q) ||
        l.courseTitle?.toLowerCase().includes(q)
    );
  }, [lessons, searchQuery]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (questionTypeFilter !== "all" && q.type !== questionTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          q.prompt?.toLowerCase().includes(query) ||
          q.lessonTitle?.toLowerCase().includes(query) ||
          q.unit?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, questionTypeFilter, searchQuery]);

  // Question Answer Handlers
  const handleSelectOption = (qId: string | number, opt: any) => {
    if (answeredQuestions[qId]?.checked) return;
    setAnsweredQuestions((prev) => ({
      ...prev,
      [qId]: { selected: opt, checked: false },
    }));
  };

  const handleCheckQuestion = (qId: string | number) => {
    setAnsweredQuestions((prev) => {
      const cur = prev[qId];
      if (!cur || cur.selected === undefined) return prev;
      return {
        ...prev,
        [qId]: { ...cur, checked: true },
      };
    });
  };

  const handleResetQuestion = (qId: string | number) => {
    setAnsweredQuestions((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  };

  return (
    <div className="space-y-6 dir-rtl text-right" dir="rtl">
      {/* ─── 1. Header & Live Status Cockpit ─── */}
      <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner shrink-0">
              <FolderDown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  محفظة الأوفلاين والمحتوى المحفوظ ⚡
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    !isOnline
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  {!isOnline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                  <span>{!isOnline ? "وضع عدم الاتصال (أوفلاين)" : "متصل بالإنترنت"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                دروسك وأسئلتك المحفوظة للمذاكرة والتطبيق بدون اتصال بالإنترنت في أي وقت ومن أي مكان — مرتبطة ومزامنة بحسابك.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncAccount}
              disabled={isSyncing || !isOnline}
              className="rounded-xl gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              title="مزامنة مع حسابك السحابي"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
              <span>مزامنة مع حسابي</span>
            </Button>

            <Button
              type="button"
              variant={forceOfflineMode ? "default" : "outline"}
              size="sm"
              onClick={() => toggleForceOfflineMode()}
              className={`rounded-xl gap-1.5 text-xs font-black transition-all ${
                forceOfflineMode
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
              title="تفعيل وضع الأوفلاين الاختياري لتوفير باقة الإنترنت"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>{forceOfflineMode ? "إلغاء وضع التوفير" : "وضع توفير الباقة (أوفلاين)"}</span>
            </Button>
          </div>
        </div>

        {/* Cockpit Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                الدروس المحفوظة
              </span>
              <strong className="text-xl font-black text-slate-900 dark:text-white">
                {lessons.length}
              </strong>
            </div>
            <BookOpen className="h-5 w-5 text-indigo-500 opacity-80" />
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                الأسئلة والتدريبات
              </span>
              <strong className="text-xl font-black text-slate-900 dark:text-white">
                {questions.length}
              </strong>
            </div>
            <HelpCircle className="h-5 w-5 text-emerald-500 opacity-80" />
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                المساحة المستهلكة
              </span>
              <strong className="text-xl font-black text-slate-900 dark:text-white">
                {metrics.estimatedMbFormatted}
              </strong>
            </div>
            <HardDrive className="h-5 w-5 text-purple-500 opacity-80" />
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                التخزين المحلي
              </span>
              <strong className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                IndexedDB نشط ✓
              </strong>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* ─── 2. Sub-Tabs Bar & Filters ─── */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "lessons"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>الدروس المحفوظة ({lessons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "questions"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>بنك الأسئلة والتدريبات ({questions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("storage")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "storage"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>إدارة التخزين والمزامنة</span>
          </button>
        </div>

        {/* Search & Local Type Filter */}
        <div className="flex items-center gap-2">
          {activeTab === "questions" && (
            <select
              value={questionTypeFilter}
              onChange={(e) => setQuestionTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">كل أنواع الأسئلة</option>
              <option value="mcq">اختيار من متعدد (MCQ)</option>
              <option value="true_false">صح وخطأ</option>
              <option value="essay">أسئلة مقالية</option>
            </select>
          )}

          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في المحفظة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. Content Body ─── */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-12 text-center text-slate-400 font-bold text-xs space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
          <p>جارٍ تحميل محتويات محفظة الأوفلاين من الذاكرة المحلية...</p>
        </div>
      ) : activeTab === "lessons" ? (
        /* ── SUB-TAB 1: LESSONS ── */
        <div>
          {filteredLessons.length === 0 ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-dashed border-indigo-200 dark:border-indigo-900/60 p-8 sm:p-12 text-center space-y-5 shadow-xs">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 grid place-items-center mx-auto shadow-inner">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    لم تقم بحفظ أي دروس في وضع الأوفلاين بعد
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    يمكنك بنقرة واحدة تحميل حزمة البداية السريعة للاحتفاظ بدروسك وملخصاتك وبنك أسئلتك كاملة على جهازك للمذاكرة والتطبيق بدون الحاجة للإنترنت.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleDownloadStarterPack}
                    disabled={isDownloadingStarterPack || !isOnline}
                    className="rounded-2xl px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs gap-2 shadow-md shadow-indigo-600/25 active:scale-95 transition-all"
                  >
                    <Sparkles className={`h-4 w-4 ${isDownloadingStarterPack ? "animate-spin" : ""}`} />
                    <span>{isDownloadingStarterPack ? "جارٍ تحميل حزمة الأوفلاين..." : "تحميل حزمة البداية السريعة للأوفلاين ⚡"}</span>
                  </Button>

                  {onNavigateToLessons && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onNavigateToLessons}
                      className="rounded-2xl px-4 py-2.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs gap-1.5"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>تصفح دروس المنصة لاختيار دروس محددة</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* 3-Step Interactive Guide */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/30 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs">
                    💡
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    دليل استخدام وضع الأوفلاين (بدون إنترنت):
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="bg-white dark:bg-[#0B1528] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-black">
                      1. حفظ الدرس بنقرة واحدة
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      عند فتح قائمة الدروس أو داخل مشغل الحصة، اضغط على <b>"حفظ للأوفلاين ⚡"</b> ليتم تخزين الملخص والخرائط الذهنية وبنك الأسئلة فورياً.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#0B1528] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                      2. المذاكرة وحل الأسئلة بدون نت
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      افتح محفظة الأوفلاين في أي وقت بدون إنترنت لقراءة الشروح، مراجعة التعريفات، وحل الأسئلة التفاعلية مع معرفة الإجابات الصحيحة والتفسير.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#0B1528] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-black">
                      3. المزامنة السحابية بحسابك
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      بمجرد اتصالك بالإنترنت، يتم حفظ تقدمك تلقائياً ومزامنة كل ما قمت بحفظه مع سيرفر حسابك ليظل معك على أي جهاز.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLessons.map((lesson) => {
                const flashcardsCount = lesson.flashcards?.length || 0;
                const questionsCount = lesson.questions?.length || 0;
                const defsCount = lesson.definitions?.length || 0;

                return (
                  <div
                    key={lesson.id}
                    className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                          جاهز أوفلاين ✓
                        </span>
                        {lesson.unit && (
                          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                            {lesson.unit}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 transition-colors">
                        {lesson.title}
                      </h3>

                      {lesson.courseTitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lesson.courseTitle}
                        </p>
                      )}

                      {/* Included Offline Content Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          شرح مقروء 📝
                        </span>
                        {flashcardsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            {flashcardsCount} كارت 🗂️
                          </span>
                        )}
                        {defsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {defsCount} مصطلح 📖
                          </span>
                        )}
                        {questionsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {questionsCount} تدريب ❓
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setSelectedLessonForModal(lesson)}
                        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>مذاكرة الدرس أوفلاين</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLesson(lesson.id, lesson.title)}
                        className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="حذف من الأوفلاين"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "questions" ? (
        /* ── SUB-TAB 2: QUESTIONS PRACTICE ── */
        <div>
          {filteredQuestions.length === 0 ? (
            <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto">
                <HelpCircle className="h-7 w-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  لا توجد أسئلة محفوظة في المحفظة حالياً
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  يمكنك حفظ أي سؤال أو تدريب ترغب في مراجعته والتدرب عليه بدون إنترنت من داخل بنك الأسئلة أو عند حل تدريبات الدروس.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>تدرّب على أسئلتك المحفوظة أوفلاين مع الإجابة النموذجية والتفسير:</span>
                <span>({filteredQuestions.length} سؤال متاح)</span>
              </div>

              {filteredQuestions.map((q, idx) => {
                const qId = q.id || idx;
                const options = q.options || [];
                const correctAns = q.correctAnswer;
                const explanation = q.explanation;

                const userAns = answeredQuestions[qId];
                const isChecked = userAns?.checked;
                const selectedVal = userAns?.selected;

                return (
                  <div
                    key={qId}
                    className="p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1528] shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="h-6 w-6 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                            {q.prompt}
                          </h4>
                          {q.lessonTitle && (
                            <span className="text-[11px] text-slate-400 font-medium block mt-1">
                              من درس: {q.lessonTitle} {q.unit ? `• ${q.unit}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.difficulty && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {q.difficulty}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(qId)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600"
                          title="حذف من المحفظة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Options list */}
                    {options.length > 0 && (
                      <div className="space-y-2">
                        {options.map((opt, optIdx) => {
                          const isOptionSelected = selectedVal === optIdx || selectedVal === opt;
                          const isCorrectOption =
                            String(correctAns) === String(optIdx) || String(correctAns) === String(opt);

                          let optionStyles =
                            "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

                          if (isChecked) {
                            if (isCorrectOption) {
                              optionStyles =
                                "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 font-black";
                            } else if (isOptionSelected && !isCorrectOption) {
                              optionStyles =
                                "border-red-500 bg-red-50 dark:bg-red-950/70 text-red-900 dark:text-red-100 font-bold line-through";
                            }
                          } else if (isOptionSelected) {
                            optionStyles =
                              "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100 font-black";
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(qId, optIdx)}
                              className={`w-full p-3 rounded-xl border text-right text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${optionStyles}`}
                            >
                              <span>{opt}</span>
                              {isChecked && isCorrectOption && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              )}
                              {isChecked && isOptionSelected && !isCorrectOption && (
                                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions & Feedback */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <div>
                        {!isChecked ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={selectedVal === undefined}
                            onClick={() => handleCheckQuestion(qId)}
                            className="h-7.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs"
                          >
                            تحقق من الإجابة ✓
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetQuestion(qId)}
                            className="h-7.5 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>إعادة الحل</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Detailed Explanation */}
                    {isChecked && explanation && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                        <strong className="block font-black text-emerald-800 dark:text-emerald-300 mb-1">
                          التفسير والتعليل العلمي للإجابة:
                        </strong>
                        {explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── SUB-TAB 3: STORAGE & SYNC SETTINGS ── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                كيف يعمل وضع الأوفلاين في منصة د. محمود المهدي؟
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                تستخدم المنصة تقنية التخزين الآمن فائق السرعة (IndexedDB) على جهازك لحفظ النصوص، الملخصات المقروءة، الخرائط الذهنية، كروت التسميع وبنوك الأسئلة؛ مع مزامنة سحابية مستمرة مع خوادم حسابك لضمان عدم ضياع أي محتوى حتى إذا قمت بتغيير جهازك.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/40 space-y-1.5">
                <strong className="text-xs font-black text-indigo-900 dark:text-indigo-200 block">
                  مزامنة الحساب السحابي:
                </strong>
                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                  أي درس أو سؤال تحفظه يتم ربطه برقم كودك وحسابك الشخصي. عند فتح المنصة من جهاز آخر، يكفي الضغط على "مزامنة مع حسابي" لتحميل كافة محفوظاتك فورياً.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1.5">
                <strong className="text-xs font-black text-emerald-900 dark:text-emerald-200 block">
                  التشغيل بدون إنترنت 100%:
                </strong>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed font-medium">
                  جميع المحتويات والأسئلة المحفوظة تعمل مباشرة بدون إنترنت، ويمكنك حل الأسئلة والتدرب عليها في أي وقت أثناء انقطاع الشبكة أو السفر.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                onClick={handleSyncAccount}
                disabled={isSyncing || !isOnline}
                className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs gap-1.5 shadow-xs"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span>مزامنة كافة المحفوظات من حسابي</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClearAll}
                className="rounded-xl px-4 py-2 border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-black text-xs gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>تفريغ الذاكرة المؤقتة للأوفلاين</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Offline Lesson Modal ─── */}
      {selectedLessonForModal && (
        <OfflineLessonModal
          lesson={selectedLessonForModal}
          onClose={() => setSelectedLessonForModal(null)}
        />
      )}
    </div>
  );
};
