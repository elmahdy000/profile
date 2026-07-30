import React, { useState } from "react";
import {
  Search,
  MessageCircle,
  UserCheck,
  UserX,
  RefreshCw,
  Trash2,
  Check,
  Copy,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Student as PlatformStudent } from "@/types/platform";

export type Student = PlatformStudent & {
  accessCode?: string | null;
  deviceId?: string | null;
  maxDevices?: number;
  boundDevices?: string[];
  enrolledCategories?: string[];
  grade?: string | null;
};

export type PaymentReceipt = {
  id: number;
  status: string;
  createdAt: string;
  studentId: number;
  studentName: string;
  studentPhone?: string;
  phone?: string;
  accessCode?: string | null;
};

export type RecoveryRequest = {
  id: number;
  status: string;
  createdAt: string;
  studentId: number;
  studentName?: string;
  name?: string;
  phone: string;
  accessCode?: string | null;
};

type Props = {
  role?: "superadmin" | "subadmin";
  students: Student[];
  recoveryRequests: RecoveryRequest[];
  paymentReceipts: PaymentReceipt[];
  studentStages: string[];
  learningCourses: Array<{ id: number; title: string; category: string }>;
  onUpdateStatus: (id: number, status: string) => Promise<void>;
  onUpdateMode: (student: Student, mode: "online" | "offline") => Promise<void>;
  onUpdatePaymentStatus: (student: Student, paymentStatus: string) => Promise<void>;
  onDeleteStudent: (id: number) => Promise<void>;
  onSetMaxDevices: (student: Student) => Promise<void>;
  onResetDevice: (student: Student) => Promise<void>;
  onCopyStudentCode: (student: Student) => void;
  copiedStudentId: number | null;
  onNavigateToReports: () => void;
  onApproveReceipt: (receiptId: number) => Promise<void>;
};

function Status({ status }: { status: string }) {
  const meta: Record<string, [string, string]> = {
    approved: ["معتمد", "bg-emerald-500/10 text-emerald-700 border-emerald-200"],
    pending: ["قيد المراجعة", "bg-amber-500/10 text-amber-700 border-amber-300"],
    suspended: ["موقوف", "bg-red-500/10 text-red-700 border-red-200"],
  };
  const [label, cls] = meta[status] || ["غير محدد", "bg-muted text-muted-foreground"];
  return <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold border ${cls}`}>{label}</span>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
      <p className="text-sm font-semibold">{text}</p>
    </div>
  );
}

export function StudentsTab({
  role = "superadmin",
  students,
  recoveryRequests,
  paymentReceipts,
  studentStages,
  onUpdateStatus,
  onUpdateMode,
  onUpdatePaymentStatus,
  onDeleteStudent,
  onSetMaxDevices,
  onResetDevice,
  onCopyStudentCode,
  copiedStudentId,
  onNavigateToReports,
  onApproveReceipt,
}: Props) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [studentStageFilter, setStudentStageFilter] = useState("all");
  const [studentPaymentFilter, setStudentPaymentFilter] = useState("all");
  const [studentSortBy, setStudentSortBy] = useState<"newest" | "oldest" | "name">("newest");

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        !studentSearch ||
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.phone.includes(studentSearch) ||
        (s.accessCode && s.accessCode.toLowerCase().includes(studentSearch.toLowerCase()));
      const matchesStatus = studentStatusFilter === "all" || s.status === studentStatusFilter;
      const matchesStage = studentStageFilter === "all" || s.grade === studentStageFilter;
      const matchesPayment = studentPaymentFilter === "all" || (s.paymentStatus || "unpaid") === studentPaymentFilter;
      return matchesSearch && matchesStatus && matchesStage && matchesPayment;
    })
    .sort((a, b) => {
      if (studentSortBy === "name") {
        return a.name.localeCompare(b.name, "ar");
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return studentSortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

  return (
    <div className="space-y-4">
      {/* Pending Code Recovery Requests Alert Banner */}
      {recoveryRequests.filter((r) => r.status === "pending").length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white font-black text-sm">
                {recoveryRequests.filter((r) => r.status === "pending").length}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-amber-900">طلبات استرجاع كود معلقة</h4>
                <p className="text-xs font-medium text-amber-700 mt-0.5">يوجد طلبات نسيان كود تحتاج لإرسال الكود للطلاب عبر الواتساب.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToReports}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs shrink-0"
            >
              <MessageCircle className="h-4 w-4" /> عرض ومعالجة الطلبات
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:grid-cols-2 lg:grid-cols-5 items-center">
        <label className="relative sm:col-span-2 lg:col-span-1 flex items-center">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو الكود..."
            className="input-admin !pr-10"
          />
        </label>
        <select value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)} className="input-admin">
          <option value="all">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">معتمد</option>
          <option value="suspended">موقوف</option>
        </select>
        <select value={studentPaymentFilter} onChange={(e) => setStudentPaymentFilter(e.target.value)} className="input-admin">
          <option value="all">كل حالات الدفع</option>
          <option value="paid">دفع مكتمل</option>
          <option value="pending_review">دفع قيد المراجعة</option>
          <option value="unpaid">لم يدفع</option>
        </select>
        <select value={studentStageFilter} onChange={(e) => setStudentStageFilter(e.target.value)} className="input-admin">
          <option value="all">كل المراحل</option>
          {studentStages.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
        <select value={studentSortBy} onChange={(e) => setStudentSortBy(e.target.value as any)} className="input-admin font-bold text-blue-700 border-blue-200 bg-blue-50/50">
          <option value="newest">ترتيب: الأحدث انضماماً</option>
          <option value="oldest">ترتيب: الأقدم انضماماً</option>
          <option value="name">ترتيب: أبجدي حسب الاسم</option>
        </select>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>عرض {filteredStudents.length} من {students.length} طالب</span>
        {(studentSearch || studentStatusFilter !== "all" || studentStageFilter !== "all" || studentPaymentFilter !== "all") && (
          <button
            type="button"
            className="font-bold text-primary"
            onClick={() => {
              setStudentSearch("");
              setStudentStatusFilter("all");
              setStudentStageFilter("all");
              setStudentPaymentFilter("all");
            }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {filteredStudents.length === 0 ? (
        <Empty text={students.length ? "لا توجد نتائج مطابقة للفلاتر" : "لا توجد طلبات تسجيل بعد"} />
      ) : (
        filteredStudents.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-5"
          >
            {/* Header Row: Avatar, Name & Info, Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b">
              {/* Left Block: Avatar & Student Details */}
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg shadow-xs">
                  {s.name ? s.name.charAt(0) : "ط"}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{s.name}</h3>
                    <Status status={s.status} />
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                        s.paymentStatus === "paid"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                          : s.paymentStatus === "pending_review"
                          ? "bg-amber-500/10 text-amber-700 border border-amber-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {s.paymentStatus === "paid"
                        ? "💳 اشتراك مدفوع"
                        : s.paymentStatus === "pending_review"
                        ? "⏳ إيصال قيد المراجعة"
                        : "🆓 مشاهدة مجانية (أول 2)"}
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                        (s.maxDevices || 1) === 2
                          ? "bg-purple-500/10 text-purple-700 border border-purple-200"
                          : s.deviceId || (s.boundDevices && s.boundDevices.length > 0)
                          ? "bg-amber-500/10 text-amber-700 border border-amber-200"
                          : "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {(s.maxDevices || 1) === 2
                        ? `📱📱 مسموح جهازين (${s.boundDevices?.length || (s.deviceId ? 1 : 0)}/2)`
                        : s.deviceId || (s.boundDevices && s.boundDevices.length > 0)
                        ? "📱 جهاز واحد مقترن"
                        : "🔓 بدون قفل جهاز"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground dir-ltr">{s.phone}</span>
                    {s.email && <span>· {s.email}</span>}
                    {s.governorate && <span>· المحافظة: <strong className="text-foreground">{s.governorate}</strong></span>}
                    {s.city && <span>· المدينة: <strong className="text-foreground">{s.city}</strong></span>}
                    {s.grade && (
                      <span>· المرحلة: <strong className="text-foreground">{s.grade === "أخرى" ? s.otherGradeDetail || "أخرى" : s.grade}</strong></span>
                    )}
                    {s.createdAt && (
                      <span className="text-[#1769FF] font-bold">
                        · الانضمام: {new Date(s.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })} الساعة {new Date(s.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    )}
                  </div>

                  {s.accessCode && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onCopyStudentCode(s)}
                        title="اضغط لنسخ كود الطالب"
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 font-mono text-xs transition ${
                          copiedStudentId === s.id ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {copiedStudentId === s.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span className="tracking-widest font-black">{s.accessCode}</span>
                        <span className="font-sans text-[11px] text-muted-foreground">{copiedStudentId === s.id ? "تم النسخ" : "نسخ الكود"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Block: Action Buttons Grid */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {s.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(s.id, "approved")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                  >
                    <UserCheck className="h-4 w-4 me-1.5" /> قبول وإصدار كود
                  </Button>
                )}
                {s.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() => onUpdateStatus(s.id, "suspended")}
                  >
                    <UserX className="h-4 w-4 me-1.5" /> إيقاف الطالب
                  </Button>
                )}
                {s.status === "suspended" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                    onClick={() => onUpdateStatus(s.id, "approved")}
                  >
                    <UserCheck className="h-4 w-4 me-1.5" /> إعادة تفعيل
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className={(s.maxDevices || 1) === 2 ? "border-purple-300 text-purple-800 bg-purple-50/80 hover:bg-purple-100 font-semibold" : "border-slate-300 text-slate-700 hover:bg-slate-50"}
                  onClick={() => onSetMaxDevices(s)}
                >
                  {(s.maxDevices || 1) === 2 ? "📱📱 مسموح جهازين (إلغاء)" : "📱 السماح بجهاز ثانٍ"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!s.deviceId && (!s.boundDevices || s.boundDevices.length === 0)}
                  className={s.deviceId || (s.boundDevices && s.boundDevices.length > 0) ? "border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100" : "opacity-50"}
                  onClick={() => onResetDevice(s)}
                >
                  <RefreshCw className="h-3.5 w-3.5 me-1.5" /> {s.deviceId || (s.boundDevices && s.boundDevices.length > 0) ? "فك قفل الأجهزة" : "بدون أجهزة"}
                </Button>
                {role === "superadmin" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    title="حذف الطالب"
                    onClick={() => onDeleteStudent(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 me-1" /> حذف
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm">نظام حضور الطالب</strong>
                  <p className="text-xs text-muted-foreground">الطالب هيشوف فيديوهات النظام المحدد بس.</p>
                </div>
                <select
                  value={s.learningMode || "online"}
                  onChange={(e) => onUpdateMode(s, e.target.value as "online" | "offline")}
                  className="input-admin text-xs font-semibold sm:w-44"
                >
                  <option value="online">أونلاين</option>
                  <option value="offline">أوفلاين</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm">حالة الاشتراك والدفع 💳</strong>
                  <p className="text-xs text-muted-foreground">تحويل الطالب لمشترك مدفوع لفتح جميع الفيديوهات.</p>
                </div>
                <select
                  value={s.paymentStatus || "unpaid"}
                  onChange={(e) => onUpdatePaymentStatus(s, e.target.value)}
                  className={`input-admin text-xs font-semibold sm:w-48 ${
                    s.paymentStatus === "paid"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : s.paymentStatus === "pending_review"
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-slate-300"
                  }`}
                >
                  <option value="unpaid">مشاهدة مجانية (أول 2)</option>
                  <option value="pending_review">إيصال قيد المراجعة</option>
                  <option value="paid">اشتراك مدفوع (فتح الكل)</option>
                </select>
              </div>
            </div>

            {/* Receipt Image Display under Student if available */}
            {(() => {
              const receipt = paymentReceipts.find((r) => r.studentId === s.id);
              if (!receipt) return null;
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      إيصال الدفع المرفوع بواسطة الطالب ({new Date(receipt.createdAt).toLocaleDateString("ar-EG")})
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/admin/payment-receipts/${receipt.id}/image`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> عرض الإيصال
                      </a>
                      {receipt.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => onApproveReceipt(receipt.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs"
                        >
                          تأكيد وتفعيل الاشتراك
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </article>
        ))
      )}
    </div>
  );
}
