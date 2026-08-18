import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  UserX,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  BookOpen,
  Calendar,
  Smartphone,
  Eye,
  Trash2,
  MoreVertical,
  Activity,
  Award,
  FileText,
  ShieldCheck,
  Clock,
  Send,
  Plus,
  MessageCircle,
  Edit2,
  Building2,
  School,
  Save,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Student as PlatformStudent } from "@/types/platform";
import type { PaymentReceipt } from "./PaymentReceiptsPanel";
import { AdminConfirmDialog } from "../dashboard/AdminConfirmDialog";

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

export type ExtendedStudent = PlatformStudent & {
  accessCode?: string | null;
  deviceId?: string | null;
  maxDevices?: number;
  boundDevices?: string[];
  enrolledCategories?: string[];
  enrolledCourseIds?: number[];
  email?: string | null;
  governorate?: string | null;
  city?: string | null;
  otherGradeDetail?: string | null;
  learningMode?: "online" | "offline";
  createdAt?: string;
  school_name?: string | null;
  parent_phone?: string | null;
  center_name?: string | null;
  appointment_slot?: string | null;
  language_track?: string | null;
};

interface StudentDrawerProps {
  student: ExtendedStudent | null;
  isOpen: boolean;
  onClose: () => void;
  role?: "superadmin" | "subadmin";
  paymentReceipts?: PaymentReceipt[];
  learningCourses?: Array<{ id: number; title: string }>;
  onUpdateStatus?: (id: number, status: "pending" | "approved" | "suspended") => void;
  onUpdatePaymentStatus?: (student: ExtendedStudent, status: string) => void;
  onUpdateMode?: (student: ExtendedStudent, mode: "online" | "offline") => void;
  onResetDevice?: (student: ExtendedStudent) => void;
  onSetMaxDevices?: (student: ExtendedStudent) => void;
  onDeleteStudent?: (id: number) => void;
  onUpdateStudentCourses?: (student: ExtendedStudent, courseIds: number[]) => void;
  onApproveReceipt?: (receiptId: number) => void;
  onSendNotificationToStudent?: (student: ExtendedStudent) => void;
}

export function StudentDrawer({
  student,
  isOpen,
  onClose,
  role = "superadmin",
  paymentReceipts = [],
  learningCourses = [],
  onUpdateStatus,
  onUpdatePaymentStatus,
  onUpdateMode,
  onResetDevice,
  onSetMaxDevices,
  onDeleteStudent,
  onUpdateStudentCourses,
  onApproveReceipt,
  onSendNotificationToStudent,
}: StudentDrawerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "courses" | "attendance" | "quizzes" | "files" | "security">("overview");
  const [copied, setCopied] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [localStudent, setLocalStudent] = useState<ExtendedStudent | null>(student);

  // Edit center booking modal state
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [editFormData, setEditFormData] = useState({
    centerName: "",
    appointmentSlot: "",
    schoolName: "",
    parentPhone: "",
    languageTrack: "عربي",
    learningMode: "offline" as "online" | "offline",
  });

  // Action Confirmation Dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info";
    action: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "info",
    action: () => {},
  });

  useEffect(() => {
    setLocalStudent(student);
    if (student) {
      setActiveTab("overview");
      setShowMoreActions(false);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const currentStudent = localStudent || student;
  const receipt = paymentReceipts.find((r) => r.studentId === currentStudent.id);

  const rawSchool = currentStudent.schoolName || currentStudent.school_name || "";
  const resolvedSchoolName = (rawSchool && rawSchool !== "arabic" && rawSchool !== "languages") ? rawSchool : "";
  const resolvedParentPhone = currentStudent.parentPhone || currentStudent.parent_phone || "";
  const resolvedCenterName = currentStudent.centerName || currentStudent.center_name || "";
  const resolvedAppointmentSlot = currentStudent.appointmentSlot || currentStudent.appointment_slot || "";
  const rawTrack = currentStudent.languageTrack || currentStudent.language_track || currentStudent.academicTrack || "";
  const resolvedLanguageTrack = rawTrack === "general" || rawTrack === "arabic" || !rawTrack ? "عربي (عام)" : rawTrack === "languages" ? "لغات (إنجليزي)" : rawTrack;

  const handleOpenEditBooking = () => {
    setEditFormData({
      centerName: resolvedCenterName || OFFICIAL_CENTERS[0].name,
      appointmentSlot: resolvedAppointmentSlot || OFFICIAL_SLOTS[0],
      schoolName: resolvedSchoolName,
      parentPhone: resolvedParentPhone,
      languageTrack: resolvedLanguageTrack,
      learningMode: currentStudent.learningMode === "offline" || resolvedCenterName ? "offline" : "online",
    });
    setIsEditingBooking(true);
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBooking(true);
    try {
      const res = await fetch(`/api/admin/students/${currentStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          centerName: editFormData.centerName.trim() || null,
          appointmentSlot: editFormData.appointmentSlot.trim() || null,
          parentPhone: editFormData.parentPhone.trim() || null,
          schoolName: editFormData.schoolName.trim() || null,
          languageTrack: editFormData.languageTrack.trim() || null,
          learningMode: editFormData.learningMode,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل حفظ بيانات حجز السنتر");
      }

      const updated = await res.json();
      setLocalStudent((prev) => (prev ? { ...prev, ...updated } : updated));
      toast({
        title: "تم تحديث بيانات السنتر والمدرسة بنجاح 📍",
        description: `تم ربط الطالب ${currentStudent.name} بـ ${editFormData.centerName || "السنتر المختار"}`,
      });
      setIsEditingBooking(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: err.message || "حدث خطأ أثناء حفظ التحديث",
      });
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleCopyCode = () => {
    if (currentStudent.accessCode) {
      navigator.clipboard.writeText(currentStudent.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const triggerConfirm = (
    title: string,
    description: string,
    variant: "danger" | "warning" | "info",
    action: () => void
  ) => {
    setShowMoreActions(false);
    setConfirmState({
      isOpen: true,
      title,
      description,
      variant,
      action,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 lg:p-6">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

        {/* Drawer Panel */}
        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden border border-[#E2E8F0] bg-white text-[#0F172A] shadow-2xl sm:h-[calc(100vh-2rem)] sm:max-w-6xl sm:rounded-[28px] lg:h-[min(900px,calc(100vh-3rem))]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4 sm:px-7 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] text-xl font-bold text-[#2563EB]">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0F172A] sm:text-xl">{student.name}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${student.status === "approved" ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#10B981]" : student.status === "suspended" ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {student.status === "approved" ? "حساب نشط" : student.status === "suspended" ? "حساب موقوف" : "بانتظار التفعيل"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                  <span className="dir-ltr text-[#2563EB] font-mono font-semibold">{student.phone}</span>
                  {student.accessCode && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 rounded bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-mono text-[#2563EB] hover:bg-[#E2E8F0]"
                    >
                      {copied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                      <span>{student.accessCode}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق ملف الطالب"
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sub-Header Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              {student.status !== "approved" ? (
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus?.(student.id, "approved")}
                  className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold h-8 text-xs rounded-xl"
                >
                  <UserCheck className="h-3.5 w-3.5 ml-1.5" />
                  {student.status === "suspended" ? "إعادة تفعيل حساب الطالب" : "تفعيل وقبول الطالب"}
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 text-xs font-bold text-[#10B981]">
                  <Check className="h-3.5 w-3.5" /> حساب نشط ومعتمد
                </span>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onSendNotificationToStudent?.(student)}
                className="border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-white h-8 rounded-xl"
              >
                <Send className="h-3.5 w-3.5 ml-1.5 text-[#2563EB]" /> إشعار خاص
              </Button>

              {student.phone && (
                <a
                  href={`https://wa.me/${(student.phone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + student.phone.replace(/[^\d+]/g, "") : student.phone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ${student.name} 👋، تواصل من د. محمود المهدي`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] text-xs font-semibold h-8 px-3 rounded-xl transition-all"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#10B981]" /> تواصل واتساب
                </a>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetMaxDevices?.(student)}
                className="border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 h-8 rounded-xl"
              >
                <Smartphone className="h-3.5 w-3.5 ml-1.5" />
                {(student.maxDevices || 1) === 2 ? "إلغاء الجهاز الثاني" : "السماح بجهاز ثانٍ"}
              </Button>
            </div>

            {/* More Actions Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-white hover:text-[#0F172A]"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMoreActions && (
                <div className="absolute left-0 top-10 z-20 w-48 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl space-y-1">
                  {student.status === "approved" && (
                    <button
                      type="button"
                      onClick={() =>
                        triggerConfirm(
                          "إيقاف حساب الطالب",
                          `هل أنت متأكد من إيقاف حساب الطالب (${student.name})؟ لن يتمكن من مشاهدة الفيديوهات لحين إعادة التفعيل.`,
                          "warning",
                          () => onUpdateStatus?.(student.id, "suspended")
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      <UserX className="h-4 w-4" /> إيقاف الطالب
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      triggerConfirm(
                        "فك قفل الأجهزة",
                        `هل أنت متأكد من إلغاء اقتران الأجهزة الحالية للطالب (${student.name})؟ سيتمكن من التسجيل من جهاز جديد.`,
                        "info",
                        () => onResetDevice?.(student)
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F6F8FC]"
                  >
                    <RefreshCw className="h-4 w-4 text-[#2563EB]" /> فك قفل الجهاز
                  </button>

                  {(role === "superadmin" || role === "subadmin") && (
                    <button
                      type="button"
                      onClick={() =>
                        triggerConfirm(
                          "حذف الطالب نهائياً",
                          `تحذير: هل أنت متأكد من حذف الطالب (${student.name}) نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.`,
                          "danger",
                          () => {
                            onDeleteStudent?.(student.id);
                            onClose();
                          }
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> حذف حساب الطالب
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 scrollbar-none sm:px-7">
            {[
              { id: "overview", label: "نظرة عامة" },
              { id: "payments", label: "الاشتراكات والاشتراك 💳" },
              { id: "courses", label: "الكورسات والصلاحيات 📚" },
              { id: "attendance", label: "الحضور والدروس ⏱️" },
              { id: "quizzes", label: "الاختبارات والنتائج 📝" },
              { id: "files", label: "الملفات والمذكرة 📁" },
              { id: "security", label: "الأجهزة والجلسات 📱" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 bg-white">
            {activeTab === "overview" && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">بيانات الطالب الأساسية ورغبة الحجز</h3>
                      <p className="mt-1 text-[11px] text-[#64748B]">بيانات التسجيل وتأكيد السنتر والموعد والتواصل.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenEditBooking}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> تعديل بيانات الحجز
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">المرحلة التعليمية</span>
                      <p className="text-sm font-bold text-[#0F172A]">{currentStudent.grade === "أخرى" ? currentStudent.otherGradeDetail || currentStudent.grade : currentStudent.grade || "غير محدد"}</p>
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">اسم المدرسة</span>
                      {resolvedSchoolName ? (
                        <p className="text-xs font-bold text-[#0F172A]">{resolvedSchoolName}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenEditBooking}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          <Plus className="h-3 w-3" /> أضف اسم المدرسة
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">الشعبة والمسار</span>
                      <p className="text-xs font-bold text-purple-700">{resolvedLanguageTrack}</p>
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">تليفون ولي الأمر</span>
                      {resolvedParentPhone ? (
                        <p className="text-xs font-bold text-amber-800 dir-ltr text-right">{resolvedParentPhone}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenEditBooking}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                        >
                          <Plus className="h-3 w-3" /> أضف رقم ولي الأمر
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">السنتر المختار</span>
                      {resolvedCenterName ? (
                        <p className="text-xs font-bold text-[#10B981]">{resolvedCenterName}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenEditBooking}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#A7F3D0] bg-[#ECFDF5] px-2 py-1 text-xs font-bold text-[#10B981] hover:bg-[#D1FAE5]"
                        >
                          <Plus className="h-3.5 w-3.5" /> حدد السنتر الآن
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">الموعد المتاح</span>
                      {resolvedAppointmentSlot ? (
                        <p className="text-xs font-bold text-amber-800">{resolvedAppointmentSlot}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenEditBooking}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                        >
                          <Plus className="h-3.5 w-3.5" /> حدد موعد الحضور
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">نظام الحضور</span>
                      <p className="text-xs font-bold text-[#2563EB]">
                        {currentStudent.learningMode === "offline" || resolvedCenterName ? "أوفلاين (السنتر)" : "أونلاين بالكامل"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">المحافظة / المدينة</span>
                      <p className="text-xs font-bold text-[#0F172A]">
                        {currentStudent.governorate ? `${currentStudent.governorate} - ${currentStudent.city || ""}` : "الشرقية - الزقازيق"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
                      <span className="text-[11px] text-[#64748B]">تاريخ التسجيل</span>
                      <p className="text-xs font-semibold text-[#475569]">
                        {currentStudent.createdAt ? new Date(currentStudent.createdAt).toLocaleDateString("ar-EG") : "غير تواريخ"}
                      </p>
                    </div>
                  </div>

                  {receipt && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800">
                          إيصال دفع مرفوع بتاريخ {new Date(receipt.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                        <a
                          href={`/api/admin/payment-receipts/${receipt.id}/image`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-white px-3 py-1 text-xs font-bold text-[#2563EB] hover:bg-[#EFF6FF]"
                        >
                          <Eye className="h-3.5 w-3.5" /> معاينة الصورة
                        </a>
                      </div>
                    </div>
                  )}
                </section>

                <aside className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">ملخص الحساب</h3>
                    <p className="mt-1 text-[11px] text-[#64748B]">أهم الحالات والصلاحيات الحالية.</p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
                    {(() => {
                      const activeDevicesCount = Array.isArray(currentStudent.boundDevices) && currentStudent.boundDevices.length > 0
                        ? currentStudent.boundDevices.length
                        : (currentStudent.deviceId ? 1 : 0);
                      const maxAllowed = currentStudent.maxDevices || 2;
                      return [
                        ["حالة الاشتراك", currentStudent.paymentStatus === "paid" ? "مدفوع" : currentStudent.paymentStatus === "pending_review" ? "قيد المراجعة" : "مجاني"],
                        ["الكورسات المخصصة", (currentStudent.enrolledCourseIds?.length ?? 0) === 0 ? "كل كورسات المرحلة" : `${currentStudent.enrolledCourseIds?.length} كورس`],
                        ["الأجهزة النشطة / المسموحة", `${activeDevicesCount} من ${maxAllowed} جهاز`],
                        ["الهاتف", currentStudent.phone || "غير مسجل"],
                        ["كود الوصول", currentStudent.accessCode || "غير متاح"],
                      ].map(([label, value], index) => (
                        <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3.5 ${index ? "border-t border-[#E2E8F0]" : ""}`}>
                          <span className="text-[11px] font-semibold text-[#64748B]">{label}</span>
                          <strong className="max-w-[180px] truncate text-left text-xs text-[#0F172A]" title={value}>{value}</strong>
                        </div>
                      ));
                    })()}
                  </div>
                  <button type="button" onClick={() => setActiveTab("courses")} className="flex w-full items-center justify-between rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-right transition hover:bg-[#DBEAFE]">
                    <span><strong className="block text-xs text-[#2563EB]">إدارة كورسات الطالب</strong><small className="mt-1 block text-[10px] text-[#64748B]">عرض وتعديل صلاحيات الكورسات</small></span>
                    <BookOpen className="h-5 w-5 text-[#2563EB]" />
                  </button>
                </aside>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A]">حالة الاشتراك الحالية</span>
                    <p className="text-xs text-[#64748B]">حدد ما إذا كان الطالب مشترك مدفوع أو مجاني.</p>
                  </div>
                  <select
                    value={student.paymentStatus || "unpaid"}
                    onChange={(e) => onUpdatePaymentStatus?.(student, e.target.value)}
                    className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="unpaid">مشاهدة مجانية (أول كورسين)</option>
                    <option value="pending_review">إيصال قيد المراجعة</option>
                    <option value="paid">اشتراك مدفوع (فتح الكل)</option>
                  </select>
                </div>

                {receipt ? (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
                    <h4 className="text-xs font-bold text-[#0F172A]">إيصال الدفع البنكي / المحفظة الإلكترونية</h4>
                    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-2 text-center">
                      <img
                        src={`/api/admin/payment-receipts/${receipt.id}/image`}
                        alt="إيصال الدفع"
                        className="mx-auto max-h-[520px] rounded-lg object-contain"
                      />
                    </div>
                    {receipt.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => onApproveReceipt?.(receipt.id)}
                        className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold h-9 text-xs rounded-xl"
                      >
                        <UserCheck className="h-4 w-4 ml-1.5" /> تأكيد الإيصال وتفعيل الاشتراك
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]">
                    لم يقم الطالب برفع إيصال دفع إلكتروني حتى الآن.
                  </div>
                )}
              </div>
            )}

            {activeTab === "courses" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A]">الكورسات المتاحة للطالب بالظبط</h4>
                      <p className="text-[11px] text-[#64748B]">حدد الكورسات المسموح بها بشكل خاص لهذا الطالب.</p>
                    </div>
                    <span className="rounded-full bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-0.5 text-xs font-semibold text-[#2563EB]">
                      {(student.enrolledCourseIds?.length ?? 0) === 0 ? "كل كورسات المرحلة تلقائياً" : `${student.enrolledCourseIds?.length} كورس`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                    {learningCourses.map((c) => {
                      const isSelected = (student.enrolledCourseIds ?? []).includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const current = student.enrolledCourseIds ?? [];
                            const updated = isSelected
                              ? current.filter((id) => id !== c.id)
                              : [...current, c.id];
                            onUpdateStudentCourses?.(student, updated);
                          }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${
                            isSelected
                              ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                              : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#BFDBFE]"
                          }`}
                        >
                          <span className="dir-ltr text-right">{c.title}</span>
                          <span className={`h-4 w-4 rounded flex items-center justify-center border ${isSelected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#CBD5E1]"}`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#64748B]">
                متابعة الدروس المشاهدة ونسبة الحضور الأسبوعي متاحة للطالب عبر منصة المتابعة الحية.
              </div>
            )}

            {activeTab === "quizzes" && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#64748B]">
                نتائج ومحاولات الاختبارات التقييمية المسجلة باسم الطالب.
              </div>
            )}

            {activeTab === "files" && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#64748B]">
                المذكرات والملفات المحملة بواسطة الطالب.
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">معرف الجهاز المقترن (Device Lock)</h4>
                    <p className="text-xs text-[#64748B] font-mono dir-ltr pt-1">
                      {student.deviceId || student.boundDevices?.[0] || "لا يوجد جهاز مقترن حالياً"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResetDevice?.(student)}
                    className="border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F6F8FC]"
                  >
                    <RefreshCw className="h-3.5 w-3.5 ml-1 text-[#2563EB]" /> فك القفل
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Safeguard Modal */}
      <AdminConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        studentName={student.name}
        variant={confirmState.variant}
        onConfirm={() => {
          confirmState.action();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Edit Center Booking & School Details Modal */}
      {isEditingBooking && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 text-right shadow-2xl space-y-4 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Building2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-base font-bold">تعديل بيانات حجز السنتر والمدرسة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBooking(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs font-semibold">
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-[#0F172A]">
                <span className="text-[#64748B] text-[11px] block">اسم الطالب:</span>
                <strong className="text-sm font-bold text-[#0F172A]">{currentStudent.name}</strong>
                <span className="text-[#64748B] text-[11px] mr-2">({currentStudent.phone})</span>
              </div>

              {/* Learning Mode */}
              <div className="space-y-1.5">
                <label className="block text-[#475569]">نظام الحضور والدراسة</label>
                <select
                  value={editFormData.learningMode}
                  onChange={(e) => setEditFormData({ ...editFormData, learningMode: e.target.value as any })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  <option value="offline">أوفلاين (حضور بالسنتر بالزقازيق)</option>
                  <option value="online">أونلاين بالكامل عبر المنصة</option>
                </select>
              </div>

              {/* Center Name */}
              <div className="space-y-1.5">
                <label className="block text-[#475569]">السنتر المختار بالزقازيق</label>
                <select
                  value={editFormData.centerName}
                  onChange={(e) => setEditFormData({ ...editFormData, centerName: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] outline-none focus:border-[#2563EB] font-bold"
                >
                  <option value="">-- بدون سنتر محدد --</option>
                  {OFFICIAL_CENTERS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment Slot */}
              <div className="space-y-1.5">
                <label className="block text-[#475569]">موعد المجموعة المتاح</label>
                <select
                  value={editFormData.appointmentSlot}
                  onChange={(e) => setEditFormData({ ...editFormData, appointmentSlot: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  <option value="">-- بدون موعد محدد --</option>
                  {OFFICIAL_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* School Name & Parent Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[#475569]">اسم المدرسة</label>
                  <input
                    type="text"
                    value={editFormData.schoolName}
                    onChange={(e) => setEditFormData({ ...editFormData, schoolName: e.target.value })}
                    placeholder="مثال: مدرسة السادات الثانوية"
                    className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[#475569]">رقم ولي الأمر</label>
                  <input
                    type="tel"
                    value={editFormData.parentPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                    className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] font-mono text-left outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Language Track */}
              <div className="space-y-1.5">
                <label className="block text-[#475569]">الشعبة / المسار اللغوي</label>
                <select
                  value={editFormData.languageTrack}
                  onChange={(e) => setEditFormData({ ...editFormData, languageTrack: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  <option value="عربي">عربي (عام)</option>
                  <option value="لغات (إنجليزي)">لغات (إنجليزي)</option>
                  <option value="لغات (فرنسي)">لغات (فرنسي)</option>
                  <option value="علمي علوم">علمي علوم</option>
                  <option value="علمي رياضة">علمي رياضة</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingBooking(false)}
                  className="border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F6F8FC]"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingBooking}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white min-w-[120px]"
                >
                  {isSavingBooking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-1.5" /> حفظ البيانات
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
