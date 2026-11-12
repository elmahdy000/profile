import { useState, useMemo } from "react";
import {
  Plus,
  UploadCloud,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  FileText,
  Search,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BidiStatement } from "../BidiStatement";
import type { KholasaMaterial } from "../types";

export interface AdminQbRow {
  id: number;
  difficulty: string;
  points: number;
  concept: string | null;
  translation: string | null;
  question: {
    prompt: string;
    options: string[];
    correctIndex: number;
    correctAnswer?: string;
    explanation?: string;
    questionType?: string;
    translation?: string;
    concept?: string;
  };
}

export interface AdminEssayRow {
  id: number;
  difficulty: string;
  points: number;
  prompt: string;
  modelAnswer: string;
  explanation: string | null;
}

interface KholasaQuestionsManagerProps {
  material: KholasaMaterial;
  mcqQuestions: AdminQbRow[];
  trueFalseQuestions: AdminQbRow[];
  essayQuestions: AdminEssayRow[];
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onRefreshBundle: () => Promise<void>;
}

export function KholasaQuestionsManager({
  material,
  mcqQuestions,
  trueFalseQuestions,
  essayQuestions,
  adminApi,
  onRefreshBundle,
}: KholasaQuestionsManagerProps) {
  const { toast } = useToast();
  const [qType, setQType] = useState<"mcq" | "true_false" | "essay">("mcq");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "add" | "bulk">("list");

  // Single question / edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [translation, setTranslation] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [points, setPoints] = useState(1);
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk upload / paste state
  const [bulkText, setBulkText] = useState("");
  const [bulkDifficulty, setBulkDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [parsingBulk, setParsingBulk] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [previewObjective, setPreviewObjective] = useState<any[] | null>(null);
  const [previewEssay, setPreviewEssay] = useState<any[] | null>(null);

  const resetForm = (targetType: "mcq" | "true_false" | "essay" = qType) => {
    setEditingId(null);
    setPrompt("");
    setOptions(targetType === "true_false" ? ["صح", "خطأ"] : ["", "", "", ""]);
    setCorrectIndex(0);
    setModelAnswer("");
    setExplanation("");
    setTranslation("");
    setDifficulty("medium");
    setPoints(targetType === "essay" ? 5 : 1);
  };

  const openEditObjective = (row: AdminQbRow, type: "mcq" | "true_false") => {
    setQType(type);
    setEditingId(row.id);
    setPrompt(row.question.prompt || "");
    const opts = row.question.options?.length ? [...row.question.options] : type === "true_false" ? ["صح", "خطأ"] : ["", "", "", ""];
    setOptions(opts);
    setCorrectIndex(row.question.correctIndex ?? 0);
    setExplanation(row.question.explanation || "");
    setTranslation(row.translation || row.question.translation || "");
    setDifficulty((row.difficulty as any) || "medium");
    setPoints(row.points || 1);
    setMode("add");
  };

  const openEditEssay = (row: AdminEssayRow) => {
    setQType("essay");
    setEditingId(row.id);
    setPrompt(row.prompt || "");
    setModelAnswer(row.modelAnswer || "");
    setExplanation(row.explanation || "");
    setDifficulty((row.difficulty as any) || "medium");
    setPoints(row.points || 5);
    setMode("add");
  };

  const handleSaveSingle = async () => {
    if (!prompt.trim()) {
      toast({ title: "اكتب نص السؤال أولاً", variant: "destructive" });
      return;
    }

    try {
      setSavingSingle(true);
      if (qType === "essay") {
        if (!modelAnswer.trim()) {
          toast({ title: "اكتب الإجابة النموذجية للسؤال المقالي", variant: "destructive" });
          return;
        }
        const payload = {
          prompt: prompt.trim(),
          modelAnswer: modelAnswer.trim(),
          explanation: explanation.trim() || null,
          difficulty,
          points: Number(points) || 5,
          stage: material.stage,
          stages: material.stages?.length ? material.stages : [material.stage],
          unit: material.unit,
          lesson: material.lesson,
          courseId: material.courseId,
        };
        if (editingId) {
          await adminApi(`/api/admin/learning/essay-question-bank/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          toast({ title: "تم تعديل السؤال المقالي بنجاح ✓" });
        } else {
          await adminApi("/api/admin/learning/essay-question-bank", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast({ title: "تمت إضافة السؤال المقالي للدرس ✓" });
        }
      } else {
        const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          toast({ title: "أضف خيارين على الأقل للسؤال", variant: "destructive" });
          return;
        }
        const safeIdx = Math.max(0, Math.min(cleanOpts.length - 1, correctIndex));
        const payload = {
          prompt: prompt.trim(),
          options: cleanOpts,
          correctIndex: safeIdx,
          explanation: explanation.trim() || undefined,
          translation: translation.trim() || undefined,
          questionType: qType,
          difficulty,
          points: Number(points) || 1,
          stage: material.stage,
          stages: material.stages?.length ? material.stages : [material.stage],
          unit: material.unit,
          lesson: material.lesson,
          lessonId: material.videoId,
          courseId: material.courseId,
        };
        if (editingId) {
          await adminApi(`/api/admin/learning/question-bank/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          toast({ title: "تم تعديل السؤال بنجاح ✓" });
        } else {
          await adminApi("/api/admin/learning/question-bank", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast({ title: "تمت إضافة السؤال لبنك الدرس ✓" });
        }
      }
      resetForm(qType);
      setMode("list");
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setSavingSingle(false);
    }
  };

  const handleDeleteObjective = async (id: number) => {
    if (!confirm("هل تريد حذف هذا السؤال من الدرس؟")) return;
    try {
      await adminApi(`/api/admin/learning/question-bank/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف السؤال ✓" });
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteEssay = async (id: number) => {
    if (!confirm("هل تريد حذف هذا السؤال المقالي؟")) return;
    try {
      await adminApi(`/api/admin/learning/essay-question-bank/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف السؤال المقالي ✓" });
      await onRefreshBundle();
    } catch (err: any) {
      toast({ title: "تعذر الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkParseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      setParsingBulk(true);
      setPreviewObjective(null);
      setPreviewEssay(null);

      if (qType === "essay") {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("defaultStage", material.stage);
        fd.append("defaultUnit", material.unit);
        fd.append("defaultLesson", material.lesson);
        fd.append("defaultDifficulty", bulkDifficulty);
        const res = await adminApi<{ questions: any[] }>("/api/admin/learning/essay-question-bank/upload-parse", {
          method: "POST",
          body: fd,
        });
        setPreviewEssay(res.questions || []);
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("stage", material.stage);
        fd.append("unit", material.unit);
        fd.append("lesson", material.lesson);
        if (material.videoId) fd.append("lessonId", String(material.videoId));
        fd.append("difficulty", bulkDifficulty);
        fd.append("previewOnly", "true");
        const res = await adminApi<{ questions: any[]; extractedText?: string }>("/api/admin/learning/test-bank/upload", {
          method: "POST",
          body: fd,
        });
        if (res.extractedText && (!res.questions || res.questions.length === 0)) {
          setBulkText(res.extractedText);
        }
        setPreviewObjective(res.questions || []);
      }
    } catch (err: any) {
      toast({ title: "فشل قراءة الملف", description: err.message, variant: "destructive" });
    } finally {
      setParsingBulk(false);
    }
  };

  const handleBulkParseText = async () => {
    if (!bulkText.trim()) return;
    try {
      setParsingBulk(true);
      setPreviewObjective(null);
      setPreviewEssay(null);

      if (qType === "essay") {
        const res = await adminApi<{ questions: any[] }>("/api/admin/learning/essay-question-bank/upload-parse", {
          method: "POST",
          body: JSON.stringify({
            rawText: bulkText,
            defaultStage: material.stage,
            defaultUnit: material.unit,
            defaultLesson: material.lesson,
            defaultDifficulty: bulkDifficulty,
          }),
        });
        setPreviewEssay(res.questions || []);
      } else {
        const res = await adminApi<{ questions: any[] }>("/api/admin/learning/test-bank/upload", {
          method: "POST",
          body: JSON.stringify({
            text: bulkText,
            stage: material.stage,
            unit: material.unit,
            lesson: material.lesson,
            lessonId: material.videoId,
            difficulty: bulkDifficulty,
            previewOnly: true,
          }),
        });
        setPreviewObjective(res.questions || []);
      }
    } catch (err: any) {
      toast({ title: "تعذر تحليل النص", description: err.message, variant: "destructive" });
    } finally {
      setParsingBulk(false);
    }
  };

  const handleConfirmBulkSave = async () => {
    try {
      setSavingBulk(true);
      if (qType === "essay" && previewEssay?.length) {
        const valid = previewEssay
          .filter((q) => q.prompt?.trim() && q.modelAnswer?.trim())
          .map((q) => ({
            ...q,
            stage: material.stage,
            stages: material.stages?.length ? material.stages : [material.stage],
            unit: material.unit,
            lesson: material.lesson,
            courseId: material.courseId,
            difficulty: q.difficulty || bulkDifficulty,
          }));
        const res = await adminApi<{ insertedCount: number }>("/api/admin/learning/essay-question-bank/bulk-save", {
          method: "POST",
          body: JSON.stringify({ questions: valid }),
        });
        toast({ title: `تم حفظ ${res.insertedCount} سؤال مقالي للدرس ✓` });
        setPreviewEssay(null);
        setBulkText("");
        setMode("list");
        await onRefreshBundle();
      } else if (previewObjective?.length) {
        const tagged = previewObjective.map((q) => ({
          ...q,
          questionType: qType === "true_false" || q.options?.length === 2 ? "true_false" : "mcq",
        }));
        const res = await adminApi<{ count?: number; insertedCount?: number; message?: string }>("/api/admin/learning/test-bank/upload", {
          method: "POST",
          body: JSON.stringify({
            questions: tagged,
            stage: material.stage,
            unit: material.unit,
            lesson: material.lesson,
            lessonId: material.videoId,
            courseId: material.courseId,
            difficulty: bulkDifficulty,
          }),
        });
        const savedCount = res.count ?? res.insertedCount ?? tagged.length;
        toast({ title: res.message || `تم حفظ ${savedCount} سؤال في بنك الدرس ✓` });
        setPreviewObjective(null);
        setBulkText("");
        setMode("list");
        await onRefreshBundle();
      }
    } catch (err: any) {
      toast({ title: "تعذر حفظ الأسئلة", description: err.message, variant: "destructive" });
    } finally {
      setSavingBulk(false);
    }
  };

  const currentObjectiveList = qType === "true_false" ? trueFalseQuestions : mcqQuestions;
  const filteredObjective = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentObjectiveList;
    return currentObjectiveList.filter(
      (r) =>
        r.question?.prompt?.toLowerCase().includes(q) ||
        r.question?.options?.some((o) => o.toLowerCase().includes(q)),
    );
  }, [currentObjectiveList, search]);

  const filteredEssay = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return essayQuestions;
    return essayQuestions.filter(
      (r) => r.prompt.toLowerCase().includes(q) || r.modelAnswer.toLowerCase().includes(q),
    );
  }, [essayQuestions, search]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Type Selector & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "mcq" as const, label: `اختيار من متعدد (${mcqQuestions.length})` },
            { id: "true_false" as const, label: `صح وخطأ (${trueFalseQuestions.length})` },
            { id: "essay" as const, label: `مقالي (${essayQuestions.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setQType(t.id);
                setPreviewObjective(null);
                setPreviewEssay(null);
                if (mode === "add" && !editingId) resetForm(t.id);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                qType === t.id ? "bg-primary text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant={mode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("list")}
            className="h-8 rounded-xl text-xs font-bold cursor-pointer"
          >
            عرض القائمة
          </Button>
          <Button
            type="button"
            variant={mode === "add" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              resetForm(qType);
              setMode("add");
            }}
            className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة سؤال
          </Button>
          <Button
            type="button"
            variant={mode === "bulk" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("bulk")}
            className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5" /> رفع ملف / لصق مجمع
          </Button>
        </div>
      </div>

      {/* Mode 1: Single Add / Edit */}
      {mode === "add" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-900">
              {editingId ? "تعديل السؤال" : qType === "essay" ? "إضافة سؤال مقالي للدرس" : qType === "true_false" ? "إضافة سؤال صح وخطأ" : "إضافة سؤال اختيار من متعدد"}
            </h5>
            <button
              type="button"
              onClick={() => {
                resetForm(qType);
                setMode("list");
              }}
              className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <textarea
            rows={3}
            placeholder="نص السؤال..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
          />

          {qType === "essay" ? (
            <textarea
              rows={4}
              placeholder="الإجابة النموذجية الكاملة..."
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 text-xs"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">الخيارات (اختر الإجابة الصحيحة)</label>
                {qType === "mcq" && options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, ""])}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    + خيار إضافي
                  </button>
                )}
              </div>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kholasa_correct_opt"
                    checked={correctIndex === idx}
                    onChange={() => setCorrectIndex(idx)}
                    className="h-4 w-4 accent-emerald-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder={`الخيار ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                    className={`flex-1 h-9 rounded-xl border px-3 text-xs ${
                      correctIndex === idx ? "border-emerald-500 bg-emerald-50/50 font-bold" : "border-slate-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2.5">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white font-bold"
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
            <input
              type="number"
              min={1}
              max={20}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 1)}
              placeholder="الدرجة"
              className="h-9 rounded-xl border border-slate-200 px-3 text-xs"
            />
          </div>

          <input
            type="text"
            placeholder="التفسير / الشرح بعد الحل (اختياري)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
          />

          {qType !== "essay" && (
            <input
              type="text"
              placeholder="ترجمة السؤال بالعربية إذا كان السؤال بالإنجليزية (اختياري)"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
            />
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setMode("list")}>
              إلغاء
            </Button>
            <Button type="button" size="sm" disabled={savingSingle} onClick={() => void handleSaveSingle()} className="gap-1.5 font-bold">
              {savingSingle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingId ? "حفظ التعديلات" : "إضافة للدرس"}
            </Button>
          </div>
        </div>
      )}

      {/* Mode 2: Bulk Upload / Smart Paste */}
      {mode === "bulk" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-black text-slate-900">
                رفع مجمع ({qType === "essay" ? "أسئلة مقالية" : qType === "true_false" ? "صح وخطأ" : "اختيار من متعدد"})
              </h5>
              <p className="text-[11px] text-slate-500">
                ارفع ملف Word (.docx) أو PDF أو TXT أو JSON أو الصق الأسئلة مباشرة لمعاينتها قبل الحفظ.
              </p>
            </div>
            <label className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-white cursor-pointer hover:opacity-90">
              {parsingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              <span>اختيار ملف (Word/PDF/TXT/JSON)</span>
              <input type="file" accept=".docx,.pdf,.txt,.json" className="hidden" onChange={handleBulkParseFile} />
            </label>
          </div>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={
              qType === "essay"
                ? "مثال:\nالسؤال (1): اشرح الفرق بين...\nالإجابة النموذجية: ...\n\nأو الصق مصفوفة JSON..."
                : "مثال:\n1. ما هي لغة هيكلة صفحات الويب؟\nأ) HTML\nب) CSS\nج) SQL\nد) Python\nالإجابة الصحيحة: أ"
            }
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={bulkDifficulty}
              onChange={(e) => setBulkDifficulty(e.target.value as any)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white font-bold"
            >
              <option value="easy">الصعوبة الافتراضية: سهل</option>
              <option value="medium">الصعوبة الافتراضية: متوسط</option>
              <option value="hard">الصعوبة الافتراضية: صعب</option>
            </select>
            <Button
              type="button"
              size="sm"
              disabled={parsingBulk || !bulkText.trim()}
              onClick={() => void handleBulkParseText()}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              {parsingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              معاينة واستخراج الأسئلة
            </Button>
          </div>

          {/* Preview Detected Questions */}
          {previewObjective && previewObjective.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <strong className="text-xs text-emerald-800">تم اكتشاف {previewObjective.length} سؤال جاهز للحفظ ✓</strong>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingBulk}
                  onClick={() => void handleConfirmBulkSave()}
                  className="h-8 rounded-xl text-xs font-bold gap-1"
                >
                  {savingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  اعتماد وحفظ الكل بالدرس
                </Button>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {previewObjective.map((pq, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px]">
                    <div className="font-bold">{i + 1}. {pq.prompt}</div>
                    <div className="text-emerald-700 mt-1">✓ الإجابة: {pq.options?.[pq.correctIndex] || pq.correctAnswer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewEssay && previewEssay.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <strong className="text-xs text-emerald-800">تم اكتشاف {previewEssay.length} سؤال مقالي جاهز للحفظ ✓</strong>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingBulk}
                  onClick={() => void handleConfirmBulkSave()}
                  className="h-8 rounded-xl text-xs font-bold gap-1"
                >
                  {savingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  اعتماد وحفظ الأسئلة المقالية
                </Button>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {previewEssay.map((pq, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px]">
                    <div className="font-bold">{i + 1}. {pq.prompt}</div>
                    <div className="text-emerald-700 mt-1 line-clamp-2">✓ الحل النموذجي: {pq.modelAnswer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Questions List */}
      {mode === "list" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث داخل أسئلة هذا الدرس..."
              className="w-full h-9 rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs"
            />
          </div>

          {qType === "essay" ? (
            filteredEssay.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                لا توجد أسئلة مقالية في هذا الدرس حالياً.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                {filteredEssay.map((row, idx) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-black text-primary">مقالي #{idx + 1} ({row.difficulty})</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEditEssay(row)} className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => void handleDeleteEssay(row.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      <BidiStatement text={row.prompt} />
                    </div>
                    <div className="text-[11px] text-emerald-700 bg-emerald-50/60 rounded-lg p-2 line-clamp-2">
                      ✓ <BidiStatement text={row.modelAnswer} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredObjective.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              لا توجد أسئلة من هذا النوع في هذا الدرس حالياً.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
              {filteredObjective.map((row, idx) => {
                const ansText = row.question.options?.[row.question.correctIndex] || row.question.correctAnswer || "";
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-black text-primary">
                        #{idx + 1} ({row.difficulty})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditObjective(row, qType === "true_false" ? "true_false" : "mcq")}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteObjective(row.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      <BidiStatement text={row.question.prompt} />
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      ✓ <BidiStatement text={ansText} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

