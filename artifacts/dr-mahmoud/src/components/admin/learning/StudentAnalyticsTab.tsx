import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Filter,
  MapPin,
  MessageCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Trophy,
  UserCheck,
  Users,
  UserX,
  Video,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

export type WatchDetail = {
  videoId: number;
  videoTitle: string;
  category: string;
  stage: string;
  progress: number;
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
};

export type QuizDetail = {
  id: number;
  quizId: number;
  quizTitle?: string;
  isHomework?: boolean;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  createdAt: string;
};

export type StudentAnalyticsItem = {
  id: number;
  name: string;
  phone: string;
  parentPhone?: string | null;
  email?: string | null;
  accessCode?: string | null;
  avatarUrl?: string | null;
  status: string;
  grade?: string | null;
  centerName?: string | null;
  appointmentSlot?: string | null;
  learningMode: string;
  paymentStatus: string;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  neverLoggedIn?: boolean;
  createdAt: string;
  daysInactive: number;
  isInactive: boolean;
  watchedVideosCount: number;
  completedVideosCount: number;
  avgWatchProgress?: number;
  quizzesCount: number;
  uniqueQuizzesCount?: number;
  uniqueExamsCount?: number;
  uniqueHomeworksCount?: number;
  passedQuizzesCount: number;
  passRate?: number | null;
  avgScore?: number | null;
  centerAttendanceCount?: number;
  dailyCheckinsCount?: number;
  checkedInToday?: boolean;
  engagementScore?: number;
  watchDetails: WatchDetail[];
  quizDetails: QuizDetail[];
};

const SEGMENT_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#64748B"];
const HISTOGRAM_COLORS = ["#F43F5E", "#F97316", "#F59E0B", "#3B82F6", "#10B981"];

function isOfflineStudent(s: StudentAnalyticsItem): boolean {
  const mode = (s.learningMode || "").toLowerCase();
  if (mode === "offline") return true;
  if (mode === "online") return false;
  const center = (s.centerName || "").trim();
  return Boolean(center && !/أونلاين|اونلاين|online/i.test(center));
}

function BiChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-xl border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2 text-xs space-y-1 text-right"
      dir="rtl"
    >
      {label && <div className="font-black text-foreground border-b border-border/60 pb-1 mb-1">{label}</div>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground font-bold">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || "#3B82F6" }}
            />
            {entry.name}
          </span>
          <span className="font-mono font-black text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "لم يدخل بعد";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "غير معروف";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

function formatWhatsAppUrl(phone: string, text: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const intl = digits.startsWith("0") ? `2${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function StudentAnalyticsTab() {
  const [data, setData] = useState<StudentAnalyticsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Power BI Cross-Filtering Slicers
  const [searchQuery, setSearchQuery] = useState("");
  const [statusSlicer, setStatusSlicer] = useState<"approved" | "all" | "pending" | "suspended">("approved");
  const [stageSlicer, setStageSlicer] = useState<string>("all");
  const [centerSlicer, setCenterSlicer] = useState<string>("all");
  const [modeSlicer, setModeSlicer] = useState<"all" | "offline" | "online">("all");
  const [paymentSlicer, setPaymentSlicer] = useState<"all" | "paid" | "unpaid">("all");
  const [segmentFilter, setSegmentFilter] = useState<
    "all" | "active" | "inactive" | "top" | "no_achievement" | "checked_in_today"
  >("all");
  const [sortBy, setSortBy] = useState<"engagement" | "avg_score" | "inactive" | "quizzes" | "videos">("engagement");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Drill-down Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalyticsItem | null>(null);

  const fetchAnalytics = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/students/analytics", { credentials: "include" });
      if (res.ok) {
        const json = (await res.json()) as StudentAnalyticsItem[];
        setData(Array.isArray(json) ? json : []);
        if (selectedStudent) {
          const updated = json.find((s) => s.id === selectedStudent.id);
          if (updated) setSelectedStudent(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch BI analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  // Reset pagination whenever any slicer changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusSlicer, stageSlicer, centerSlicer, modeSlicer, paymentSlicer, segmentFilter, sortBy]);

  // Unique slicer options
  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => {
      if (s.grade && s.grade.trim()) set.add(s.grade.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [data]);

  const uniqueCenters = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => {
      const c = (s.centerName || "").trim();
      if (c && !/أونلاين|اونلاين|online/i.test(c)) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [data]);

  // Cross-filtered dataset (drives ALL KPIs, charts, insights, and table!)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data
      .filter((s) => {
        if (statusSlicer !== "all" && s.status !== statusSlicer) return false;
        if (q) {
          const hit =
            s.name?.toLowerCase().includes(q) ||
            s.phone?.includes(q) ||
            s.accessCode?.toLowerCase().includes(q) ||
            s.centerName?.toLowerCase().includes(q);
          if (!hit) return false;
        }
        if (stageSlicer !== "all" && (s.grade || "").trim() !== stageSlicer) return false;
        if (centerSlicer !== "all" && (s.centerName || "").trim() !== centerSlicer) return false;
        if (modeSlicer !== "all") {
          const isOffline = isOfflineStudent(s);
          if (modeSlicer === "offline" && !isOffline) return false;
          if (modeSlicer === "online" && isOffline) return false;
        }
        if (paymentSlicer === "paid" && s.paymentStatus !== "paid") return false;
        if (paymentSlicer === "unpaid" && s.paymentStatus === "paid") return false;

        if (segmentFilter === "active" && s.isInactive) return false;
        if (segmentFilter === "inactive" && !s.isInactive) return false;
        if (segmentFilter === "top" && (s.avgScore === null || s.avgScore === undefined || s.avgScore < 85)) return false;
        if (segmentFilter === "no_achievement" && (s.watchedVideosCount > 0 || s.quizzesCount > 0)) return false;
        if (segmentFilter === "checked_in_today" && !s.checkedInToday) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "avg_score") return (b.avgScore ?? -1) - (a.avgScore ?? -1);
        if (sortBy === "inactive") return b.daysInactive - a.daysInactive;
        if (sortBy === "quizzes") return (b.uniqueQuizzesCount ?? b.quizzesCount) - (a.uniqueQuizzesCount ?? a.quizzesCount);
        if (sortBy === "videos") return b.completedVideosCount - a.completedVideosCount;
        return (b.engagementScore ?? 0) - (a.engagementScore ?? 0);
      });
  }, [data, searchQuery, statusSlicer, stageSlicer, centerSlicer, modeSlicer, paymentSlicer, segmentFilter, sortBy]);

  // ── Executive KPI Metrics (Reactive to Slicers) ──
  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((s) => !s.isInactive).length;
    const inactive = total - active;
    const paid = filtered.filter((s) => s.paymentStatus === "paid").length;
    const checkedInToday = filtered.filter((s) => s.checkedInToday).length;
    const withPhoto = filtered.filter((s) => Boolean(s.avatarUrl && s.avatarUrl.trim() && s.avatarUrl !== "null")).length;
    const scoredStudents = filtered.filter((s) => typeof s.avgScore === "number");
    const avgScore =
      scoredStudents.length > 0
        ? Math.round(scoredStudents.reduce((acc, s) => acc + (s.avgScore || 0), 0) / scoredStudents.length)
        : 0;
    const totalQuizAttempts = filtered.reduce((acc, s) => acc + s.quizzesCount, 0);
    const totalCompletedVideos = filtered.reduce((acc, s) => acc + s.completedVideosCount, 0);
    const avgEngagement =
      total > 0 ? Math.round(filtered.reduce((acc, s) => acc + (s.engagementScore || 0), 0) / total) : 0;

    return {
      total,
      active,
      inactive,
      paid,
      checkedInToday,
      withPhoto,
      photoPct: total > 0 ? Math.round((withPhoto / total) * 100) : 0,
      avgScore,
      scoredCount: scoredStudents.length,
      totalQuizAttempts,
      totalCompletedVideos,
      avgEngagement,
    };
  }, [filtered]);

  // ── Chart 1: 14-Day Platform Activity Trend (Quizzes + Video Watches) ──
  const activityTrendData = useMemo(() => {
    const keyFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const labelFmt = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      day: "numeric",
      month: "short",
    });

    const map = new Map<string, { dateKey: string; label: string; quizzes: number; watches: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = keyFmt.format(d);
      map.set(key, { dateKey: key, label: labelFmt.format(d), quizzes: 0, watches: 0 });
    }

    for (const s of filtered) {
      for (const q of s.quizDetails) {
        const dt = new Date(q.createdAt);
        if (isNaN(dt.getTime())) continue;
        const bucket = map.get(keyFmt.format(dt));
        if (bucket) bucket.quizzes += 1;
      }
      for (const w of s.watchDetails) {
        const dt = new Date(w.updatedAt);
        if (isNaN(dt.getTime())) continue;
        const bucket = map.get(keyFmt.format(dt));
        if (bucket) bucket.watches += 1;
      }
    }

    return Array.from(map.values());
  }, [filtered]);

  // ── Chart 2: Stage Performance Comparison ──
  const stageChartData = useMemo(() => {
    const map = new Map<string, { stage: string; students: number; scoreSum: number; scoredCount: number }>();
    for (const s of filtered) {
      const raw = (s.grade || "غير محدد").trim();
      const shortName = raw.length > 26 ? `${raw.slice(0, 26)}…` : raw;
      const cur = map.get(shortName) || { stage: shortName, students: 0, scoreSum: 0, scoredCount: 0 };
      cur.students += 1;
      if (typeof s.avgScore === "number") {
        cur.scoreSum += s.avgScore;
        cur.scoredCount += 1;
      }
      map.set(shortName, cur);
    }
    return Array.from(map.values())
      .map((x) => ({
        stage: x.stage,
        الطلاب: x.students,
        "متوسط الدرجة": x.scoredCount > 0 ? Math.round(x.scoreSum / x.scoredCount) : 0,
      }))
      .sort((a, b) => b["الطلاب"] - a["الطلاب"])
      .slice(0, 8);
  }, [filtered]);

  // ── Chart 3: Score Distribution Histogram ──
  const scoreHistogramData = useMemo(() => {
    const buckets = [
      { range: "أقل من 50%", count: 0 },
      { range: "50% – 64%", count: 0 },
      { range: "65% – 74%", count: 0 },
      { range: "75% – 84%", count: 0 },
      { range: "85% – 100%", count: 0 },
    ];
    for (const s of filtered) {
      if (typeof s.avgScore !== "number") continue;
      if (s.avgScore < 50) buckets[0].count++;
      else if (s.avgScore < 65) buckets[1].count++;
      else if (s.avgScore < 75) buckets[2].count++;
      else if (s.avgScore < 85) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [filtered]);

  // ── Chart 4: Mode & Payment Donut ──
  const segmentDonutData = useMemo(() => {
    let paidOffline = 0;
    let paidOnline = 0;
    let freeOffline = 0;
    let freeOnline = 0;
    for (const s of filtered) {
      const isOff = isOfflineStudent(s);
      const isPaid = s.paymentStatus === "paid";
      if (isPaid && isOff) paidOffline++;
      else if (isPaid && !isOff) paidOnline++;
      else if (!isPaid && isOff) freeOffline++;
      else freeOnline++;
    }
    return [
      { name: "مدفوع · سنتر", value: paidOffline },
      { name: "مدفوع · أونلاين", value: paidOnline },
      { name: "مجاني · سنتر", value: freeOffline },
      { name: "مجاني · أونلاين", value: freeOnline },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  // ── Top Performers & At-Risk Lists ──
  const topPerformers = useMemo(() => {
    return filtered
      .filter((s) => typeof s.avgScore === "number" && (s.uniqueQuizzesCount ?? s.quizzesCount) >= 1)
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0) || (b.uniqueQuizzesCount || 0) - (a.uniqueQuizzesCount || 0))
      .slice(0, 6);
  }, [filtered]);

  const atRiskStudents = useMemo(() => {
    return filtered
      .filter((s) => s.status === "approved" && (s.daysInactive >= 3 || (typeof s.avgScore === "number" && s.avgScore < 55)))
      .sort((a, b) => b.daysInactive - a.daysInactive)
      .slice(0, 6);
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const hasSlicers =
    Boolean(searchQuery.trim()) ||
    statusSlicer !== "approved" ||
    stageSlicer !== "all" ||
    centerSlicer !== "all" ||
    modeSlicer !== "all" ||
    paymentSlicer !== "all" ||
    segmentFilter !== "all";

  const clearSlicers = () => {
    setSearchQuery("");
    setStatusSlicer("approved");
    setStageSlicer("all");
    setCenterSlicer("all");
    setModeSlicer("all");
    setPaymentSlicer("all");
    setSegmentFilter("all");
  };

  // 1-Click CSV Export (UTF-8 BOM for Arabic Excel)
  const handleExportCsv = () => {
    const headers = [
      "الاسم",
      "الكود",
      "الهاتف",
      "المرحلة",
      "السنتر",
      "النظام",
      "الاشتراك",
      "نسبة الالتزام",
      "متوسط الدرجات %",
      "اختبارات فريدة",
      "إجمالي المحاولات",
      "فيديوهات مكتملة",
      "أيام حضور السنتر",
      "حضور المنصة اليومي",
      "أيام الانقطاع",
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.accessCode || "",
      s.phone || "",
      s.grade || "",
      s.centerName || "",
      isOfflineStudent(s) ? "سنتر" : "أونلاين",
      s.paymentStatus === "paid" ? "مدفوع" : "مجاني",
      `${s.engagementScore ?? 0}%`,
      s.avgScore !== null && s.avgScore !== undefined ? `${s.avgScore}%` : "—",
      s.uniqueQuizzesCount ?? s.quizzesCount,
      s.quizzesCount,
      s.completedVideosCount,
      s.centerAttendanceCount ?? 0,
      s.dailyCheckinsCount ?? 0,
      s.daysInactive,
    ]);
    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `powerbi-students-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" dir="rtl">
        <div className="h-16 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-muted animate-pulse" />
          <div className="h-72 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* 1. Executive Power BI Header */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shrink-0">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              لوحة التحليلات التنفيذية (BI Analytics)
            </h2>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 text-[11px] font-black text-blue-700 dark:text-blue-300 font-mono">
              {kpis.total.toLocaleString("en-US")} طالب
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            تحليل حي ومترابط (Cross-Filtered) لتقدم الطلاب، الدرجات، المشاهدات، حضور السنتر، والالتزام اليومي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 rounded-xl text-xs font-bold cursor-pointer gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>تصدير Excel (CSV)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => void fetchAnalytics(true)}
            className="h-9 rounded-xl text-xs font-bold cursor-pointer gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </Button>
        </div>
      </div>

      {/* 2. Power BI Interactive Slicers Bar */}
      <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الكود أو الموبايل أو السنتر..."
              className="w-full h-10 pr-9 pl-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusSlicer}
            onChange={(e) => setStatusSlicer(e.target.value as any)}
            className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="approved">المفعلون فقط ✓</option>
            <option value="all">كل الحالات ({data.length})</option>
            <option value="pending">قيد المراجعة</option>
            <option value="suspended">موقوف</option>
          </select>

          <select
            value={stageSlicer}
            onChange={(e) => setStageSlicer(e.target.value)}
            className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="all">كل المراحل ({uniqueStages.length})</option>
            {uniqueStages.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={centerSlicer}
            onChange={(e) => setCenterSlicer(e.target.value)}
            className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="all">كل السناتر ({uniqueCenters.length})</option>
            {uniqueCenters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={modeSlicer}
            onChange={(e) => setModeSlicer(e.target.value as any)}
            className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="all">الكل (سنتر + أونلاين)</option>
            <option value="offline">طلاب السنتر فقط</option>
            <option value="online">طلاب الأونلاين فقط</option>
          </select>

          <select
            value={paymentSlicer}
            onChange={(e) => setPaymentSlicer(e.target.value as any)}
            className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="all">كل الاشتراكات</option>
            <option value="paid">مدفوع فقط</option>
            <option value="unpaid">غير مدفوع / مجاني</option>
          </select>
        </div>

        {/* Segment Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "الكل" },
                { id: "active", label: "نشط (< 3 أيام)" },
                { id: "inactive", label: "منقطع (+3 أيام)" },
                { id: "top", label: "متفوقون (85%+)" },
                { id: "checked_in_today", label: "أثبت حضوره اليوم ✓" },
                { id: "no_achievement", label: "بدون نشاط بعد" },
              ] as const
            ).map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSegmentFilter(seg.id)}
                className={`h-8 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  segmentFilter === seg.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {hasSlicers && (
            <button
              type="button"
              onClick={clearSlicers}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>مسح الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Executive KPI Cards Row (6 Live Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">إجمالي الطلاب</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">{kpis.total}</strong>
          <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
            نشط: {kpis.active} · منقطع: {kpis.inactive}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">متوسط الدرجات</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">{kpis.avgScore}%</strong>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            من {kpis.scoredCount} طالب امتحنوا
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">محاولات الامتحانات</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">
            {kpis.totalQuizAttempts.toLocaleString("en-US")}
          </strong>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            دروس مكتملة: {kpis.totalCompletedVideos}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">مؤشر الالتزام العام</span>
            <Activity className="h-4 w-4 text-indigo-600" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">{kpis.avgEngagement}%</strong>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${kpis.avgEngagement}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">حضور المنصة اليوم</span>
            <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">{kpis.checkedInToday}</strong>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            مدفوع: {kpis.paid} طالب
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">صور البروفايل</span>
            <Camera className="h-4 w-4 text-blue-600" />
          </div>
          <strong className="block text-2xl font-black font-mono text-foreground">{kpis.photoPct}%</strong>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            {kpis.withPhoto} من {kpis.total} طالب
          </span>
        </div>
      </div>

      {/* 4. Power BI Charts Grid (2 x 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: 14-Day Activity Trend */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">نشاط المنصة اليومي (آخر 14 يوم)</h3>
              <p className="text-[11px] text-muted-foreground">عدد محاولات الامتحانات ومشاهدات الدروس يومياً</p>
            </div>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.7} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BiChartTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
                <Area
                  type="monotone"
                  dataKey="quizzes"
                  name="محاولات امتحانات"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="watches"
                  name="مشاهدات دروس"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Score Distribution Histogram */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">توزيع مستويات ودرجات الطلاب</h3>
              <p className="text-[11px] text-muted-foreground">عدد الطلاب في كل شريحة درجة (أفضل درجة لكل امتحان)</p>
            </div>
            <Award className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreHistogramData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.7} />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BiChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.45)" }} />
                <Bar dataKey="count" name="عدد الطلاب" radius={[8, 8, 0, 0]}>
                  {scoreHistogramData.map((_, idx) => (
                    <Cell key={idx} fill={HISTOGRAM_COLORS[idx % HISTOGRAM_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Stage Performance Breakdown (Dual Y-Axis: Students Count vs Avg Score %) */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">توزيع ومتوسط درجات المراحل الدراسية</h3>
              <p className="text-[11px] text-muted-foreground">مقارنة عدد الطلاب (يسار) ومتوسط الدرجات % (يمين) لكل مرحلة</p>
            </div>
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.7} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: "#10B981" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <Tooltip content={<BiChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.45)" }} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
                <Bar yAxisId="left" dataKey="الطلاب" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="متوسط الدرجة" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Mode & Payment Segmentation Donut */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">توزيع الطلاب (سنتر / أونلاين · مدفوع / مجاني)</h3>
              <p className="text-[11px] text-muted-foreground">نسبة كل شريحة داخل الفلتر الحالي</p>
            </div>
            <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="h-64 w-full flex items-center justify-center" dir="ltr">
            {segmentDonutData.length === 0 ? (
              <p className="text-xs text-muted-foreground font-bold">لا توجد بيانات للعرض</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {segmentDonutData.map((_, idx) => (
                      <Cell key={idx} fill={SEGMENT_COLORS[idx % SEGMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<BiChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Top Performers & At-Risk Students Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>أعلى الطلاب تفوقاً</span>
            </h3>
            <span className="text-[11px] font-bold text-muted-foreground">اضغط على الطالب للتفاصيل</span>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">لا توجد نتائج امتحانات في هذا النطاق بعد</p>
          ) : (
            <div className="divide-y divide-border">
              {topPerformers.map((st, idx) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudent(st)}
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-right hover:bg-muted/40 rounded-xl px-2 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-xs font-black font-mono text-amber-600 shrink-0">#{idx + 1}</span>
                    {st.avatarUrl ? (
                      <img src={st.avatarUrl} alt={st.name} className="h-9 w-9 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                      <span className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 font-black text-xs grid place-items-center shrink-0">
                        {st.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground truncate">{st.name}</div>
                      <div className="text-[10.5px] text-muted-foreground truncate">
                        {st.uniqueQuizzesCount ?? st.quizzesCount} امتحان · {st.completedVideosCount} درس مكتمل
                      </div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-xs font-black font-mono shrink-0">
                    {st.avgScore}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* At-Risk / Inactive Students */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>طلاب يحتاجون متابعة (منقطعون 3+ أيام أو مستوى ضعيف)</span>
            </h3>
          </div>
          {atRiskStudents.length === 0 ? (
            <p className="text-xs text-emerald-600 font-bold py-6 text-center">ممتاز! مفيش طلاب متعثرين في هذا الفلتر ✓</p>
          ) : (
            <div className="divide-y divide-border">
              {atRiskStudents.map((st) => (
                <div
                  key={st.id}
                  className="py-2.5 flex items-center justify-between gap-2 px-2 hover:bg-muted/40 rounded-xl transition"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(st)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-right cursor-pointer"
                  >
                    {st.avatarUrl ? (
                      <img src={st.avatarUrl} alt={st.name} className="h-9 w-9 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                      <span className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 font-black text-xs grid place-items-center shrink-0">
                        {st.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground truncate">{st.name}</div>
                      <div className="text-[10.5px] text-rose-600 dark:text-rose-400 font-bold truncate">
                        منقطع {st.daysInactive} يوم{typeof st.avgScore === "number" ? ` · متوسط ${st.avgScore}%` : ""}
                      </div>
                    </div>
                  </button>
                  <a
                    href={formatWhatsAppUrl(
                      st.phone,
                      `أهلاً يا ${st.name} 👋 لاحظنا غيابك عن المنصة بقالك ${st.daysInactive} أيام، طمّنا عليك وارجع كمّل مذاكرتك!`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[11px] font-bold shrink-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>متابعة</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Detailed Drill-Down Students Progress Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground">
            جدول تحليل تقدم الطلاب ({filtered.length} طالب)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
            >
              <option value="engagement">أعلى التزام وتفاعل</option>
              <option value="avg_score">أعلى متوسط درجات</option>
              <option value="quizzes">أكثر امتحانات محلولة</option>
              <option value="videos">أكثر دروس مكتملة</option>
              <option value="inactive">الأطول انقطاعاً</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr className="h-11">
                <th className="px-3 font-bold">الطالب</th>
                <th className="px-3 font-bold">المرحلة والسنتر</th>
                <th className="px-3 font-bold text-center">مؤشر الالتزام</th>
                <th className="px-3 font-bold text-center">متوسط الدرجات</th>
                <th className="px-3 font-bold text-center">الامتحانات</th>
                <th className="px-3 font-bold text-center">الدروس</th>
                <th className="px-3 font-bold text-center">حضور السنتر / اليومي</th>
                <th className="px-3 font-bold text-center">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground font-bold">
                    لا توجد نتائج مطابقة للفلاتر الحالية
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="hover:bg-muted/40 transition cursor-pointer"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.name}
                            loading="lazy"
                            className="h-9 w-9 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <span className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs grid place-items-center shrink-0">
                            {s.name.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="font-black text-foreground truncate max-w-[160px]">{s.name}</div>
                          <div className="text-[10.5px] font-mono text-muted-foreground" dir="ltr">
                            {s.accessCode || s.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[11px] font-bold text-foreground truncate max-w-[180px]">{s.grade || "—"}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[160px]">
                          {s.centerName || (s.learningMode === "offline" ? "سنتر" : "أونلاين")}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-1 w-20">
                        <span className="font-mono font-black text-[11px] text-foreground">{s.engagementScore ?? 0}%</span>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (s.engagementScore ?? 0) >= 70
                                ? "bg-emerald-600"
                                : (s.engagementScore ?? 0) >= 40
                                ? "bg-amber-500"
                                : "bg-rose-600"
                            }`}
                            style={{ width: `${s.engagementScore ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-black">
                      {typeof s.avgScore === "number" ? (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] ${
                            s.avgScore >= 80
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : s.avgScore >= 60
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {s.avgScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                      {s.uniqueQuizzesCount ?? s.quizzesCount}
                      <span className="text-[10px] text-muted-foreground block">
                        ({s.quizzesCount} محاولة)
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                      {s.completedVideosCount} / {s.watchedVideosCount}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-[10.5px] font-bold">
                        <span className="text-foreground">سنتر: {s.centerAttendanceCount ?? 0}</span>
                        <span className={s.checkedInToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                          يومي: {s.dailyCheckinsCount ?? 0} {s.checkedInToday ? "✓" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-[10.5px] font-bold ${
                          s.neverLoggedIn
                            ? "bg-muted text-muted-foreground"
                            : s.daysInactive === 0
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : s.daysInactive < 3
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {s.neverLoggedIn ? "لم يدخل بعد" : s.daysInactive === 0 ? "نشط اليوم" : `منذ ${s.daysInactive} يوم`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" /> السابق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-lg cursor-pointer"
              >
                التالي <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Student Deep Drill-Down Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-3 sm:p-5"
          dir="rtl"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card text-foreground shadow-2xl overflow-hidden text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-3 min-w-0">
                {selectedStudent.avatarUrl ? (
                  <img
                    src={selectedStudent.avatarUrl}
                    alt={selectedStudent.name}
                    className="h-12 w-12 rounded-2xl object-cover border border-border shrink-0"
                  />
                ) : (
                  <span className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 font-black text-base grid place-items-center shrink-0">
                    {selectedStudent.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-black text-foreground truncate">{selectedStudent.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedStudent.grade || "—"} {selectedStudent.centerName ? `· ${selectedStudent.centerName}` : ""} ·{" "}
                    <span className="font-mono">{selectedStudent.accessCode || selectedStudent.phone}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Quick KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl border border-border bg-muted/30 p-3">
                  <span className="text-[10.5px] font-bold text-muted-foreground block">مؤشر الالتزام</span>
                  <strong className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                    {selectedStudent.engagementScore ?? 0}%
                  </strong>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3">
                  <span className="text-[10.5px] font-bold text-muted-foreground block">متوسط الدرجات</span>
                  <strong className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {typeof selectedStudent.avgScore === "number" ? `${selectedStudent.avgScore}%` : "—"}
                  </strong>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3">
                  <span className="text-[10.5px] font-bold text-muted-foreground block">حضور السنتر</span>
                  <strong className="text-lg font-black font-mono text-foreground">
                    {selectedStudent.centerAttendanceCount ?? 0} حصة
                  </strong>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3">
                  <span className="text-[10.5px] font-bold text-muted-foreground block">حضور المنصة اليومي</span>
                  <strong className="text-lg font-black font-mono text-foreground">
                    {selectedStudent.dailyCheckinsCount ?? 0} يوم
                  </strong>
                </div>
              </div>

              {/* Quiz History */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>سجل الامتحانات ({selectedStudent.quizDetails.length})</span>
                </h4>
                {selectedStudent.quizDetails.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">لم يحل أي امتحان بعد.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selectedStudent.quizDetails.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-border bg-background px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black shrink-0 ${
                              q.isHomework
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            }`}>
                              {q.isHomework ? "واجب" : "امتحان"}
                            </span>
                            <span className="truncate">{q.quizTitle || `اختبار #${q.quizId}`}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(q.createdAt)} · المدة: {formatSeconds(q.timeSpentSeconds)}
                          </div>
                        </div>
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                            q.passed
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {q.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Watch History */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-blue-600" />
                  <span>سجل مشاهدة الدروس ({selectedStudent.watchDetails.length})</span>
                </h4>
                {selectedStudent.watchDetails.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">لم يشاهد أي فيديو بعد.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selectedStudent.watchDetails.map((w) => (
                      <div
                        key={w.videoId}
                        className="rounded-xl border border-border bg-background px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground truncate">{w.videoTitle}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDate(w.updatedAt)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${w.completed ? "bg-emerald-600" : "bg-blue-600"}`}
                              style={{ width: `${Math.min(100, w.progress)}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-[11px]">{w.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentAnalyticsTab;
