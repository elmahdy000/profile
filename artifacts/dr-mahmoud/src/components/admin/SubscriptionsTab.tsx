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
  Filter,
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
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "overdue":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
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
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 dir-rtl text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            إدارة الاشتراكات الشهرية 💳
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
            تتبع ومتابعة دفعات الطلاب الشهرية وحالة التفعيل (500 جنيه كل 29 يوم)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={notifyExpiring}
            disabled={notifying}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 shadow-sm"
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
            className="h-10 px-4 rounded-xl text-xs font-bold gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* High-Contrast Modern Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                إجمالي الاشتراكات
              </span>
              <strong className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {stats.total}
              </strong>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="rounded-2xl border border-amber-300 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                معلقة
              </span>
              <strong className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1 block">
                {stats.pending}
              </strong>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Paid */}
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                مدفوعة
              </span>
              <strong className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1 block">
                {stats.paid}
              </strong>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/40 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                متأخرة
              </span>
              <strong className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-1 block">
                {stats.overdue}
              </strong>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-500/20">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 5: Expiring Soon */}
        <div className="rounded-2xl border border-orange-300 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-950/40 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-orange-900 dark:text-orange-200 block">
                تنتهي قريباً
              </span>
              <strong className="text-2xl font-black text-orange-950 dark:text-orange-100 mt-1 block">
                {stats.expiringSoon}
              </strong>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
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
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو الهاتف..."
            className="w-full h-10 rounded-xl border border-border bg-card pr-9 pl-4 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right dir-rtl">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground text-xs font-bold">
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
            <tbody className="divide-y divide-border">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-12 text-xs font-bold text-muted-foreground">
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
                      className={`hover:bg-muted/40 transition-colors ${
                        isExpiringSoon ? "bg-amber-500/10 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{sub.studentName}</span>
                          {isExpiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground dir-ltr text-right">
                        {sub.studentPhone}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {new Date(sub.monthStartDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {new Date(sub.monthEndDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {sub.amountDue} جنيه
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                            sub.paymentStatus
                          )}`}
                        >
                          {getStatusText(sub.paymentStatus)}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold">
                        <span
                          className={
                            daysRemaining < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : daysRemaining <= 3
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
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
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تأكيد الدفع</span>
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => markAsOverdue(sub.id)}
                                variant="outline"
                                className="h-8 px-3 rounded-lg border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 font-bold text-xs gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>متأخر</span>
                              </Button>
                            </>
                          )}
                          {sub.paymentStatus === "paid" && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
