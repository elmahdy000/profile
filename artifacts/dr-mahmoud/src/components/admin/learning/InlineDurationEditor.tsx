import React, { useState } from "react";
import { Check, Clock, Loader2, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatQuizDurationAr } from "@/lib/motivationMessages";

interface InlineDurationEditorProps {
  quizId: number;
  durationMinutes?: number | null;
  onUpdated: (newDuration: number | null) => void;
  size?: "sm" | "md";
}

export function InlineDurationEditor({
  quizId,
  durationMinutes,
  onUpdated,
  size = "sm",
}: InlineDurationEditorProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(durationMinutes ? String(durationMinutes) : "30");
  const [saving, setSaving] = useState(false);

  const openEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(durationMinutes && durationMinutes > 0 ? String(durationMinutes) : "30");
    setEditing(true);
  };

  const handleSave = async (customVal?: number | null) => {
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
          : "تم جعل الوقت مفتوحاً",
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تحديث الوقت" });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={openEditor}
        title="اضغط لتعديل الوقت فوراً (Realtime)"
        className={`inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold transition cursor-pointer ${
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          {durationMinutes && durationMinutes > 0 ? formatQuizDurationAr(durationMinutes) : "تحديد وقت"}
        </span>
        <Pencil className="h-2.5 w-2.5 opacity-70" />
      </button>
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
            void handleSave();
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
        onClick={() => void handleSave(2880)}
        className="h-6 px-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black cursor-pointer"
        title="ضبط 48 ساعة (2880 دقيقة)"
      >
        48س
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
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
