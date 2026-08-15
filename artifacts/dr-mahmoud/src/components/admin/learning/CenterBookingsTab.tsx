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
      return (
        s.learningMode === "offline" ||
        Boolean(s.centerName && s.centerName.trim()) ||
        Boolean(s.appointmentSlot && s.appointmentSlot.trim())
      );
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
      if (centerFilter !== "all" && s.centerName !== centerFilter) return false;

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
      s.centerName || "سنتر الزقازيق",
      s.appointmentSlot || "حسب المواعيد",
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
    <div className="center-bookings-workspace space-y-6 text-[#F8FAFC]" dir="rtl">
      {/* 1. Header Banner & Page Action */}
      <div className="flex flex-col gap-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/70 via-[#0D1B2A] to-[#0A1424] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 shadow-inner">
            <MapPin className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              📍 كشف وتفاصيل حجوزات السناتر (المواعيد الحضورية)
            </h1>
            <p className="mt-1 text-xs text-emerald-300 font-bold leading-relaxed">
              جدول مخصص وشامل لجميع الطلاب المسجلين بالسناتر بالزقازيق، مع إمكانية تحديد السنتر والموعد مباشرة لكل طالب.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleExportCSV}
            className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> تصدير كشف الحجز (CSV)
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-11 px-4 rounded-xl border-emerald-500/40 bg-[#0B1424] hover:bg-emerald-500/20 text-emerald-300 font-extrabold text-xs transition-all flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" /> طباعة كشف الحضور
          </Button>
        </div>
      </div>

      {/* 2. Key Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#2B3D57] bg-[#101B2D] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#8492A6]">
            <span className="text-xs font-extrabold">إجمالي حجوزات السناتر</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{stats.total} <span className="text-xs font-bold text-[#8492A6]">حجز</span></p>
        </div>

        <div className="rounded-2xl border border-[#2B3D57] bg-[#101B2D] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#8492A6]">
            <span className="text-xs font-extrabold">مواعيد محددة</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300">{stats.withSlot} <span className="text-xs font-bold text-[#8492A6]">طالب</span></p>
        </div>

        <div className="rounded-2xl border border-[#2B3D57] bg-[#101B2D] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#8492A6]">
            <span className="text-xs font-extrabold">أولياء الأمور المسجلين</span>
            <Phone className="h-4 w-4 text-[#1677FF]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#69A5FF]">{stats.withParentPhone} <span className="text-xs font-bold text-[#8492A6]">رقم مسجل</span></p>
        </div>

        <div className="rounded-2xl border border-[#2B3D57] bg-[#101B2D] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#8492A6]">
            <span className="text-xs font-extrabold">الاشتراكات المدفوعة</span>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{stats.paidCount} <span className="text-xs font-bold text-[#8492A6]">اشتراك</span></p>
        </div>
      </div>

      {/* 3. Dedicated Filter Bar */}
      <div className="rounded-2xl border border-[#2B3D57] bg-[#101B2D] p-4 space-y-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Live Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-[#7F91AA]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب، رقم التلفون، كود الحجز، أو هاتف ولي الأمر..."
              className="h-11 w-full rounded-xl border border-[#26364D] bg-[#0B1424] pr-10 pl-4 text-xs font-bold text-white placeholder-[#7F91AA] focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-3.5 text-[#7F91AA] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Center Filter */}
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">كل السناتر والمراكز</option>
            {OFFICIAL_CENTERS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
            {uniqueCenters.filter(c => !OFFICIAL_CENTERS.some(oc => oc.name === c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Slot Filter */}
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-emerald-500 focus:outline-none"
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
            className="h-11 rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs font-bold text-[#A8B5C7] focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">كل المراحل الدراسية</option>
            {uniqueStages.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Additional Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#26364D]/60 text-xs font-bold text-[#A8B5C7]">
          <div className="flex flex-wrap items-center gap-3">
            <span>تصفية إضافية:</span>
            {uniqueSchools.length > 0 && (
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="h-9 rounded-lg border border-[#26364D] bg-[#0B1424] px-2.5 text-xs text-[#A8B5C7]"
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
              className="h-9 rounded-lg border border-[#26364D] bg-[#0B1424] px-2.5 text-xs text-[#A8B5C7]"
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
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          <span className="text-[#8492A6]">
            معروض الآن: <strong className="text-white">{filteredBookings.length}</strong> حجز بالسنتر من إجمالي {centerStudents.length}
          </span>
        </div>
      </div>

      {/* 4. Complete Center Bookings Table */}
      <div className="admin-center-table relative overflow-x-auto rounded-2xl border border-[#2B3D57] bg-[#101B2D] shadow-md">
        <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-right text-[11px]">
          <thead className="sticky top-0 z-20 bg-[#0A1424] text-[#B6C2D2]">
            <tr className="h-12">
              <th className="w-10 border-b border-[#2B3D57] px-2.5 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label="تحديد الكل"
                  className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#7F91AA] transition hover:bg-white/5 hover:text-white"
                >
                  {isAllSelected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th className="w-10 border-b border-[#2B3D57] px-2 py-2 text-center font-black">#</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[160px]">الطالب وكود الوصول</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[140px]">المرحلة التعليمية</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[120px]">اسم المدرسة</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[95px]">المسار</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[160px]">السنتر المختار 📍</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[160px]">الموعد المحدد ⏰</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[125px]">هاتف الطالب 📱</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[125px]">هاتف ولي الأمر 👨‍👩‍👦</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[95px]">تاريخ التسجيل</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 font-extrabold min-w-[85px]">الاشتراك</th>
              <th className="border-b border-[#2B3D57] px-3 py-2 text-left font-extrabold min-w-[140px]">الإجراءات</th>
            </tr>
          </thead>

          <tbody className="bg-[#101B2D]">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-12 text-center text-xs text-[#7F91AA]">
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
                    className={`group h-[64px] transition-[background-color] hover:bg-[#192A43] ${
                      isSelected ? "bg-emerald-500/10 shadow-[inset_-3px_0_0_#10B981]" : idx % 2 ? "bg-[#0D192A]/45" : "bg-[#101B2D]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="border-b border-[#26364D]/55 px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelect(s.id)}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#7F91AA] transition hover:bg-white/5 hover:text-white"
                      >
                        {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>

                    {/* Serial Number */}
                    <td className="border-b border-[#26364D]/55 px-2 py-2 text-center font-mono font-bold text-[#7F91AA]">
                      {idx + 1}
                    </td>

                    {/* Student Name + Access Code */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-xs font-black text-emerald-400">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="block max-w-[130px] truncate text-xs font-extrabold text-[#F8FAFC] group-hover:text-emerald-300" title={s.name}>
                            {s.name}
                          </span>
                          {s.accessCode && (
                            <button
                              type="button"
                              onClick={() => onCopyStudentCode(s)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-400 dir-ltr text-right hover:underline"
                            >
                              {copiedStudentId === s.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              <span>{s.accessCode}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <span className="line-clamp-2 text-[11px] font-bold text-[#B7C4D6]" title={effectiveStage}>
                        {effectiveStage}
                      </span>
                    </td>

                    {/* School Name */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <span className="truncate max-w-[110px] block text-[11px] font-bold text-[#A8B5C7]" title={s.schoolName || "غير محدد"}>
                        {s.schoolName || "غير مسجل"}
                      </span>
                    </td>

                    {/* Language Track */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <span className="inline-flex rounded-md border border-[#26364D] bg-[#0B1424] px-2 py-0.5 text-[10px] font-bold text-[#A9B8CC]">
                        {s.languageTrack || "عام"}
                      </span>
                    </td>

                    {/* Center Name */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      {s.centerName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-300">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={s.centerName}>{s.centerName}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
                        >
                          <Plus className="h-3 w-3" /> حدد السنتر
                        </button>
                      )}
                    </td>

                    {/* Appointment Slot */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      {s.appointmentSlot ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-extrabold text-amber-300">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span className="truncate max-w-[145px]" title={s.appointmentSlot}>{s.appointmentSlot}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
                        >
                          <Clock className="h-3 w-3" /> حدد الموعد
                        </button>
                      )}
                    </td>

                    {/* Student Phone */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/${(s.phone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + s.phone.replace(/[^\d+]/g, "") : s.phone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ${s.name} 👋، تواصل بخصوص حجز السنتر`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex p-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition"
                          title="واتساب الطالب"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                        <span className="font-mono text-xs font-bold text-[#A9B8CC] dir-ltr">{s.phone}</span>
                      </div>
                    </td>

                    {/* Parent Phone */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      {s.parentPhone ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`https://wa.me/${(s.parentPhone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + s.parentPhone.replace(/[^\d+]/g, "") : s.parentPhone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ولي أمر الطالب ${s.name} 👋، تواصل من إدارة السنتر`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 rounded-md bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 transition"
                            title="واتساب ولي الأمر"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                          <span className="font-mono text-xs font-bold text-amber-300 dir-ltr">{s.parentPhone}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-[#64748B]">غير مسجل</span>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <span className="font-mono text-[10px] font-bold text-[#7F91AA]">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-EG") : "—"}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2">
                      <span
                        className={`inline-flex h-6 items-center justify-center gap-1 rounded-md px-2 text-[10px] font-extrabold ${
                          s.paymentStatus === "paid"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : s.paymentStatus === "pending_review"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-[#0B1424] text-[#7F91AA] border border-[#26364D]"
                        }`}
                      >
                        {s.paymentStatus === "paid" ? "مدفوع" : s.paymentStatus === "pending_review" ? "مراجعة" : "مجاني"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="border-b border-[#26364D]/55 px-3 py-2 text-left">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[10px] font-extrabold text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1"
                          title="تعديل السنتر والموعد وبيانات ولي الأمر"
                        >
                          <Edit2 className="h-3 w-3" /> تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveDrawerStudent(s)}
                          className="rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-2 py-1 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
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

      {/* 5. Quick Edit Booking Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-[#0F172A] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تعديل وتحديد حجز السنتر</h3>
                  <p className="text-xs text-emerald-400 font-bold">{editingStudent.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-[#7F91AA] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs font-bold">
              {/* Center Selection */}
              <div className="space-y-1.5">
                <label className="text-[#94A3B8] block">📍 السنتر المختار:</label>
                <select
                  value={editFormData.centerName}
                  onChange={(e) => setEditFormData({ ...editFormData, centerName: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
                <label className="text-[#94A3B8] block">⏰ الموعد المحدد للحضور:</label>
                <select
                  value={editFormData.appointmentSlot}
                  onChange={(e) => setEditFormData({ ...editFormData, appointmentSlot: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                >
                  {OFFICIAL_SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Parent Phone */}
              <div className="space-y-1.5">
                <label className="text-[#94A3B8] block">👨‍👩‍👦 رقم هاتف ولي الأمر:</label>
                <input
                  type="text"
                  value={editFormData.parentPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                  placeholder="مثال: 01012345678"
                  className="h-11 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs text-white dir-ltr text-right focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[#94A3B8] block">🏫 اسم المدرسة:</label>
                <input
                  type="text"
                  value={editFormData.schoolName}
                  onChange={(e) => setEditFormData({ ...editFormData, schoolName: e.target.value })}
                  placeholder="مثال: مدرسة السادات الثانوية بنين"
                  className="h-11 w-full rounded-xl border border-[#26364D] bg-[#0B1424] px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26364D]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  className="h-10 px-4 rounded-xl border-[#26364D] bg-[#0B1424] text-white hover:bg-white/5 text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5"
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
