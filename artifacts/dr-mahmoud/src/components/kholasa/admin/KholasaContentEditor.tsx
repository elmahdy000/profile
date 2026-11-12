import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Calculator,
  CheckSquare,
  Layers,
  Plus,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  KholasaSummaryData,
  KholasaFlashcard,
  KholasaDefinition,
  KholasaKeyConcept,
  KholasaExamTip,
  KholasaCommonMistake,
  KholasaFormula,
} from "../types";

interface KholasaContentEditorProps {
  summaryData: KholasaSummaryData;
  flashcards: KholasaFlashcard[];
  onChangeSummary: (next: KholasaSummaryData) => void;
  onChangeFlashcards: (next: KholasaFlashcard[]) => void;
}

type SectionKey =
  | "definitions"
  | "concepts"
  | "tips"
  | "mistakes"
  | "formulas"
  | "checklist"
  | "flashcards";

export function KholasaContentEditor({
  summaryData,
  flashcards,
  onChangeSummary,
  onChangeFlashcards,
}: KholasaContentEditorProps) {
  const [section, setSection] = useState<SectionKey>("definitions");
  const [showJsonAdvanced, setShowJsonAdvanced] = useState(false);
  const [jsonError, setJsonError] = useState("");

  const definitions = Array.isArray(summaryData.definitions) ? summaryData.definitions : [];
  const keyConcepts = Array.isArray(summaryData.keyConcepts) ? summaryData.keyConcepts : [];
  const examTips = Array.isArray(summaryData.examTips) ? summaryData.examTips : [];
  const commonMistakes = Array.isArray(summaryData.commonMistakes) ? summaryData.commonMistakes : [];
  const formulas = Array.isArray(summaryData.formulas) ? summaryData.formulas : [];
  const checklist = Array.isArray(summaryData.checklist) ? summaryData.checklist : [];
  const cards = Array.isArray(flashcards) ? flashcards : [];

  const updateSummaryField = <K extends keyof KholasaSummaryData>(key: K, value: KholasaSummaryData[K]) => {
    onChangeSummary({ ...summaryData, [key]: value });
  };

  const sectionsMeta: Array<{ id: SectionKey; label: string; count: number; icon: typeof BookOpen }> = [
    { id: "definitions", label: "التعريفات", count: definitions.length, icon: BookOpen },
    { id: "concepts", label: "المفاهيم", count: keyConcepts.length, icon: Sparkles },
    { id: "tips", label: "تكات الامتحان", count: examTips.length, icon: Lightbulb },
    { id: "mistakes", label: "أخطاء شائعة", count: commonMistakes.length, icon: AlertTriangle },
    { id: "formulas", label: "القواعد والصيغ", count: formulas.length, icon: Calculator },
    { id: "checklist", label: "قائمة المراجعة", count: checklist.length, icon: CheckSquare },
    { id: "flashcards", label: "البطاقات", count: cards.length, icon: Layers },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Section Selector Pills */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {sectionsMeta.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
              section === id
                ? "bg-primary text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${section === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 1. Definitions */}
      {section === "definitions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">التعريفات والمصطلحات ({definitions.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                updateSummaryField("definitions", [
                  ...definitions,
                  { term: "", meaning: "", translation: "", example: "" },
                ])
              }
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة تعريف
            </Button>
          </div>
          {definitions.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              لا توجد تعريفات مضافة بعد. اضغط «إضافة تعريف» للبدء.
            </p>
          )}
          <div className="space-y-2.5">
            {definitions.map((d, idx) => {
              const patchDef = (patch: Partial<KholasaDefinition>) => {
                const next = [...definitions];
                next[idx] = { ...next[idx], ...patch };
                updateSummaryField("definitions", next);
              };
              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-primary">تعريف #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => updateSummaryField("definitions", definitions.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="المصطلح (Term)"
                      value={d.term || ""}
                      onChange={(e) => patchDef({ term: e.target.value })}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                    />
                    <input
                      type="text"
                      placeholder="الترجمة بالعربية (اختياري)"
                      value={d.translation || ""}
                      onChange={(e) => patchDef({ translation: e.target.value })}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="التعريف / المعنى"
                    value={d.meaning ?? d.definition ?? ""}
                    onChange={(e) => patchDef({ meaning: e.target.value, definition: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="مثال توضيحي (اختياري)"
                    value={d.example || ""}
                    onChange={(e) => patchDef({ example: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Key Concepts */}
      {section === "concepts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">أهم المفاهيم والأفكار ({keyConcepts.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                updateSummaryField("keyConcepts", [
                  ...keyConcepts,
                  { title: "", description: "", translation: "", tag: "" },
                ])
              }
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة مفهوم
            </Button>
          </div>
          {keyConcepts.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              لا توجد مفاهيم مضافة بعد.
            </p>
          )}
          <div className="space-y-2.5">
            {keyConcepts.map((c, idx) => {
              const patchConcept = (patch: Partial<KholasaKeyConcept>) => {
                const next = [...keyConcepts];
                next[idx] = { ...next[idx], ...patch };
                updateSummaryField("keyConcepts", next);
              };
              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-sky-600">مفهوم #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => updateSummaryField("keyConcepts", keyConcepts.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="عنوان المفهوم"
                      value={c.title || ""}
                      onChange={(e) => patchConcept({ title: e.target.value })}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                    />
                    <input
                      type="text"
                      placeholder="تصنيف مختصر / Tag (اختياري)"
                      value={c.tag || ""}
                      onChange={(e) => patchConcept({ tag: e.target.value })}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="الشرح المختصر"
                    value={c.description || ""}
                    onChange={(e) => patchConcept({ description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="الترجمة بالعربية (اختياري)"
                    value={c.translation || ""}
                    onChange={(e) => patchConcept({ translation: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Exam Tips */}
      {section === "tips" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">تكات وملاحظات الامتحان ({examTips.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() => updateSummaryField("examTips", [...examTips, { title: "", tip: "" }])}
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة تكة امتحان
            </Button>
          </div>
          {examTips.map((t, idx) => {
            const patchTip = (patch: Partial<KholasaExamTip>) => {
              const next = [...examTips];
              next[idx] = { ...next[idx], ...patch };
              updateSummaryField("examTips", next);
            };
            return (
              <div key={idx} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-700">تكة #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateSummaryField("examTips", examTips.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="عنوان التكة (اختياري)"
                  value={t.title || ""}
                  onChange={(e) => patchTip({ title: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="نص التكة / الملاحظة المهمة"
                  value={t.tip || ""}
                  onChange={(e) => patchTip({ tip: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Common Mistakes */}
      {section === "mistakes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">الأخطاء الشائعة وتصحيحها ({commonMistakes.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                updateSummaryField("commonMistakes", [
                  ...commonMistakes,
                  { mistake: "", correction: "", why: "" },
                ])
              }
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة خطأ شائع
            </Button>
          </div>
          {commonMistakes.map((m, idx) => {
            const patchMistake = (patch: Partial<KholasaCommonMistake>) => {
              const next = [...commonMistakes];
              next[idx] = { ...next[idx], ...patch };
              updateSummaryField("commonMistakes", next);
            };
            return (
              <div key={idx} className="rounded-2xl border border-rose-200 bg-rose-50/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-rose-700">خطأ #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateSummaryField("commonMistakes", commonMistakes.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="الخطأ الشائع الذي يقع فيه الطلاب"
                  value={m.mistake || ""}
                  onChange={(e) => patchMistake({ mistake: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                />
                <input
                  type="text"
                  placeholder="الصواب / التصحيح"
                  value={m.correction || ""}
                  onChange={(e) => patchMistake({ correction: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="لماذا؟ (اختياري)"
                  value={m.why || ""}
                  onChange={(e) => patchMistake({ why: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Formulas & Rules */}
      {section === "formulas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">القواعد والصيغ والأكواد ({formulas.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() => updateSummaryField("formulas", [...formulas, { title: "", formula: "", note: "" }])}
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة قاعدة / كود
            </Button>
          </div>
          {formulas.map((f, idx) => {
            const patchFormula = (patch: Partial<KholasaFormula>) => {
              const next = [...formulas];
              next[idx] = { ...next[idx], ...patch };
              updateSummaryField("formulas", next);
            };
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-purple-700">قاعدة #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateSummaryField("formulas", formulas.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="اسم القاعدة"
                  value={f.title || ""}
                  onChange={(e) => patchFormula({ title: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                />
                <textarea
                  dir="ltr"
                  rows={2}
                  placeholder="الصيغة أو الكود البرمجي"
                  value={f.formula || ""}
                  onChange={(e) => patchFormula({ formula: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-900 text-amber-300 p-2.5 font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="ملاحظة (اختياري)"
                  value={f.note || ""}
                  onChange={(e) => patchFormula({ note: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Checklist */}
      {section === "checklist" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">قائمة المراجعة السريعة للطالب ({checklist.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() => updateSummaryField("checklist", [...checklist, { id: `chk-${Date.now()}`, text: "" }])}
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة نقطة
            </Button>
          </div>
          {checklist.map((item, idx) => {
            const textVal = typeof item === "string" ? item : item.text;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-6 text-center">{idx + 1}.</span>
                <input
                  type="text"
                  value={textVal || ""}
                  placeholder="مثال: فهم الفرق بين GET و POST"
                  onChange={(e) => {
                    const next = [...checklist];
                    next[idx] = { id: typeof item === "string" ? `chk-${idx}` : item.id || `chk-${idx}`, text: e.target.value };
                    updateSummaryField("checklist", next);
                  }}
                  className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => updateSummaryField("checklist", checklist.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Flashcards */}
      {section === "flashcards" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">بطاقات المراجعة الذكية ({cards.length})</h5>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                onChangeFlashcards([
                  ...cards,
                  { id: `fc-${Date.now()}`, front: "", back: "", translation: "", tag: "" },
                ])
              }
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة بطاقة
            </Button>
          </div>
          {cards.map((fc, idx) => {
            const patchCard = (patch: Partial<KholasaFlashcard>) => {
              const next = [...cards];
              next[idx] = { ...next[idx], ...patch };
              onChangeFlashcards(next);
            };
            return (
              <div key={fc.id || idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-purple-700">بطاقة #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => onChangeFlashcards(cards.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="وجه البطاقة (المصطلح أو السؤال)"
                    value={fc.front || ""}
                    onChange={(e) => patchCard({ front: e.target.value })}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="التصنيف / Tag (اختياري)"
                    value={fc.tag || ""}
                    onChange={(e) => patchCard({ tag: e.target.value })}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="ظهر البطاقة (الإجابة والشرح)"
                  value={fc.back || ""}
                  onChange={(e) => patchCard({ back: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="الترجمة بالعربية (اختياري)"
                  value={fc.translation || ""}
                  onChange={(e) => patchCard({ translation: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Optional Advanced JSON Collapse */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowJsonAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5" /> استيراد / تعديل JSON مباشر (للمحترفين - اختياري)
          </span>
          {showJsonAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showJsonAdvanced && (
          <div className="p-3.5 border-t border-slate-200 space-y-3 bg-white">
            {jsonError && <p className="text-xs font-bold text-rose-600">{jsonError}</p>}
            <div>
              <label className="text-[11px] font-bold block mb-1">summaryData (JSON)</label>
              <textarea
                dir="ltr"
                rows={6}
                value={JSON.stringify(summaryData || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || "{}");
                    setJsonError("");
                    onChangeSummary(parsed);
                  } catch {
                    setJsonError("صيغة JSON في summaryData غير مكتملة");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">flashcards (JSON)</label>
              <textarea
                dir="ltr"
                rows={4}
                value={JSON.stringify(cards || [], null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || "[]");
                    if (Array.isArray(parsed)) {
                      setJsonError("");
                      onChangeFlashcards(parsed);
                    }
                  } catch {
                    setJsonError("صيغة JSON في flashcards غير مكتملة");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-[11px]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

