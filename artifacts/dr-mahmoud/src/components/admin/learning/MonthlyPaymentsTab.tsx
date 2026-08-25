import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Bell,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentStudent {
  id: number;
  name: string;
  phone: string;
  grade: string;
  paymentStatus: string;
  subscriptionStatus: string | null;
  lastActiveAt: string | null;
  approvedAt: string | null;
}

type FilterType = "all" | "paid" | "unpaid" | "pending_review";

function statusBadge(status: string) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> مدفوع
      </span>
    );
  if (status === "pending_review")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> قيد المراجعة
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
      <XCircle className="h-3 w-3" /> لم يدفع
    </span>
  );
}

export function MonthlyPaymentsTab() {
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
      const mapped: PaymentStudent[] = data
        .filter((s) => s.status === "approved")
        .map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone || "",
          grade: s.grade || "",
          paymentStatus: s.paymentStatus || "unpaid",
          subscriptionStatus: s.subscriptionStatus || null,
          lastActiveAt: s.lastActiveAt || null,
          approvedAt: s.approvedAt || null,
        }));
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
    } catch (e) {
      alert((e as Error).message);
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
    if (!confirm("هل أنت متأكد؟ سيتم تحويل حالة دفع جميع الطلاب إلى 'لم يدفع' لبداية الشهر الجديد.")) return;
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
      alert(`تم تحويل ${paidStudents.length} طالب إلى 'لم يدفع' بنجاح ✅`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setResettingAll(false);
    }
  };

  // Notify unpaid students
  const notifyUnpaid = async () => {
    const unpaidStudents = students.filter((s) => s.paymentStatus === "unpaid");
    if (unpaidStudents.length === 0) { alert("لا يوجد طلاب غير مدفوعين"); return; }
    if (!confirm(`هل تريد إرسال إشعار تذكير لـ ${unpaidStudents.length} طالب لم يدفعوا؟`)) return;
    setNotifying(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: unpaidStudents.map((s) => s.id),
          type: "warning",
          title: "تذكير: لم يتم تسجيل دفعة هذا الشهر",
          message: "عزيزي الطالب، لم يتم تسجيل دفعة الاشتراك لهذا الشهر. يرجى سداد المبلغ المطلوب ورفع إيصال الدفع من خلال المنصة للاستمرار في الوصول للمحتوى.",
        }),
      });
      const data = await res.json();
      alert(data.message || `تم إرسال الإشعار لـ ${unpaidStudents.length} طالب 🎉`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setNotifying(false);
    }
  };

  const filtered = students
    .filter((s) => {
      if (filter !== "all" && s.paymentStatus !== filter) return false;
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
          <h2 className="text-xl font-black text-slate-900">المدفوعات الشهرية</h2>
          <p className="text-sm text-slate-500 mt-0.5">إدارة حالة دفع الطلاب — يتجدد كل شهر</p>
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
            onClick={() => void notifyUnpaid()}
            disabled={notifying}
            className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
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
            {resettingAll ? "جاري الإعادة..." : "بداية شهر جديد (تصفير الكل)"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الطلاب", value: stats.total, icon: Users, color: "blue" },
          { label: "دافعين", value: stats.paid, icon: CheckCircle2, color: "emerald" },
          { label: "لم يدفعوا", value: stats.unpaid, icon: XCircle, color: "rose" },
          { label: "قيد المراجعة", value: stats.pending, icon: Clock, color: "amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`rounded-2xl border bg-${color}-50 border-${color}-200 p-4 text-center`}
          >
            <Icon className={`h-5 w-5 mx-auto mb-1.5 text-${color}-600`} />
            <p className={`text-2xl font-black text-${color}-700`}>{value}</p>
            <p className={`text-xs font-medium text-${color}-600 mt-0.5`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm font-semibold mb-2">
            <span className="text-slate-600">نسبة الدفع هذا الشهر</span>
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
          <div className="flex justify-between text-xs text-slate-400 mt-1.5">
            <span>{stats.paid} دفعوا</span>
            <span>{stats.unpaid} لم يدفعوا</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم أو التليفون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "paid", "unpaid", "pending_review"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-2 text-xs font-bold border transition ${
                filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {f === "all" ? `الكل (${stats.total})` : f === "paid" ? `دافعين (${stats.paid})` : f === "unpaid" ? `لم يدفعوا (${stats.unpaid})` : `مراجعة (${stats.pending})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right py-3 px-4 font-bold text-slate-700">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-blue-600 transition"
                  >
                    الاسم {sortAsc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-bold text-slate-700">التليفون</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 hidden md:table-cell">المرحلة</th>
                <th className="text-center py-3 px-4 font-bold text-slate-700">حالة الدفع</th>
                <th className="text-center py-3 px-4 font-bold text-slate-700">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    لا يوجد طلاب مطابقون
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{s.phone}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs hidden md:table-cell max-w-[200px] truncate">
                      {s.grade}
                    </td>
                    <td className="py-3 px-4 text-center">{statusBadge(s.paymentStatus)}</td>
                    <td className="py-3 px-4 text-center">
                      {s.paymentStatus !== "paid" ? (
                        <button
                          onClick={() => void updatePayment(s.id, "paid")}
                          disabled={updating.has(s.id)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 transition"
                        >
                          {updating.has(s.id) ? "..." : "✓ تأكيد الدفع"}
                        </button>
                      ) : (
                        <button
                          onClick={() => void updatePayment(s.id, "unpaid")}
                          disabled={updating.has(s.id)}
                          className="rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 text-slate-600 text-xs font-bold px-3 py-1.5 transition"
                        >
                          {updating.has(s.id) ? "..." : "إلغاء الدفع"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-400 text-center">
          يعرض {filtered.length} من {students.length} طالب
        </div>
      </div>
    </div>
  );
}
