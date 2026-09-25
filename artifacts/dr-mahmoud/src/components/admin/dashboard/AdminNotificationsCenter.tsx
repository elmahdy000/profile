import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  CreditCard,
  UserCheck,
  KeyRound,
  Calendar,
  Send,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";

interface AdminNotificationsCenterProps {
  onNavigate: (tab: string, subTab?: string) => void;
  bookingsCount?: number;
}

export function AdminNotificationsCenter({
  onNavigate,
  bookingsCount = 0,
}: AdminNotificationsCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    pendingReceipts: 0,
    pendingStudents: 0,
    pendingRecovery: 0,
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchLiveCounts = async () => {
    try {
      setLoading(true);
      const [receiptsRes, studentsRes, recoveryRes] = await Promise.all([
        fetch("/api/admin/payment-receipts", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/admin/students", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/admin/recovery-requests", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);

      const pendingReceipts = Array.isArray(receiptsRes)
        ? receiptsRes.filter((r: any) => r.status === "pending").length
        : 0;
      const pendingStudents = Array.isArray(studentsRes)
        ? studentsRes.filter((s: any) => s.status !== "approved" && s.status !== "suspended").length
        : 0;
      const pendingRecovery = Array.isArray(recoveryRes)
        ? recoveryRes.filter((r: any) => r.status === "pending" || r.status === "open").length
        : 0;

      setCounts({
        pendingReceipts,
        pendingStudents,
        pendingRecovery,
      });
    } catch {
      // Silently catch in polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLiveCounts();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLiveCounts();
      }
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const [visitedCategories, setVisitedCategories] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_visited_notifications_v1") || "{}");
    } catch {
      return {};
    }
  });

  const markCategoryVisited = (key: string, currentVal: number) => {
    setVisitedCategories((prev) => {
      const next = { ...prev, [key]: currentVal };
      try {
        localStorage.setItem("admin_visited_notifications_v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAllNotifications = () => {
    const next = {
      pendingReceipts: counts.pendingReceipts,
      pendingStudents: counts.pendingStudents,
      pendingRecovery: counts.pendingRecovery,
      bookings: bookingsCount,
    };
    setVisitedCategories(next);
    try {
      localStorage.setItem("admin_visited_notifications_v1", JSON.stringify(next));
    } catch {}
  };

  const unreadReceipts = Math.max(0, counts.pendingReceipts - (visitedCategories.pendingReceipts || 0));
  const unreadStudents = Math.max(0, counts.pendingStudents - (visitedCategories.pendingStudents || 0));
  const unreadRecovery = Math.max(0, counts.pendingRecovery - (visitedCategories.pendingRecovery || 0));
  const unreadBookings = Math.max(0, bookingsCount - (visitedCategories.bookings || 0));

  const totalUrgent = unreadReceipts + unreadStudents + unreadRecovery + unreadBookings;

  const handleAction = (tab: string, subTab?: string, categoryKey?: string, currentCount?: number) => {
    if (categoryKey && currentCount !== undefined) {
      markCategoryVisited(categoryKey, currentCount);
    }
    setIsOpen(false);
    onNavigate(tab, subTab);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="مركز الإشعارات والتنبيهات"
        aria-expanded={isOpen}
        className={`relative grid h-10 w-10 place-items-center rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
            : totalUrgent > 0
            ? "border-amber-300 bg-amber-50/70 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        }`}
      >
        <Bell className="h-4.5 w-4.5" />
        {totalUrgent > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-950 animate-pulse">
            {totalUrgent > 99 ? "99+" : totalUrgent}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 mt-2 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-[fadeIn_0.15s_ease-out] dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-3.5 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <div>
                <strong className="block text-xs font-black text-slate-900 dark:text-white">
                  مركز الإشعارات الإدارية
                </strong>
                <span className="text-[10px] text-slate-500">
                  {totalUrgent > 0 ? `${totalUrgent} طلبات تحتاج إلى اتخاذ إجراء` : "جميع الأمور محدثة بالكامل"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {totalUrgent > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                >
                  تحديد الكل كمقروء
                </button>
              )}
              <button
                type="button"
                onClick={() => void fetchLiveCounts()}
                disabled={loading}
                title="تحديث البيانات"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-primary" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body: Action Cards */}
          <div className="max-h-[65vh] overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
            {/* 1. Payment Receipts */}
            <button
              type="button"
              onClick={() => handleAction("learning", "payments", "pendingReceipts", counts.pendingReceipts)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-right transition-all cursor-pointer ${
                unreadReceipts > 0
                  ? "bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200"
                  : "hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800/50 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    unreadReceipts > 0
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="block text-xs font-bold truncate">إيصالات التحويل البنكي</strong>
                    {unreadReceipts > 0 && (
                      <span className="text-[10px] font-black bg-amber-600 text-white px-1.5 py-0.2 rounded-full">
                        {unreadReceipts} جديد
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 truncate">
                    {unreadReceipts > 0
                      ? `يوجد ${unreadReceipts} إيصالات سداد تنتظر المراجعة والتأكيد`
                      : "لا توجد إيصالات سداد معلقة حالياً"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {/* 2. Pending Student Approvals */}
            <button
              type="button"
              onClick={() => handleAction("learning", "students", "pendingStudents", counts.pendingStudents)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-right transition-all cursor-pointer ${
                unreadStudents > 0
                  ? "bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 text-blue-950 dark:bg-blue-950/30 dark:border-blue-800/40 dark:text-blue-200"
                  : "hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800/50 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    unreadStudents > 0
                      ? "bg-[#0B63CE] text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="block text-xs font-bold truncate">تسجيلات الطلاب الجديدة</strong>
                    {unreadStudents > 0 && (
                      <span className="text-[10px] font-black bg-[#0B63CE] text-white px-1.5 py-0.2 rounded-full">
                        {unreadStudents} جديد
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 truncate">
                    {unreadStudents > 0
                      ? `يوجد ${unreadStudents} طلاب بانتظار الاعتماد وتفعيل الكورسات`
                      : "كل حسابات الطلاب معتمدة ومفعلة"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {/* 3. Code Recovery Requests */}
            <button
              type="button"
              onClick={() => handleAction("learning", "reports", "pendingRecovery", counts.pendingRecovery)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-right transition-all cursor-pointer ${
                unreadRecovery > 0
                  ? "bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/80 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-200"
                  : "hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800/50 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    unreadRecovery > 0
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="block text-xs font-bold truncate">استرجاع أكواد الدخول</strong>
                    {unreadRecovery > 0 && (
                      <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                        {unreadRecovery} طلب
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 truncate">
                    {unreadRecovery > 0
                      ? `يوجد ${unreadRecovery} طلاب طلبوا إعادة إرسال كود الدخول`
                      : "لا توجد طلبات استرجاع أكواد معلقة"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {/* 4. Bookings */}
            <button
              type="button"
              onClick={() => handleAction("learning", "center-bookings", "bookings", bookingsCount)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-right transition-all cursor-pointer ${
                unreadBookings > 0
                  ? "bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/80 text-purple-950 dark:bg-purple-950/30 dark:border-purple-800/40 dark:text-purple-200"
                  : "hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800/50 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    unreadBookings > 0
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="block text-xs font-bold truncate">حجوزات السنتر والاستشارات</strong>
                    {unreadBookings > 0 && (
                      <span className="text-[10px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                        {unreadBookings} معلق
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 truncate">
                    {unreadBookings > 0
                      ? `يوجد ${unreadBookings} حجز ينتظر التواصل والتأكيد`
                      : "لا توجد حجوزات جديدة معلقة"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleAction("learning", "notifications")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-white text-xs font-bold transition hover:opacity-90 shadow-xs"
            >
              <Send className="h-3 w-3" />
              إرسال إشعار للطلاب
            </button>
            <button
              type="button"
              onClick={() => handleAction("learning", "self-assessment-packs")}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-primary/40 hover:text-primary transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              التقييم الذاتي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
