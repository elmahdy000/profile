import React, { useState } from "react";
import {
  BellRing,
  BookCheck,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MapPin,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentNotification } from "@/types/platform";
import { formatExamDayAndTime } from "@/lib/motivationMessages";

interface StudentNotificationsModalProps {
  notifications: StudentNotification[];
  onMarkOneRead: (notification: StudentNotification) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
  onNavigateTab?: (tab: string) => void;
}

function getNotificationStyle(type?: string | null, title?: string) {
  const t = (type || "").toLowerCase();
  const ttl = (title || "").toLowerCase();
  if (t.includes("homework") || ttl.includes("واجب")) {
    return {
      icon: BookCheck,
      badge: "واجب منزلي",
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      actionLabel: "افتح الواجب دلوقتي",
      targetTab: "homework",
    };
  }
  if (t.includes("quiz") || ttl.includes("اختبار") || ttl.includes("امتحان")) {
    return {
      icon: ClipboardCheck,
      badge: "اختبار جديد",
      color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
      actionLabel: "افتح الاختبارات دلوقتي",
      targetTab: "quizzes",
    };
  }
  if (t.includes("attendance") || ttl.includes("حضور") || ttl.includes("غياب")) {
    return {
      icon: MapPin,
      badge: "حضور السنتر",
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      actionLabel: null,
      targetTab: null,
    };
  }
  if (t.includes("payment") || ttl.includes("اشتراك") || ttl.includes("دفع")) {
    return {
      icon: CreditCard,
      badge: "الاشتراك",
      color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
      actionLabel: "افتح حسابي",
      targetTab: "profile",
    };
  }
  return {
    icon: Sparkles,
    badge: "تنبيه مهم",
    color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    actionLabel: null,
    targetTab: null,
  };
}

export function StudentNotificationsModal({
  notifications,
  onMarkOneRead,
  onMarkAllRead,
  onNavigateTab,
}: StudentNotificationsModalProps) {
  const [busyId, setBusyId] = useState<number | "all" | null>(null);

  const unreadList = notifications.filter((n) => !n.readAt);
  if (unreadList.length === 0) return null;

  const handleAckOne = async (item: StudentNotification, goTab?: string | null) => {
    setBusyId(item.id);
    try {
      await onMarkOneRead(item);
      if (goTab && onNavigateTab) {
        onNavigateTab(goTab);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleAckAll = async () => {
    setBusyId("all");
    try {
      await onMarkAllRead();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border-2 border-blue-500/40 bg-card shadow-2xl overflow-hidden text-right">
        {/* Header (Flat Solid Color — No Gradient) */}
        <div className="shrink-0 bg-blue-600 dark:bg-blue-700 px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 border border-white/30">
              <BellRing className="h-5 w-5 animate-bounce" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>عندك إشعارات جديدة مهمة!</span>
                <span className="rounded-full bg-white text-blue-700 px-2 py-0.5 text-xs font-black font-mono">
                  {unreadList.length}
                </span>
              </h3>
              <p className="text-[11px] text-blue-100 font-semibold">
                اقرأ الإشعار واضغط «فهمت ✓» عشان تكمل على المنصة
              </p>
            </div>
          </div>
        </div>

        {/* Unread Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {unreadList.map((item) => {
            const meta = getNotificationStyle(item.type, item.title);
            const Icon = meta.icon;
            const timeInfo = formatExamDayAndTime(item.createdAt);
            const isBusy = busyId === item.id || busyId === "all";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-background p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black border ${meta.color}`}>
                        {meta.badge}
                      </span>
                      <h4 className="text-sm font-black text-foreground mt-0.5 leading-snug">
                        {item.title}
                      </h4>
                    </div>
                  </div>
                  {timeInfo && (
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                      {timeInfo.fullLabel}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] font-semibold text-foreground/90 leading-relaxed bg-muted/30 rounded-xl p-3 border border-border/60">
                  {item.message}
                </p>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {meta.actionLabel && meta.targetTab && onNavigateTab && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAckOne(item, meta.targetTab)}
                      className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{meta.actionLabel}</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={meta.actionLabel ? "outline" : "default"}
                    disabled={isBusy}
                    onClick={() => void handleAckOne(item)}
                    className={`h-9 px-4 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
                      !meta.actionLabel ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>فهمت / تم الاطلاع ✓</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {unreadList.length > 1 && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {unreadList.length} إشعارات غير مقروءة
            </span>
            <Button
              type="button"
              disabled={busyId !== null}
              onClick={() => void handleAckAll()}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              <span>تأكيد قراءة الكل ({unreadList.length}) ✓</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
