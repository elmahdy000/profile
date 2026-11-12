import React, { useState, useEffect } from "react";
import { PlusCircle, Edit3, X, Check, Loader2, Video, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CurriculumLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "rename";
  initialStage: string;
  initialUnit: string;
  initialLesson?: string;
  initialVideoId?: number | null;
  availableStages: string[];
  availableUnits: string[];
  videos: Array<{ id: number; title: string; courseId: number; stage?: string }>;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onSuccess: (lessonName: string, unitName: string) => void;
}

export function CurriculumLessonModal({
  isOpen,
  onClose,
  mode,
  initialStage,
  initialUnit,
  initialLesson = "",
  initialVideoId = null,
  availableStages,
  availableUnits,
  videos,
  adminApi,
  onSuccess,
}: CurriculumLessonModalProps) {
  const { toast } = useToast();
  const [stage, setStage] = useState(initialStage);
  const [unit, setUnit] = useState(initialUnit);
  const [lessonName, setLessonName] = useState(initialLesson);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(initialVideoId ? String(initialVideoId) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStage(initialStage);
      setUnit(initialUnit);
      setLessonName(initialLesson);
      setSelectedVideoId(initialVideoId ? String(initialVideoId) : "");
    }
  }, [isOpen, initialStage, initialUnit, initialLesson, initialVideoId]);

  if (!isOpen) return null;

  // Filter video options by stage if available
  const stageVideos = videos.filter((v) => !v.stage || v.stage === stage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage.trim() || !unit.trim() || !lessonName.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }

    setSaving(true);
    try {
      const vId = selectedVideoId ? Number(selectedVideoId) : null;
      const matchingVideo = vId ? videos.find((v) => v.id === vId) : null;

      if (mode === "add") {
        await adminApi("/api/admin/learning/curriculum/create-lesson", {
          method: "POST",
          body: JSON.stringify({
            stage: stage.trim(),
            unit: unit.trim(),
            lesson: lessonName.trim(),
            videoId: vId,
            courseId: matchingVideo?.courseId || null,
          }),
        });
        toast({ title: "تمت إضافة الدرس بنجاح! 🚀", description: `الدرس: ${lessonName}` });
      } else {
        await adminApi("/api/admin/learning/curriculum/rename-lesson", {
          method: "POST",
          body: JSON.stringify({
            stage: stage.trim(),
            unit: initialUnit.trim(),
            oldLesson: initialLesson.trim(),
            newLesson: lessonName.trim(),
            targetUnit: unit.trim(),
            videoId: vId,
          }),
        });
        toast({ title: "تم تحديث الدرس بنجاح! ✓", description: `الاسم: ${lessonName}` });
      }
      onSuccess(lessonName.trim(), unit.trim());
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حفظ الدرس" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              {mode === "add" ? <PlusCircle className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                {mode === "add" ? "إضافة درس جديد للمنهج" : "تعديل بيانات الدرس"}
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {mode === "add" ? "إضافة درس جديد تحت الوحدة لربط الفيديوهات وبنوك الأسئلة والامتحانات" : "تعديل اسم الدرس أو نقله لوحدة أخرى أو ربط فيديو به"}
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
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Stage & Unit Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">المرحلة الدراسية *</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                disabled={mode === "rename"}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-muted/30 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer disabled:opacity-60"
              >
                {availableStages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">الوحدة التابع لها *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lesson Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">اسم الدرس *</label>
            <input
              type="text"
              required
              placeholder="مثال: الدرس الثاني: التشفير المتماثل والمفتاح العام"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Video Linking (Optional) */}
          <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-muted/20">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-primary" />
              <span>ربط فيديو الشرح بالمنصة (اختياري)</span>
            </label>
            <select
              value={selectedVideoId}
              onChange={(e) => {
                setSelectedVideoId(e.target.value);
                // Auto-fill lesson name if empty
                if (!lessonName.trim() && e.target.value) {
                  const vid = videos.find((v) => String(v.id) === e.target.value);
                  if (vid) setLessonName(vid.title);
                }
              }}
              className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">بدون ربط فيديو (درس أسئلة واختبارات فقط)</option>
              {stageVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground block">
              إذا تم ربط الفيديو، سيظهر هذا الدرس في مكتبة فيديوهات الطالب والخلاصة بالتزامن مع الأسئلة.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !lessonName.trim()}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === "add" ? "إضافة الدرس الآن" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
