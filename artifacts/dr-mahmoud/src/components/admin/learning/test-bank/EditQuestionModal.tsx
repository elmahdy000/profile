import React from "react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptionLabel, isEnglishQuestion } from "./types";

interface EditQuestionModalProps {
  isOpen: boolean;
  editingQuestion: any | null;
  setEditingQuestion: (q: any) => void;
  savingQuestion: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export function EditQuestionModal({
  isOpen,
  editingQuestion,
  setEditingQuestion,
  savingQuestion,
  onClose,
  onSave,
}: EditQuestionModalProps) {
  if (!isOpen || !editingQuestion) return null;

  const isEnglish = isEnglishQuestion(editingQuestion.prompt, editingQuestion.options);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>{editingQuestion.id ? "تعديل السؤال في البنك" : "إضافة سؤال جديد للدرس"}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">نص السؤال *</label>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                  isEnglish
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
              </span>
            </div>
            <textarea
              rows={3}
              required
              dir={isEnglish ? "ltr" : "rtl"}
              value={editingQuestion.prompt}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, prompt: e.target.value })
              }
              placeholder={isEnglish ? "Type question prompt here..." : "اكتب نص السؤال هنا..."}
              className={`w-full rounded-xl border border-border bg-background p-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                isEnglish ? "text-left font-sans" : "text-right font-sans"
              }`}
            />
          </div>

          {/* Choices */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              الاختيارات (حدد الدائرة بجانب الإجابة الصحيحة):
            </label>
            {editingQuestion.options.map((opt: string, i: number) => {
              const letter = getOptionLabel(i, isEnglish);
              const isChecked = editingQuestion.correctIndex === i;
              return (
                <div key={i} dir={isEnglish ? "ltr" : "rtl"} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={isChecked}
                    onChange={() =>
                      setEditingQuestion({ ...editingQuestion, correctIndex: i })
                    }
                    className="h-4 w-4 accent-emerald-600 cursor-pointer shrink-0"
                  />
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[11px] font-black shrink-0">
                    {letter}
                  </span>
                  <input
                    type="text"
                    required
                    dir={isEnglish ? "ltr" : "rtl"}
                    value={opt}
                    onChange={(e) => {
                      const next = [...editingQuestion.options];
                      next[i] = e.target.value;
                      setEditingQuestion({ ...editingQuestion, options: next });
                    }}
                    placeholder={isEnglish ? `Option (${letter})` : `الاختيار (${letter})`}
                    className={`flex-1 h-9 px-3 rounded-xl border text-xs font-bold text-foreground focus:outline-none ${
                      isChecked
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border bg-background"
                    } ${isEnglish ? "text-left font-sans" : "text-right font-sans"}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">مستوى الصعوبة</label>
              <select
                value={editingQuestion.difficulty || "medium"}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold cursor-pointer"
              >
                <option value="easy">سهل 🟢</option>
                <option value="medium">متوسط 🟡</option>
                <option value="hard">صعب 🔴</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">درجة السؤال</label>
              <input
                type="number"
                min={1}
                max={10}
                value={editingQuestion.points || 1}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, points: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">
              {isEnglish ? "Explanation / Steps (Optional)" : "التفسير وخطوات الإجابة (اختياري)"}
            </label>
            <textarea
              rows={2}
              dir={isEnglish ? "ltr" : "rtl"}
              value={editingQuestion.explanation || ""}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
              }
              placeholder={isEnglish ? "Explain why this answer is correct..." : "شرح سبب صحة هذا الاختيار..."}
              className={`w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                isEnglish ? "text-left font-sans" : "text-right font-sans"
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">
              رابط صورة السؤال (اختياري)
            </label>
            <input
              type="text"
              value={editingQuestion.imageUrl || ""}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })
              }
              placeholder="https://... أو /api/..."
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button
              type="submit"
              disabled={savingQuestion}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer"
            >
              {savingQuestion ? "جارٍ الحفظ..." : "حفظ السؤال في البنك 💾"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
