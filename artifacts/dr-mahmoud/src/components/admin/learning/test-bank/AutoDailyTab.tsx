import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Plus, Trash2, Edit, CheckCircle2, RefreshCw, Eye, X, Clock, Sliders, Bot, Send, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AdminApiFn, StageNode } from "./types";

interface AutoDailyTabProps {
  adminApi: AdminApiFn;
  treeData: StageNode[];
  availableStages: string[];
  loadTree: () => void;
  onReviewQuiz: (quiz: any) => void;
}

export function AutoDailyTab({
  adminApi,
  treeData,
  availableStages,
  loadTree,
  onReviewQuiz,
}: AutoDailyTabProps) {
  const { toast } = useToast();
  // Multi-Schedule Auto-Exam State
  const [channelsConfig, setChannelsConfig] = useState<{
    telegram: { enabled: boolean; botToken: string; chatId: string };
    whatsapp: { enabled: boolean; phoneNumber: string; webhookUrl: string };
  }>({
    telegram: { enabled: false, botToken: "", chatId: "" },
    whatsapp: { enabled: false, phoneNumber: "", webhookUrl: "" },
  });

  const [schedules, setSchedules] = useState<Array<{
    id: string;
    title: string;
    enabled: boolean;
    timeOfDay: string;
    stage: string;
    unit?: string;
    lesson?: string;
    courseId?: number | null;
    questionsCount: number;
    durationMinutes: number;
    passingScore: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    lastRunDate?: string;
    lastGeneratedQuizId?: number;
  }>>([]);

  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [savingChannels, setSavingChannels] = useState<boolean>(false);
  const [triggeringScheduleId, setTriggeringScheduleId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<any | null>(null);

  // Modal State for Adding/Editing a Schedule
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<{
    id?: string;
    title: string;
    enabled: boolean;
    timeOfDay: string;
    stage: string;
    unit: string;
    lesson: string;
    courseId?: number | null;
    questionsCount: number;
    durationMinutes: number;
    passingScore: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
  } | null>(null);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Modal State for Channels Setup (Telegram Bot & WhatsApp)
  const [channelsModalOpen, setChannelsModalOpen] = useState<boolean>(false);

  const loadAutoExamConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await adminApi<any>("/api/admin/learning/auto-exam/config");
      if (res) {
        if (res.channels) setChannelsConfig(res.channels);
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      }
    } catch (err: any) {
      // silently handle
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveChannels = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingChannels(true);
    try {
      const res = await adminApi<any>("/api/admin/learning/auto-exam/channels", {
        method: "PUT",
        body: JSON.stringify(channelsConfig),
      });
      if (res.channels) setChannelsConfig(res.channels);
      setChannelsModalOpen(false);
      toast({ title: "تم حفظ وتحديث إعدادات قنوات الإشعار (تليجرام/واتساب) بنجاح! 💾" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "تعذر حفظ القنوات" });
    } finally {
      setSavingChannels(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    if (!editingSchedule.title.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة اسم للجدول" });
      return;
    }
    setSavingSchedule(true);
    try {
      if (editingSchedule.id) {
        // Update existing schedule
        const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${editingSchedule.id}`, {
          method: "PUT",
          body: JSON.stringify(editingSchedule),
        });
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
        toast({ title: "تم تحديث بيانات الجدول بنجاح! 💾" });
      } else {
        // Create new schedule
        const res = await adminApi<any>("/api/admin/learning/auto-exam/schedules", {
          method: "POST",
          body: JSON.stringify(editingSchedule),
        });
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
        toast({ title: "تمت إضافة الجدول اليومي الجديد بنجاح! 🎉" });
      }
      setScheduleModalOpen(false);
      setEditingSchedule(null);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ الجدول" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleSchedule = async (schedule: any) => {
    try {
      const updated = { ...schedule, enabled: !schedule.enabled };
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
      if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      toast({
        title: updated.enabled
          ? `تم تفعيل جدول (${schedule.title}) بنجاح 🟢`
          : `تم إيقاف جدول (${schedule.title}) مؤقتاً ⚪`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تغيير حالة الجدول" });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف جدول (${title})؟`)) return;
    try {
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      toast({ title: `تم حذف الجدول (${title}) بنجاح 🗑️` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف الجدول" });
    }
  };

  const handleTriggerSchedule = async (schedule: any) => {
    setTriggeringScheduleId(schedule.id);
    setTriggerResult(null);
    try {
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${schedule.id}/trigger`, {
        method: "POST",
      });
      setTriggerResult(res);
      toast({
        title: `تم توليد اختبار تجريبي لـ (${schedule.title}) بنجاح! 🚀`,
        description: `تم إرسال نموذج الاختبار للمراجعة على البوت.`,
      });
      loadAutoExamConfig();
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر توليد الاختبار", description: err.message || "فشل التوليد" });
    } finally {
      setTriggeringScheduleId(null);
    }
  };


  useEffect(() => {
    loadAutoExamConfig();
  }, []);

  // Dynamic units and lessons for Schedule Add/Edit Modal
  const scheduleModalUnits = useMemo(() => {
    if (!editingSchedule || !editingSchedule.stage || editingSchedule.stage === "all") return [];
    const st = treeData.find((s) => s.stage === editingSchedule.stage);
    return st ? st.units : [];
  }, [treeData, editingSchedule?.stage]);

  const scheduleModalLessons = useMemo(() => {
    if (!editingSchedule || !editingSchedule.unit || editingSchedule.unit === "all") return [];
    const u = scheduleModalUnits.find((unit) => unit.unit === editingSchedule.unit);
    return u ? u.lessons : [];
  }, [scheduleModalUnits, editingSchedule?.unit]);

  return (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Bot className="h-4 w-4" />
                  <span>نظام الجداول المتعددة والامتحانات الآلية</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-foreground">
                  جداول الاختبارات اليومية الذكية لكل مرحلة ودرس 🤖📚
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  أنشئ جداول مستقلة لكل مرحلة دراسية، وحدة، أو درس محدد بمواعيد وتوزيع صعوبة مخصص. يقوم النظام في كل موعد بسحب الأسئلة دون تكرار للأسئلة الحديثة، ثم ينشئ الاختبار <strong className="text-foreground">كمسودة خاصة سرية</strong>، ويرسله فوراً لمراجعتك على <strong className="text-sky-600">تليجرام أو واتساب</strong> مع زر للاعتماد والنشر بضغطة واحدة.
                </p>
              </div>

              {/* Bot Status Pill & Actions */}
              <div className="shrink-0 flex flex-col items-end gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                      channelsConfig.telegram.enabled && channelsConfig.telegram.botToken
                        ? "bg-sky-500/15 text-sky-600 border border-sky-500/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {channelsConfig.telegram.enabled && channelsConfig.telegram.botToken
                        ? "تليجرام مربوط بنجاح (@DrElmahdy_Quiz_Bot) 🟢"
                        : "تليجرام غير مضبوط"}
                    </span>
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setChannelsModalOpen(true)}
                    className="h-8 px-3 rounded-xl border-border text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>إعدادات البوت والقنوات</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setEditingSchedule({
                      title: "اختبار يومي جديد",
                      enabled: true,
                      timeOfDay: "08:00",
                      stage: availableStages[0] || "all",
                      unit: "all",
                      lesson: "all",
                      courseId: null,
                      questionsCount: 10,
                      durationMinutes: 20,
                      passingScore: 60,
                      difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
                    });
                    setScheduleModalOpen(true);
                  }}
                  className="w-full h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة جدول يومي جديد لمرحلة / درس ➕</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Schedules List Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h4 className="text-base font-black text-foreground">
                الجداول اليومية المجدولة ({schedules.length} جدول)
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAutoExamConfig}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>
          </div>

          {/* Schedules Cards Grid */}
          {schedules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center space-y-4">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <h5 className="text-sm font-black text-foreground">لا توجد جداول يومية مضافة حتى الآن</h5>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  يمكنك إضافة جدول لكل مرحلة دراسية أو درس لمراجعة وتوليد اختبارات يومية تلقائية مستمرة.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setEditingSchedule({
                    title: "اختبار يومي جديد",
                    enabled: true,
                    timeOfDay: "08:00",
                    stage: availableStages[0] || "all",
                    unit: "all",
                    lesson: "all",
                    courseId: null,
                    questionsCount: 10,
                    durationMinutes: 20,
                    passingScore: 60,
                    difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
                  });
                  setScheduleModalOpen(true);
                }}
                className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>إنشاء أول جدول يومي الآن</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-3xl border bg-card p-5 sm:p-6 shadow-sm transition-all space-y-4 ${
                    schedule.enabled
                      ? "border-amber-500/30 hover:border-amber-500/60 ring-1 ring-amber-500/10"
                      : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                            schedule.enabled
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${schedule.enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                          {schedule.enabled ? "مفعّل 🟢" : "متوقف مؤقتاً ⚪"}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-bold">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>الساعة {schedule.timeOfDay} (القاهرة)</span>
                        </span>
                      </div>

                      <h4 className="text-base font-black text-foreground pt-1">{schedule.title}</h4>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`h-7 px-3 rounded-full text-xs font-black cursor-pointer transition-colors ${
                        schedule.enabled
                          ? "bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                          : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                      }`}
                      title={schedule.enabled ? "إيقاف مؤقت لهذا الجدول" : "تفعيل هذا الجدول"}
                    >
                      {schedule.enabled ? "إيقاف" : "تفعيل"}
                    </button>
                  </div>

                  {/* Scope Details Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">المرحلة الدراسية:</span>
                      <strong className="text-foreground font-extrabold truncate max-w-[150px]">
                        {schedule.stage === "all" ? "كل المراحل" : schedule.stage}
                      </strong>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">الوحدة / الدرس:</span>
                      <strong className="text-foreground font-extrabold truncate max-w-[150px]">
                        {schedule.unit === "all" || !schedule.unit ? "شامل المنهج" : schedule.unit}
                        {schedule.lesson && schedule.lesson !== "all" ? ` · ${schedule.lesson}` : ""}
                      </strong>
                    </div>
                  </div>

                  {/* Exam Specs Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">عدد الأسئلة</span>
                      <strong className="text-foreground font-black text-sm">{schedule.questionsCount}</strong>
                    </div>

                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">المدة</span>
                      <strong className="text-foreground font-black text-sm">{schedule.durationMinutes} دقيقة</strong>
                    </div>

                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">درجة النجاح</span>
                      <strong className="text-emerald-600 font-black text-sm">{schedule.passingScore}%</strong>
                    </div>
                  </div>

                  {/* Difficulty Breakdown Pill */}
                  <div className="flex items-center justify-between text-[11px] bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50 text-muted-foreground">
                    <span>توزيع الصعوبة:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-600">سهل: {schedule.difficultyDistribution?.easy || 0}</span>
                      <span>·</span>
                      <span className="text-amber-600">متوسط: {schedule.difficultyDistribution?.medium || 0}</span>
                      <span>·</span>
                      <span className="text-rose-600">صعب: {schedule.difficultyDistribution?.hard || 0}</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleTriggerSchedule(schedule)}
                      disabled={triggeringScheduleId === schedule.id}
                      className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-xs gap-1.5"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${triggeringScheduleId === schedule.id ? "animate-spin" : ""}`} />
                      <span>{triggeringScheduleId === schedule.id ? "جارٍ الإرسال..." : "إرسال تجريبي الآن للبوت 🚀"}</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSchedule({
                            id: schedule.id,
                            title: schedule.title,
                            enabled: schedule.enabled,
                            timeOfDay: schedule.timeOfDay,
                            stage: schedule.stage,
                            unit: schedule.unit || "all",
                            lesson: schedule.lesson || "all",
                            courseId: schedule.courseId || null,
                            questionsCount: schedule.questionsCount,
                            durationMinutes: schedule.durationMinutes,
                            passingScore: schedule.passingScore,
                            difficultyDistribution: schedule.difficultyDistribution || { easy: 3, medium: 5, hard: 2 },
                          });
                          setScheduleModalOpen(true);
                        }}
                        className="h-9 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold cursor-pointer gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>تعديل</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(schedule.id, schedule.title)}
                        className="h-9 px-3 rounded-xl text-rose-600 hover:bg-rose-500/10 text-xs font-bold cursor-pointer gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trigger Result Banner */}
          {triggerResult && (
            <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      تم توليد الاختبار التجريبي لـ ({triggerResult.scheduleTitle}) بنجاح! (#{triggerResult.quiz?.id}: {triggerResult.quiz?.title})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      المرحلة: {triggerResult.stageName} · النطاق: {triggerResult.unitName} · الحالة: مسودة غير منشورة 🔒
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onReviewQuiz(triggerResult.quiz);
                    }}
                    className="h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer shadow-xs gap-1.5"
                  >
                    <Eye className="h-4 w-4" />
                    <span>مراجعة وتعديل الأسئلة هنا</span>
                  </Button>

                  <a
                    href={triggerResult.approvalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>فتح رابط الاعتماد والنشر المباشر 🚀</span>
                  </a>
                </div>
              </div>

              {/* Delivery Status details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-500/20">
                <div className="bg-card/80 rounded-xl p-3 border border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">حالة إرسال Telegram:</span>
                  <span className="font-extrabold text-sky-600">
                    {triggerResult.telegramResult?.success ? "تم الإرسال بنجاح بنقرة زر الاعتماد ✅" : (triggerResult.telegramResult?.error || "غير مفعل")}
                  </span>
                </div>

                <div className="bg-card/80 rounded-xl p-3 border border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">حالة إرسال WhatsApp:</span>
                  <span className="font-extrabold text-emerald-600">
                    {triggerResult.whatsappResult?.success ? "تم الإرسال بنجاح ✅" : (triggerResult.whatsappResult?.error || "غير مفعل")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCHEDULE ADD / EDIT MODAL                                    */}
          {/* ============================================================ */}
          {scheduleModalOpen && editingSchedule && (
            <div
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
              onClick={(e) => e.target === e.currentTarget && setScheduleModalOpen(false)}
            >
              <div className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[92vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>{editingSchedule.id ? "تعديل الجدول اليومي" : "إضافة جدول يومي جديد"}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSchedule} className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Schedule Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">اسم أو عنوان الجدول *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: اختبار يومي - تانية ثانوي - التنفس الخلوي"
                      value={editingSchedule.title}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, title: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Stage, Unit, Lesson Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Stage */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">المرحلة الدراسية:</label>
                      <select
                        value={editingSchedule.stage}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            stage: e.target.value,
                            unit: "all",
                            lesson: "all",
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">كل المراحل (تدوير ذكي)</option>
                        {availableStages.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">الوحدة الدراسية:</label>
                      <select
                        value={editingSchedule.unit}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            unit: e.target.value,
                            lesson: "all",
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">شامل كل الوحدات</option>
                        {scheduleModalUnits.map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit} ({u.totalQuestions} سؤال)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lesson */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">الدرس المحدد:</label>
                      <select
                        value={editingSchedule.lesson}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            lesson: e.target.value,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">شامل كامل دروس الوحدة</option>
                        {scheduleModalLessons.map((l) => (
                          <option key={l.lesson} value={l.lesson}>
                            {l.lesson} ({l.totalQuestions} سؤال)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timing & Exam Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">موعد التوليد (القاهرة):</label>
                      <input
                        type="time"
                        required
                        value={editingSchedule.timeOfDay}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, timeOfDay: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">عدد الأسئلة:</label>
                      <input
                        type="number"
                        min={3}
                        max={50}
                        required
                        value={editingSchedule.questionsCount}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            questionsCount: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">المدة (دقيقة):</label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        required
                        value={editingSchedule.durationMinutes}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">درجة النجاح %:</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        required
                        value={editingSchedule.passingScore}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            passingScore: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Difficulty Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-bold text-foreground">توزيع الصعوبة داخل الاختبار:</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">سهل</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.easy}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                easy: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">متوسط</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.medium}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                medium: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>

                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-rose-700 dark:text-rose-400">صعب</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.hard}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                hard: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={editingSchedule.enabled}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, enabled: e.target.checked })}
                      className="h-4 w-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-foreground">تفعيل هذا الجدول للعمل يومياً فور الحفظ</span>
                  </label>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScheduleModalOpen(false)}
                      className="h-10 px-4 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingSchedule}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md"
                    >
                      {savingSchedule ? "جارٍ الحفظ..." : "حفظ الجدول 💾"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* CHANNELS SETTINGS MODAL (Telegram Bot & WhatsApp)            */}
          {/* ============================================================ */}
          {channelsModalOpen && (
            <div
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
              onClick={(e) => e.target === e.currentTarget && setChannelsModalOpen(false)}
            >
              <div className="w-full max-w-xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[90vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4 text-sky-500" />
                    <span>إعدادات قنوات الإشعار والمراجعة (تليجرام / واتساب)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setChannelsModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveChannels} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Telegram Setup Card */}
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
                      <span className="text-xs font-black text-foreground flex items-center gap-2">
                        <Send className="h-4 w-4 text-sky-500" />
                        <span>قناة Telegram (موصى بها ومجانية)</span>
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelsConfig.telegram.enabled}
                          onChange={(e) =>
                            setChannelsConfig({
                              ...channelsConfig,
                              telegram: { ...channelsConfig.telegram, enabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 accent-sky-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">تفعيل إرسال تليجرام</span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Telegram Bot Token:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.telegram.botToken}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            telegram: { ...channelsConfig.telegram, botToken: e.target.value.trim() },
                          })
                        }
                        placeholder="8821235319:AAFdp8sj..."
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Telegram Chat ID الخاص بك:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.telegram.chatId}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            telegram: { ...channelsConfig.telegram, chatId: e.target.value.trim() },
                          })
                        }
                        placeholder="مثال: 744591440"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Setup Card */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                      <span className="text-xs font-black text-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        <span>قناة WhatsApp (عبر Webhook / Gateway)</span>
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelsConfig.whatsapp.enabled}
                          onChange={(e) =>
                            setChannelsConfig({
                              ...channelsConfig,
                              whatsapp: { ...channelsConfig.whatsapp, enabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">تفعيل إرسال واتساب</span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">رقم الهاتف لاستقبال الرسالة:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.whatsapp.phoneNumber}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            whatsapp: { ...channelsConfig.whatsapp, phoneNumber: e.target.value.trim() },
                          })
                        }
                        placeholder="01012345678"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">رابط WhatsApp API Gateway / Webhook URL:</label>
                      <input
                        type="url"
                        dir="ltr"
                        value={channelsConfig.whatsapp.webhookUrl}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            whatsapp: { ...channelsConfig.whatsapp, webhookUrl: e.target.value.trim() },
                          })
                        }
                        placeholder="https://api.ultramsg.com/..."
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setChannelsModalOpen(false)}
                      className="h-10 px-4 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingChannels}
                      className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md"
                    >
                      {savingChannels ? "جارٍ الحفظ..." : "حفظ إعدادات القنوات 💾"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

  );
}

export default AutoDailyTab;
