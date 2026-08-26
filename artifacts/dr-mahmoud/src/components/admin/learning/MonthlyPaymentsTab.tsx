import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Bell,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PaymentStudent {
  id: number;
  name: string;
  phone: string;
  grade: string;
  paymentStatus: string;
  subscriptionStatus: string | null;
  subscriptionStartDate: string | null;
  lastActiveAt: string | null;
  approvedAt: string | null;
  daysElapsed: number;
  daysRemaining: number;
  isExpiringSoon: boolean;
}

type FilterType = "all" | "paid" | "expiring_soon" | "unpaid" | "pending_review";

function statusBadge(student: PaymentStudent) {
  if (student.paymentStatus === "paid") {
    if (student.isExpiringSoon) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-300 animate-pulse">
          <AlertTriangle className="h-3 w-3" /> متبقي {student.daysRemaining} {student.daysRemaining === 1 ? "يوم" : "أيام"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> مدفوع (متبقي {student.daysRemaining} يوم)
      </span>
    );
  }
  if (student.paymentStatus === "pending_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
        <Clock className="h-3 w-3" /> إيصال قيد المراجعة
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
      <XCircle className="h-3 w-3" /> باقة مجانية (لم يدفع)
    </span>
  );
}

export function MonthlyPaymentsTab() {
  const { toast } = useToast();
  const [students, setStudents] = useState<PaymentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<Set<number>>(new Set());
  const [notifying, setNotifying] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل الطلاب");
      const data: any[] = await res.json();
      const now = Date.now();
      const mapped: PaymentStudent[] = data
        .filter((s) => s.status === "approved")
        .map((s) => {
          const startDate = s.subscriptionStartDate || s.approvedAt || s.createdAt;
          const startMs = startDate ? new Date(startDate).getTime() : now;
          const daysElapsed = Math.round((now - startMs) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, 30 - daysElapsed);
          const paymentStatus = s.paymentStatus || "unpaid";
          const isExpiringSoon = paymentStatus === "paid" && daysRemaining <= 5;
          return {
            id: s.id,
            name: s.name,
            phone: s.phone || "",
            grade: s.grade || "",
            paymentStatus,
            subscriptionStatus: s.subscriptionStatus || null,
            subscriptionStartDate: startDate || null,
            lastActiveAt: s.lastActiveAt || null,
            approvedAt: s.approvedAt || null,
            daysElapsed,
            daysRemaining,
            isExpiringSoon,
          };
        });
      setStudents(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePayment = async (studentId: number, newStatus: "paid" | "unpaid") => {
    setUpdating((prev) => new Set(prev).add(studentId));
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (!res.ok) throw new Error("فشل تحديث حالة الدفع");
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, paymentStatus: newStatus } : s))
      );
      toast({
        title: newStatus === "paid" ? "تم تأكيد الدفع وتجديد الاشتراك 30 يوماً ✅" : "تم تحويل الطالب للباقة المجانية",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: (e as Error).message });
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  // Reset ALL students to unpaid (start of new month)
  const resetAllToUnpaid = async () => {
    if (!window.confirm("هل أنت متأكد؟ سيتم تحويل حالة دفع جميع الطلاب إلى 'لم يدفع' لبداية الشهر الجديد.")) return;
    setResettingAll(true);
    try {
      const paidStudents = students.filter((s) => s.paymentStatus === "paid");
      for (const s of paidStudents) {
        await fetch(`/api/admin/students/${s.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "unpaid" }),
        });
      }
      await load();
      toast({
        title: `تم تحويل ${paidStudents.length} طالب إلى 'لم يدفع' بنجاح ✅`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: (e as Error).message });
    } finally {
      setResettingAll(false);
    }
  };

  // Notify unpaid or expiring soon students
  const notifyStudentsGroup = async (targetGroup: "unpaid" | "expiring_soon") => {
    const targetStudents = targetGroup === "expiring_soon"
      ? students.filter((s) => s.isExpiringSoon)
      : students.filter((s) => s.paymentStatus === "unpaid");

    if (targetStudents.length === 0) {
      toast({ title: targetGroup === "expiring_soon" ? "لا يوجد طلاب أوشكت اشتراكاتهم على الانتهاء" : "لا يوجد طلاب غير مدفوعين" });
      return;
    }
    const confirmMsg = targetGroup === "expiring_soon"
      ? `هل تريد إرسال إشعار تذكير لـ ${targetStudents.length} طالب أوشك اشتراكهم الشهري على الانتهاء خلال 5 أيام؟`
      : `هل تريد إرسال إشعار تذكير لـ ${targetStudents.length} طالب في الباقة المجانية؟`;

    if (!window.confirm(confirmMsg)) return;
    setNotifying(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: targetStudents.map((s) => s.id),
          type: "warning",
          title: targetGroup === "expiring_soon" ? "تذكير: قرب موعد تجديد الاشتراك الشهري ⏳" : "تذكير: يرجى تجديد الاشتراك الشهري 💳",
          message: targetGroup === "expiring_soon"
            ? "عزيزي الطالب، يرجى العلم أن اشتراكك الشهري ينتهي خلال أيام قليلة. يرجى دفع الاشتراك ورفع الإيصال لضمان عدم توقف الفيديوهات والمذكرات."
            : "عزيزي الطالب، لم يتم تسجيل دفعة الاشتراك لهذا الشهر. يرجى سداد المبلغ المطلوب ورفع إيصال الدفع من خلال المنصة للاستمرار في الوصول للمحتوى.",
        }),
      });
      const data = await res.json();
      toast({
        title: data.message || `تم إرسال الإشعار لـ ${targetStudents.length} طالب 🎉`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: (e as Error).message });
    } finally {
      setNotifying(false);
    }
  };

  const filtered = students
    .filter((s) => {
      if (filter === "paid" && s.paymentStatus !== "paid") return false;
      if (filter === "expiring_soon" && !s.isExpiringSoon) return false;
      if (filter === "unpaid" && s.paymentStatus !== "unpaid") return false;
      if (filter === "pending_review" && s.paymentStatus !== "pending_review") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.phone.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "ar");
      return sortAsc ? cmp : -cmp;
    });

  const stats = {
    total: students.length,
    paid: students.filter((s) => s.paymentStatus === "paid").length,
    expiringSoon: students.filter((s) => s.isExpiringSoon).length,
    unpaid: students.filter((s) => s.paymentStatus === "unpaid").length,
    pending: students.filter((s) => s.paymentStatus === "pending_review").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">الاشتراكات والمدفوعات الشهرية</h2>
          <p className="text-sm text-slate-500 mt-0.5">متابعة دقيقة لكل طالب — تجديد 30 يوماً وقفل أوتوماتيكي عند الانتهاء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void notifyStudentsGroup("expiring_soon")}
            disabled={notifying || stats.expiringSoon === 0}
            className="gap-1.5 text-xs border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            تذكير القريب انتهائهم ({stats.expiringSoon})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void notifyStudentsGroup("unpaid")}
            disabled={notifying || stats.unpaid === 0}
            className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {notifying ? "جاري الإرسال..." : `إشعار الغير مدفوعين (${stats.unpaid})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void resetAllToUnpaid()}
            disabled={resettingAll}
            className="gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {resettingAll ? "جاري الإعادة..." : "تصفير الشهر للكل"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border bg-slate-50 border-slate-200 p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-1.5 text-slate-600" />
          <p className="text-2xl font-black text-slate-700">{stats.total}</p>
          <p className="text-xs font-medium text-slate-600 mt-0.5">إجمالي الطلاب</p>
        </div>
        <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-emerald-600" />
          <p className="text-2xl font-black text-emerald-700">{stats.paid}</p>
          <p className="text-xs font-medium text-emerald-600 mt-0.5">اشتراك نشط (ساري)</p>
        </div>
        <div className="rounded-2xl border bg-amber-50 border-amber-300 p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1.5 text-amber-600" />
          <p className="text-2xl font-black text-amber-700">{stats.expiringSoon}</p>
          <p className="text-xs font-medium text-amber-700 mt-0.5">ينتهي قريباً (≤5 أيام)</p>
        </div>
        <div className="rounded-2xl border bg-rose-50 border-rose-200 p-4 text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1.5 text-rose-600" />
          <p className="text-2xl font-black text-rose-700">{stats.unpaid}</p>
          <p className="text-xs font-medium text-rose-600 mt-0.5">باقة مجانية (لم يدفع)</p>
        </div>
        <div className="rounded-2xl border bg-blue-50 border-blue-200 p-4 text-center col-span-2 sm:col-span-1">
          <Clock className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
          <p className="text-2xl font-black text-blue-700">{stats.pending}</p>
          <p className="text-xs font-medium text-blue-600 mt-0.5">إيصال للمراجعة</p>
        </div>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm font-semibold mb-2">
            <span className="text-slate-600">نسبة التفعيل والدفع المباشر</span>
            <span className="text-emerald-700">
              {Math.round((stats.paid / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(stats.paid / stats.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الطالب أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({stats.total})
          </button>
          <button
            onClick={() => setFilter("paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === "paid"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            اشتراك ساري ({stats.paid})
          </button>
          <button
            onClick={() => setFilter("expiring_soon")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === "expiring_soon"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            ينتهي قريباً ⚠️ ({stats.expiringSoon})
          </button>
          <button
            onClick={() => setFilter("unpaid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === "unpaid"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            مجاني ({stats.unpaid})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => setSortAsc((v) => !v)}
                >
                  <div className="flex items-center gap-1">
                    الطالب
                    {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>
                </th>
                <th className="px-4 py-3">الهاتف</th>
                <th className="px-4 py-3">المرحلة</th>
                <th className="px-4 py-3">حالة الاشتراك الشهري</th>
                <th className="px-4 py-3 text-center">الإجراءات والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    لا يوجد طلاب يطابقون خيارات البحث أو الفلترة.
                  </td>
                </tr>
              ) : (
                filtered.map((student, idx) => {
                  const isUpdating = updating.has(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dir-ltr text-right">
                        {student.phone}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={student.grade}>
                        {student.grade || "غير محدد"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(student)}</td>
                      <td className="px-4 py-3 text-center">
                        {student.paymentStatus === "paid" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdating}
                            onClick={() => void updatePayment(student.id, "unpaid")}
                            className="h-8 px-3 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl"
                          >
                            <XCircle className="h-3.5 w-3.5 ml-1" />
                            {isUpdating ? "جاري التغيير..." : "تحويل للباقة المجانية"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => void updatePayment(student.id, "paid")}
                            className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                            {isUpdating ? "جاري التفعيل..." : "تأكيد دفع الشهر (30 يوماً) ✅"}
                          </Button>
                        )}
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
}
