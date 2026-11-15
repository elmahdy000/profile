import React, { useState } from "react";
import {
  Download,
  FileText,
  FileCode,
  Printer,
  Check,
  X,
  Sparkles,
  Layers,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CurriculumExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: string;
  unit: string;
  lesson?: string;
  totalQuestions?: number;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
}

export function CurriculumExportModal({
  isOpen,
  onClose,
  stage,
  unit,
  lesson = "all",
  totalQuestions = 0,
  adminApi,
}: CurriculumExportModalProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<"json" | "doc_with_answers" | "doc_student_only">("doc_with_answers");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const isWholeUnit = !lesson || lesson === "all";
  const title = isWholeUnit ? `تصدير جميع أسئلة: (${unit})` : `تصدير أسئلة: (${lesson})`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        stage,
        unit,
      });
      if (lesson && lesson !== "all") {
        params.set("lesson", lesson);
      }

      const data = await adminApi<any>(`/api/admin/learning/curriculum/export-json?${params.toString()}`);
      const questions: any[] = data.allQuestions || [];

      if (questions.length === 0) {
        toast({
          variant: "destructive",
          title: "لا توجد أسئلة",
          description: "لم يتم العثور على أي أسئلة لتصديرها في هذا النطاق.",
        });
        setIsExporting(false);
        return;
      }

      const cleanUnitName = unit.replace(/[\\/:*?"<>|]/g, "_");
      const cleanLessonName = lesson && lesson !== "all" ? lesson.replace(/[\\/:*?"<>|]/g, "_") : "";
      const baseName = cleanLessonName ? `أسئلة_${cleanLessonName}` : `أسئلة_${cleanUnitName}`;

      if (exportFormat === "json") {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        downloadBlob(blob, `${baseName}.json`);
        toast({
          title: "تم تصدير ملف JSON بنجاح ✓",
          description: `تم حفظ ${questions.length} سؤال بصيغة JSON مهيكلة.`,
        });
      } else {
        const includeAnswers = exportFormat === "doc_with_answers";
        const textContent = generateFormattedText(questions, stage, unit, isWholeUnit ? "شامل الوحدة" : lesson, includeAnswers);
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const suffix = includeAnswers ? "نموذج_الإجابة" : "نسخة_الطالب";
        downloadBlob(blob, `${baseName}_(${suffix}).txt`);
        toast({
          title: includeAnswers ? "تم تصدير بنك الأسئلة مع الإجابات والتفسيرات ✓" : "تم تصدير ورقة الأسئلة للطلاب بنجاح ✓",
          description: `تم حفظ ${questions.length} سؤال في ملف نصي منسق وجاهز.`,
        });
      }

      onClose();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ أثناء التصدير",
        description: err.message || "تعذر تصدير الأسئلة حالياً.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateFormattedText = (
    questions: any[],
    stageName: string,
    unitName: string,
    lessonName: string,
    includeAnswers: boolean
  ): string => {
    let out = "";
    out += "========================================================================\n";
    out += `                منصة د. محمود المهدي التعليمية               \n`;
    out += `المرحلة: ${stageName}\n`;
    out += `الوحدة: ${unitName}\n`;
    out += `الدرس: ${lessonName}\n`;
    out += `إجمالي الأسئلة: ${questions.length} سؤال\n`;
    out += `النوع: ${includeAnswers ? "نسخة المعلم (مع الإجابات النموذجية والتفسيرات)" : "نسخة الطالب (ورقة أسئلة فقط)"}\n`;
    out += `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}\n`;
    out += "========================================================================\n\n";

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const typeLabel = q.type || (q.category === "essay" ? "سؤال مقالي" : "اختيار من متعدد");
      out += `[السؤال ${qNum}] (${typeLabel}) [${q.points || 1} درجة]\n`;
      out += `${q.prompt}\n\n`;

      if (q.category === "essay") {
        if (includeAnswers) {
          out += `الإجابة النموذجية:\n${q.modelAnswer || "غير محددة"}\n\n`;
          if (q.explanation) {
            out += `التفسير / الشرح:\n${q.explanation}\n\n`;
          }
        } else {
          out += "الإجابة: __________________________________________________\n";
          out += "        __________________________________________________\n\n";
        }
      } else {
        // MCQ or True/False
        const options: string[] = q.options || [];
        options.forEach((opt, optIdx) => {
          const letter = ["أ", "ب", "ج", "د", "هـ", "و"][optIdx] || `${optIdx + 1}`;
          out += `   (${letter}) ${opt}\n`;
        });
        out += "\n";

        if (includeAnswers) {
          out += `* الإجابة الصحيحة: ${q.correctAnswer || (typeof q.correctIndex === "number" ? options[q.correctIndex] : "")}\n`;
          if (q.explanation) {
            out += `* التفسير: ${q.explanation}\n`;
          }
          out += "\n";
        }
      }
      out += "------------------------------------------------------------------------\n\n";
    });

    return out;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-600/20 shadow-xs">
              <Download className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">{title}</h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {stage} • {totalQuestions ? `${totalQuestions} سؤال متاح` : "تصدير متكامل"}
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

        {/* Export Formats Choices */}
        <div className="space-y-2">
          <label className="text-xs font-black text-foreground block">اختر صيغة ونموذج التصدير:</label>
          <div className="grid grid-cols-1 gap-2">
            {/* Format 1: Teacher Complete Sheet with answers */}
            <button
              type="button"
              onClick={() => setExportFormat("doc_with_answers")}
              className={`p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                exportFormat === "doc_with_answers"
                  ? "bg-blue-500/10 border-blue-600 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted/60"
              }`}
            >
              <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-black">بنك أسئلة منسق مع الإجابات والتفسيرات</strong>
                  {exportFormat === "doc_with_answers" && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ملف نصي منسق (نسخة المعلم) يشمل نص الأسئلة، الخيارات، الإجابة الصحيحة وشرح سبب الإختيار.
                </p>
              </div>
            </button>

            {/* Format 2: Student Exam Sheet (without answers) */}
            <button
              type="button"
              onClick={() => setExportFormat("doc_student_only")}
              className={`p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                exportFormat === "doc_student_only"
                  ? "bg-emerald-500/10 border-emerald-600 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted/60"
              }`}
            >
              <Printer className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-black">ورقة اختبار للطلاب (بدون إجابات)</strong>
                  {exportFormat === "doc_student_only" && <Check className="h-4 w-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  جاهزة للطباعة أو التوزيع على الطلاب للحل الذاتي مع ترويسة الدرس والمرحلة والدرجات.
                </p>
              </div>
            </button>

            {/* Format 3: Clean Structured JSON */}
            <button
              type="button"
              onClick={() => setExportFormat("json")}
              className={`p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                exportFormat === "json"
                  ? "bg-purple-500/10 border-purple-600 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-xs"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted/60"
              }`}
            >
              <FileCode className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-black">ملف JSON مهيكل وقابل لإعادة الاستيراد</strong>
                  {exportFormat === "json" && <Check className="h-4 w-4 text-purple-600" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  بنية برمجية معيارية دقيقة مناسبة للنسخ الاحتياطي أو الاستيراد المباشر في أي منصة أخرى.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting} className="h-9 text-xs font-bold">
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? "جارٍ إعداد وتصدير الملف..." : "تصدير وتحميل الملف فوراً"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
