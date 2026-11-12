import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Loader2,
  CheckCircle2,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BidiStatement } from "@/components/kholasa/BidiStatement";

interface CurriculumEssaysViewProps {
  stage: string;
  unit: string;
  lesson: string;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onAddEssayClick: () => void;
  onEditEssayClick: (essay: any) => void;
}

export function CurriculumEssaysView({
  stage,
  unit,
  lesson,
  adminApi,
  onAddEssayClick,
  onEditEssayClick,
}: CurriculumEssaysViewProps) {
  const { toast } = useToast();
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEssays = async () => {
    if (!stage || !unit) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ stage, unit });
      if (lesson && lesson !== "all") {
        params.append("lesson", lesson);
      }
      const res = await adminApi<any>(`/api/admin/learning/essay-question-bank?${params.toString()}`);
      const items = Array.isArray(res) ? res : Array.isArray(res?.questions) ? res.questions : [];
      setEssays(items);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "تعذر تحميل الأسئلة المقالية" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEssays();
  }, [stage, unit, lesson]);

  const handleDeleteEssay = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال المقالي؟")) return;
    try {
      await adminApi(`/api/admin/learning/essay-question-bank/${id}`, {
        method: "DELETE",
      });
      toast({ title: "تم حذف السؤال المقالي بنجاح 🗑️" });
      setEssays((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حذف السؤال" });
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
        <div>
          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <span>بنك الأسئلة المقالية ({essays.length})</span>
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold">
            {lesson === "all" ? `كل مقالي ${unit}` : `مقالي الدرس: ${lesson}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={loadEssays}
            disabled={loading}
            className="h-8 text-xs font-bold gap-1 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onAddEssayClick}
            className="h-8 text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة سؤال مقالي يدوي
          </Button>
        </div>
      </div>

      {/* Essays List or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-bold text-xs flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <span>جاري تحميل الأسئلة المقالية...</span>
        </div>
      ) : essays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h5 className="text-sm font-black text-foreground">لا توجد أسئلة مقالية مضافة لهذا الدرس حتى الآن</h5>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            يمكنك إضافة أسئلة مقالية وشرح إجاباتها النموذجية والترجمة لتظهر للطلاب في امتحانات وبنك الأسئلة المقالية.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onAddEssayClick}
            className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            إضافة أول سؤال مقالي
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {essays.map((essay, idx) => (
            <div
              key={essay.id || idx}
              className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-600 text-xs font-black">
                    {idx + 1}
                  </span>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                      <BidiStatement text={essay.prompt} />
                    </div>
                    {essay.translation && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{essay.translation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditEssayClick(essay)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="تعديل السؤال"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEssay(essay.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="حذف السؤال"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Model Answer Box */}
              {essay.modelAnswer && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-foreground space-y-1">
                  <strong className="text-emerald-700 dark:text-emerald-300 block font-black">
                    ✓ الإجابة النموذجية:
                  </strong>
                  <div className="leading-relaxed">
                    <BidiStatement text={essay.modelAnswer} />
                  </div>
                </div>
              )}

              {/* Explanation Box */}
              {essay.explanation && (
                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30 text-[11px] text-muted-foreground space-y-0.5">
                  <strong className="text-foreground block font-bold">💡 التفسير:</strong>
                  <div className="leading-relaxed">
                    <BidiStatement text={essay.explanation} />
                  </div>
                </div>
              )}

              {/* Footer Metadata */}
              <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-muted-foreground border-t border-border/40">
                <span className="bg-muted px-2 py-0.5 rounded-md">
                  الصعوبة: {essay.difficulty === "easy" ? "سهل 🟢" : essay.difficulty === "hard" ? "صعب 🔴" : "متوسط 🟡"}
                </span>
                <span className="bg-muted px-2 py-0.5 rounded-md">
                  الدرجات: {essay.points || 1}
                </span>
                {essay.concept && (
                  <span className="bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-md">
                    {essay.concept}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
