import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  UserCheck,
  UserX,
  Copy,
  Check,
  Trash2,
  Download,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Clock,
  CalendarDays,
  Sparkles,
  Unlock,
  MessageCircle,
  SlidersHorizontal,
  RotateCcw,
  MapPin,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentReceipt } from "./PaymentReceiptsPanel";
import { StudentDrawer, type ExtendedStudent } from "./StudentDrawer";

interface StudentsTabProps {
  students: ExtendedStudent[];
  contextFilterLabel?: string | null;
  onClearContextFilter?: () => void;
  role?: "superadmin" | "subadmin";
  recoveryRequests?: any[];
  studentStages?: string[];
  onUpdateStatus: (id: number, status: "pending" | "approved" | "suspended") => void;
  onUpdatePaymentStatus: (student: ExtendedStudent, status: string) => void;
  onUpdateMode: (student: ExtendedStudent, mode: "online" | "offline") => void;
  onResetDevice: (student: ExtendedStudent) => void;
  onSetMaxDevices: (student: ExtendedStudent) => void;
  onDeleteStudent: (id: number) => void;
  copiedStudentId: number | null;
  onCopyStudentCode: (student: ExtendedStudent) => void;
  paymentReceipts?: PaymentReceipt[];
  learningCourses?: Array<{ id: number; title: string }>;
  onUpdateStudentCourses?: (student: ExtendedStudent, courseIds: number[]) => void;
  onApproveReceipt?: (receiptId: number) => void;
  onNavigateToReports?: () => void;
}

export function StudentsTab({
  students = [],
  contextFilterLabel,
  onClearContextFilter,
  role = "superadmin",
  onUpdateStatus,
  onUpdatePaymentStatus,
  onUpdateMode,
  onResetDevice,
  onSetMaxDevices,
  onDeleteStudent,
  copiedStudentId,
  onCopyStudentCode,
  paymentReceipts = [],
  learningCourses = [],
  onUpdateStudentCourses,
  onApproveReceipt,
  onNavigateToReports,
}: StudentsTabProps) {
  // Read initial parameters from URL Search Params if available
  const getInitialParam = (key: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  };

  // Search & Filter State
  const [searchInput, setSearchInput] = useState(() => getInitialParam("search", ""));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getInitialParam("search", ""));
  const [stageFilter, setStageFilter] = useState(() => getInitialParam("stage", "all"));
  const [courseFilter, setCourseFilter] = useState(() => getInitialParam("course", "all"));
  const [paymentFilter, setPaymentFilter] = useState(() => getInitialParam("payment", "all"));
  const [statusFilter, setStatusFilter] = useState(() => getInitialParam("status", "all"));
  const [modeFilter, setModeFilter] = useState(() => getInitialParam("mode", "all"));
  const [activityFilter, setActivityFilter] = useState<"all" | "inactive_7d" | "inactive_30d" | "never" | "active_now">(() => getInitialParam("activity", "all") as any);
  const [sortBy, setSortBy] = useState<"newest" | "name" | "code" | "last_active_asc" | "last_active_desc">(() => getInitialParam("sort", "newest") as any);

  // Selection & Pagination
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(() => Number(getInitialParam("page", "1")) || 1);
  const [pageSize, setPageSize] = useState(25);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Drawer
  const [activeDrawerStudent, setActiveDrawerStudent] = useState<ExtendedStudent | null>(null);

  // Keep an open profile in sync after a successful parent-list update.
  useEffect(() => {
    if (!activeDrawerStudent) return;
    const latestStudent = students.find((student) => student.id === activeDrawerStudent.id);
    if (latestStudent && latestStudent !== activeDrawerStudent) {
      setActiveDrawerStudent(latestStudent);
    }
  }, [students, activeDrawerStudent]);

  // 300ms Debounce for live search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL Search Params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (courseFilter !== "all") params.set("course", courseFilter);
    if (paymentFilter !== "all") params.set("payment", paymentFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (modeFilter !== "all") params.set("mode", modeFilter);
    if (activityFilter !== "all") params.set("activity", activityFilter);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", String(currentPage));

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [debouncedSearch, stageFilter, courseFilter, paymentFilter, statusFilter, modeFilter, activityFilter, sortBy, currentPage]);

  // Unique stages list
  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const g = s.grade === "أخرى" ? s.otherGradeDetail || s.grade : s.grade;
      if (g) set.add(g);
    });
    return Array.from(set);
  }, [students]);

  // Listen for URL search parameter changes (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchInput(params.get("search") || "");
      setDebouncedSearch(params.get("search") || "");
      setStageFilter(params.get("stage") || "all");
      setCourseFilter(params.get("course") || "all");
      setPaymentFilter(params.get("payment") || "all");
      setStatusFilter(params.get("status") || "all");
      setModeFilter(params.get("mode") || "all");
      setActivityFilter((params.get("activity") as any) || "all");
      setSortBy((params.get("sort") as any) || "newest");
      setCurrentPage(Number(params.get("page")) || 1);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    const nowTime = Date.now();
    return students
      .filter((s) => {
        // Search Filter
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchPhone = s.phone?.includes(q);
          const matchCode = s.accessCode?.toLowerCase().includes(q);
          const matchEmail = s.email?.toLowerCase().includes(q);
          const matchSchool = s.schoolName?.toLowerCase().includes(q);
          const matchCenter = s.centerName?.toLowerCase().includes(q);
          const matchParentPhone = s.parentPhone?.includes(q);
          if (!matchName && !matchPhone && !matchCode && !matchEmail && !matchSchool && !matchCenter && !matchParentPhone) return false;
        }

        // Stage Filter
        const effectiveStage = s.grade === "أخرى" ? s.otherGradeDetail || s.grade : s.grade;
        if (stageFilter !== "all" && effectiveStage !== stageFilter) return false;

        // Course Filter
        if (courseFilter !== "all") {
          if (isNaN(Number(courseFilter))) {
            const matchName = (s.enrolledCategories || []).some((c) => c.toLowerCase().includes(courseFilter.toLowerCase()));
            if (!matchName) return false;
          } else {
            const courseId = Number(courseFilter);
            if (!s.enrolledCourseIds?.includes(courseId)) return false;
          }
        }

        // Payment Filter
        if (paymentFilter !== "all" && (s.paymentStatus || "unpaid") !== paymentFilter) return false;

        // Status Filter
        if (statusFilter !== "all" && s.status !== statusFilter) return false;

        // Mode Filter
        if (modeFilter !== "all") {
          const isOfflineStudent = s.learningMode === "offline" || Boolean(s.centerName && s.centerName.trim()) || Boolean(s.appointmentSlot && s.appointmentSlot.trim());
          if (modeFilter === "offline" && !isOfflineStudent) return false;
          if (modeFilter === "online" && isOfflineStudent) return false;
          if (modeFilter !== "offline" && modeFilter !== "online" && s.learningMode !== modeFilter) return false;
        }

        // Activity Filter
        const activeDate = s.lastActiveAt || s.lastLoginAt || s.updatedAt;
        const activeTime = activeDate ? new Date(activeDate).getTime() : 0;
        const diffDays = activeDate ? (nowTime - activeTime) / (1000 * 60 * 60 * 24) : Infinity;

        if (activityFilter === "never" && activeDate) return false;
        if (activityFilter === "inactive_7d" && diffDays < 7) return false;
        if (activityFilter === "inactive_30d" && diffDays < 30) return false;
        if (activityFilter === "active_now" && (diffDays >= 7 || !activeDate)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name, "ar");
        if (sortBy === "code") return (a.accessCode || "").localeCompare(b.accessCode || "");
        if (sortBy === "last_active_asc") {
          const timeA = (a.lastActiveAt || a.lastLoginAt || a.updatedAt) ? new Date(a.lastActiveAt || a.lastLoginAt || a.updatedAt!).getTime() : 0;
          const timeB = (b.lastActiveAt || b.lastLoginAt || b.updatedAt) ? new Date(b.lastActiveAt || b.lastLoginAt || b.updatedAt!).getTime() : 0;
          return timeA - timeB;
        }
        if (sortBy === "last_active_desc") {
          const timeA = (a.lastActiveAt || a.lastLoginAt || a.updatedAt) ? new Date(a.lastActiveAt || a.lastLoginAt || a.updatedAt!).getTime() : 0;
          const timeB = (b.lastActiveAt || b.lastLoginAt || b.updatedAt) ? new Date(b.lastActiveAt || b.lastLoginAt || b.updatedAt!).getTime() : 0;
          return timeB - timeA;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [students, debouncedSearch, stageFilter, courseFilter, paymentFilter, statusFilter, modeFilter, activityFilter, sortBy]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchInput ||
      stageFilter !== "all" ||
      courseFilter !== "all" ||
      paymentFilter !== "all" ||
      statusFilter !== "all" ||
      modeFilter !== "all" ||
      activityFilter !== "all" ||
      sortBy !== "newest"
  );

  const clearAllFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStageFilter("all");
    setCourseFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setModeFilter("all");
    setActivityFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Checkbox Selection
  const isAllFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const toggleSelectStudent = (id: number) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Bulk Actions
  const handleBulkApprove = () => {
    selectedStudentIds.forEach((id) => onUpdateStatus(id, "approved"));
    setSelectedStudentIds([]);
  };

  const handleBulkSuspend = () => {
    selectedStudentIds.forEach((id) => onUpdateStatus(id, "suspended"));
    setSelectedStudentIds([]);
  };

  const handleSuspendAllFiltered = () => {
    const targetStudents = filteredStudents.filter((s) => s.status !== "suspended");
    if (targetStudents.length === 0) {
      alert("جميع الطلاب المعروضين موقوفون بالفعل.");
      return;
    }
    const confirmed = window.confirm(
      `هل أنت تأكيد من إيقاف حسابات جميع الطلاب المعروضين وعددهم (${targetStudents.length} طالب)؟\n\nتنويه: يمكنك أنت أو المساعد إعادة تفعيل أي طالب لاحقاً بسهولة.`
    );
    if (confirmed) {
      targetStudents.forEach((s) => onUpdateStatus(s.id, "suspended"));
    }
  };

  const handleSuspendAllStudents = () => {
    const activeStudents = students.filter((s) => s.status !== "suspended");
    if (activeStudents.length === 0) {
      alert("جميع الطلاب (الأونلاين والأوفلاين) موقوفون بالفعل حالياً.");
      return;
    }
    const confirmed = window.confirm(
      `⚠️ إجراء حاسم:\nهل أنت متأكد من إيقاف حسابات كافة الطلاب بالكامل (أونلاين + أوفلاين) وعددهم (${activeStudents.length} طالب)؟\n\nتنويه: لن يتمكن أي طالب من الدخول للمنصة إلا بعد تفعيله يدويًا منك أو من المشرف المساعد.`
    );
    if (confirmed) {
      activeStudents.forEach((s) => onUpdateStatus(s.id, "suspended"));
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["الاسم,الهاتف,الكود,المرحلة,حالة الاشتراك,حالة الحساب"]
        .concat(
          filteredStudents.map(
            (s) =>
              `"${s.name}","${s.phone}","${s.accessCode || ""}","${s.grade || ""}","${s.paymentStatus || ""}","${s.status}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 text-[#0F172A]" dir="rtl">
      {modeFilter === "offline" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-[#0F172A] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold">
              <MapPin className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">قائمة حجوزات السناتر والمواعيد الحضورية</h2>
              <p className="text-xs text-[#64748B]">تعرض الآن جميع الحجوزات والطلاب المسجلين بنظام الأوفلاين ({filteredStudents.length} حجز بمركز التعليم)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#2563EB] hover:bg-[#DBEAFE] transition-colors"
          >
            عرض جميع الطلاب (أونلاين + أوفلاين)
          </button>
        </div>
      )}

      {contextFilterLabel && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#2563EB]" />
            <p className="min-w-0 text-xs font-semibold text-[#475569]">
              تعرض القائمة الآن: <strong className="text-[#0F172A]">{contextFilterLabel}</strong>
              <span className="mr-2 text-[#64748B]">({students.length} طالب)</span>
            </p>
          </div>
          {onClearContextFilter && (
            <button
              type="button"
              onClick={onClearContextFilter}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-white px-3 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              عرض كل الطلاب
            </button>
          )}
        </div>
      )}

      {/* 1. Integrated Search & Filters Toolbar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3 shadow-xs overflow-hidden">
        {/* Row 1: Search + Result Count + Clear */}
        <div className="flex items-center gap-3">
          {/* Search Input — min-w-[360px] on desktop, full width on mobile */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الهاتف أو الكود أو البريد"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-12 w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] pr-11 pl-10 text-sm font-medium text-[#0F172A] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Result Counter */}
          <span className="shrink-0 text-xs font-medium text-[#64748B] whitespace-nowrap hidden sm:block">
            عرض <strong className="text-[#0F172A] font-bold">{filteredStudents.length}</strong>{" "}
            من أصل <strong className="text-[#0F172A] font-bold">{students.length}</strong> طالبًا
          </span>

          {/* Clear Filters (visible only when active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">مسح الفلاتر</span>
            </button>
          )}

          {/* Quick Inactive Filter Button */}
          <button
            type="button"
            onClick={() => {
              if (activityFilter === "inactive_7d" && sortBy === "last_active_asc") {
                setActivityFilter("all");
                setSortBy("newest");
              } else {
                setActivityFilter("inactive_7d");
                setSortBy("last_active_asc");
              }
              setCurrentPage(1);
            }}
            className={`shrink-0 inline-flex items-center gap-1.5 h-12 rounded-xl px-3.5 text-xs font-bold transition-all shadow-xs ${
              activityFilter === "inactive_7d"
                ? "bg-amber-600 text-white ring-2 ring-amber-400"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-600" />
            <span>المنقطعين (لم يدخلوا من أسبوع) ⚠️</span>
          </button>

          {activityFilter !== "all" && (
            <button
              type="button"
              onClick={handleSuspendAllFiltered}
              className="shrink-0 inline-flex items-center gap-1.5 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 text-xs font-bold transition-all shadow-xs"
            >
              <UserX className="h-4 w-4" />
              <span>إيقاف المنقطعين المعروضين ({filteredStudents.filter((s) => s.status !== "suspended").length}) 🚫</span>
            </button>
          )}

          {/* Suspend All Students (Online + Offline) Button */}
          <button
            type="button"
            onClick={handleSuspendAllStudents}
            className="shrink-0 inline-flex items-center gap-1.5 h-12 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3.5 text-xs font-bold transition-all shadow-xs"
            title="إيقاف جميع الطلاب (أونلاين وأوفلاين) لحين تفعيلهم يدويًا من الأدمن أو المشرف المساعد"
          >
            <UserX className="h-4 w-4" />
            <span>إيقاف كافة الطلاب (أونلاين + أوفلاين) 🛑</span>
          </button>

          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="shrink-0 inline-flex items-center gap-1.5 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 text-xs font-bold transition-all shadow-xs"
            >
              <BarChart3 className="h-4 w-4" />
              <span>تقارير الدخول والنشاط 📊</span>
            </button>
          )}

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="lg:hidden shrink-0 flex items-center gap-1.5 h-12 rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-semibold text-[#0F172A]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
          </button>
        </div>

        {/* Row 2 (Desktop): Filters Grid — auto-fit prevents overflow */}
        <div className="hidden lg:grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل المراحل</option>
            {uniqueStages.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل الكورسات</option>
            {learningCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل الاشتراكات</option>
            <option value="paid">مدفوع (وصول كامل)</option>
            <option value="pending_review">إيصال للمراجعة</option>
            <option value="unpaid">مجاني (معاينة)</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل الحسابات</option>
            <option value="approved">حساب نشط</option>
            <option value="pending">ينتظر التفعيل</option>
            <option value="suspended">حساب موقوف</option>
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل الأنظمة</option>
            <option value="online">أونلاين</option>
            <option value="offline">أوفلاين (السنتر)</option>
          </select>

          {/* Activity Level Filter */}
          <select
            value={activityFilter}
            onChange={(e) => { setActivityFilter(e.target.value as any); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">حالة النشاط بالمنصة</option>
            <option value="inactive_7d">منقطع من أسبوع (7+ أيام)</option>
            <option value="inactive_30d">منقطع من شهر (30+ يوم)</option>
            <option value="never">لم يدخل المنصة أبدًا</option>
            <option value="active_now">نشط خلال الأسبوع</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="newest">الأحدث تسجيلًا</option>
            <option value="last_active_asc">المنقطعين أولاً (الأقدم نشاطاً)</option>
            <option value="last_active_desc">الأكثر نشاطاً مؤخراً</option>
            <option value="name">أبجديًا بالاسم</option>
            <option value="code">حسب كود الطالب</option>
          </select>
        </div>

        {/* Mobile Filters Collapsible (2-col grid) */}
        {isMobileFilterOpen && (
          <div className="lg:hidden grid grid-cols-2 gap-2 pt-3 border-t border-[#E2E8F0]">
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#0F172A]">
              <option value="all">كل المراحل</option>
              {uniqueStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#0F172A]">
              <option value="all">كل الاشتراكات</option>
              <option value="paid">مدفوع</option>
              <option value="pending_review">مراجعة</option>
              <option value="unpaid">مجاني</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#0F172A]">
              <option value="all">كل الحسابات</option>
              <option value="approved">نشط</option>
              <option value="pending">معلق</option>
              <option value="suspended">موقوف</option>
            </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#0F172A]">
              <option value="all">كل الأنظمة</option>
              <option value="online">أونلاين</option>
              <option value="offline">أوفلاين</option>
            </select>
            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as any)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#0F172A]">
              <option value="all">كل حالات النشاط</option>
              <option value="inactive_7d">منقطع أكثر من 7 أيام</option>
              <option value="inactive_30d">منقطع أكثر من 30 يوم</option>
              <option value="never">لم يدخل أبدًا</option>
            </select>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E2E8F0]">
            <span className="text-xs font-semibold text-[#64748B]">فلاتر نشطة:</span>

            {stageFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">
                <span>المرحلة: {stageFilter}</span>
                <button type="button" onClick={() => setStageFilter("all")} className="hover:text-[#0F172A]"><X className="h-3 w-3" /></button>
              </span>
            )}
            {paymentFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">
                <span>الاشتراك: {paymentFilter === "paid" ? "مدفوع" : paymentFilter === "pending_review" ? "مراجعة" : "مجاني"}</span>
                <button type="button" onClick={() => setPaymentFilter("all")} className="hover:text-[#0F172A]"><X className="h-3 w-3" /></button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">
                <span>الحساب: {statusFilter === "approved" ? "نشط" : statusFilter === "suspended" ? "موقوف" : "معلق"}</span>
                <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-[#0F172A]"><X className="h-3 w-3" /></button>
              </span>
            )}
            {activityFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <span>النشاط: {activityFilter === "inactive_7d" ? "منقطع (7+ أيام)" : activityFilter === "inactive_30d" ? "منقطع (30+ يوم)" : activityFilter === "never" ? "لم يدخل أبدًا" : "نشط"}</span>
                <button type="button" onClick={() => setActivityFilter("all")} className="hover:text-[#0F172A]"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Bulk Action Bar (Appears when 1+ selected) */}
      {selectedStudentIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white">
              {selectedStudentIds.length}
            </span>
            <span className="text-xs font-bold text-[#0F172A]">
              طلاب محددون {filteredStudents.length > selectedStudentIds.length ? `(من أصل ${filteredStudents.length} بالفئة)` : "(جميع طلاب الفئة)"}
            </span>
            {selectedStudentIds.length < filteredStudents.length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs font-bold text-[#2563EB] hover:underline bg-white border border-[#BFDBFE] px-2.5 py-1 rounded-lg mr-2 transition-colors hover:bg-[#DBEAFE]"
              >
                📌 تحديد كل طلاب هذه الفئة/النتيجة ({filteredStudents.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleBulkApprove}
              className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs h-9 rounded-xl min-h-[44px]"
            >
              <UserCheck className="h-4 w-4 ml-1" /> قبول وتفعيل المحدد ({selectedStudentIds.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleBulkSuspend}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 rounded-xl min-h-[44px]"
            >
              <UserX className="h-4 w-4 ml-1" /> إيقاف المحدد ({selectedStudentIds.length})
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] h-9 rounded-xl min-h-[44px]"
            >
              <Download className="h-4 w-4 ml-1 text-[#2563EB]" /> تصدير CSV
            </Button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-[#64748B] hover:text-[#0F172A] underline mr-2 font-medium"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile student cards */}
      <div className="grid gap-3 lg:hidden">
        {paginatedStudents.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-xs text-[#64748B]">
            لا توجد نتائج مسجلة مطابقة للبحث أو الفلاتر المختارة.
          </div>
        ) : paginatedStudents.map((student) => {
          const effectiveStage = student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade || "غير محدد";
          return (
            <article key={student.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
              <button type="button" onClick={() => setActiveDrawerStudent(student)} className="w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">{student.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#0F172A]">{student.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-[#64748B]" dir="ltr">{student.phone}</p>
                    </div>
                  </div>
                  <Eye className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${student.paymentStatus === "paid" ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#10B981]" : student.paymentStatus === "pending_review" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"}`}>{student.paymentStatus === "paid" ? "مدفوع" : student.paymentStatus === "pending_review" ? "مراجعة" : "مجاني"}</span>
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${student.status === "approved" ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#10B981]" : student.status === "suspended" ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{student.status === "approved" ? "نشط" : student.status === "suspended" ? "موقوف" : "معلق"}</span>
                  <span className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[10px] font-semibold text-[#475569]">{student.learningMode === "offline" || student.centerName ? "أوفلاين (السنتر)" : "أونلاين"}</span>
                </div>
                {(student.learningMode === "offline" || student.centerName || student.appointmentSlot) && (
                  <div className="mt-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-2.5 text-xs text-right space-y-1">
                    <p className="font-bold text-[#2563EB] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      <span>السنتر: {student.centerName || "—"}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-amber-800">
                      ⏰ الموعد المحدد: {student.appointmentSlot || "—"}
                    </p>
                    {student.parentPhone && (
                      <p className="text-[10px] font-medium text-[#475569] dir-ltr text-right">
                        👨‍👩‍👦 هاتف ولي الأمر: {student.parentPhone}
                      </p>
                    )}
                  </div>
                )}
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3">
                {student.accessCode ? <button type="button" onClick={() => onCopyStudentCode(student)} className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#2563EB]" dir="ltr"><Copy className="h-3.5 w-3.5" />{student.accessCode}</button> : <span />}
                <button type="button" onClick={() => setActiveDrawerStudent(student)} className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-2 text-[11px] font-semibold text-white">عرض الملف الكامل</button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop data table */}
      <div className="admin-students-table relative hidden overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-xs lg:block">
        <table className="w-full min-w-[1160px] border-separate border-spacing-0 text-right text-[11px]">
          <thead className="sticky top-0 z-20 bg-[#F8FAFC] text-[#475569]">
            <tr className="h-12">
              <th className="w-10 border-b border-[#E2E8F0] px-2.5 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label={isAllFilteredSelected ? "إلغاء تحديد كل الطلاب" : "تحديد كل الطلاب بالفئة"}
                  title={isAllFilteredSelected ? "إلغاء تحديد الكل" : `تحديد كافة طلاب الفئة الحالية (${filteredStudents.length} طالب)`}
                  className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9]"
                >
                  {isAllFilteredSelected ? <CheckSquare className="h-4 w-4 text-[#2563EB]" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              {[
                ["الطالب وكود الوصول", "min-w-[160px]"],
                ["بيانات التواصل", "min-w-[155px]"],
                ["تاريخ التسجيل", "min-w-[105px]"],
                ["المرحلة التعليمية", "min-w-[140px]"],
                ["الكورسات", "min-w-[90px]"],
                ["الاشتراك", "min-w-[95px]"],
                ["الحساب", "min-w-[85px]"],
                ["السنتر والموعد 📍", "min-w-[165px]"],
                ["الأجهزة", "min-w-[85px]"],
                ["آخر ظهور ⏱️", "min-w-[110px]"],
              ].map(([label, width]) => (
                <th key={label} className={`border-b border-[#E2E8F0] px-2.5 py-2 font-bold ${width}`}>{label}</th>
              ))}
              <th className="min-w-[110px] border-b border-[#E2E8F0] px-2.5 py-2 text-left font-bold">الإجراءات</th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-12 text-center text-xs text-[#64748B]">
                  لا توجد نتائج مسجلة مطابقة للبحث أو الفلاتر المختارة.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s, rowIndex) => {
                const isSelected = selectedStudentIds.includes(s.id);
                const effectiveStage = s.grade === "أخرى" ? s.otherGradeDetail || "أخرى" : s.grade || "غير محدد";

                return (
                  <tr
                    key={s.id}
                    onClick={() => setActiveDrawerStudent(s)}
                    className={`group h-[64px] cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                      isSelected ? "bg-[#EFF6FF]" : rowIndex % 2 ? "bg-[#FAF9FD]" : "bg-white"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelectStudent(s.id)}
                        aria-label={isSelected ? `إلغاء تحديد ${s.name}` : `تحديد ${s.name}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9]"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#2563EB]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    {/* Student Primary Info */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-bold text-[#2563EB]">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="block max-w-[135px] truncate text-xs font-bold text-[#0F172A] transition-colors group-hover:text-[#2563EB]" title={s.name}>
                            {s.name}
                          </span>
                          {s.accessCode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyStudentCode(s);
                              }}
                              title="اضغط لنسخ الكود"
                              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#2563EB] dir-ltr text-right hover:underline"
                            >
                              {copiedStudentId === s.id ? (
                                <Check className="h-3 w-3 text-[#10B981]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>{s.accessCode}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={`https://wa.me/${(s.phone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + s.phone.replace(/[^\d+]/g, "") : s.phone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ${s.name} 👋، تواصل من د. محمود المهدي`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center p-1 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] border border-[#A7F3D0] transition-all shrink-0"
                            title="تواصل واتساب مباشر"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                          <span className="font-mono text-xs font-medium text-[#0F172A] dir-ltr">
                            {s.phone}
                          </span>
                        </div>
                        {s.parentPhone && (
                          <span className="block font-mono text-[10px] font-semibold text-amber-800 dir-ltr text-right" title="رقم ولي الأمر">
                            ولي الأمر: {s.parentPhone}
                          </span>
                        )}
                        {s.email && (
                          <span className="block max-w-[125px] truncate font-sans text-[10px] text-[#64748B] dir-ltr text-right" title={s.email}>
                            {s.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Registration date */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      {s.createdAt && !Number.isNaN(new Date(s.createdAt).getTime()) ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                          <div className="leading-tight">
                            <span className="block whitespace-nowrap text-[11px] font-semibold text-[#0F172A]">
                              {new Date(s.createdAt).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <span className="block text-[9px] font-medium text-[#64748B]">انضم للمنصة</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-[#64748B]">غير متاح</span>
                      )}
                    </td>

                    {/* Stage */}
                    <td className="max-w-[140px] border-b border-[#E2E8F0] px-2.5 py-2">
                      <span className="line-clamp-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 text-[11px] font-medium leading-5 text-[#475569]" title={effectiveStage}>
                        {effectiveStage}
                      </span>
                    </td>

                    {/* Enrolled Courses Badge */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#334155]">
                        {(s.enrolledCourseIds?.length ?? 0) === 0
                          ? "كل الكورسات"
                          : `${s.enrolledCourseIds?.length} كورس`}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <span
                        className={`inline-flex h-7 w-[88px] items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-bold text-center ${
                          s.paymentStatus === "paid"
                            ? "bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]"
                            : s.paymentStatus === "pending_review"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                        }`}
                      >
                        {s.paymentStatus === "paid" ? (
                          <>
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>مدفوع</span>
                          </>
                        ) : s.paymentStatus === "pending_review" ? (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            <span>مراجعة</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>مجاني</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <span
                        className={`inline-flex h-7 w-[84px] items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-bold text-center ${
                          s.status === "approved"
                            ? "bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]"
                            : s.status === "suspended"
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {s.status === "approved" ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>نشط</span>
                          </>
                        ) : s.status === "suspended" ? (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>موقوف</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>معلق</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Mode / Center Name & Appointment Slot */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      {s.learningMode === "offline" || s.centerName || s.appointmentSlot ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{s.centerName || "—"}</span>
                          </span>
                          {s.appointmentSlot && (
                            <span className="block text-[10px] font-semibold text-amber-800 truncate max-w-[135px]" title={s.appointmentSlot}>
                              ⏰ {s.appointmentSlot}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">
                          أونلاين
                        </span>
                      )}
                    </td>

                    {/* Device Lock */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      {(() => {
                        const activeCount = Array.isArray(s.boundDevices) && s.boundDevices.length > 0
                          ? s.boundDevices.length
                          : (s.deviceId ? 1 : 0);
                        const maxLimit = s.maxDevices || 2;
                        return (
                          <span
                            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold ${
                              activeCount >= maxLimit
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : activeCount > 0
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                            }`}
                            title={`الأجهزة المفتوحة والمربوطة حالياً: ${activeCount} من إجمالي المسموح ${maxLimit}`}
                          >
                            {activeCount > 0 ? (
                              <>
                                <Smartphone className="h-3.5 w-3.5" />
                                <span>{activeCount} من {maxLimit} جهاز</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3.5 w-3.5 text-slate-400" />
                                <span>0 من {maxLimit} جهاز</span>
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Last Active Time */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      {(() => {
                        const activeDate = s.lastActiveAt || s.lastLoginAt || s.updatedAt;
                        if (!activeDate) {
                          return <span className="text-[10px] font-semibold text-slate-400">لم يدخل بعد</span>;
                        }
                        const date = new Date(activeDate);
                        const now = new Date();
                        const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffMins < 5) {
                          return (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> نشط الآن 🟢
                            </span>
                          );
                        }
                        if (diffMins < 60) {
                          return <span className="text-[10px] font-bold text-emerald-700">منذ {diffMins} دقيقة</span>;
                        }
                        if (diffHours < 24) {
                          return <span className="text-[10px] font-bold text-blue-700">منذ {diffHours} ساعة</span>;
                        }
                        if (diffDays === 1) {
                          return <span className="text-[10px] font-bold text-slate-700">أمس</span>;
                        }
                        if (diffDays < 30) {
                          return <span className="text-[10px] font-semibold text-slate-600">منذ {diffDays} يوم</span>;
                        }
                        return <span className="text-[10px] font-medium text-slate-400">{date.toLocaleDateString("ar-EG")}</span>;
                      })()}
                    </td>

                    {/* Primary Action + 3-dots Dropdown Menu */}
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2 text-left" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Primary Action Button */}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setActiveDrawerStudent(s)}
                          className="h-8 min-h-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-2.5 text-[10px] font-semibold text-white shadow-none"
                        >
                          <Eye className="h-4 w-4 ml-1.5" />
                          <span>عرض الملف</span>
                        </Button>

                        {/* 3-dots Menu Button */}
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === s.id ? null : s.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] transition-colors hover:bg-white hover:text-[#0F172A]"
                          title="إجراءات إضافية"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu Overlay */}
                        {openDropdownId === s.id && (
                          <div className="absolute left-0 top-11 z-30 w-48 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl space-y-1">
                            {s.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(s.id, "approved");
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#10B981] hover:bg-[#ECFDF5]"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تفعيل الحساب</span>
                              </button>
                            )}
                            {s.status !== "suspended" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(s.id, "suspended");
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                <span>إيقاف الحساب</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSetMaxDevices(s);
                                setOpenDropdownId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F6F8FC]"
                            >
                              <Smartphone className="h-3.5 w-3.5 text-[#2563EB]" />
                              <span>تغيير أجهزة اللوجن</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onResetDevice(s);
                                setOpenDropdownId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F6F8FC]"
                            >
                              <Unlock className="h-3.5 w-3.5 text-amber-600" />
                              <span>فك قفل الجهاز</span>
                            </button>
                            {s.accessCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  onCopyStudentCode(s);
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F6F8FC]"
                              >
                                <Copy className="h-3.5 w-3.5 text-[#2563EB]" />
                                <span>نسخ كود الوصول</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteStudent(s.id);
                                setOpenDropdownId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف الطالب</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-xs font-semibold text-[#475569] shadow-xs">
        <div className="flex items-center gap-2">
          <span>عدد النتائج في الصفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#E2E8F0] bg-[#F6F8FC] px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>الصفحة {currentPage} من أصل {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="الصفحة السابقة"
              className="h-9 w-9 p-0 border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F6F8FC] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="الصفحة التالية"
              className="h-9 w-9 p-0 border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F6F8FC] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Full Student Profile Drawer */}
      <StudentDrawer
        student={activeDrawerStudent ? students.find((s) => s.id === activeDrawerStudent.id) || activeDrawerStudent : null}
        isOpen={Boolean(activeDrawerStudent)}
        onClose={() => setActiveDrawerStudent(null)}
        role={role}
        paymentReceipts={paymentReceipts}
        learningCourses={learningCourses}
        onUpdateStatus={onUpdateStatus}
        onUpdatePaymentStatus={onUpdatePaymentStatus}
        onUpdateMode={onUpdateMode}
        onResetDevice={onResetDevice}
        onSetMaxDevices={onSetMaxDevices}
        onDeleteStudent={onDeleteStudent}
        onUpdateStudentCourses={onUpdateStudentCourses}
        onApproveReceipt={onApproveReceipt}
      />
    </div>
  );
}
