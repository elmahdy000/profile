import React, { useState } from "react";
import {
  X,
  BookOpen,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OfflineSavedLesson } from "@/lib/offlineStorage";

interface OfflineLessonModalProps {
  lesson: OfflineSavedLesson;
  onClose: () => void;
}

type LessonTab = "summary" | "flashcards" | "definitions" | "questions";

export const OfflineLessonModal: React.FC<OfflineLessonModalProps> = ({ lesson, onClose }) => {
  const [activeTab, setActiveTab] = useState<LessonTab>("summary");

  // Flashcards state
  const flashcards = lesson.flashcards || [];
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Definitions search
  const definitions = lesson.definitions || [];
  const [defSearch, setDefSearch] = useState("");

  // Questions interactive state: { [qIdx]: { selectedOption: string | number, isChecked: boolean } }
  const questions = lesson.questions || [];
  const [userAnswers, setUserAnswers] = useState<Record<number, { selected: any; checked: boolean }>>({});

  const handleSelectAnswer = (qIdx: number, val: any) => {
    if (userAnswers[qIdx]?.checked) return; // locked once checked
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: { selected: val, checked: false },
    }));
  };

  const handleCheckAnswer = (qIdx: number) => {
    setUserAnswers((prev) => {
      const cur = prev[qIdx];
      if (!cur || cur.selected === undefined) return prev;
      return {
        ...prev,
        [qIdx]: { ...cur, checked: true },
      };
    });
  };

  const handleResetAnswer = (qIdx: number) => {
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[qIdx];
      return next;
    });
  };

  const filteredDefinitions = definitions.filter(
    (d) =>
      d.term?.toLowerCase().includes(defSearch.toLowerCase()) ||
      d.definition?.toLowerCase().includes(defSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#0D1B30]/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {lesson.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  وضع الأوفلاين ⚡
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lesson.courseTitle || "المادة التعليمية"} {lesson.unit ? `• ${lesson.unit}` : ""} {lesson.duration ? `• ${lesson.duration} دقيقة` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1528] shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                activeTab === "summary"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>الشرح والزتونة المقروءة 📝</span>
            </button>

            {flashcards.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("flashcards")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  activeTab === "flashcards"
                    ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>كروت التسميع ({flashcards.length}) 🗂️</span>
              </button>
            )}

            {definitions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("definitions")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  activeTab === "definitions"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>المصطلحات والتعريفات ({definitions.length}) 📖</span>
              </button>
            )}

            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  activeTab === "questions"
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>تدريبات الدرس ({questions.length}) ❓</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: SUMMARY / ZATONA */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {lesson.summaryContent ? (
                <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>ملخص الدرس والزتونة المركزة:</span>
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {lesson.summaryContent}
                  </div>
                </div>
              ) : lesson.description ? (
                <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-400 mb-2">
                    وصف وشرح الدرس:
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {lesson.description}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-bold text-xs">
                  لا يوجد نص ملخص إضافي مخزن لهذا الدرس. يمكنك مراجعة الأسئلة والكروت المرفقة.
                </div>
              )}

              {/* Key Points */}
              {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 sm:p-5 rounded-2xl border border-amber-200/70 dark:border-amber-900/40">
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 mb-2.5 flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span>أهم النقاط المفتاحية بالدرس:</span>
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-medium">
                    {lesson.keyPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FLASHCARDS */}
          {activeTab === "flashcards" && flashcards.length > 0 && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-400">
                  بطاقة {currentCardIdx + 1} من {flashcards.length}
                </span>
              </div>

              {/* Interactive Card */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="min-h-[220px] p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/15 border-2 border-dashed border-amber-300 dark:border-amber-700/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-lg active:scale-98 select-none"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80">
                  {isFlipped ? "الإجابة / الشرح" : "السؤال / المفهوم (انقر لقلب البطاقة 🔄)"}
                </span>
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed">
                  {isFlipped ? flashcards[currentCardIdx]?.back : flashcards[currentCardIdx]?.front}
                </p>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentCardIdx === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                  }}
                  className="rounded-xl gap-1 text-xs font-bold"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>السابق</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="rounded-xl text-xs font-bold text-amber-600"
                >
                  قلب البطاقة 🔄
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentCardIdx === flashcards.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIdx((prev) => Math.min(flashcards.length - 1, prev + 1));
                  }}
                  className="rounded-xl gap-1 text-xs font-bold"
                >
                  <span>التالي</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: DEFINITIONS */}
          {activeTab === "definitions" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ابحث في المصطلحات والتعريفات..."
                value={defSearch}
                onChange={(e) => setDefSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none focus:border-indigo-500"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDefinitions.map((d, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1A2D] shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs sm:text-sm font-black text-purple-700 dark:text-purple-400">
                        {d.term}
                      </strong>
                      {d.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                          {d.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {d.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUESTIONS / PRACTICE */}
          {activeTab === "questions" && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                تدرب على أسئلة الدرس أوفلاين بدون استهلاك إنترنت، وتحقق من إجاباتك مع التفسير العلمي الكامل:
              </div>

              {questions.map((q, qIdx) => {
                const prompt = q.prompt || q.question?.prompt || q.questionText || "سؤال تدريبي";
                const options: string[] = q.options || q.question?.options || [];
                const explanation = q.explanation || q.question?.explanation;
                const correctAns = q.correctAnswer ?? q.correctOptionIndex ?? q.answer;

                const userAns = userAnswers[qIdx];
                const isChecked = userAns?.checked;
                const selectedVal = userAns?.selected;

                return (
                  <div
                    key={qIdx}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1A2D] shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                          {prompt}
                        </h4>
                      </div>
                      {q.difficulty && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {q.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Options list */}
                    {options.length > 0 && (
                      <div className="space-y-2">
                        {options.map((opt, optIdx) => {
                          const isOptionSelected = selectedVal === optIdx || selectedVal === opt;
                          const isCorrectOption =
                            String(correctAns) === String(optIdx) ||
                            String(correctAns) === String(opt);

                          let optionStyles =
                            "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

                          if (isChecked) {
                            if (isCorrectOption) {
                              optionStyles =
                                "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 font-black";
                            } else if (isOptionSelected && !isCorrectOption) {
                              optionStyles =
                                "border-red-500 bg-red-50 dark:bg-red-950/70 text-red-900 dark:text-red-100 font-bold line-through";
                            }
                          } else if (isOptionSelected) {
                            optionStyles =
                              "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100 font-black";
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectAnswer(qIdx, optIdx)}
                              className={`w-full p-3 rounded-xl border text-right text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${optionStyles}`}
                            >
                              <span>{opt}</span>
                              {isChecked && isCorrectOption && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              )}
                              {isChecked && isOptionSelected && !isCorrectOption && (
                                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions & Explanation */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <div>
                        {!isChecked ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={selectedVal === undefined}
                            onClick={() => handleCheckAnswer(qIdx)}
                            className="h-7.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs"
                          >
                            تحقق من الإجابة ✓
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetAnswer(qIdx)}
                            className="h-7.5 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>إعادة الحل</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Explanation */}
                    {isChecked && explanation && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                        <strong className="block font-black text-indigo-700 dark:text-indigo-400 mb-1">
                          التفسير العلمي للإجابة:
                        </strong>
                        {explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
