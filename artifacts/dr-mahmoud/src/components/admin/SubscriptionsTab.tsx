import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bell,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthlySubscription {
  id: number;
  studentId: number;
  studentName: string;
  studentPhone: string;
  monthStartDate: string;
  monthEndDate: string;
  amountDue: number;
  paymentStatus: "pending" | "paid" | "overdue" | "cancelled";
  paymentDate: string | null;
  receiptId: number | null;
  adminNotes: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<MonthlySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/subscriptions", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل تحميل الاشتراكات");
      const data = await response.json();
      const transformed = data.map((item: any) => ({
        id: item.subscription.id,
        studentId: item.subscription.studentId,
        studentName: item.student?.name || "غير معروف",
        studentPhone: item.student?.phone || "",
        monthStartDate: item.subscription.monthStartDate,
        monthEndDate: item.subscription.monthEndDate,
        amountDue: item.subscription.amountDue,
        paymentStatus: item.subscription.paymentStatus,
        paymentDate: item.subscription.paymentDate,
        receiptId: item.subscription.receiptId,
        adminNotes: item.subscription.adminNotes,
        notifiedAt: item.subscription.notifiedAt,
        createdAt: item.subscription.createdAt,
      }));
      setSubscriptions(transformed);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (subscriptionId: number) => {
    if (!confirm("هل أنت متأكد من تأكيد دفع هذا الاشتراك؟")) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("فشل تحديث حالة الدفع");

      alert("تم تأكيد الدفع بنجاح");
      void loadSubscriptions();
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء تحديث حالة الدفع");
    }
  };

  const markAsOverdue = async (subscriptionId: number) => {
    if (!confirm("هل أنت متأكد من وضع علامة متأخر على هذا الاشتراك؟")) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/mark-overdue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("فشل تحديث حالة الاشتراك");

      alert("تم تحديث حالة الاشتراك بنجاح");
      void loadSubscriptions();
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء تحديث حالة الاشتراك");
    }
  };

  const notifyExpiring = async () => {
    if (!confirm("هل تريد إرسال إشعارات للطلاب الذين ينتهي اشتراكهم قريباً؟")) return;

    try {
      setNotifying(true);
      const response = await fetch("/api/admin/subscriptions/notify-expiring", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) throw new Error("فشل إرسال الإشعارات");

      const result = await response.json();
      alert(result.message);
      void loadSubscriptions();
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء إرسال الإشعارات");
    } finally {
      setNotifying(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs";
      case "pending":
        return "bg-amber-50 text-amber-800 border-amber-200 font-bold px-2.5 py-0.5 rounded-full text-xs";
      case "overdue":
        return "bg-rose-50 text-rose-800 border-rose-200 font-bold px-2.5 py-0.5 rounded-full text-xs";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 font-bold px-2.5 py-0.5 rounded-full text-xs";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "مدفوع";
      case "pending":
        return "معلق";
      case "overdue":
        return "متأخر";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesFilter = filter === "all" || sub.paymentStatus === filter;
    const matchesSearch =
      !searchQuery.trim() ||
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentPhone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: subscriptions.length,
    pending: subscriptions.filter((s) => s.paymentStatus === "pending").length,
    paid: subscriptions.filter((s) => s.paymentStatus === "paid").length,
    overdue: subscriptions.filter((s) => s.paymentStatus === "overdue").length,
    expiringSoon: subscriptions.filter((s) => {
      if (s.paymentStatus !== "pending") return false;
      const days = getDaysRemaining(s.monthEndDate);
      return days <= 3 && days >= 0;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 dir-rtl text-right font-sans">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            إدارة الاشتراكات الشهرية 💳
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#64748B] mt-1">
            تتبع ومتابعة دفعات الطلاب الشهرية وحالة التفعيل (500 جنيه كل 29 يوم)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={notifyExpiring}
            disabled={notifying}
            className="h-10 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs gap-2 shadow-xs"
          >
            {notifying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            <span>إشعار المتأخرين</span>
          </Button>

          <Button
            type="button"
            onClick={loadSubscriptions}
            variant="outline"
            className="h-10 px-4 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* High-Contrast Modern Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#64748B] block">
                إجمالي الاشتراكات
              </span>
              <strong className="text-2xl font-black text-[#0F172A] mt-1 block">
                {stats.total}
              </strong>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="rounded-2xl border border-[#FDE68A] bg-[#FEF3C7]/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#92400E] block">
                معلقة
              </span>
              <strong className="text-2xl font-black text-[#78350F] mt-1 block">
                {stats.pending}
              </strong>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#D97706] text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Paid */}
        <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5]/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#065F46] block">
                مدفوعة
              </span>
              <strong className="text-2xl font-black text-[#064E3B] mt-1 block">
                {stats.paid}
              </strong>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#059669] text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="rounded-2xl border border-[#FECDD3] bg-[#FFF1F2]/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#9F1239] block">
                متأخرة
              </span>
              <strong className="text-2xl font-black text-[#881337] mt-1 block">
                {stats.overdue}
              </strong>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E11D48] text-white shadow-xs">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 5: Expiring Soon */}
        <div className="rounded-2xl border border-[#FED7AA] bg-[#FFEDD5]/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#9A3412] block">
                تنتهي قريباً
              </span>
              <strong className="text-2xl font-black text-[#7C2D12] mt-1 block">
                {stats.expiringSoon}
              </strong>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EA580C] text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "الكل" },
            { key: "pending", label: "معلقة" },
            { key: "paid", label: "مدفوعة" },
            { key: "overdue", label: "متأخرة" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                filter === f.key
                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#475569] hover:bg-white hover:text-[#0F172A]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو الهاتف..."
            className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-white pr-10 pl-4 text-xs font-medium text-[#0F172A] placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      {/* Modern High-Contrast Subscriptions Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right dir-rtl">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] text-xs font-bold">
                <th className="p-4 text-right">الطالب</th>
                <th className="p-4 text-right">الهاتف</th>
                <th className="p-4 text-right">تاريخ البداية</th>
                <th className="p-4 text-right">تاريخ الانتهاء</th>
                <th className="p-4 text-right">المبلغ</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">الأيام المتبقية</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-12 text-xs font-bold text-[#64748B]">
                    لا توجد اشتراكات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const daysRemaining = getDaysRemaining(sub.monthEndDate);
                  const isExpiringSoon =
                    daysRemaining <= 3 && daysRemaining >= 0 && sub.paymentStatus === "pending";

                  return (
                    <motion.tr
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isExpiringSoon ? "bg-[#FFFBEB]" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-xs text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <span>{sub.studentName}</span>
                          {isExpiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-[#475569] dir-ltr text-right">
                        {sub.studentPhone}
                      </td>
                      <td className="p-4 text-xs text-[#475569]">
                        {new Date(sub.monthStartDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-xs text-[#475569]">
                        {new Date(sub.monthEndDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-xs font-black text-[#059669]">
                        {sub.amountDue} جنيه
                      </td>
                      <td className="p-4">
                        <span className={getStatusBadge(sub.paymentStatus)}>
                          {getStatusText(sub.paymentStatus)}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold">
                        <span
                          className={
                            daysRemaining < 0
                              ? "text-[#E11D48]"
                              : daysRemaining <= 3
                              ? "text-[#D97706]"
                              : "text-[#475569]"
                          }
                        >
                          {daysRemaining < 0
                            ? `متأخر ${Math.abs(daysRemaining)} يوم`
                            : `${daysRemaining} يوم`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {sub.paymentStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => markAsPaid(sub.id)}
                                className="h-8 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تأكيد الدفع</span>
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => markAsOverdue(sub.id)}
                                variant="outline"
                                className="h-8 px-3 rounded-lg border-[#FECDD3] bg-white text-[#E11D48] hover:bg-[#FFF1F2] font-bold text-xs gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>متأخر</span>
                              </Button>
                            </>
                          )}
                          {sub.paymentStatus === "paid" && (
                            <span className="text-xs font-bold text-[#059669] flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> تم الدفع
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
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
