import { useState, useEffect } from "react";
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckSquare,
  Square,
  Calculator,
  GitCompare,
} from "lucide-react";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish } from "./kholasa-speech";
import type { KholasaMaterial } from "./types";

interface KholasaSummaryViewProps {
  material: KholasaMaterial;
  darkSurface?: boolean;
}

export function hasZatonaContent(material?: KholasaMaterial | null): boolean {
  if (!material) return false;
  const s = material.summaryData || {};
  return (
    (Array.isArray(material.objectives) && material.objectives.filter(Boolean).length > 0) ||
    (Array.isArray(s.formulas) && s.formulas.length > 0) ||
    (Array.isArray(s.comparisons) && s.comparisons.length > 0) ||
    (Array.isArray(s.examTips) && s.examTips.length > 0) ||
    (Array.isArray(s.commonMistakes) && s.commonMistakes.length > 0) ||
    (Array.isArray(s.checklist) && s.checklist.length > 0)
  );
}

export function KholasaSummaryView({ material, darkSurface = false }: KholasaSummaryViewProps) {
  const s = material.summaryData || {};
  const formulas = Array.isArray(s.formulas) ? s.formulas : [];
  const comparisons = Array.isArray(s.comparisons) ? s.comparisons : [];
  const examTips = Array.isArray(s.examTips) ? s.examTips : [];
  const commonMistakes = Array.isArray(s.commonMistakes) ? s.commonMistakes : [];
  const checklist = Array.isArray(s.checklist) ? s.checklist : [];
  const objectives = Array.isArray(material.objectives) ? material.objectives.filter(Boolean) : [];

  const storageKey = `kholasa_checklist_${material.id}`;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCheckedItems(saved ? JSON.parse(saved) : {});
    } catch {
      setCheckedItems({});
    }
  }, [storageKey]);

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const hasAnyContent = hasZatonaContent(material);

  const cardClass = darkSurface
    ? "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 text-slate-100"
    : "rounded-2xl border border-border bg-card p-4 sm:p-5 text-foreground shadow-xs";

  const subCardClass = darkSurface
    ? "rounded-xl border border-white/10 bg-slate-950/60 p-3.5"
    : "rounded-xl border border-border/70 bg-muted/40 p-3.5";

  const mutedClass = darkSurface ? "text-slate-300" : "text-muted-foreground";

  if (!hasAnyContent) {
    return (
      <div className={`${cardClass} text-center py-10`} dir="rtl">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-amber-400 opacity-80" />
        <p className="text-sm font-bold">لا توجد بيانات ملخص «زتونة» مضافة لهذا الدرس حالياً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right select-none" dir="rtl" onContextMenu={(e) => e.preventDefault()}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 px-3 py-1 text-xs font-extrabold">
            <Sparkles className="h-3.5 w-3.5" /> الزتونة
          </span>
          <h3 className={`mt-1.5 text-base sm:text-lg font-black ${darkSurface ? "text-white" : "text-foreground"}`}>
            <BidiStatement text={material.lesson} />
          </h3>
        </div>
      </div>

      {/* 0. Lesson Learning Objectives */}
      {objectives.length > 0 && (
        <section className={cardClass}>
          <h4 className="flex items-center gap-2 text-sm font-black mb-2.5 text-emerald-500">
            <Sparkles className="h-4 w-4" /> ماذا ستتعلم في هذا الدرس؟ ({objectives.length})
          </h4>
          <ul className="space-y-1.5 text-xs leading-6 pr-1">
            {objectives.map((obj, idx) => {
              const text = String(obj);
              const isEng = isPrimarilyEnglish(text);
              return (
                <li
                  key={idx}
                  dir={isEng ? "ltr" : "rtl"}
                  className={`flex items-start gap-2 ${isEng ? "text-left" : "text-right"}`}
                >
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="flex-1">
                    <BidiStatement text={text} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 3. Formulas / Rules */}
      {formulas.length > 0 && (
        <section className={cardClass}>
          <h4 className="flex items-center gap-2 text-sm font-black mb-3 text-purple-500">
            <Calculator className="h-4 w-4" /> القواعد والصيغ الأساسية ({formulas.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {formulas.map((f, idx) => (
              <div key={idx} className={subCardClass}>
                <div className="text-xs font-extrabold mb-1.5">
                  <BidiStatement text={f.title} />
                </div>
                <div
                  dir="ltr"
                  className="rounded-lg bg-slate-900 text-amber-300 font-mono text-xs p-2.5 overflow-x-auto"
                >
                  {f.formula}
                </div>
                {f.note && (
                  <p className={`mt-1.5 text-[11px] ${mutedClass}`}>
                    <BidiStatement text={f.note} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Comparisons */}
      {comparisons.length > 0 && (
        <section className={cardClass}>
          <h4 className="flex items-center gap-2 text-sm font-black mb-3 text-cyan-500">
            <GitCompare className="h-4 w-4" /> مقارنات مهمة ({comparisons.length})
          </h4>
          <div className="space-y-4">
            {comparisons.map((comp, idx) => (
              <div key={idx} className={`${subCardClass} overflow-x-auto`}>
                <h5 className="text-xs font-black mb-2">
                  <BidiStatement text={comp.title} />
                </h5>
                {Array.isArray(comp.headers) && Array.isArray(comp.rows) && comp.rows.length > 0 ? (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60">
                        {comp.headers.map((h, hi) => (
                          <th key={hi} className="p-2 text-right font-extrabold">
                            <BidiStatement text={h} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comp.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-border/30 last:border-0">
                          {row.map((cell, ci) => (
                            <td key={ci} className={`p-2 ${mutedClass}`}>
                              <BidiStatement text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : Array.isArray(comp.points) ? (
                  <div className="space-y-2">
                    {comp.points.map((pt, pi) => (
                      <div key={pi} className="grid sm:grid-cols-3 gap-2 text-xs border-b border-border/30 pb-2 last:border-0">
                        <strong className="font-bold"><BidiStatement text={pt.label} /></strong>
                        <span className={mutedClass}><BidiStatement text={pt.a} /></span>
                        <span className={mutedClass}><BidiStatement text={pt.b} /></span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Exam Tips & Common Mistakes */}
      <div className="grid gap-4 lg:grid-cols-2">
        {examTips.length > 0 && (
          <section className={`${cardClass} border-emerald-500/30`}>
            <h4 className="flex items-center gap-2 text-sm font-black mb-3 text-emerald-500">
              <Lightbulb className="h-4 w-4" /> تكات وأسرار الامتحان ({examTips.length})
            </h4>
            <ul className="space-y-2.5">
              {examTips.map((tip, idx) => (
                <li key={idx} className={`${subCardClass} border-emerald-500/20 text-xs leading-6`}>
                  {tip.title && (
                    <strong className="block font-extrabold text-emerald-500 mb-0.5">
                      <BidiStatement text={tip.title} />
                    </strong>
                  )}
                  <BidiStatement text={typeof tip === "string" ? tip : tip.tip} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {commonMistakes.length > 0 && (
          <section className={`${cardClass} border-rose-500/30`}>
            <h4 className="flex items-center gap-2 text-sm font-black mb-3 text-rose-500">
              <AlertTriangle className="h-4 w-4" /> أخطاء شائعة احذرها ({commonMistakes.length})
            </h4>
            <ul className="space-y-2.5">
              {commonMistakes.map((m, idx) => (
                <li key={idx} className={`${subCardClass} border-rose-500/20 text-xs space-y-1 leading-6`}>
                  <div className="text-rose-500 font-bold">
                    ✕ الخطأ: <BidiStatement text={m.mistake} />
                  </div>
                  <div className="text-emerald-500 font-bold">
                    ✓ الصواب: <BidiStatement text={m.correction} />
                  </div>
                  {m.why && (
                    <p className={`text-[11px] ${mutedClass}`}>
                      <BidiStatement text={m.why} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* 6. Interactive Study Checklist */}
      {checklist.length > 0 && (
        <section className={cardClass}>
          <h4 className="flex items-center gap-2 text-sm font-black mb-3 text-amber-500">
            <CheckSquare className="h-4 w-4" /> قائمة التحقق الذاتي قبل الامتحان
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item, idx) => {
              const text = typeof item === "string" ? item : item.text;
              const key = typeof item === "string" ? `chk-${idx}` : item.id || `chk-${idx}`;
              const checked = Boolean(checkedItems[key]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCheck(key)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-right text-xs transition-all cursor-pointer ${
                    checked
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold"
                      : darkSurface
                        ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 opacity-60 mt-0.5" />
                  )}
                  <span className={checked ? "line-through opacity-85" : ""}>
                    <BidiStatement text={text} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

