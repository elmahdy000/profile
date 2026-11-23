import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarCheck2, Check, CheckCircle2, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import { getStudentAuthHeaders } from "@/lib/studentUploadHelpers";

interface RecentDayItem {
  date: string;
  dayLabel: string;
  checkedIn: boolean;
  isToday: boolean;
  isMissed: boolean;
}

interface DailyCheckInStatus {
  todayDate: string;
  checkedInToday: boolean;
  streakDays: number;
  totalCheckins: number;
  missedDaysCount: number;
  missedYesterday: boolean;
  maxAllowedMisses: number;
  recentDays: RecentDayItem[];
}

interface DailyCheckInModalProps {
  student: Student;
  enabled: boolean;
}

export function DailyCheckInModal({ student, enabled }: DailyCheckInModalProps) {
  const [status, setStatus] = useState<DailyCheckInStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!enabled || !student?.id) return;
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const res = await fetch("/api/learning/daily-checkin/status", {
          credentials: "include",
          headers: getStudentAuthHeaders(false),
        });
        if (!res.ok) return;
        const data = (await res.json()) as DailyCheckInStatus;
        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        // Silent — never block student if network hiccups
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [enabled, student?.id]);

  if (!enabled || !status || status.checkedInToday) return null;

  const todayFormatted = (() => {
    try {
      return new Intl.DateTimeFormat("ar-EG", {
        timeZone: "Africa/Cairo",
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    } catch {
      return status.todayDate;
    }
  })();

  const handleCheckIn = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learning/daily-checkin", {
        method: "POST",
        credentials: "include",
        headers: getStudentAuthHeaders(true),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر تسجيل الحضور، جرّب تاني");

      setStatus(data as DailyCheckInStatus);
      toast({
        title: "تم إثبات حضورك النهارده ✓",
        description:
          data.streakDays > 1
            ? `عاش يا بطل! سلسلتك وصلت لـ ${data.streakDays} أيام متتالية 🔥`
            : "عاش يا بطل! حضورك اتسجل ليوم النهارده بنجاح.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "تعذر التسجيل",
        description: err.message || "جرّب تاني بعد لحظة",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isDanger = status.missedDaysCount >= status.maxAllowedMisses;

  return (
    <div
      className="fixed inset-0 z-[135] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card text-foreground p-5 sm:p-6 shadow-2xl space-y-4 text-right">
        {/* Compact Clean Header */}
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-foreground">
                إثبات حضورك اليومي
              </h3>
              <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 px-2 py-0.5 text-[10px] font-black">
                {todayFormatted}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              أهلاً يا <strong>{student.name}</strong>! اضغط ضغطة واحدة لتسجيل حضورك النهارده على المنصة.
            </p>
          </div>
        </div>

        {/* Last 7 Days Clean Dots */}
        <div className="rounded-2xl border border-border bg-muted/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-muted-foreground">التزامك آخر 7 أيام</span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black">
              <Flame className="h-3.5 w-3.5" />
              <span>{status.streakDays} يوم متتالي</span>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {status.recentDays.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground truncate max-w-full">
                  {d.dayLabel}
                </span>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl border text-xs font-black ${
                    d.checkedIn
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : d.isToday
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500 border-dashed"
                      : d.isMissed
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      : "bg-card text-muted-foreground border-border"
                  }`}
                >
                  {d.checkedIn ? <Check className="h-4 w-4" /> : d.isToday ? "•" : d.isMissed ? "✕" : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Absence Warning Banner (shown clearly if student missed 1+ days, or calm policy note) */}
        {status.missedDaysCount > 0 ? (
          <div
            className={`rounded-2xl border p-3 text-xs flex items-start gap-2.5 leading-relaxed ${
              isDanger
                ? "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-black">
                {isDanger
                  ? `تنبيه أخير: وصلت لـ ${status.missedDaysCount} أيام غياب عن المنصة!`
                  : `تغيبت عن المنصة ${status.missedDaysCount} من ${status.maxAllowedMisses} أيام`}
              </strong>
              <span className="text-[11px] font-semibold opacity-90">
                تكرار الغياب عن المنصة أكتر من 3 مرات يعرّض حسابك للإغلاق. التزم بتسجيل حضورك يومياً في أي وقت خلال اليوم.
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] font-semibold text-muted-foreground bg-muted/30 border border-border rounded-xl px-3 py-2">
            📌 تسجيل الحضور اليومي إلزامي في أي وقت خلال اليوم — تكرار الغياب أكتر من 3 مرات يعرّض المنصة للإغلاق.
          </p>
        )}

        {/* Single Fast 1-Click Action */}
        <Button
          type="button"
          disabled={submitting}
          onClick={() => void handleCheckIn()}
          className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-sm cursor-pointer flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جارٍ تسجيل حضورك...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>إثبات حضوري اليوم ✓</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
