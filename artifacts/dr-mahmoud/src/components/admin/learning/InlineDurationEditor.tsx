import React, { useState } from "react";
import { Check, Clock, Loader2, Pencil, TimerOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  formatOpenHoursAr,
  formatQuizDurationAr,
  formatRemainingWindowAr,
} from "@/lib/motivationMessages";

interface InlineDurationEditorProps {
  quizId: number;
  durationMinutes?: number | null;
  openHours?: number | null;
  availableUntil?: string | null;
  mode?: "timer" | "hours";
  onUpdated: (newDuration: number | null) => void;
  onHoursUpdated?: (
    newHours: number | null,
    newAvailableUntil: string | null,
    newDuration?: number | null,
  ) => void;
  size?: "sm" | "md";
}

export function InlineDurationEditor({
  quizId,
  durationMinutes,
  openHours,
  availableUntil,
  mode = "timer",
  onUpdated,
  onHoursUpdated,
  size = "sm",
}: InlineDurationEditorProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(
    mode === "hours"
      ? openHours && openHours > 0
        ? String(openHours)
        : "24"
      : durationMinutes
        ? String(durationMinutes)
        : "30",
  );
  const [saving, setSaving] = useState(false);

  const openEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "hours") {
      setValue(openHours && openHours > 0 ? String(openHours) : "24");
    } else {
      setValue(durationMinutes && durationMinutes > 0 ? String(durationMinutes) : "30");
    }
    setEditing(true);
  };

  const handleSaveHours = async (
    customHours?: number | null,
    clearTimerToo = false,
  ) => {
    const parsedHours =
      customHours !== undefined
        ? customHours
        : value.trim() === "" || Number(value) <= 0
          ? null
          : Math.max(1, Math.min(720, Math.round(Number(value))));

    if (parsedHours !== null && (!Number.isFinite(parsedHours) || parsedHours < 1)) {
      toast({
        variant: "destructive",
        description: "اكتب عدد ساعات صحيح (من 1 إلى 720)",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { openHours: parsedHours };
      if (clearTimerToo) {
        payload.durationMinutes = null;
      }

      const res = await fetch(`/api/admin/learning/quizzes/${quizId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر تحديث مدة الإتاحة");

      const nextHours = data.openHours !== undefined ? data.openHours : parsedHours;
      const nextUntil = data.availableUntil ?? null;
      const nextDur =
        data.durationMinutes !== undefined
          ? data.durationMinutes
          : clearTimerToo
            ? null
            : durationMinutes ?? null;

      if (clearTimerToo) {
        onUpdated(null);
      }
      onHoursUpdated?.(nextHours, nextUntil, nextDur);
      setEditing(false);
      toast({
        title: "تم تحديث ساعات الإتاحة لحظياً ⚡",
        description: parsedHours
          ? `الامتحان مفتوح لمدة ${formatOpenHoursAr(parsedHours)} بدءاً من الآن${clearTimerToo ? " وتم إلغاء المؤقت" : ""}.`
          : "تم جعل الامتحان مفتوحاً دائماً بدون وقت إغلاق.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message || "تعذر تحديث ساعات الإتاحة",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearTimerOnly = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/learning/quizzes/${quizId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر إلغاء المؤقت");
      onUpdated(null);
      onHoursUpdated?.(data.openHours ?? openHours ?? null, data.availableUntil ?? availableUntil ?? null, null);
      toast({
        title: "تم إلغاء المؤقت ⚡",
        description: "أصبح هذا الامتحان الآن بدون عداد وقت ضاغط للطلاب.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر إلغاء المؤقت" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTimer = async (customVal?: number | null) => {
    const parsed =
      customVal !== undefined
        ? customVal
        : value.trim() === ""
          ? null
          : Math.max(1, Math.min(10080, Math.round(Number(value))));

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 1)) {
      toast({ variant: "destructive", description: "اكتب عدد دقائق صحيح (من 1 إلى 10080)" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/learning/quizzes/${quizId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر تحديث الوقت");

      onUpdated(parsed);
      setEditing(false);
      toast({
        title: "تم تحديث الوقت لحظياً ⚡",
        description: parsed
          ? `الوقت الجديد: ${formatQuizDurationAr(parsed)} (بيتحدث تلقائياً عند الطلاب المفتوح عندهم الامتحان/الواجب)`
          : "تم إلغاء المؤقت وجعل الوقت مفتوحاً",
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تحديث الوقت" });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    if (mode === "hours") {
      const winInfo = formatRemainingWindowAr(availableUntil, openHours);
      const hasPerAttemptTimer = Boolean(durationMinutes && durationMinutes > 0);
      return (
        <div className="inline-flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={openEditor}
            title="اضغط للتحكم في عدد ساعات إتاحة الامتحان"
            className={`inline-flex items-center gap-1 rounded-lg border font-bold transition cursor-pointer ${winInfo.expired
                ? "border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300"
              } ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
          >
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              {openHours && openHours > 0
                ? `${formatOpenHoursAr(openHours)} (${winInfo.expired ? "انتهى" : winInfo.label.replace("متاح · ", "")})`
                : winInfo.label}
            </span>
            <Pencil className="h-2.5 w-2.5 opacity-70" />
          </button>
          {hasPerAttemptTimer ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleClearTimerOnly()}
              title="الامتحان به مؤقت قديم — اضغط لإلغاء المؤقت وجعله بدون تايمر"
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
            >
              <TimerOff className="h-2.5 w-2.5" />
              <span>مؤقت {durationMinutes}د (إلغاء)</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
              بدون مؤقت
            </span>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={openEditor}
        title="اضغط لتعديل الوقت فوراً (Realtime)"
        className={`inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold transition cursor-pointer ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          }`}
      >
        <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          {durationMinutes && durationMinutes > 0 ? formatQuizDurationAr(durationMinutes) : "بدون مؤقت"}
        </span>
        <Pencil className="h-2.5 w-2.5 opacity-70" />
      </button>
    );
  }

  if (mode === "hours") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-blue-500/50 bg-blue-50/90 dark:bg-slate-900 p-1.5 shadow-sm"
        dir="rtl"
      >
        {[12, 24, 48, 72].map((h) => (
          <button
            key={h}
            type="button"
            disabled={saving}
            onClick={() => void handleSaveHours(h)}
            className={`h-6 px-1.5 rounded-md border text-[10px] font-black cursor-pointer ${Number(value) === h
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-950 border-border text-foreground hover:bg-muted"
              }`}
            title={`فتح لمدة ${h} ساعة من الآن`}
          >
            {h}س
          </button>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveHours(null)}
          className="h-6 px-1.5 rounded-md bg-white dark:bg-slate-950 border border-border text-[10px] font-black hover:bg-muted cursor-pointer"
          title="فتح دائم بدون تاريخ إغلاق"
        >
          دائماً
        </button>
        <input
          type="number"
          min={1}
          max={720}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSaveHours();
            } else if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="w-14 h-6 rounded-md border border-blue-400 bg-white dark:bg-slate-950 text-center text-xs font-black font-mono text-foreground focus:outline-none"
        />
        <span className="text-[10px] font-bold text-blue-900 dark:text-blue-200">ساعة</span>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveHours()}
          className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black inline-flex items-center gap-0.5 cursor-pointer"
          title="حفظ الساعات من الآن"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          <span>حفظ</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
          className="h-6 w-6 rounded-md hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 grid place-items-center cursor-pointer"
          title="إلغاء"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/60 p-1 shadow-sm"
      dir="rtl"
    >
      <button
        type="button"
        disabled={saving}
        onClick={() => setValue(String(Math.max(1, (Number(value) || 15) - 5)))}
        className="h-6 px-1.5 rounded-md bg-white dark:bg-slate-900 border border-border text-[10px] font-black font-mono hover:bg-muted cursor-pointer"
        title="نقص 5 دقايق"
      >
        -5
      </button>
      <input
        type="number"
        min={1}
        max={10080}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSaveTimer();
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        className="w-16 h-6 rounded-md border border-amber-400 bg-white dark:bg-slate-950 text-center text-xs font-black font-mono text-foreground focus:outline-none"
      />
      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200">د</span>
      <button
        type="button"
        disabled={saving}
        onClick={() => setValue(String(Math.min(10080, (Number(value) || 15) + 5)))}
        className="h-6 px-1.5 rounded-md bg-white dark:bg-slate-900 border border-border text-[10px] font-black font-mono hover:bg-muted cursor-pointer"
        title="زوّد 5 دقايق"
      >
        +5
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSaveTimer(null)}
        className="h-6 px-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 text-[10px] font-black cursor-pointer"
        title="بدون مؤقت"
      >
        بدون مؤقت
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSaveTimer()}
        className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black inline-flex items-center gap-0.5 cursor-pointer"
        title="حفظ فوري"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        <span>حفظ</span>
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => setEditing(false)}
        className="h-6 w-6 rounded-md hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 grid place-items-center cursor-pointer"
        title="إلغاء"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
