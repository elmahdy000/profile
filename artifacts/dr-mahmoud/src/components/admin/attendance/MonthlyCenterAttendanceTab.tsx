import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Download,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Check,
  Building2,
  CalendarDays,
  AlertTriangle,
  RefreshCw,
  Phone,
  MessageCircle,
  HelpCircle,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  defaultOfflineCenters,
  type OfflineCenterItem,
  normalizeDays,
} from "../settings/CentersTab";
import {
  OFFICIAL_CENTERS,
  normalizeCenterName,
  normalizeSlotName,
} from "../learning/StudentDrawer";

export interface MonthlyAttendanceRecord {
  studentId: number;
  name: string;
  phone: string;
  parentPhone?: string | null;
  grade: string;
  accessCode: string;
  paymentStatus?: string | null;
  centerName: string;
  appointmentSlot: string | null;
  enrolledSlot: string | null;
  enrolledCenter: string | null;
  isCrossGroup: boolean;
  status: "present" | "absent" | "late" | "unmarked";
  attendedAt?: string | null;
  recordedBy?: string | null;
  parentNotified: boolean;
  parentRegistered: boolean;
  parentName?: string | null;
  notes?: string | null;
}

interface DailyAttendanceResponse {
  date: string;
  dayOfWeek: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  unmarkedCount: number;
  makeupCount: number;
  attendanceRate: number;
  records: MonthlyAttendanceRecord[];
}

// Map center names to standard active days for scheduling hints
const getCenterScheduledDays = (centerName: string): string[] => {
  const norm = normalizeCenterName(centerName);
  const matching = defaultOfflineCenters.filter(
    (c) => normalizeCenterName(c.name) === norm
  );
  if (matching.length > 0) {
    const daysSet = new Set<string>();
    matching.forEach((m) => {
      normalizeDays(m.daysStr).forEach((d) => daysSet.add(d));
    });
    return Array.from(daysSet);
  }
  return ["سبت", "اتنين", "أربع"];
};

// Arabic weekday names index (0 = Sunday in JS)
const ARABIC_WEEKDAYS = [
  { key: "أحد", label: "الأحد", short: "أحد" },
  { key: "اثنين", label: "الإثنين", short: "إثنين" },
  { key: "ثلاثاء", label: "الثلاثاء", short: "ثلاثاء" },
  { key: "أربعاء", label: "الأربعاء", short: "أربعاء" },
  { key: "خميس", label: "الخميس", short: "خميس" },
  { key: "جمعة", label: "الجمعة", short: "جمعة" },
  { key: "سبت", label: "السبت", short: "سبت" },
];

export const MonthlyCenterAttendanceTab: React.FC = () => {
  const { toast } = useToast();

  // Current Cairo Date components
  const today = useMemo(() => {
    const now = new Date();
    const cairoDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return cairoDateStr; // "YYYY-MM-DD"
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(() => {
    const parts = today.split("-");
    return parseInt(parts[0], 10) || new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const parts = today.split("-");
    return parseInt(parts[1], 10) || new Date().getMonth() + 1;
  });

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const parts = today.split("-");
    return parseInt(parts[2], 10) || new Date().getDate();
  });

  // Selected Center ("all" or center name, default "all" so assistant sees all centers directly)
  const [selectedCenter, setSelectedCenter] = useState<string>("all");

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data Loading States
  const [records, setRecords] = useState<MonthlyAttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    unmarkedCount: 0,
    attendanceRate: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null);

  // Selected date formatted as YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const y = currentYear;
    const m = String(currentMonth).padStart(2, "0");
    const d = String(selectedDay).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentYear, currentMonth, selectedDay]);

  // Days in selected Month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Generate list of days with day-of-week metadata
  const monthDaysList = useMemo(() => {
    const list = [];
    const scheduledDays = getCenterScheduledDays(selectedCenter);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentYear, currentMonth - 1, day);
      const dayIndex = dateObj.getDay(); // 0 is Sunday
      const weekday = ARABIC_WEEKDAYS[dayIndex];
      const isToday =
        today ===
        `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Check if scheduled
      const isScheduled = scheduledDays.some(
        (sd) =>
          weekday.key.includes(sd) ||
          sd.includes(weekday.key) ||
          (sd === "اتنين" && weekday.key.includes("اثنين")) ||
          (sd === "حد" && weekday.key.includes("أحد"))
      );

      list.push({
        day,
        weekday,
        isToday,
        isScheduled,
        dateStr: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      });
    }
    return list;
  }, [currentYear, currentMonth, daysInMonth, selectedCenter, today]);

  // Center list with canonical names
  const centersList = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_CENTERS.forEach((c) => set.add(c.name));
    set.add("سنتر الحناوي - لغات");
    set.add("سنتر القنايات - عربي");
    set.add("سنتر فيوتشر (Future) - عربي");
    set.add("سنتر رافال (Rafal) - عربي");
    set.add("سنتر زاج (Zag) - عربي");
    set.add("سنتر إديوفيرس (EduVerse) - لغات");
    return Array.from(set);
  }, []);

  // Fetch Attendance Data for (Selected Date + Selected Center)
  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        date: selectedDateStr,
        center: selectedCenter,
      });

      const res = await fetch(`/api/admin/attendance/daily?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("فشل تحميل بيانات الحضور لليوم والسنتر المحددين.");
      }

      const data = await res.json();
      const statsData = data.stats || data.summary || {
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        unmarkedCount: 0,
        attendanceRate: 0,
      };
      setRecords(data.records || []);
      setStats({
        totalStudents: statsData.totalStudents || 0,
        presentCount: statsData.presentCount || 0,
        absentCount: statsData.absentCount || 0,
        lateCount: statsData.lateCount || 0,
        unmarkedCount: statsData.unmarkedCount || 0,
        attendanceRate: statsData.attendanceRate || 0,
      });
    } catch (err: any) {
      console.error("Fetch attendance error:", err);
      toast({
        variant: "destructive",
        description: err.message || "حدث خطأ أثناء تحميل الحضور.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, selectedCenter, toast]);

  // Load whenever selectedDateStr or selectedCenter changes
  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  // Quick Status Toggle Handler (Present / Absent / Late / Unmarked)
  const handleUpdateStatus = async (
    studentId: number,
    newStatus: "present" | "absent" | "late" | "unmarked",
    studentName: string
  ) => {
    setIsUpdatingStatus(studentId);
    try {
      const res = await fetch("/api/admin/attendance/manual-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          date: selectedDateStr,
          status: newStatus,
          centerName: selectedCenter,
          notifyParent: false, // Don't spam notifications on routine toggle
        }),
      });

      if (!res.ok) {
        throw new Error("فشل تحديث حالة الحضور في الخادم");
      }

      // Update local state smoothly
      setRecords((prev) =>
        prev.map((r) =>
          r.studentId === studentId ? { ...r, status: newStatus } : r
        )
      );

      toast({
        description: `تم تحديث حالة الطالب ${studentName} إلى [${
          newStatus === "present"
            ? "حاضر ✓"
            : newStatus === "absent"
            ? "غائب ✕"
            : newStatus === "late"
            ? "متأخر ⏳"
            : "غير مسجل"
        }] بنجاح.`,
      });

      // Refresh totals
      void fetchAttendance();
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message || "فشل تحديث الحالة.",
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Bulk mark all unmarked as absent for this center & date
  const handleBulkAbsent = async () => {
    const unmarked = records.filter((r) => r.status === "unmarked");
    if (unmarked.length === 0) {
      toast({ description: "جميع الطلاب مسجلون بالفعل لهذا اليوم والسنتر." });
      return;
    }

    if (
      !window.confirm(
        `هل تريد تسجيل غياب لجميع الطلاب المتبقين (${unmarked.length} طالب) في ${selectedCenter} لتاريخ ${selectedDateStr}؟`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/attendance/bulk-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: selectedDateStr,
          center: selectedCenter,
          notifyParents: false,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل تسجيل الغياب الجماعي");
      }

      const data = await res.json();
      toast({
        description: `تم تسجيل ${data.markedCount || unmarked.length} طالب كـ غائب بنجاح.`,
      });
      void fetchAttendance();
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message || "حدث خطأ أثناء تسجيل الغياب الجماعي.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // WhatsApp Alert Generator
  const handleSendWhatsApp = (record: MonthlyAttendanceRecord) => {
    const phone = record.parentPhone || record.phone;
    if (!phone) {
      toast({
        variant: "destructive",
        description: "لا يوجد رقم هاتف مسجل لولي الأمر أو الطالب.",
      });
      return;
    }

    const cleanPhone = phone.replace(/[^\d]/g, "").replace(/^0/, "20");
    const statusText =
      record.status === "present"
        ? "حاضر في الموعد"
        : record.status === "late"
        ? "حاضر بتأخير"
        : record.status === "absent"
        ? "غائب عن الحصة"
        : "غير مسجل";

    const msg = `السلام عليكم ورحمة الله،\nمن مكتب د. محمود المهدي:\nنحيطكم علماً بحالة حضور الطالب (${record.name}) في (${selectedCenter}) ليوم (${selectedDateStr}): [${statusText}].\nنسأل الله لأبنائنا دوام التفوق والنجاح.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Filtered Records based on status & search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      // Grade filter
      if (gradeFilter !== "all" && !r.grade.includes(gradeFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesPhone = r.phone.includes(q) || (r.parentPhone && r.parentPhone.includes(q));
        const matchesCode = r.accessCode.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [records, statusFilter, gradeFilter, searchQuery]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  const handleGoToday = () => {
    const parts = today.split("-");
    setCurrentYear(parseInt(parts[0], 10));
    setCurrentMonth(parseInt(parts[1], 10));
    setSelectedDay(parseInt(parts[2], 10));
  };

  // Month name in Arabic
  const monthNameArabic = useMemo(() => {
    const dateObj = new Date(currentYear, currentMonth - 1, 1);
    return dateObj.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  // Selected Day Weekday Name
  const selectedWeekdayName = useMemo(() => {
    const dateObj = new Date(currentYear, currentMonth - 1, selectedDay);
    return ARABIC_WEEKDAYS[dateObj.getDay()]?.label || "";
  }, [currentYear, currentMonth, selectedDay]);

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* ─── 1. Header & Navigation Cockpit ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-inner">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900">
                  دفتر الحضور بالشهور والسناتر
                </h2>
                <span className="bg-indigo-100 text-indigo-700 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  شهري تفاعلي
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                اختر اليوم والسنتر لمراجعة الحضور والغياب، تعديل الحالات فورياً، ومتابعة أولياء الأمور
              </p>
            </div>
          </div>

          {/* Month / Year Navigator */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl"
              title="الشهر القادم"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <span className="text-xs font-black text-slate-800 px-3 min-w-[130px] text-center">
              {monthNameArabic}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl"
              title="الشهر السابق"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToday}
              className="h-8 px-3 text-[11px] font-black text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50 rounded-xl"
            >
              اليوم الحالي
            </Button>
          </div>
        </div>

        {/* ─── 2. Center Picker Buttons ─── */}
        <div className="mt-5">
          <label className="text-xs font-black text-slate-700 block mb-2.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
            اختر السنتر المستهدف (مع إبراز سنتر الحناوي ومواعيد الزقازيق):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {/* All Centers Option */}
            <button
              type="button"
              onClick={() => setSelectedCenter("all")}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden ${
                selectedCenter === "all"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    selectedCenter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  الكل
                </span>
                {selectedCenter === "all" && <Check className="h-3.5 w-3.5" />}
              </div>
              <strong className="text-xs font-black block leading-snug truncate">
                جميع السناتر
              </strong>
              <span className={`text-[10px] font-medium truncate ${selectedCenter === "all" ? "text-white/80" : "text-slate-400"}`}>
                كل المجموعات
              </span>
            </button>

            {centersList.map((cName) => {
              const isSelected = selectedCenter !== "all" && normalizeCenterName(selectedCenter) === normalizeCenterName(cName);
              const isHennawy = cName.includes("حناو");
              return (
                <button
                  key={cName}
                  type="button"
                  onClick={() => setSelectedCenter(cName)}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden ${
                    isSelected
                      ? isHennawy
                        ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                        : "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                      : isHennawy
                      ? "bg-rose-50/50 hover:bg-rose-50 text-rose-900 border-rose-200/80"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : isHennawy
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cName.includes("لغات") ? "لغات" : "عربي"}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>

                  <strong className="text-xs font-black block leading-snug truncate">
                    {cName}
                  </strong>

                  <span
                    className={`text-[10px] font-medium truncate ${
                      isSelected ? "text-white/80" : "text-slate-400"
                    }`}
                  >
                    {getCenterScheduledDays(cName).join(" • ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 3. Days of the Month Horizontal Strip ─── */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-indigo-600" />
              أيام الشهر ({monthNameArabic}):
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              اليوم المحدد:{" "}
              <b className="text-indigo-600 font-black">
                {selectedWeekdayName} {selectedDay} {monthNameArabic}
              </b>
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {monthDaysList.map((item) => {
              const isSelected = item.day === selectedDay;
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => setSelectedDay(item.day)}
                  className={`shrink-0 flex flex-col items-center justify-center min-w-[58px] py-2.5 px-1.5 rounded-xl border transition-all text-center relative ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-105 z-10"
                      : item.isToday
                      ? "bg-amber-50 text-amber-900 border-amber-300 font-black"
                      : item.isScheduled
                      ? "bg-indigo-50/40 text-slate-800 border-indigo-100 hover:bg-indigo-50"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold block ${
                      isSelected ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {item.weekday.short}
                  </span>

                  <strong className="text-base font-black my-0.5 leading-none">
                    {item.day}
                  </strong>

                  {/* Scheduled Badge Indicator */}
                  {item.isScheduled ? (
                    <span
                      className={`text-[8px] font-black px-1 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      حصة ✓
                    </span>
                  ) : (
                    <span className="text-[8px] opacity-0">-</span>
                  )}

                  {/* Dot for today */}
                  {item.isToday && !isSelected && (
                    <span className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 4. Live Attendance Cockpit Counters ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Enrolled */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>إجمالي المقيدين</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-slate-800">{stats.totalStudents}</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              {selectedCenter === "all"
                ? "في جميع السناتر"
                : selectedCenter.startsWith("سنتر")
                ? `في ${selectedCenter}`
                : `في سنتر ${selectedCenter}`}
            </span>
          </div>
        </div>

        {/* Present */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
            <span>حاضرون</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-emerald-600">{stats.presentCount}</strong>
            <span className="text-[10px] text-emerald-700 block mt-0.5">مسجل حضور رسمي</span>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-red-200/80 shadow-xs bg-red-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-700 text-xs font-bold mb-1">
            <span>غائبون</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-red-600">{stats.absentCount}</strong>
            <span className="text-[10px] text-red-700 block mt-0.5">لم يحضروا الحصة</span>
          </div>
        </div>

        {/* Late */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs bg-amber-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
            <span>متأخرون</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-amber-600">{stats.lateCount}</strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">حضروا بعد الموعد</span>
          </div>
        </div>

        {/* Unmarked */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>غير مسجلين</span>
            <HelpCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-slate-600">{stats.unmarkedCount}</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">في انتظار الرصد</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-indigo-200/80 shadow-xs bg-indigo-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-bold mb-1">
            <span>نسبة الحضور</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <strong className="text-xl sm:text-2xl font-black text-indigo-600">{stats.attendanceRate}%</strong>
            <span className="text-[10px] text-indigo-700 block mt-0.5">حاضر + متأخر</span>
          </div>
        </div>
      </div>

      {/* ─── 5. Controls & Action Bar ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Local Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="present">حاضر فقط 🟢</option>
            <option value="absent">غائب فقط 🔴</option>
            <option value="late">متأخر فقط 🟡</option>
            <option value="unmarked">غير مسجل ⚪</option>
          </select>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchAttendance}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs font-bold text-slate-600 rounded-xl"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Bulk Action: Mark All Unmarked as Absent */}
        <div className="flex items-center gap-2">
          {stats.unmarkedCount > 0 && (
            <Button
              type="button"
              onClick={handleBulkAbsent}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>تحويل المتبقين لغياب ({stats.unmarkedCount})</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs font-bold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>طباعة الكشف</span>
          </Button>
        </div>
      </div>

      {/* ─── 6. Detailed Interactive Attendance Table ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800">
              كشف طلاب {selectedCenter === "all" ? "جميع السناتر" : selectedCenter} — ليوم {selectedWeekdayName} ({selectedDateStr})
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              ({filteredRecords.length} طالب)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span>اضغط على أي زر لتغيير الحالة فورياً:</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">حاضر</span>
            <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">غائب</span>
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">متأخر</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">كود الطالب</th>
                <th className="py-3 px-4">المرحلة الدراسية</th>
                <th className="py-3 px-4">موعد المجموعة</th>
                <th className="py-3 px-4">حالة الحضور</th>
                <th className="py-3 px-4 text-center">تحديد الحالة فوراً</th>
                <th className="py-3 px-4 text-center">إشعار ولي الأمر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    جارٍ تحميل سجلات الحضور والغياب...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <AlertTriangle className="h-6 w-6 mx-auto text-amber-500 mb-2 opacity-80" />
                    لا توجد سجلات مطابقة لهذا اليوم والسنتر.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const isUpdating = isUpdatingStatus === record.studentId;

                  return (
                    <tr
                      key={record.studentId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{record.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {record.phone}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700 text-[11px]">
                        {record.accessCode}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {record.grade}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-bold text-[11px]">
                        {record.appointmentSlot || record.enrolledSlot || "بدون موعد محدد"}
                      </td>

                      <td className="py-3 px-4">
                        {record.status === "present" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            حاضر
                          </span>
                        ) : record.status === "absent" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-black text-[11px]">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            غائب
                          </span>
                        ) : record.status === "late" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-[11px]">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            متأخر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px]">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                            غير مسجل
                          </span>
                        )}
                      </td>

                      {/* Instant Toggle Status Controls */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleUpdateStatus(record.studentId, "present", record.name)
                            }
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all flex items-center gap-1 ${
                              record.status === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                            }`}
                            title="تسجيل حاضر"
                          >
                            <Check className="h-3 w-3" />
                            <span>حاضر</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleUpdateStatus(record.studentId, "absent", record.name)
                            }
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all flex items-center gap-1 ${
                              record.status === "absent"
                                ? "bg-red-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-red-700 hover:bg-white"
                            }`}
                            title="تسجيل غياب"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>غائب</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleUpdateStatus(record.studentId, "late", record.name)
                            }
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all flex items-center gap-1 ${
                              record.status === "late"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-amber-700 hover:bg-white"
                            }`}
                            title="تسجيل متأخر"
                          >
                            <Clock className="h-3 w-3" />
                            <span>متأخر</span>
                          </button>
                        </div>
                      </td>

                      {/* WhatsApp Notify */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendWhatsApp(record)}
                          className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 mx-auto"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>واتساب</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
