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
  Plus,
  RefreshCw,
  Download,
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
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/subscriptions", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل تحميل الاشتراكات");
      const data = await response.json();
      // Transform API response to match component interface
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
      loadSubscriptions();
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
      loadSubscriptions();
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
      loadSubscriptions();
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "overdue":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-500/30";
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
    if (filter === "all") return true;
    return sub.paymentStatus === filter;
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
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[#1677FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F8FAFC]">إدارة الاشتراكات الشهرية</h2>
          <p className="text-sm text-[#A8B5C7] mt-1">
            تتبع ومتابعة دفعات الطلاب الشهرية (500 جنيه كل 29 يوم)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={notifyExpiring}
            disabled={notifying}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {notifying ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            إشعار المتأخرين
          </Button>
          <Button onClick={loadSubscriptions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-[#26364D] bg-[#0B1424] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#A8B5C7]">إجمالي الاشتراكات</p>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#1677FF]" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-300">معلقة</p>
              <p className="text-2xl font-black text-white mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-300">مدفوعة</p>
              <p className="text-2xl font-black text-white mt-1">{stats.paid}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-300">متأخرة</p>
              <p className="text-2xl font-black text-white mt-1">{stats.overdue}</p>
            </div>
            <XCircle className="h-8 w-8 text-rose-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-300">تنتهي قريباً</p>
              <p className="text-2xl font-black text-white mt-1">{stats.expiringSoon}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "الكل" },
          { key: "pending", label: "معلقة" },
          { key: "paid", label: "مدفوعة" },
          { key: "overdue", label: "متأخرة" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === f.key
                ? "bg-[#1677FF] text-white"
                : "bg-[#131E31] text-[#A8B5C7] hover:bg-[#1a2942]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-[#26364D] bg-[#0B1424] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#26364D] bg-[#131E31]">
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">الطالب</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">الهاتف</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">تاريخ البداية</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">تاريخ الانتهاء</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">المبلغ</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">الحالة</th>
                <th className="text-right p-4 text-xs font-black text-[#A8B5C7]">الأيام المتبقية</th>
                <th className="text-center p-4 text-xs font-black text-[#A8B5C7]">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-[#A8B5C7]">
                    لا توجد اشتراكات
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const daysRemaining = getDaysRemaining(sub.monthEndDate);
                  const isExpiringSoon = daysRemaining <= 3 && daysRemaining >= 0 && sub.paymentStatus === "pending";

                  return (
                    <motion.tr
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-[#26364D] hover:bg-[#131E31] transition-colors ${
                        isExpiringSoon ? "bg-orange-500/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{sub.studentName}</span>
                          {isExpiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-orange-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#A8B5C7] font-mono" dir="ltr">
                          {sub.studentPhone}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#A8B5C7]">
                          {new Date(sub.monthStartDate).toLocaleDateString("ar-EG")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#A8B5C7]">
                          {new Date(sub.monthEndDate).toLocaleDateString("ar-EG")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-emerald-400">
                          {sub.amountDue} جنيه
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            sub.paymentStatus
                          )}`}
                        >
                          {getStatusText(sub.paymentStatus)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-sm font-bold ${
                            daysRemaining < 0
                              ? "text-rose-400"
                              : daysRemaining <= 3
                              ? "text-orange-400"
                              : "text-[#A8B5C7]"
                          }`}
                        >
                          {daysRemaining < 0 ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${daysRemaining} يوم`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {sub.paymentStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => markAsPaid(sub.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => markAsOverdue(sub.id)}
                                variant="outline"
                                className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {sub.paymentStatus === "paid" && (
                            <span className="text-xs text-emerald-400">
                              ✓ تم الدفع
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
