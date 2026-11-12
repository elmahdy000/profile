import { useState } from "react";
import {
  ClipboardCheck,
  Sparkles,
  UploadCloud,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { KholasaMaterial } from "../types";

export interface AdminLessonQuizRow {
  id: number;
  title: string;
  scope: string;
  videoId: number | null;
  durationMinutes: number | null;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  questionsCount: number;
}

interface KholasaExamBuilderProps {
  material: KholasaMaterial;
  quizzes: AdminLessonQuizRow[];
  totalBankQuestions: number;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onRefreshBundle: () => Promise<void>;
}

export function KholasaExamBuilder({
  material,
  quizzes,
  totalBankQuestions,
  adminApi,
  onRefreshBundle,
}: KholasaExamBuilderProps) {
  const { toast } = useToast();
  const [builderMode, setBuilderMode] = useState<"generate" | "upload">("generate");

  // Shared Exam Settings
  const [title, setTitle] = useState(`اختبار على: ${material.lesson}`);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [scope, setScope] = useState<"lesson" | "course">(material.videoId ? "lesson" : "course");
  const [isPublished, setIsPublished] = useState(true);

  // Mode 1: Smart Generate from Bank
  const [genCount, setGenCount] = useState(Math.min(20, Math.max(5, totalBankQuestions || 10)));
  const [genType, setGenType] = useState<"all" | "mcq" | "true_false">("all");
  const [generating, setGenerating] = useState(false);

  // Mode 2: Upload / Paste Custom Exam
  const [rawText, setRawText] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[] | null>(null);
  const [creatingCustom, setCreatingCustom] = useState(false);

  const handleGenerateExam = async () => {
    if (!title.trim()) {
      toast({ title: "اكتب عنوان الاختبار", variant: "destructive" });
      return;
    }
    try {
      setGenerating(true);
      const res = await adminApi<{ actualCount?: number; note?: string }>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          stage: material.stage,
          stages: material.stages?.length ? material.stages : [material.stage],
          unit: material.unit,
          lesson: material.lesson,
          courseId: material.courseId,
          videoId: scope === "lesson" ? material.videoId : null,
          scope,
          count: Math.max(1, Number(genCount) || 10),
          questionType: genType,
          durationMinutes: Number(durationMinutes) || null,
          passingScore: Number(passingScore) || 60,
          maxAttempts: Number(maxAttempts),
          shuffleQuestions: true,
          showExplanations: true,
          isPublished,
        }),
      });
      toast({
        title: `تم إنشاء الاختبار بنجاح (${res.actualCount ?? genCount} سؤال) ✓`,
        description: res.note,
      });
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر توليد الاختبار", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadExamFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      setParsingFile(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("stage", material.stage);
      fd.append("unit", material.unit);
      fd.append("lesson", material.lesson);
      fd.append("previewOnly", "true");
      const res = await adminApi<{ questions: any[]; extractedText?: string }>("/api/admin/learning/test-bank/upload", {
        method: "POST",
        body: fd,
      });
      if (res.extractedText && (!res.questions || res.questions.length === 0)) {
        setRawText(res.extractedText);
      }
      setParsedQuestions(res.questions || []);
      if (!res.questions?.length) {
        toast({ title: "لم يتم التعرف على نمط أسئلة تلقائي — راجع النص المستخرج بالأسفل", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "فشل تحليل ملف الاختبار", description: err.message, variant: "destructive" });
    } finally {
      setParsingFile(false);
    }
  };

  const handleParseExamText = async () => {
    if (!rawText.trim()) return;
    try {
      setParsingFile(true);
      const res = await adminApi<{ questions: any[] }>("/api/admin/learning/test-bank/upload", {
        method: "POST",
        body: JSON.stringify({
          text: rawText,
          stage: material.stage,
          unit: material.unit,
          lesson: material.lesson,
          previewOnly: true,
        }),
      });
      setParsedQuestions(res.questions || []);
    } catch (err: any) {
      toast({ title: "تعذر تحليل النص", description: err.message, variant: "destructive" });
    } finally {
      setParsingFile(false);
    }
  };

  const handleCreateCustomQuiz = async () => {
    if (!title.trim() || !parsedQuestions?.length) return;
    try {
      setCreatingCustom(true);
      await adminApi(`/api/admin/learning/kholasa/materials/${material.id}/create-quiz`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          scope,
          durationMinutes: Number(durationMinutes) || null,
          passingScore: Number(passingScore) || 60,
          maxAttempts: Number(maxAttempts),
          isPublished,
          questions: parsedQuestions,
        }),
      });
      toast({ title: `تم رفع ونشر الاختبار (${parsedQuestions.length} سؤال) بنجاح ✓` });
      setParsedQuestions(null);
      setRawText("");
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر إنشاء الاختبار", description: err.message, variant: "destructive" });
    } finally {
      setCreatingCustom(false);
    }
  };

  const handleToggleQuizPublish = async (q: AdminLessonQuizRow) => {
    try {
      await adminApi(`/api/admin/learning/quizzes/${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !q.isPublished }),
      });
      toast({ title: q.isPublished ? "تم إخفاء الاختبار" : "تم نشر الاختبار للطلاب ✓" });
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الاختبار نهائياً؟")) return;
    try {
      await adminApi(`/api/admin/learning/quizzes/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف الاختبار ✓" });
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر الحذف", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Existing Lesson Quizzes */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
        <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4 text-primary" /> الاختبارات المرتبطة بهذا الدرس ({quizzes.length})
        </h5>
        {quizzes.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">لا توجد اختبارات مضافة لهذا الدرس بعد.</p>
        ) : (
          <div className="space-y-2">
            {quizzes.map((qz) => (
              <div
                key={qz.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
              >
                <div>
                  <div className="text-xs font-black text-slate-900">{qz.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {qz.questionsCount} سؤال • نجاح {qz.passingScore}% • {qz.scope === "lesson" ? "مرتبط بالفيديو" : "مفتوح في الاختبارات"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      qz.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {qz.isPublished ? "منشور" : "مخفي"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleToggleQuizPublish(qz)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    title={qz.isPublished ? "إخفاء" : "نشر"}
                  >
                    {qz.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteQuiz(qz.id)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBuilderMode("generate")}
          className={`flex-1 rounded-xl border py-2.5 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
            builderMode === "generate" ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <Sparkles className="h-4 w-4" /> توليد اختبار فوري من بنك الدرس ({totalBankQuestions} سؤال متاح)
        </button>
        <button
          type="button"
          onClick={() => setBuilderMode("upload")}
          className={`flex-1 rounded-xl border py-2.5 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
            builderMode === "upload" ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <UploadCloud className="h-4 w-4" /> رفع اختبار من ملف (Word / PDF / نص)
        </button>
      </div>

      {/* Common Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <label className="text-xs font-bold block mb-1">عنوان الاختبار</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="text-[11px] font-bold block mb-1">المدة (دقيقة)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 20)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1">نسبة النجاح %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value) || 60)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1">المحاولات (0 = لا نهائي)</label>
            <input
              type="number"
              min={0}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1">نطاق الظهور</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs bg-white font-bold"
            >
              {material.videoId && <option value="lesson">اختبار مرتبط بفيديو الدرس</option>}
              <option value="course">متاح في صفحة الاختبارات مباشرة</option>
            </select>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          نشر الاختبار للطلاب وإرسال إشعار فور الإنشاء
        </label>

        {builderMode === "generate" ? (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">عدد الأسئلة</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value) || 10)}
                  className="w-28 h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1">نوع الأسئلة</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as any)}
                  className="h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white font-bold"
                >
                  <option value="all">شامل (اختياري + صح وخطأ)</option>
                  <option value="mcq">اختيار من متعدد فقط</option>
                  <option value="true_false">صح وخطأ فقط</option>
                </select>
              </div>
            </div>

            <Button
              type="button"
              disabled={generating || totalBankQuestions === 0}
              onClick={() => void handleGenerateExam()}
              className="h-10 px-5 rounded-xl text-xs font-black gap-1.5 cursor-pointer"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              توليد ونشر الاختبار الآن
            </Button>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">ارفع ملف الاختبار أو الصق الأسئلة:</span>
              <label className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white cursor-pointer hover:opacity-90">
                {parsingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                <span>اختيار ملف (Word/PDF/TXT/JSON)</span>
                <input type="file" accept=".docx,.pdf,.txt,.json" className="hidden" onChange={handleUploadExamFile} />
              </label>
            </div>

            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"الصق أسئلة الاختبار هنا...\n1. السؤال...\nأ) خيار 1\nب) خيار 2\nالإجابة الصحيحة: أ"}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono"
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parsingFile || !rawText.trim()}
                onClick={() => void handleParseExamText()}
                className="h-9 rounded-xl text-xs font-bold gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> معاينة أسئلة الاختبار
              </Button>
            </div>

            {parsedQuestions && parsedQuestions.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-emerald-800">جاهز للنشر: {parsedQuestions.length} سؤال ✓</strong>
                  <Button
                    type="button"
                    size="sm"
                    disabled={creatingCustom}
                    onClick={() => void handleCreateCustomQuiz()}
                    className="h-9 rounded-xl text-xs font-black gap-1.5"
                  >
                    {creatingCustom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    اعتماد وإنشاء الاختبار
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {parsedQuestions.map((pq, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-2 text-[11px]">
                      <strong>{i + 1}. {pq.prompt}</strong>
                      <div className="text-emerald-700">✓ {pq.options?.[pq.correctIndex] || pq.correctAnswer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

