import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MonitorConfigState {
  enabled: boolean;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
  alertOnNewReceipt: boolean;
  alertOnNewBooking: boolean;
  alertOnNewStudent: boolean;
  alertOnRepeatAbsence: boolean;
  alertOnExpiringSubscriptions: boolean;
  telegramEnabled: boolean;
  useAutoExamBot: boolean;
  hasCustomBotToken: boolean;
  telegramChatId: string;
  resolvedTelegramSource: "custom" | "auto_exam" | "none";
  resolvedTelegramChatId: string | null;
  hasResolvedTelegram: boolean;
  hasGeminiKey: boolean;
  hasGeminiKeyOverride: boolean;
  webhookRegisteredUrl: string | null;
  botUsername?: string | null;
  botConnected?: boolean;
  lastDailyReportDate: string | null;
}

interface ExportFileMeta {
  id: string;
  filename: string;
  title: string;
  format: "csv" | "html";
  mimeType: string;
  rowCount: number;
  sizeBytes: number;
  createdAt: string;
}

interface PlatformPulse {
  generatedAt: string;
  cairoDate: string;
  cairoTimeLabel: string;
  systemHealth: {
    dbOk: boolean;
    dbLatencyMs: number;
    uptimeSeconds: number;
    processRssMb: number;
    osFreeMemMb: number;
    osTotalMemMb: number;
    osMemUsedPercent: number;
    loadAvg1m: number;
    errorsLast24hCount: number;
    recentErrors: Array<{ method: string; path: string; message: string; at: string }>;
  };
  students: {
    total: number;
    activeApproved: number;
    pendingApproval: number;
    paid: number;
    pendingReview: number;
    unpaid: number;
    onlineCount: number;
    centerCount: number;
    newToday: number;
    newLast7Days: number;
    unconfirmedCenterCount: number;
    inactivePaid7Days: number;
    byStage: Array<{ stage: string; total: number; paid: number }>;
    byCenter: Array<{ centerName: string; total: number; paid: number; unconfirmed: number }>;
  };
  attendanceToday: {
    date: string;
    present: number;
    late: number;
    absent: number;
    byCenter: Array<{ centerName: string; present: number; late: number; absent: number }>;
    absentNamesToday: string[];
    repeatAbsentees7Days: Array<{ studentId: number; name: string; phone?: string; centerName: string; absentDays: number }>;
  };
  financeAndActions: {
    totalSubscriptionsCount: number;
    paidSubscriptionsCount: number;
    paidRevenueEgpTotal: number;
    paidRevenueLast30DaysEgp: number;
    pendingSubscriptionsAmountEgp: number;
    pendingMonthlySubscriptions: number;
    expiringSubscriptionsNext3Days: number;
    selfAssessmentPaidPacksTotal: number;
    pendingReceiptsCount: number;
    pendingReceiptsLatest: Array<{ id: number; studentName: string; phone: string; createdAt: string }>;
    pendingBookingsCount: number;
    pendingBookingsLatest: Array<{ id: number; name: string; phone: string; message?: string; createdAt: string }>;
    pendingRecoveryRequests: number;
    pendingSummaries: number;
    pendingEssaySubmissions: number;
  };
  academics: {
    publishedCoursesCount: number;
    publishedVideosCount: number;
    publishedFilesCount: number;
    publishedQuizzesCount: number;
    videoViewsLast7Days: number;
    videoCompletionsLast7Days: number;
    dailyChallengesCompleted7Days: number;
    activeMistakeItemsCount: number;
    attemptsToday: number;
    attemptsLast7Days: number;
    avgScoreLast7Days: number;
    passRateLast7Days: number;
    selfAssessmentsLast7Days: number;
    lowestAvgQuiz7Days: { title: string; attempts: number; avgScore: number } | null;
    topStudentsLast7Days: Array<{ name: string; avgScore: number; attempts: number }>;
  };
  operations: {
    auditLogsLast24hCount: number;
    auditBreakdownByActor24h: Array<{ actorName: string; actorRole: string; count: number }>;
    recentAuditActions: Array<{
      actorName: string;
      actorRole: string;
      action: string;
      details: string;
      createdAt: string;
    }>;
    googleSheetConfigured: boolean;
    googleSheetLastSyncStatus: string | null;
    googleSheetLastSyncedAt: string | null;
    autoExamTelegramEnabled: boolean;
  };
}

interface ReportEntry {
  id: string;
  kind: "daily" | "manual" | "alert" | "telegram_query";
  title: string;
  summary: string;
  createdAt: string;
  sentToTelegram: boolean;
  telegramError?: string | null;
  modelUsed?: string | null;
  files?: ExportFileMeta[];
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  questionRef?: string;
  modelUsed?: string;
  timestamp: string;
  files?: ExportFileMeta[];
}

const QUICK_PROMPTS = [
  "أعطني تقريراً متكاملاً لكل أقسام المنصة اليوم (طلاب، مالية، سناتر، اختبارات، سيرفر)",
  "جهز لي ملف Excel (CSV) بجميع طلاب سنتر الحناوي بأرقامهم وأكوادهم وحالة الدفع",
  "هاتلي تفاصيل المالية: المحصّل بالجنيه، المستحقات المعلقة، ومن لم يدفع الشهر",
  "ابعتلي كشف نتائج آخر امتحان والطلاب المتعثرين",
  "من الطلاب الغايبون اليوم والغائبون بشكل متكرر بأرقام أولياء الأمور؟",
  "اعرض سجل نشاط المساعدين والإدارة خلال آخر 24 ساعة",
];

type AlertToggleKey =
  | "alertOnNewReceipt"
  | "alertOnNewBooking"
  | "alertOnNewStudent"
  | "alertOnRepeatAbsence"
  | "alertOnExpiringSubscriptions";

const ALERT_TOGGLE_OPTIONS: ReadonlyArray<{ key: AlertToggleKey; label: string }> = [
  { key: "alertOnNewReceipt", label: "تنبيه فور رفع إيصال دفع جديد" },
  { key: "alertOnNewBooking", label: "تنبيه عند وجود طلب حجز جديد" },
  { key: "alertOnNewStudent", label: "تنبيه عند تسجيل طالب جديد" },
  { key: "alertOnRepeatAbsence", label: "تنبيه يومي للطلاب متكرري الغياب (9 مساءً)" },
  { key: "alertOnExpiringSubscriptions", label: "تنبيه يومي للاشتراكات القريبة من الانتهاء (1 ظهراً)" },
];

const REPORT_KIND_META: Record<ReportEntry["kind"], { label: string; className: string }> = {
  alert: { label: "تنبيه فوري", className: "bg-amber-100 text-amber-800" },
  daily: { label: "تقرير يومي", className: "bg-emerald-100 text-emerald-800" },
  telegram_query: { label: "طلب تليجرام", className: "bg-sky-100 text-sky-800" },
  manual: { label: "تقرير متكامل", className: "bg-blue-100 text-blue-800" },
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

async function readJsonSafe<T = Record<string, unknown>>(res: Response): Promise<Partial<T>> {
  try {
    return (await res.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export function AdminMonitorAgentTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"chat" | "reports" | "settings">("chat");
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<MonitorConfigState | null>(null);
  const [pulse, setPulse] = useState<PlatformPulse | null>(null);
  const [reports, setReports] = useState<ReportEntry[]>([]);

  const [botTokenInput, setBotTokenInput] = useState("");
  const [chatIdInput, setChatIdInput] = useState("");
  const [geminiOverrideInput, setGeminiOverrideInput] = useState("");
  const [hasUnsavedConfig, setHasUnsavedConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  const [isRunningReport, setIsRunningReport] = useState(false);
  const [reportFilter, setReportFilter] = useState<"all" | "daily" | "manual" | "alert" | "telegram_query">("all");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isAskingAgent, setIsAskingAgent] = useState(false);
  const [sendingFileId, setSendingFileId] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/monitor/state", { credentials: "include" });
      const data = await readJsonSafe<{
        config: MonitorConfigState;
        pulse: PlatformPulse;
        reports: ReportEntry[];
        error: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || "تعذر تحميل بيانات الوكيل الذكي");
      }
      setConfig(data.config || null);
      setChatIdInput(data.config?.telegramChatId || "");
      setPulse(data.pulse || null);
      setReports(data.reports || []);
      setHasUnsavedConfig(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ في تحميل مراقب المنصة",
        description: getErrorMessage(err, "تعذر تحميل البيانات"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const updateConfigField = <K extends keyof MonitorConfigState>(key: K, val: MonitorConfigState[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: val } : prev));
    setHasUnsavedConfig(true);
  };

  const handleSendFileToTelegram = async (fileId: string) => {
    setSendingFileId(fileId);
    try {
      const res = await fetch(`/api/admin/monitor/exports/${encodeURIComponent(fileId)}/send-telegram`, {
        method: "POST",
        credentials: "include",
      });
      const data = await readJsonSafe<{ error: string }>(res);
      if (!res.ok) throw new Error(data.error || "تعذر إرسال الملف لتليجرام");
      toast({ title: "تم إرسال الملف إلى تليجرام 📁✅" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: getErrorMessage(err, "تعذر إرسال الملف لتليجرام"),
      });
    } finally {
      setSendingFileId(null);
    }
  };

  const handleRunReport = async (sendToTelegram: boolean) => {
    setIsRunningReport(true);
    try {
      const res = await fetch("/api/admin/monitor/run-report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendToTelegram, includeFile: true }),
      });
      const data = await readJsonSafe<{ report: ReportEntry; error: string }>(res);
      if (!res.ok || !data.report) throw new Error(data.error || "فشل توليد التقرير");

      const report = data.report;
      setReports((prev) => [report, ...prev]);
      setSubTab("reports");

      let reportToastTitle = "تم توليد التقرير المتكامل + ملف Excel بنجاح 📊";
      if (sendToTelegram) {
        reportToastTitle = report.sentToTelegram
          ? "تم توليد التقرير المتكامل + الملف وإرسالهما لتليجرام ✅"
          : "تم توليد التقرير المتكامل (تنبيه تليجرام)";
      }

      toast({
        title: reportToastTitle,
        description: report.telegramError || `باستخدام ${report.modelUsed || "Gemini AI"}`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: getErrorMessage(err, "فشل توليد التقرير"),
      });
    } finally {
      setIsRunningReport(false);
    }
  };

  const handleDeleteReport = async (id?: string) => {
    try {
      const res = await fetch(
        id ? `/api/admin/monitor/reports/${encodeURIComponent(id)}` : "/api/admin/monitor/reports",
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("تعذر حذف السجل");
      setReports((prev) => (id ? prev.filter((r) => r.id !== id) : []));
      toast({ title: id ? "تم حذف التقرير" : "تم مسح أرشيف التقارير" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: getErrorMessage(err, "تعذر حذف السجل"),
      });
    }
  };

  const handleAskQuestion = async (customQ?: string, sendToTelegram = false) => {
    const q = (customQ ?? questionInput).trim();
    if (!q || isAskingAgent) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: q,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    if (!customQ) setQuestionInput("");
    setIsAskingAgent(true);

    try {
      const res = await fetch("/api/admin/monitor/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          sendToTelegram,
        }),
      });
      const data = await readJsonSafe<{
        answer: string;
        modelUsed: string;
        files: ExportFileMeta[];
        generatedAt: string;
        telegramSent: boolean;
        error: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "تعذر الحصول على رد الوكيل");

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "",
          questionRef: q,
          modelUsed: data.modelUsed,
          files: data.files || [],
          timestamp: data.generatedAt || new Date().toISOString(),
        },
      ]);
      if (sendToTelegram && data.telegramSent) {
        toast({ title: "تم إرسال الإجابة والملفات إلى تليجرام ✅" });
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "تعذر تنفيذ الطلب",
        description: getErrorMessage(err, "تعذر تنفيذ الطلب"),
      });
    } finally {
      setIsAskingAgent(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/admin/monitor/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          dailyReportEnabled: config.dailyReportEnabled,
          dailyReportTime: config.dailyReportTime,
          alertOnNewReceipt: config.alertOnNewReceipt,
          alertOnNewBooking: config.alertOnNewBooking,
          alertOnNewStudent: config.alertOnNewStudent,
          alertOnRepeatAbsence: config.alertOnRepeatAbsence,
          alertOnExpiringSubscriptions: config.alertOnExpiringSubscriptions,
          telegramEnabled: config.telegramEnabled,
          useAutoExamBot: config.useAutoExamBot,
          telegramChatId: chatIdInput.trim(),
          ...(botTokenInput.trim() ? { telegramBotToken: botTokenInput.trim() } : {}),
          ...(geminiOverrideInput.trim() ? { geminiKeyOverride: geminiOverrideInput.trim() } : {}),
        }),
      });
      const data = await readJsonSafe<{ hasResolvedTelegram: boolean; error: string }>(res);
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");

      setBotTokenInput("");
      setGeminiOverrideInput("");
      await loadState();
      toast({
        title: "تم حفظ إعدادات الوكيل وتليجرام بنجاح ✅",
        description: data.hasResolvedTelegram
          ? "قناة تليجرام متصلة وجاهزة لإرسال التقارير."
          : "تم الحفظ — أضف Bot Token و Chat ID لتفعيل الإرسال إلى تليجرام.",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: getErrorMessage(err, "تعذر حفظ الإعدادات"),
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await fetch("/api/admin/monitor/telegram-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(botTokenInput.trim() ? { botToken: botTokenInput.trim() } : {}),
          ...(chatIdInput.trim() ? { chatId: chatIdInput.trim() } : {}),
        }),
      });
      const data = await readJsonSafe<{ message: string; error: string }>(res);
      if (!res.ok) throw new Error(data.error || "فشل اختبار الاتصال بتليجرام");
      toast({ title: "تم الإرسال إلى تليجرام 🟢", description: data.message });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "فشل اتصال تليجرام",
        description: getErrorMessage(err, "فشل اختبار الاتصال بتليجرام"),
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSetupWebhook = async () => {
    setIsSettingWebhook(true);
    try {
      const res = await fetch("/api/admin/monitor/telegram-webhook-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(botTokenInput.trim() ? { botToken: botTokenInput.trim() } : {}),
        }),
      });
      const data = await readJsonSafe<{ message: string; error: string }>(res);
      if (!res.ok) throw new Error(data.error || "فشل تفعيل الرد التفاعلي");
      await loadState();
      toast({ title: "تم تفعيل الرد التفاعلي للبوت 🔗✅", description: data.message });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: getErrorMessage(err, "فشل تفعيل الرد التفاعلي"),
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const renderFilesRow = (files?: ExportFileMeta[]) => {
    if (!files || files.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-slate-200/80">
        {files.map((f) => (
          <div key={f.id} className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 p-1">
            <a
              href={`/api/admin/monitor/exports/${encodeURIComponent(f.id)}`}
              download={f.filename}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1 transition"
            >
              <Download className="h-3 w-3" />
              <span>تحميل {f.format.toUpperCase()} ({f.rowCount} سجل)</span>
            </a>
            <button
              type="button"
              disabled={sendingFileId === f.id}
              onClick={() => void handleSendFileToTelegram(f.id)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="إرسال هذا الملف مباشرة إلى تليجرام"
            >
              <Send className="h-3 w-3" />
              <span>إرسال لتليجرام</span>
            </button>
          </div>
        ))}
      </div>
    );
  };

  const filteredReports = reports.filter((r) => reportFilter === "all" || r.kind === reportFilter);

  if (isLoading && !pulse) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm font-bold">جاري قراءة نبض المنصة وتحميل الوكيل الذكي...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 shadow-lg border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">الوكيل الذكي ومراقب المنصة المتكامل</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {config?.hasGeminiKey ? "Gemini 4 + بحث عميق وتصدير ملفات" : "وضع الإحصاء المباشر"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border inline-flex items-center gap-1 ${
                    config?.hasResolvedTelegram
                      ? "bg-sky-500/20 text-sky-200 border-sky-400/30"
                      : "bg-amber-500/20 text-amber-200 border-amber-400/30"
                  }`}
                >
                  <MessageCircle className="h-3 w-3" />
                  {config?.hasResolvedTelegram
                    ? config.botUsername
                      ? `@${config.botUsername} جاهز`
                      : "بوت تليجرام جاهز"
                    : "ربط تليجرام يحتاج ضبط"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                اطلب أي كشف طلاب، درجات اختبار، مالية، غياب، أو تقرير شامل — ويرد عليك فوراً مع إرفاق ملف Excel/CSV هنا أو في تليجرام.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRunningReport}
              onClick={() => void handleRunReport(false)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/15 inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isRunningReport ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
              <span>تقرير متكامل الآن</span>
            </button>
            <button
              type="button"
              disabled={isRunningReport}
              onClick={() => void handleRunReport(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>تقرير + ملف Excel لتليجرام</span>
            </button>
            <button
              type="button"
              onClick={() => void loadState()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              title="تحديث الأرقام الآن"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Telemetry Cards */}
      {pulse && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>الطلاب</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{pulse.students.total}</div>
            <div className="text-[11px] text-slate-600 mt-1">
              مدفوع: <strong className="text-emerald-700">{pulse.students.paid}</strong> • اليوم: <strong>+{pulse.students.newToday}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>المحصّل (ج.م)</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700">{pulse.financeAndActions.paidRevenueEgpTotal.toLocaleString("en-US")}</div>
            <div className="text-[11px] text-slate-600 mt-1">
              معلق: <strong className="text-amber-700">{pulse.financeAndActions.pendingSubscriptionsAmountEgp} ج.م</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>حضور اليوم</span>
              <QrCode className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700">{pulse.attendanceToday.present}</div>
            <div className="text-[11px] text-slate-600 mt-1">
              متأخر: <strong>{pulse.attendanceToday.late}</strong> • غائب: <strong className="text-red-600">{pulse.attendanceToday.absent}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>مهام معلقة</span>
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-600">
              {pulse.financeAndActions.pendingReceiptsCount + pulse.financeAndActions.pendingBookingsCount + pulse.financeAndActions.pendingRecoveryRequests}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              إيصالات: <strong>{pulse.financeAndActions.pendingReceiptsCount}</strong> • حجوزات: <strong>{pulse.financeAndActions.pendingBookingsCount}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>الاختبارات (7ي)</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-700">{pulse.academics.attemptsLast7Days}</div>
            <div className="text-[11px] text-slate-600 mt-1">
              متوسط: <strong>{pulse.academics.avgScoreLast7Days}%</strong> • نجاح: <strong>{pulse.academics.passRateLast7Days}%</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
              <span>السيرفر والـ DB</span>
              <Server className={`h-4 w-4 ${pulse.systemHealth.dbOk ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <div className={`text-xl font-black ${pulse.systemHealth.errorsLast24hCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
              {pulse.systemHealth.dbOk ? `${pulse.systemHealth.dbLatencyMs}ms` : "عطل"}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              RAM: <strong>{pulse.systemHealth.osMemUsedPercent}%</strong> • 500: <strong>{pulse.systemHealth.errorsLast24hCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setSubTab("chat")}
          className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer ${
            subTab === "chat" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>اطلب أي تقرير أو كشف من الوكيل</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab("reports")}
          className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer ${
            subTab === "reports" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>سجل التقارير والتنبيهات ({reports.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer ${
            subTab === "settings" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>إعدادات بوت تليجرام والمراقبة</span>
          {hasUnsavedConfig && <span className="h-2 w-2 rounded-full bg-amber-500" />}
        </button>
      </div>

      {/* SUBTAB 1: AI AGENT CHAT */}
      {subTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col min-h-[500px]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span>المساعد التنفيذي الذكي (بحث قاعدة البيانات + تصدير ملفات)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">اطلب أي قائمة أو تحليل أو شيت وسيُجهز لك فوراً</span>
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isAskingAgent}
                  onClick={() => void handleAskQuestion(q)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 text-[11px] font-bold transition cursor-pointer text-right"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] p-1 mb-4">
              {chatMessages.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-slate-400 p-6 border border-dashed border-slate-200 rounded-2xl">
                  <FileSpreadsheet className="h-9 w-9 text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700">اطلب أي تقرير، شيت درجات، قائمة طلاب سنتر، إيصالات، أو تحليل لطالب معين</p>
                  <p className="text-[11px] text-slate-500 mt-1">يمكنك أيضاً إرسال نفس الطلب مباشرة إلى بوت تليجرام `@DrElmahdy_Quiz_Bot` ليصلك هناك مع ملف Excel</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white mr-8"
                        : "bg-slate-50 border border-slate-200 text-slate-800 ml-4"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] opacity-80 font-bold">
                      <span>{msg.role === "user" ? "د. محمود" : `المساعد الذكي (${msg.modelUsed || "Gemini"})`}</span>
                      <div className="flex items-center gap-2">
                        {msg.role === "assistant" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(msg.text);
                                toast({ title: "تم نسخ الإجابة ✅" });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              <Copy className="h-2.5 w-2.5" /> نسخ
                            </button>
                            {msg.questionRef && (
                              <button
                                type="button"
                                onClick={() => void handleAskQuestion(msg.questionRef, true)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 cursor-pointer"
                              >
                                <Send className="h-2.5 w-2.5" /> لتليجرام
                              </button>
                            )}
                          </>
                        )}
                        <span>
                          {new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(new Date(msg.timestamp))}
                        </span>
                      </div>
                    </div>
                    {msg.text}
                    {msg.role === "assistant" && renderFilesRow(msg.files)}
                  </div>
                ))
              )}
              {isAskingAgent && (
                <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span>جاري البحث في قاعدة البيانات وتجهيز المطلوب...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskQuestion();
              }}
              className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100"
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="اطلب أي كشف أو تقرير أو تحليل من المنصة..."
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isAskingAgent || !questionInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>تنفيذ الطلب</span>
              </button>
              <button
                type="button"
                disabled={isAskingAgent || !questionInput.trim()}
                onClick={() => void handleAskQuestion(questionInput, true)}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="تنفيذ الطلب وإرسال النتيجة + الملفات إلى تليجرام"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>وأرسل لتليجرام</span>
              </button>
            </form>
          </div>

          {/* Right Live Alerts & Centers Sidebar */}
          {pulse && (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>نقاط المتابعة الفورية والسناتر</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">بانتظار تفعيل الحساب</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black">{pulse.students.pendingApproval}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">لم يؤكدوا السنتر بعد</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black">{pulse.students.unconfirmedCenterCount}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">طلبات استعادة كود</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black">{pulse.financeAndActions.pendingRecoveryRequests}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">تلخيصات ومقالي بانتظار التقييم</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black">
                    {pulse.financeAndActions.pendingSummaries + pulse.financeAndActions.pendingEssaySubmissions}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">اشتراكات تنتهي خلال 3 أيام</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black">
                    {pulse.financeAndActions.expiringSubscriptionsNext3Days}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">طلاب مدفوعون خاملون (+7ي)</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-black">{pulse.students.inactivePaid7Days}</span>
                </div>
              </div>

              {pulse.students.byCenter.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-black text-slate-800 mb-2">🏫 توزيع طلاب السناتر:</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {pulse.students.byCenter.map((c) => (
                      <div key={c.centerName} className="text-[11px] bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                        <span className="font-bold text-slate-800 truncate">{c.centerName}</span>
                        <span className="text-blue-700 font-black shrink-0">{c.total} ({c.paid} مدفوع)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: REPORTS & ALERTS FEED */}
      {subTab === "reports" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">أرشيف التقارير اليومية والتنبيهات الفورية</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", "الكل"],
                  ["daily", "يومي آلي"],
                  ["manual", "تقارير متكاملة"],
                  ["alert", "تنبيهات لحظية"],
                  ["telegram_query", "طلبات تليجرام"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReportFilter(key)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    reportFilter === key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              {reports.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleDeleteReport()}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" /> مسح الكل
                </button>
              )}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-bold">
              لا توجد تقارير مسجلة في هذا التصنيف حتى الآن — اضغط "تقرير متكامل الآن" بالأعلى لإنشاء تقرير شامل.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const badgeMeta = REPORT_KIND_META[rep.kind];
                return (
                <div key={rep.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badgeMeta.className}`}>
                        {badgeMeta.label}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">{rep.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                      {rep.sentToTelegram && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="h-3 w-3" /> أُرسل لتليجرام
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(
                          new Date(rep.createdAt),
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteReport(rep.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="حذف التقرير"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white rounded-xl border border-slate-200/80 p-3.5">
                    {rep.summary}
                    {renderFilesRow(rep.files)}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SETTINGS & TELEGRAM WEBHOOK */}
      {subTab === "settings" && config && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5 max-w-3xl">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span>إعدادات المراقبة التلقائية وربط بوت التليجرام</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                البيانات محفوظة بشكل آمن في الخادم ومتاحة لصلاحية المدير الرئيسي فقط (د. محمود).
              </p>
            </div>
            {hasUnsavedConfig && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">
                تغييرات غير محفوظة
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => updateConfigField("enabled", e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-xs font-black text-slate-800">تفعيل مراقبة المنصة في الخلفية</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={config.dailyReportEnabled}
                onChange={(e) => updateConfigField("dailyReportEnabled", e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-xs font-black text-slate-800">إرسال تقرير يومي متكامل + ملف Excel تلقائياً</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                توقيت التقرير اليومي (بتوقيت القاهرة 24 ساعة)
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="time"
                  value={config.dailyReportTime}
                  onChange={(e) => updateConfigField("dailyReportTime", e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">محرك Gemini AI</span>
              <span className={`font-black ${config.hasGeminiKey ? "text-emerald-700" : "text-red-600"}`}>
                {config.hasGeminiKey ? "مفعل وجاهز ✅" : "غير مضبوط"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-slate-900">التنبيهات الفورية والذكية:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {ALERT_TOGGLE_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(config[key])}
                    onChange={(e) => updateConfigField(key, e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="font-bold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-sky-600" />
                <span>إعدادات بوت التليجرام (Telegram Bot)</span>
              </h4>
              <label className="flex items-center gap-2 text-[11px] font-bold text-sky-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.useAutoExamBot}
                  onChange={(e) => updateConfigField("useAutoExamBot", e.target.checked)}
                  className="h-3.5 w-3.5 accent-sky-600"
                />
                <span>استخدام بوت الاختبارات اليومية تلقائياً إذا وُجد</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bot Token (اختياري عند استخدام البوت الحالي)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={botTokenInput}
                  onChange={(e) => {
                    setBotTokenInput(e.target.value);
                    setHasUnsavedConfig(true);
                  }}
                  placeholder={config.hasCustomBotToken ? "•••••••• (محفوظ)" : "يُقرأ تلقائياً من بوت المنصة"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Telegram Chat ID (اختياري عند استخدام البوت الحالي)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={chatIdInput}
                  onChange={(e) => {
                    setChatIdInput(e.target.value);
                    setHasUnsavedConfig(true);
                  }}
                  placeholder="يُقرأ تلقائياً أو أدخل Chat ID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1">
              <span>
                الحالة:{" "}
                <strong className={config.hasResolvedTelegram ? "text-emerald-700" : "text-amber-700"}>
                  {config.hasResolvedTelegram
                    ? `متصل (${config.botUsername ? `@${config.botUsername} — ` : ""}${config.resolvedTelegramSource === "custom" ? "بوت مخصص" : "بوت المنصة"} - ${config.resolvedTelegramChatId})`
                    : "غير متصل بعد"}
                </strong>
              </span>
              {config.webhookRegisteredUrl && (
                <span className="text-emerald-700 font-bold">الرد التفاعلي وقائمة الأوامر مفعلون ✅</span>
              )}
            </div>

            <div className="rounded-xl bg-white/80 border border-sky-200/70 p-2.5 text-[11px] text-slate-700">
              <strong className="text-slate-900">أوامر البوت الجاهزة:</strong>{" "}
              <span className="font-mono" dir="ltr">/menu • /today • /export_today • /pending • /absent • /exams • /health • /audit</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تحديث مفتاح Gemini API (اختياري — المفتاح الأساسي محفوظ بأمان في الخادم)
            </label>
            <input
              type="password"
              dir="ltr"
              value={geminiOverrideInput}
              onChange={(e) => {
                setGeminiOverrideInput(e.target.value);
                setHasUnsavedConfig(true);
              }}
              placeholder={config.hasGeminiKey ? "•••••••• (محفوظ ويعمل بنجاح)" : "أدخل Gemini API Key"}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isTestingTelegram}
                onClick={() => void handleTestTelegram()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTestingTelegram ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-sky-600" />}
                <span>اختبار إرسال تليجرام</span>
              </button>
              <button
                type="button"
                disabled={isSettingWebhook}
                onClick={() => void handleSetupWebhook()}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSettingWebhook ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                <span>تفعيل الرد التفاعلي (Webhook)</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isSavingConfig}
              onClick={() => void handleSaveConfig()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
