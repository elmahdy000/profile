import React, { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  Download,
  Printer,
  Copy,
  Check,
  MessageCircle,
  CalendarDays,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  Building2,
  Users,
  Clock,
  Phone,
  GraduationCap,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  Sparkles,
  Edit2,
  Save,
  Loader2,
  School,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StudentDrawer, type ExtendedStudent } from "./StudentDrawer";

const OFFICIAL_CENTERS = [
  { name: "سنتر رافال أكاديمي (Rafal Academy)", location: "بجوار الثانوية العسكرية - الزقازيق" },
  { name: "سنتر زاج أكاديمي (Zag Academy)", location: "منطقة الفلل - الزقازيق" },
  { name: "سنتر إديوفيرس (EduVerse)", location: "منطقة الفلل - الزقازيق" },
  { name: "سنتر حسن صميدة", location: "منطقة الحناوي - الزقازيق" },
];

const OFFICIAL_SLOTS = [
  "سبت - اتنين - أربع (الساعة 3:30 عصراً)",
  "سبت - اتنين - أربع (الساعة 5:00 مساءً)",
  "سبت - اتنين - أربع (الساعة 6:30 مساءً)",
  "حد - تلات - خميس (الساعة 6:30 مساءً)",
  "حسب جدول المجموعات بالسنتر (الساعة 3:00 عصراً)",
];

interface CenterBookingsTabProps {
  students: ExtendedStudent[];
  role?: "superadmin" | "subadmin";
  onUpdateStatus: (id: number, status: "pending" | "approved" | "suspended") => void;
  onUpdatePaymentStatus: (student: ExtendedStudent, status: string) => void;
  onUpdateMode: (student: ExtendedStudent, mode: "online" | "offline") => void;
  onResetDevice: (student: ExtendedStudent) => void;
  onSetMaxDevices: (student: ExtendedStudent) => void;
  onDeleteStudent: (id: number) => void;
  copiedStudentId: number | null;
  onCopyStudentCode: (student: ExtendedStudent) => void;
  learningCourses?: Array<{ id: number; title: string }>;
  onUpdateStudentCourses?: (student: ExtendedStudent, courseIds: number[]) => void;
  onUpdateBooking?: (id: number, patch: Partial<ExtendedStudent>) => void;
}

export function CenterBookingsTab({
  students = [],
  role = "superadmin",
  onUpdateStatus,
  onUpdatePaymentStatus,
  onUpdateMode,
  onResetDevice,
  onSetMaxDevices,
  onDeleteStudent,
  copiedStudentId,
  onCopyStudentCode,
  learningCourses = [],
  onUpdateStudentCourses,
  onUpdateBooking,
}: CenterBookingsTabProps) {
  const { toast } = useToast();

  // Local state for students list to reflect immediate edits
  const [localStudents, setLocalStudents] = useState<ExtendedStudent[]>(students);

  // Sync if parent prop updates
  React.useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  // Filter for center / offline students
  const centerStudents = useMemo(() => {
    return localStudents.filter((s) => {
      const isOfflineMode = String(s.learningMode || "").trim().toLowerCase() === "offline";
      const hasCenter = Boolean(s.centerName && String(s.centerName).trim());
      const hasSlot = Boolean(s.appointmentSlot && String(s.appointmentSlot).trim());
      const hasParentPhone = Boolean(s.parentPhone && String(s.parentPhone).trim());
      return isOfflineMode || hasCenter || hasSlot || hasParentPhone;
    });
  }, [localStudents]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeDrawerStudent, setActiveDrawerStudent] = useState<ExtendedStudent | null>(null);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<ExtendedStudent | null>(null);
  const [editFormData, setEditFormData] = useState({
    centerName: "",
    appointmentSlot: "",
    parentPhone: "",
    schoolName: "",
    languageTrack: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Open Edit Modal
  const handleOpenEdit = (student: ExtendedStudent) => {
    setEditingStudent(student);
    setEditFormData({
      centerName: student.centerName || "سنتر رافال أكاديمي (Rafal Academy)",
      appointmentSlot: student.appointmentSlot || "سبت - اتنين - أربع (الساعة 3:30 عصراً)",
      parentPhone: student.parentPhone || "",
      schoolName: student.schoolName || "",
      languageTrack: student.languageTrack || "عربي",
    });
  };

  // Save Booking Details to Server
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          centerName: editFormData.centerName.trim() || null,
          appointmentSlot: editFormData.appointmentSlot.trim() || null,
          parentPhone: editFormData.parentPhone.trim() || null,
          schoolName: editFormData.schoolName.trim() || null,
          languageTrack: editFormData.languageTrack.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل حفظ بيانات حجز السنتر");
      }

      const updated = await res.json();
      setLocalStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...updated } : s))
      );
      onUpdateBooking?.(editingStudent.id, updated);

      toast({
        title: "تم حفظ وتحديث السنتر والموعد بنجاح 📍",
        description: `تم ربط الطالب ${editingStudent.name} بـ ${editFormData.centerName}`,
      });

      setEditingStudent(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: err.message || "حدث خطأ أثناء الاتصال بالسيرفر",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Extract unique filter options
  const uniqueCenters = useMemo(() => {
    const set = new Set<string>();
    centerStudents.forEach((s) => {
      if (s.centerName && s.centerName.trim()) set.add(s.centerName.trim());
    });
    return Array.from(set);
  }, [centerStudents]);

  const uniqueSlots = useMemo(() => {
    const set = new Set<string>();
    centerStudents.forEach((s) => {
      if (s.appointmentSlot && s.appointmentSlot.trim()) set.add(s.appointmentSlot.trim());
    });
    return Array.from(set);
  }, [centerStudents]);

  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    centerStudents.forEach((s) => {
      const stage = s.grade === "أخرى" ? s.otherGradeDetail || s.grade : s.grade;
      if (stage) set.add(stage);
    });
    return Array.from(set);
  }, [centerStudents]);

  const uniqueSchools = useMemo(() => {
    const set = new Set<string>();
    centerStudents.forEach((s) => {
      if (s.schoolName && s.schoolName.trim()) set.add(s.schoolName.trim());
    });
    return Array.from(set);
  }, [centerStudents]);

  // Filtering Logic
  const filteredBookings = useMemo(() => {
    return centerStudents.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.phone?.includes(q);
        const matchCode = s.accessCode?.toLowerCase().includes(q);
        const matchParent = s.parentPhone?.includes(q);
        const matchSchool = s.schoolName?.toLowerCase().includes(q);
        const matchCenter = s.centerName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchParent && !matchSchool && !matchCenter) {
          return false;
        }
      }

      // Center Filter
      if (centerFilter === "بدون سنتر محدد" && s.centerName?.trim()) return false;
      if (centerFilter !== "all" && centerFilter !== "بدون سنتر محدد" && s.centerName !== centerFilter) return false;

      // Slot Filter
      if (slotFilter !== "all" && s.appointmentSlot !== slotFilter) return false;

      // Stage Filter
      const effectiveStage = s.grade === "أخرى" ? s.otherGradeDetail || s.grade : s.grade;
      if (stageFilter !== "all" && effectiveStage !== stageFilter) return false;

      // School Filter
      if (schoolFilter !== "all" && s.schoolName !== schoolFilter) return false;

      // Payment Filter
      if (paymentFilter !== "all" && (s.paymentStatus || "unpaid") !== paymentFilter) return false;

      return true;
    });
  }, [centerStudents, searchQuery, centerFilter, slotFilter, stageFilter, schoolFilter, paymentFilter]);

  // Stats Summary
  const stats = useMemo(() => {
    const total = centerStudents.length;
    const withSlot = centerStudents.filter((s) => s.appointmentSlot && s.appointmentSlot.trim()).length;
    const withParentPhone = centerStudents.filter((s) => s.parentPhone && s.parentPhone.trim()).length;
    const paidCount = centerStudents.filter((s) => s.paymentStatus === "paid").length;
    return { total, withSlot, withParentPhone, paidCount };
  }, [centerStudents]);

  const centerCards = useMemo(() => {
    const names = Array.from(new Set([
      ...OFFICIAL_CENTERS.map((center) => center.name),
      ...uniqueCenters,
    ]));

    const cards = names.map((name) => {
      const studentsInCenter = centerStudents.filter((student) => student.centerName?.trim() === name);
      const complete = studentsInCenter.filter((student) => Boolean(student.appointmentSlot?.trim())).length;
      return {
        name,
        location: OFFICIAL_CENTERS.find((center) => center.name === name)?.location || "بيانات مضافة من الإدارة",
        total: studentsInCenter.length,
        complete,
        incomplete: studentsInCenter.length - complete,
      };
    });

    const withoutCenter = centerStudents.filter((student) => !student.centerName?.trim());
    if (withoutCenter.length > 0) {
      cards.push({
        name: "بدون سنتر محدد",
        location: "يحتاج إلى استكمال بيانات الحجز",
        total: withoutCenter.length,
        complete: withoutCenter.filter((student) => Boolean(student.appointmentSlot?.trim())).length,
        incomplete: withoutCenter.length,
      });
    }

    return cards;
  }, [centerStudents, uniqueCenters]);

  // Select all checkbox
  const isAllSelected = filteredBookings.length > 0 && filteredBookings.every((s) => selectedIds.includes(s.id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(filteredBookings.map((s) => s.id));
  };
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "م",
      "الاسم الكامل",
      "كود الوصول",
      "هاتف الطالب",
      "هاتف ولي الأمر",
      "المرحلة التعليمية",
      "اسم المدرسة",
      "المسار/الشعبة",
      "السنتر المختار",
      "الموعد المحدد",
      "حالة الاشتراك",
      "حالة الحساب",
      "تاريخ التسجيل",
    ];

    const rows = filteredBookings.map((s, idx) => [
      idx + 1,
      s.name,
      s.accessCode || "",
      s.phone || "",
      s.parentPhone || "غير مسجل",
      s.grade === "أخرى" ? s.otherGradeDetail || s.grade : s.grade || "",
      s.schoolName || "غير محدد",
      s.languageTrack || "عام",
      s.centerName || "—",
      s.appointmentSlot || "—",
      s.paymentStatus === "paid" ? "مدفوع" : s.paymentStatus === "pending_review" ? "مراجعة" : "مجاني",
      s.status === "approved" ? "نشط" : s.status === "suspended" ? "موقوف" : "معلق",
      s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-EG") : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(",")].concat(rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `center_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="center-bookings-workspace space-y-6 text-[#0F172A]" dir="rtl">
      {/* 1. White Header Card & Page Actions */}
      <div className="flex flex-col gap-4 rounded-[18px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#BFDBFE]">
            <MapPin className="h-5 w-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
              كشف تفاصيل حجوزات السناتر
            </h1>
            <p className="mt-1 text-sm text-[#475569] leading-relaxed">
              جدول مخصص وشامل لجميع الطلاب المسجلين بالسناتر، مع إمكانية تحديد السنتر والموعد مباشرة لكل طالب.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleExportCSV}
            className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" /> تصدير كشف الحجز CSV
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-11 px-4 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#EFF6FF] text-[#2563EB] font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4 text-[#2563EB]" /> طباعة كشف الحضور
          </Button>
        </div>
      </div>

      {/* 2. Key Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold">إجمالي حجوزات السناتر</span>
            <Users className="h-4 w-4 text-[#2563EB]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.total} <span className="text-xs font-normal text-[#64748B]">حجز</span></p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold">مواعيد محددة</span>
            <Clock className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.withSlot} <span className="text-xs font-normal text-[#64748B]">طالب</span></p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold">أولياء الأمور المسجلين</span>
            <Phone className="h-4 w-4 text-[#2563EB]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.withParentPhone} <span className="text-xs font-normal text-[#64748B]">رقم مسجل</span></p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold">الاشتراكات المدفوعة</span>
            <CreditCard className="h-4 w-4 text-[#10B981]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.paidCount} <span className="text-xs font-normal text-[#64748B]">اشتراك</span></p>
        </div>
      </div>

      {/* 2.5 Center KPI Cards */}
      <section aria-labelledby="center-kpi-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="center-kpi-heading" className="text-base font-bold text-[#0F172A]">توزيع الطلاب حسب السنتر</h2>
            <p className="mt-1 text-xs text-[#64748B]">اضغط على أي بطاقة لعرض طلاب السنتر فقط.</p>
          </div>
          {centerFilter !== "all" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCenterFilter("all")}
              className="h-9 rounded-lg border-[#BFDBFE] bg-white px-3 text-xs font-semibold text-[#2563EB]"
            >
              <X className="h-3.5 w-3.5" /> إظهار كل السناتر
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {centerCards.map((card) => {
            const isActive = centerFilter === card.name;
            return (
              <button
                key={card.name}
                type="button"
                onClick={() => setCenterFilter(isActive ? "all" : card.name)}
                aria-pressed={isActive}
                className={`group text-right rounded-2xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 ${
                  isActive
                    ? "border-[#2563EB] bg-[#EFF6FF] shadow-md"
                    : "border-[#E2E8F0] bg-white hover:border-[#93C5FD] hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    card.name === "بدون سنتر محدد"
                      ? "border-amber-200 bg-amber-50 text-amber-600"
                      : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}>
                    {card.name === "بدون سنتر محدد" ? <AlertCircle className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-[#0F172A]" title={card.name}>{card.name}</h3>
                    <p className="mt-1 truncate text-[11px] text-[#64748B]" title={card.location}>{card.location}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black leading-none text-[#0F172A]">{card.total}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#64748B]">طالب مسجل</p>
                  </div>
                  <div className="space-y-1 text-left text-[11px] font-semibold">
                    <p className="text-emerald-600"><CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />{card.complete} مكتمل</p>
                    <p className="text-amber-600"><AlertCircle className="ml-1 inline h-3.5 w-3.5" />{card.incomplete} ناقص</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Dedicated Filter Bar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-4 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Live Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب، رقم التلفون، كود الحجز..."
              className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] pr-10 pl-4 text-xs font-medium text-[#0F172A] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-3.5 text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Center Filter */}
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل السناتر والمراكز</option>
            {OFFICIAL_CENTERS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
            {uniqueCenters.filter(c => !OFFICIAL_CENTERS.some(oc => oc.name === c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {centerStudents.some((s) => !s.centerName?.trim()) && <option value="بدون سنتر محدد">بدون سنتر محدد</option>}
          </select>

          {/* Slot Filter */}
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل المواعيد المتاحة</option>
            {OFFICIAL_SLOTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {uniqueSlots.filter(s => !OFFICIAL_SLOTS.includes(s)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
          >
            <option value="all">كل المراحل الدراسية</option>
            {uniqueStages.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Additional Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9] text-xs font-medium text-[#64748B]">
          <div className="flex flex-wrap items-center gap-3">
            <span>تصفية إضافية:</span>
            {uniqueSchools.length > 0 && (
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F6F8FC] px-2.5 text-xs text-[#0F172A]"
              >
                <option value="all">كل المدارس</option>
                {uniqueSchools.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            )}

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F6F8FC] px-2.5 text-xs text-[#0F172A]"
            >
              <option value="all">كل الاشتراكات</option>
              <option value="paid">مدفوع</option>
              <option value="pending_review">مراجعة</option>
              <option value="unpaid">مجاني</option>
            </select>

            {(searchQuery || centerFilter !== "all" || slotFilter !== "all" || stageFilter !== "all" || schoolFilter !== "all" || paymentFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCenterFilter("all");
                  setSlotFilter("all");
                  setStageFilter("all");
                  setSchoolFilter("all");
                  setPaymentFilter("all");
                }}
                className="text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
              >
                <X className="h-3.5 w-3.5" /> إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          <span className="text-[#64748B]">
            معروض الآن: <strong className="text-[#0F172A]">{filteredBookings.length}</strong> حجز بالسنتر من إجمالي {centerStudents.length}
          </span>
        </div>
      </div>

      {/* 3.5. Mobile Center Bookings Cards (lg:hidden) */}
      <div className="grid gap-3 lg:hidden">
        {filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center text-xs text-[#64748B]">
            لا توجد حجوزات سناتر مطابقة للبحث أو الفلاتر.
          </div>
        ) : (
          filteredBookings.map((student) => {
            const effectiveStage = student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade || "غير محدد";
            return (
              <div key={student.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                      {student.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#0F172A]">{student.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-[#64748B]" dir="ltr">{student.phone}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                    student.status === "approved" ? "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]" :
                    student.status === "suspended" ? "bg-red-50 text-red-600 border-red-200" :
                    "bg-amber-50 text-amber-600 border-amber-200"
                  }`}>
                    {student.status === "approved" ? "مفعل" : student.status === "suspended" ? "موقوف" : "معلق"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <span className="block text-[#64748B] text-[10px]">السنتر:</span>
                    <span className="font-semibold text-[#2563EB] truncate block">{student.centerName || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B] text-[10px]">الموعد:</span>
                    <span className="font-semibold text-[#0F172A] truncate block">{student.appointmentSlot || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B] text-[10px]">المرحلة:</span>
                    <span className="font-semibold text-[#475569] truncate block">{effectiveStage}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B] text-[10px]">هاتف ولي الأمر:</span>
                    <span className="font-semibold text-[#475569] font-mono block" dir="ltr">{student.parentPhone || "غير مسجل"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerStudent(student)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#2563EB] hover:bg-[#DBEAFE]"
                  >
                    <Eye className="h-4 w-4" /> فتح ملف الطالب والتعديل
                  </button>
                  <a
                    href={`https://wa.me/${student.phone.replace(/[^\d+]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#10B981] text-white hover:bg-[#059669] shrink-0"
                    title="واتساب"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="admin-center-table relative overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-right text-[11px]">
            <thead className="sticky top-0 z-20 bg-[#F8FAFC] text-[#475569]">
              <tr className="h-12">
                <th className="w-10 border-b border-[#E2E8F0] px-2.5 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="تحديد الكل"
                    className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9]"
                  >
                    {isAllSelected ? <CheckSquare className="h-4 w-4 text-[#2563EB]" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="w-10 border-b border-[#E2E8F0] px-2 py-2 text-center font-bold">#</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[160px]">الطالب وكود الوصول</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[140px]">المرحلة التعليمية</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[120px]">اسم المدرسة</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[95px]">المسار</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[160px]">السنتر المختار</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[160px]">الموعد المحدد</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[125px]">هاتف الطالب</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[125px]">هاتف ولي الأمر</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[95px]">تاريخ التسجيل</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 font-bold min-w-[85px]">الاشتراك</th>
                <th className="border-b border-[#E2E8F0] px-3 py-2 text-left font-bold min-w-[140px]">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-xs text-[#64748B]">
                    لا توجد حجوزات سناتر مطابقة للبحث أو الفلاتر المحددة.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((s, idx) => {
                  const isSelected = selectedIds.includes(s.id);
                  const effectiveStage = s.grade === "أخرى" ? s.otherGradeDetail || "أخرى" : s.grade || "غير محدد";

                  return (
                    <tr
                      key={s.id}
                      className={`group h-[60px] transition-colors hover:bg-[#F8FAFC] ${
                        isSelected ? "bg-[#EFF6FF]" : idx % 2 ? "bg-[#FAF9FD]" : "bg-white"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="border-b border-[#E2E8F0] px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(s.id)}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9]"
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-[#2563EB]" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>

                      {/* Serial Number */}
                      <td className="border-b border-[#E2E8F0] px-2 py-2 text-center font-mono font-medium text-[#64748B]">
                        {idx + 1}
                      </td>

                      {/* Student Name + Access Code */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-bold text-[#2563EB]">
                            {s.name.charAt(0)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <span className="block max-w-[130px] truncate text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB]" title={s.name}>
                              {s.name}
                            </span>
                            {s.accessCode && (
                              <button
                                type="button"
                                onClick={() => onCopyStudentCode(s)}
                                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#2563EB] dir-ltr text-right hover:underline"
                              >
                                {copiedStudentId === s.id ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                                <span>{s.accessCode}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <span className="line-clamp-2 text-[11px] font-medium text-[#475569]" title={effectiveStage}>
                          {effectiveStage}
                        </span>
                      </td>

                      {/* School Name */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <span className="truncate max-w-[110px] block text-[11px] font-medium text-[#334155]" title={s.schoolName || "غير محدد"}>
                          {s.schoolName || "غير مسجل"}
                        </span>
                      </td>

                      {/* Language Track */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <span className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#334155]">
                          {s.languageTrack || "عام"}
                        </span>
                      </td>

                      {/* Center Name */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        {s.centerName ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
                            <MapPin className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                            <span className="truncate max-w-[140px]" title={s.centerName}>{s.centerName}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            <Plus className="h-3 w-3" /> حدد السنتر
                          </button>
                        )}
                      </td>

                      {/* Appointment Slot */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        {s.appointmentSlot ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span className="truncate max-w-[140px]" title={s.appointmentSlot}>{s.appointmentSlot}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#64748B]">غير محدد</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2 font-mono text-xs text-[#0F172A] font-semibold" dir="ltr">
                        {s.phone}
                      </td>

                      {/* Parent Phone */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        {s.parentPhone ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://wa.me/${(s.parentPhone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + s.parentPhone.replace(/[^\d+]/g, "") : s.parentPhone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ولي أمر الطالب ${s.name} 👋، تواصل من إدارة السنتر`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] transition"
                              title="واتساب ولي الأمر"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                            <span className="font-mono text-xs font-semibold text-[#0F172A] dir-ltr">{s.parentPhone}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-[#64748B]">غير مسجل</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <span className="font-mono text-xs font-semibold text-[#334155]">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-EG") : "—"}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2">
                        <span
                          className={`inline-flex h-6 items-center justify-center gap-1 rounded-md px-2 text-[10px] font-bold ${
                            s.paymentStatus === "paid"
                              ? "bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]"
                              : s.paymentStatus === "pending_review"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                          }`}
                        >
                          {s.paymentStatus === "paid" ? "مدفوع" : s.paymentStatus === "pending_review" ? "مراجعة" : "مجاني"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="border-b border-[#E2E8F0] px-3 py-2 text-left">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-all flex items-center gap-1"
                            title="تعديل السنتر والموعد وبيانات ولي الأمر"
                          >
                            <Edit2 className="h-3 w-3" /> تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveDrawerStudent(s)}
                            className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-1 text-[10px] font-semibold text-[#2563EB] hover:bg-[#DBEAFE] transition-all flex items-center gap-1"
                            title="عرض الملف الكامل"
                          >
                            <Eye className="h-3 w-3" /> الملف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Quick Edit Booking Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">تعديل وتحديد حجز السنتر</h3>
                  <p className="text-xs text-[#2563EB] font-semibold">{editingStudent.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs font-medium">
              {/* Center Selection */}
              <div className="space-y-1.5">
                <label className="text-[#475569] block">📍 السنتر المختار:</label>
                <select
                  value={editFormData.centerName}
                  onChange={(e) => setEditFormData({ ...editFormData, centerName: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                  required
                >
                  {OFFICIAL_CENTERS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} — {c.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Selection */}
              <div className="space-y-1.5">
                <label className="text-[#475569] block">⏰ الموعد المحدد للحضور:</label>
                <select
                  value={editFormData.appointmentSlot}
                  onChange={(e) => setEditFormData({ ...editFormData, appointmentSlot: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                  required
                >
                  {OFFICIAL_SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Parent Phone */}
              <div className="space-y-1.5">
                <label className="text-[#475569] block">👨‍👩‍👦 رقم هاتف ولي الأمر:</label>
                <input
                  type="text"
                  value={editFormData.parentPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                  placeholder="مثال: 01012345678"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs text-[#0F172A] dir-ltr text-right focus:border-[#2563EB] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[#475569] block">🏫 اسم المدرسة:</label>
                <input
                  type="text"
                  value={editFormData.schoolName}
                  onChange={(e) => setEditFormData({ ...editFormData, schoolName: e.target.value })}
                  placeholder="مثال: مدرسة السادات الثانوية بنين"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FC] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  className="h-10 px-4 rounded-xl border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] text-xs font-semibold"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> حفظ بيانات الحجز
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Drawer Modal */}
      {activeDrawerStudent && (
        <StudentDrawer
          student={localStudents.find((s) => s.id === activeDrawerStudent.id) || activeDrawerStudent}
          isOpen={Boolean(activeDrawerStudent)}
          onClose={() => setActiveDrawerStudent(null)}
          role={role}
          learningCourses={learningCourses}
          onUpdateStatus={onUpdateStatus}
          onUpdatePaymentStatus={onUpdatePaymentStatus}
          onUpdateMode={onUpdateMode}
          onResetDevice={onResetDevice}
          onSetMaxDevices={onSetMaxDevices}
          onDeleteStudent={onDeleteStudent}
          onUpdateStudentCourses={onUpdateStudentCourses}
        />
      )}
    </div>
  );
}
