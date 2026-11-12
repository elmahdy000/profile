import React, { useState, useEffect } from "react";
import { FolderPlus, Edit3, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CurriculumUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "rename";
  initialStage: string;
  initialUnit?: string;
  availableStages: string[];
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onSuccess: (unitName: string) => void;
}

export function CurriculumUnitModal({
  isOpen,
  onClose,
  mode,
  initialStage,
  initialUnit = "",
  availableStages,
  adminApi,
  onSuccess,
}: CurriculumUnitModalProps) {
  const { toast } = useToast();
  const [stage, setStage] = useState(initialStage);
  const [unitName, setUnitName] = useState(initialUnit);
  const [initialLesson, setInitialLesson] = useState("الدرس الأول: مقدمة وتمهيد");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStage(initialStage);
      setUnitName(initialUnit);
      setInitialLesson("الدرس الأول: مقدمة وتمهيد");
    }
  }, [isOpen, initialStage, initialUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage.trim() || !unitName.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى تحديد المرحلة وكتابة اسم الوحدة" });
      return;
    }

    setSaving(true);
    try {
      if (mode === "add") {
        await adminApi("/api/admin/learning/curriculum/create-unit", {
          method: "POST",
          body: JSON.stringify({
            stage: stage.trim(),
            unit: unitName.trim(),
            initialLesson: initialLesson.trim(),
          }),
        });
        toast({ title: "تم إنشاء الوحدة بنجاح! 🎉", description: `الوحدة: ${unitName}` });
      } else {
        await adminApi("/api/admin/learning/curriculum/rename-unit", {
          method: "POST",
          body: JSON.stringify({
            stage: stage.trim(),
            oldUnit: initialUnit.trim(),
            newUnit: unitName.trim(),
          }),
        });
        toast({ title: "تم تحديث اسم الوحدة بنجاح! ✓", description: `الاسم الجديد: ${unitName}` });
      }
      onSuccess(unitName.trim());
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حفظ الوحدة" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              {mode === "add" ? <FolderPlus className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                {mode === "add" ? "إضافة وحدة دراسية جديدة" : "تعديل اسم الوحدة الدراسية"}
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {mode === "add" ? "إنشاء وحدة بالمنهج لإضافة الدروس والأسئلة والامتحانات بها" : "تحديث اسم الوحدة في كافة البنوك والامتحانات"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">المرحلة الدراسية / المسار *</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              disabled={mode === "rename"}
              className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer disabled:opacity-60"
            >
              {availableStages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">اسم الوحدة *</label>
            <input
              type="text"
              required
              placeholder="مثال: الوحدة الرابعة: البرمجة الكائنية وتطبيقاتها"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Initial Lesson (only on Add) */}
          {mode === "add" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">اسم الدرس الافتتاحي للوحدة (اختياري)</label>
              <input
                type="text"
                placeholder="الدرس الأول: مقدمة وتمهيد"
                value={initialLesson}
                onChange={(e) => setInitialLesson(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-[10px] text-muted-foreground block">
                سيتم تجهيز هذا الدرس داخل الوحدة تلقائياً لتبدأ بوضع الأسئلة والامتحانات به فوراً.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !unitName.trim()}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === "add" ? "إنشاء الوحدة الآن" : "حفظ التعديل"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
