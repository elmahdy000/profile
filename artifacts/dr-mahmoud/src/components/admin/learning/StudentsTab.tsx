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
  const [sortBy, setSortBy] = useState<"newest" | "name" | "code">(() => getInitialParam("sort", "newest") as any);

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
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", String(currentPage));

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [debouncedSearch, stageFilter, courseFilter, paymentFilter, statusFilter, modeFilter, sortBy, currentPage]);

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
      setSortBy((params.get("sort") as any) || "newest");
      setCurrentPage(Number(params.get("page")) || 1);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Filtering Logic
  const filteredStudents = useMemo(() => {
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

        // Mode Filter (Center bookings: learningMode === "offline" OR has centerName/appointmentSlot)
        if (modeFilter !== "all") {
          const isOfflineStudent = s.learningMode === "offline" || Boolean(s.centerName && s.centerName.trim()) || Boolean(s.appointmentSlot && s.appointmentSlot.trim());
          if (modeFilter === "offline" && !isOfflineStudent) return false;
          if (modeFilter === "online" && isOfflineStudent) return false;
          if (modeFilter !== "offline" && modeFilter !== "online" && s.learningMode !== modeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name, "ar");
        if (sortBy === "code") return (a.accessCode || "").localeCompare(b.accessCode || "");
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [students, debouncedSearch, stageFilter, courseFilter, paymentFilter, statusFilter, modeFilter, sortBy]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchInput ||
      stageFilter !== "all" ||
      courseFilter !== "all" ||
      paymentFilter !== "all" ||
      statusFilter !== "all" ||
      modeFilter !== "all" ||
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
  const isAllSelected =
    paginatedStudents.length > 0 && paginatedStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(paginatedStudents.map((s) => s.id));
    }
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
    <div className="admin-adaptive-dark-ui space-y-5 text-[#F8FAFC]" dir="rtl">
      {modeFilter === "offline" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">📍 قائمة حجوزات السناتر والمواعيد الحضورية</h2>
              <p className="text-xs font-bold text-emerald-300">تعرض الآن جميع الحجوزات والطلاب المسجلين بنظام الأوفلاين ({filteredStudents.length} حجز بمركز التعليم)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-[#0B1424] border border-emerald-500/35 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            عرض جميع الطلاب (أونلاين + أوفلاين)
          </button>
        </div>
      )}

      {contextFilterLabel && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#1677FF]/35 bg-[#1677FF]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#4096FF]" />
            <p className="min-w-0 text-xs font-bold text-[#A8B5C7]">
              تعرض القائمة الآن: <strong className="text-[#F8FAFC]">{contextFilterLabel}</strong>
              <span className="mr-2 text-[#7F91AA]">({students.length} طالب)</span>
            </p>
          </div>
          {onClearContextFilter && (
            <button
              type="button"
              onClick={onClearContextFilter}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#1677FF]/35 bg-[#0B1424] px-3 text-xs font-black text-[#69A5FF] transition-colors hover:bg-[#13213A] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              عرض كل الطلاب
            </button>
          )}
        </div>
      )}

      {/* 1. Integrated Search & Filters Toolbar */}
      <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-4 space-y-3 shadow-sm overflow-hidden">
        {/* Row 1: Search + Result Count + Clear */}
        <div className="flex items-center gap-3">
          {/* Search Input — min-w-[360px] on desktop, full width on mobile */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8492A6] pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الهاتف أو الكود أو البريد"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-12 w-full min-w-0 rounded-xl border border-[#26364D] bg-[#0B1424] pr-11 pl-10 text-sm font-bold text-[#F8FAFC] placeholder-[#8492A6] focus:border-[#1677FF] focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8492A6] hover:text-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Result Counter */}
          <span className="shrink-0 text-xs font-bold text-[#A8B5C7] whitespace-nowrap hidden sm:block">
            عرض <strong className="text-[#F8FAFC] font-black">{filteredStudents.length}</strong>{" "}
            من أصل <strong className="text-[#F8FAFC] font-black">{students.length}</strong> طالبًا
          </span>

          {/* Clear Filters (visible only when active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">مسح الفلاتر</span>
            </button>
          )}

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="lg:hidden shrink-0 flex items-center gap-1.5 h-12 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#F8FAFC]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#1677FF]" />
          </button>
        </div>

        {/* Row 2 (Desktop): Filters Grid — auto-fit prevents overflow */}
        <div className="hidden lg:grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
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
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
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
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
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
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
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
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
          >
            <option value="all">كل الأنظمة</option>
            <option value="online">أونلاين</option>
            <option value="offline">أوفلاين (السنتر)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-12 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-[#1677FF] focus:outline-none"
          >
            <option value="newest">الأحدث تسجيلًا</option>
            <option value="name">أبجديًا بالاسم</option>
            <option value="code">حسب كود الطالب</option>
          </select>
        </div>

        {/* Mobile Filters Collapsible (2-col grid) */}
        {isMobileFilterOpen && (
          <div className="lg:hidden grid grid-cols-2 gap-2 pt-3 border-t border-[#26364D]">
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7]">
              <option value="all">كل المراحل</option>
              {uniqueStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7]">
              <option value="all">كل الاشتراكات</option>
              <option value="paid">مدفوع</option>
              <option value="pending_review">مراجعة</option>
              <option value="unpaid">مجاني</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7]">
              <option value="all">كل الحسابات</option>
              <option value="approved">نشط</option>
              <option value="pending">معلق</option>
              <option value="suspended">موقوف</option>
            </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7]">
              <option value="all">كل الأنظمة</option>
              <option value="online">أونلاين</option>
              <option value="offline">أوفلاين</option>
            </select>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#26364D]/60">
            <span className="text-xs font-bold text-[#8492A6]">فلاتر نشطة:</span>

            {stageFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#1677FF]/15 border border-[#1677FF]/30 px-2.5 py-0.5 text-xs font-bold text-[#1677FF]">
                <span>المرحلة: {stageFilter}</span>
                <button type="button" onClick={() => setStageFilter("all")} className="hover:text-white"><X className="h-3 w-3" /></button>
              </span>
            )}
            {paymentFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#1677FF]/15 border border-[#1677FF]/30 px-2.5 py-0.5 text-xs font-bold text-[#1677FF]">
                <span>الاشتراك: {paymentFilter === "paid" ? "مدفوع" : paymentFilter === "pending_review" ? "مراجعة" : "مجاني"}</span>
                <button type="button" onClick={() => setPaymentFilter("all")} className="hover:text-white"><X className="h-3 w-3" /></button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#1677FF]/15 border border-[#1677FF]/30 px-2.5 py-0.5 text-xs font-bold text-[#1677FF]">
                <span>الحساب: {statusFilter === "approved" ? "نشط" : statusFilter === "suspended" ? "موقوف" : "معلق"}</span>
                <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-white"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Bulk Action Bar (Appears when 1+ selected) */}
      {selectedStudentIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1677FF]/40 bg-[#1677FF]/15 p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1677FF] text-xs font-black text-white">
              {selectedStudentIds.length}
            </span>
            <span className="text-xs font-extrabold text-[#F8FAFC]">طلاب محددون للإجراء الجماعي</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleBulkApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 rounded-xl min-h-[44px]"
            >
              <UserCheck className="h-4 w-4 ml-1" /> قبول وتفعيل المحدد
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleBulkSuspend}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-9 rounded-xl min-h-[44px]"
            >
              <UserX className="h-4 w-4 ml-1" /> إيقاف المحدد
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="border-[#26364D] bg-[#0B1424] text-xs font-extrabold text-[#F8FAFC] hover:bg-[#131E31] h-9 rounded-xl min-h-[44px]"
            >
              <Download className="h-4 w-4 ml-1 text-[#1677FF]" /> تصدير CSV
            </Button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-[#A9B8CC] hover:text-white underline mr-2"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile student cards — same data and drawer actions, without a desktop table squeeze */}
      <div className="grid gap-3 lg:hidden">
        {paginatedStudents.length === 0 ? (
          <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-8 text-center text-xs text-[#8492A6]">
            لا توجد نتائج مسجلة مطابقة للبحث أو الفلاتر المختارة.
          </div>
        ) : paginatedStudents.map((student) => {
          const effectiveStage = student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade || "غير محدد";
          return (
            <article key={student.id} className="rounded-2xl border border-[#26364D] bg-[#131E31] p-4 shadow-sm">
              <button type="button" onClick={() => setActiveDrawerStudent(student)} className="w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1677FF]/15 text-sm font-black text-[#1677FF]">{student.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-[#F8FAFC]">{student.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-[#A8B5C7]" dir="ltr">{student.phone}</p>
                    </div>
                  </div>
                  <Eye className="mt-1 h-4 w-4 shrink-0 text-[#1677FF]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold ${student.paymentStatus === "paid" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : student.paymentStatus === "pending_review" ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-[#26364D] bg-[#0B1424] text-[#8492A6]"}`}>{student.paymentStatus === "paid" ? "مدفوع" : student.paymentStatus === "pending_review" ? "مراجعة" : "مجاني"}</span>
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold ${student.status === "approved" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : student.status === "suspended" ? "border-rose-500/30 bg-rose-500/15 text-rose-400" : "border-amber-500/30 bg-amber-500/15 text-amber-300"}`}>{student.status === "approved" ? "نشط" : student.status === "suspended" ? "موقوف" : "معلق"}</span>
                  <span className="rounded-lg border border-[#26364D] bg-[#0B1424] px-2 py-1 text-[10px] font-bold text-[#A8B5C7]">{student.learningMode === "offline" || student.centerName ? "أوفلاين (السنتر)" : "أونلاين"}</span>
                </div>
                {(student.learningMode === "offline" || student.centerName || student.appointmentSlot) && (
                  <div className="mt-2.5 rounded-xl border border-emerald-500/35 bg-emerald-950/40 p-2.5 text-xs text-right space-y-1">
                    <p className="font-extrabold text-emerald-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>السنتر: {student.centerName || "حضور بالسنتر (الزقازيق)"}</span>
                    </p>
                    <p className="text-[11px] font-bold text-amber-300">
                      ⏰ الموعد المحدد: {student.appointmentSlot || "حسب الجدول والأيام المعروضة"}
                    </p>
                    {student.parentPhone && (
                      <p className="text-[10px] font-bold text-slate-300 dir-ltr text-right">
                        👨‍👩‍👦 هاتف ولي الأمر: {student.parentPhone}
                      </p>
                    )}
                  </div>
                )}
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-[#26364D] pt-3">
                {student.accessCode ? <button type="button" onClick={() => onCopyStudentCode(student)} className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#1677FF]" dir="ltr"><Copy className="h-3.5 w-3.5" />{student.accessCode}</button> : <span />}
                <button type="button" onClick={() => setActiveDrawerStudent(student)} className="rounded-lg bg-[#1677FF] px-3 py-2 text-[11px] font-black text-white">عرض الملف الكامل</button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop data table */}
      <div className="admin-students-table relative hidden overflow-x-auto rounded-2xl border border-[#2B3D57] bg-[#101B2D] shadow-sm lg:block">
        <table className="w-full min-w-[1160px] border-separate border-spacing-0 text-right text-[11px]">
          <thead className="sticky top-0 z-20 bg-[#0A1424] text-[#B6C2D2]">
            <tr className="h-12">
              <th className="w-10 border-b border-[#2B3D57] px-2.5 text-center">
                <button type="button" onClick={toggleSelectAll} aria-label={isAllSelected ? "إلغاء تحديد كل الطلاب" : "تحديد كل الطلاب"} className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#7F91AA] transition hover:bg-white/5 hover:text-white">
                  {isAllSelected ? <CheckSquare className="h-4 w-4 text-[#1677FF]" /> : <Square className="h-4 w-4" />}
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
              ].map(([label, width]) => (
                <th key={label} className={`border-b border-[#2B3D57] px-2.5 py-2 font-extrabold ${width}`}>{label}</th>
              ))}
              <th className="min-w-[110px] border-b border-[#2B3D57] px-2.5 py-2 text-left font-extrabold">الإجراءات</th>
            </tr>
          </thead>

          <tbody className="bg-[#101B2D]">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-12 text-center text-xs text-[#7F91AA]">
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
                    className={`group h-[66px] cursor-pointer transition-[background-color,box-shadow] hover:bg-[#192A43] hover:shadow-[inset_-3px_0_0_#1677FF] ${
                      isSelected ? "bg-[#1677FF]/12 shadow-[inset_-3px_0_0_#1677FF]" : rowIndex % 2 ? "bg-[#0D192A]/45" : "bg-[#101B2D]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelectStudent(s.id)}
                        aria-label={isSelected ? `إلغاء تحديد ${s.name}` : `تحديد ${s.name}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#7F91AA] transition hover:bg-white/5 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#1677FF]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    {/* Student Primary Info (Name font >= 13px + Avatar 32px + Code LTR) */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1677FF]/25 bg-[#1677FF]/12 text-xs font-black text-[#69A5FF]">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <span className="block max-w-[135px] truncate text-xs font-extrabold text-[#F8FAFC] transition-colors group-hover:text-[#69A5FF]" title={s.name}>
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
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#1677FF] dir-ltr text-right hover:underline"
                            >
                              {copiedStudentId === s.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>{s.accessCode}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact (Phone LTR + Email LTR + Parent Phone) */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={`https://wa.me/${(s.phone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + s.phone.replace(/[^\d+]/g, "") : s.phone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ${s.name} 👋، تواصل من د. محمود المهدي`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition-all shrink-0"
                            title="تواصل واتساب مباشر"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                          <span className="font-mono text-xs font-bold text-[#A9B8CC] dir-ltr">
                            {s.phone}
                          </span>
                        </div>
                        {s.parentPhone && (
                          <span className="block font-mono text-[10px] font-bold text-amber-300 dir-ltr text-right" title="رقم ولي الأمر">
                            ولي الأمر: {s.parentPhone}
                          </span>
                        )}
                        {s.email && (
                          <span className="block max-w-[125px] truncate font-sans text-[10px] text-[#7F91AA] dir-ltr text-right" title={s.email}>
                            {s.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Platform registration date */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      {s.createdAt && !Number.isNaN(new Date(s.createdAt).getTime()) ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#334761]/70 bg-[#0B1424]/70 px-2 py-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#69A5FF]" />
                          <div className="leading-tight">
                            <span className="block whitespace-nowrap text-[11px] font-extrabold text-[#D8E2EF]">
                              {new Date(s.createdAt).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <span className="mt-0.5 block text-[9px] font-bold text-[#64748B]">انضم للمنصة</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-[#64748B]">غير متاح</span>
                      )}
                    </td>

                    {/* Stage (Line clamp 2 + Tooltip) */}
                    <td className="max-w-[140px] border-b border-[#26364D]/55 px-2.5 py-2">
                      <span className="line-clamp-2 rounded-lg bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-bold leading-5 text-[#B7C4D6]" title={effectiveStage}>
                        {effectiveStage}
                      </span>
                    </td>

                    {/* Enrolled Courses Badge */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#0B1424] border border-[#26364D] px-2.5 py-1 text-xs font-bold text-[#A9B8CC]">
                        {(s.enrolledCourseIds?.length ?? 0) === 0
                          ? "كل الكورسات"
                          : `${s.enrolledCourseIds?.length} كورس`}
                      </span>
                    </td>

                    {/* Payment Status (Lucide icons, NO emojis) */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <span
                        className={`inline-flex h-7 w-[88px] items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-extrabold text-center ${
                          s.paymentStatus === "paid"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : s.paymentStatus === "pending_review"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-[#0B1424] text-[#7F91AA] border border-[#26364D]"
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

                    {/* Account Status (Lucide icons, NO emojis) */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <span
                        className={`inline-flex h-7 w-[84px] items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-extrabold text-center ${
                          s.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : s.status === "suspended"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      {s.learningMode === "offline" || s.centerName || s.appointmentSlot ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[130px]">{s.centerName || "سنتر الزقازيق"}</span>
                          </span>
                          {s.appointmentSlot && (
                            <span className="block text-[10px] font-bold text-amber-300 truncate max-w-[135px]" title={s.appointmentSlot}>
                              ⏰ {s.appointmentSlot}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full border border-[#1677FF]/25 bg-[#1677FF]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#69A5FF]">
                          أونلاين
                        </span>
                      )}
                    </td>

                    {/* Device Lock (Lucide icons, NO emojis) */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2">
                      <span
                        className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold ${
                          (s.maxDevices || 1) === 2
                            ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                            : s.deviceId || (s.boundDevices && s.boundDevices.length > 0)
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-[#0B1424] text-[#7F91AA] border border-[#26364D]"
                        }`}
                      >
                        {(s.maxDevices || 1) === 2 ? (
                          <>
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>جهازين</span>
                          </>
                        ) : s.deviceId ? (
                          <>
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>جهاز واحد</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            <span>بدون ربط</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Primary Action + 3-dots Dropdown Menu */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2 text-left" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Primary Single Action: Eye icon + View Profile */}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setActiveDrawerStudent(s)}
                          className="h-8 min-h-8 rounded-lg bg-[#1677FF] px-2.5 text-[10px] font-extrabold text-white shadow-none hover:bg-[#1267DB]"
                        >
                          <Eye className="h-4 w-4 ml-1.5" />
                          <span>عرض الملف</span>
                        </Button>

                        {/* 3-dots Menu Button */}
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === s.id ? null : s.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#334761] bg-[#0B1424] text-[#A9B8CC] transition-colors hover:border-[#49617F] hover:bg-[#1A2942] hover:text-white"
                          title="إجراءات إضافية"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu Overlay */}
                        {openDropdownId === s.id && (
                          <div className="absolute left-0 top-11 z-30 w-48 rounded-xl border border-[#26364D] bg-[#0B1424] p-1.5 shadow-2xl space-y-1">
                            {s.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(s.id, "approved");
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10"
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
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/10"
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
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#A9B8CC] hover:bg-[#131E31]"
                            >
                              <Smartphone className="h-3.5 w-3.5 text-[#1677FF]" />
                              <span>تغيير أجهزة اللوجن</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onResetDevice(s);
                                setOpenDropdownId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#A9B8CC] hover:bg-[#131E31]"
                            >
                              <Unlock className="h-3.5 w-3.5 text-amber-400" />
                              <span>فك قفل الجهاز</span>
                            </button>
                            {s.accessCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  onCopyStudentCode(s);
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#A9B8CC] hover:bg-[#131E31]"
                              >
                                <Copy className="h-3.5 w-3.5 text-[#1677FF]" />
                                <span>نسخ كود الوصول</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteStudent(s.id);
                                setOpenDropdownId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#26364D] bg-[#131E31] p-4 text-xs font-bold text-[#A9B8CC]">
        <div className="flex items-center gap-2">
          <span>عدد النتائج في الصفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#26364D] bg-[#0B1424] px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none"
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
              className="h-9 w-9 p-0 border-[#26364D] bg-[#0B1424] text-[#F8FAFC] disabled:opacity-40"
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
              className="h-9 w-9 p-0 border-[#26364D] bg-[#0B1424] text-[#F8FAFC] disabled:opacity-40"
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
