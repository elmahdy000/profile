import { useState, useMemo, useEffect } from "react";
import { BookOpen, Languages, Search, Sparkles, Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish, isSpeechSupported, speakEnglishText, stopSpeech } from "./kholasa-speech";
import type { KholasaMaterial } from "./types";

interface KholasaDefinitionsViewProps {
  material: KholasaMaterial;
  darkSurface?: boolean;
}

export function KholasaDefinitionsView({ material, darkSurface = false }: KholasaDefinitionsViewProps) {
  const [showTranslations, setShowTranslations] = useState(true);
  const [search, setSearch] = useState("");
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speechAvailable = isSpeechSupported();

  useEffect(() => {
    return () => stopSpeech();
  }, [material.id]);

  const toggleSpeak = (key: string, textToSpeak: string) => {
    if (speakingKey === key) {
      stopSpeech();
      setSpeakingKey(null);
      return;
    }
    speakEnglishText(textToSpeak, {
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey((cur) => (cur === key ? null : cur)),
    });
  };

  const definitions = Array.isArray(material.summaryData?.definitions)
    ? material.summaryData.definitions
    : [];
  const concepts = Array.isArray(material.summaryData?.keyConcepts)
    ? material.summaryData.keyConcepts
    : [];

  const q = search.trim().toLowerCase();

  const filteredDefs = useMemo(() => {
    if (!q) return definitions;
    return definitions.filter(
      (d) =>
        d.term?.toLowerCase().includes(q) ||
        d.meaning?.toLowerCase().includes(q) ||
        d.definition?.toLowerCase().includes(q) ||
        d.translation?.toLowerCase().includes(q),
    );
  }, [definitions, q]);

  const filteredConcepts = useMemo(() => {
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.translation?.toLowerCase().includes(q),
    );
  }, [concepts, q]);

  const cardClass = darkSurface
    ? "rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-100"
    : "rounded-2xl border border-border bg-card p-4 text-foreground shadow-2xs";

  const mutedClass = darkSurface ? "text-slate-300" : "text-muted-foreground";

  if (definitions.length === 0 && concepts.length === 0) {
    return (
      <div className={`${cardClass} text-center py-10`} dir="rtl">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-60 text-primary" />
        <p className="text-sm font-bold">لا توجد تعريفات أو مصطلحات مضافة لهذا الدرس حالياً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في التعريفات والمفاهيم..."
            className={`w-full h-9 rounded-xl border pr-9 pl-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              darkSurface
                ? "border-white/15 bg-slate-950/70 text-white placeholder:text-slate-400"
                : "border-border bg-background text-foreground"
            }`}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTranslations((v) => !v)}
          className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
            darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {showTranslations ? "إخفاء الترجمة" : "إظهار الترجمة"}
        </Button>
      </div>

      {/* Definitions Section */}
      {filteredDefs.length > 0 && (
        <section className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-black text-indigo-500">
            <BookOpen className="h-4 w-4" /> التعريفات والمصطلحات الأساسية ({filteredDefs.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDefs.map((d, idx) => {
              const defText = d.meaning || d.definition || "";
              const isEngTerm = isPrimarilyEnglish(d.term);
              const isEngDef = isPrimarilyEnglish(defText);
              const canSpeak = speechAvailable && (isEngTerm || isEngDef);
              const key = `def-${idx}`;
              const isSpeaking = speakingKey === key;
              const speechPayload = [isEngTerm ? d.term : "", isEngDef ? defText : ""]
                .filter(Boolean)
                .join(". ");

              return (
                <div key={idx} className={cardClass}>
                  <div
                    className="flex items-start justify-between gap-2 mb-2"
                    dir={isEngTerm ? "ltr" : "rtl"}
                  >
                    <div
                      dir={isEngTerm ? "ltr" : "rtl"}
                      className={`flex-1 text-sm font-black text-primary ${
                        isEngTerm ? "text-left font-sans" : "text-right"
                      }`}
                    >
                      <BidiStatement text={d.term} />
                    </div>
                    {canSpeak && speechPayload && (
                      <button
                        type="button"
                        onClick={() => toggleSpeak(key, speechPayload)}
                        title={isSpeaking ? "إيقاف النطق" : "نطق المصطلح والتعريف"}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                          isSpeaking
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : darkSurface
                              ? "border-white/15 bg-white/5 text-sky-300 hover:bg-white/10"
                              : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {isSpeaking ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                        <span>{isSpeaking ? "إيقاف" : "استماع 🔊"}</span>
                      </button>
                    )}
                  </div>
                  <p
                    dir={isEngDef ? "ltr" : "rtl"}
                    className={`text-xs leading-6 ${mutedClass} ${
                      isEngDef ? "text-left font-sans" : "text-right"
                    }`}
                  >
                    <BidiStatement text={defText} />
                  </p>
                  {showTranslations && d.translation && (
                    <div
                      dir="rtl"
                      className="mt-2.5 pt-2 border-t border-border/40 text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed text-right bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl p-2.5 border border-emerald-500/20"
                    >
                      <span className="block text-[10px] font-black text-emerald-800 dark:text-emerald-400 mb-0.5">🌐 الترجمة العربية:</span>
                      {d.translation}
                    </div>
                  )}
                  {d.example && (
                    <p
                      dir={isPrimarilyEnglish(d.example) ? "ltr" : "rtl"}
                      className={`mt-2 text-[11px] italic ${mutedClass} ${
                        isPrimarilyEnglish(d.example) ? "text-left font-sans" : "text-right"
                      }`}
                    >
                      مثال: <BidiStatement text={d.example} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Key Concepts Section */}
      {filteredConcepts.length > 0 && (
        <section className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-black text-sky-500">
            <Sparkles className="h-4 w-4" /> المفاهيم والأفكار الرئيسية ({filteredConcepts.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredConcepts.map((c, idx) => {
              const isEngTitle = isPrimarilyEnglish(c.title);
              const isEngDesc = isPrimarilyEnglish(c.description);
              const canSpeak = speechAvailable && (isEngTitle || isEngDesc);
              const key = `concept-${idx}`;
              const isSpeaking = speakingKey === key;
              const speechPayload = [isEngTitle ? c.title : "", isEngDesc ? c.description : ""]
                .filter(Boolean)
                .join(". ");

              return (
                <div key={idx} className={cardClass}>
                  <div
                    className="flex items-start justify-between gap-2 mb-2"
                    dir={isEngTitle ? "ltr" : "rtl"}
                  >
                    <strong
                      dir={isEngTitle ? "ltr" : "rtl"}
                      className={`flex-1 text-sm font-extrabold ${
                        isEngTitle ? "text-left font-sans" : "text-right"
                      }`}
                    >
                      <BidiStatement text={c.title} />
                    </strong>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canSpeak && speechPayload && (
                        <button
                          type="button"
                          onClick={() => toggleSpeak(key, speechPayload)}
                          title={isSpeaking ? "إيقاف النطق" : "نطق المفهوم"}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                            isSpeaking
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : darkSurface
                                ? "border-white/15 bg-white/5 text-sky-300 hover:bg-white/10"
                                : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          {isSpeaking ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                          <span>{isSpeaking ? "إيقاف" : "استماع 🔊"}</span>
                        </button>
                      )}
                      {c.tag && (
                        <span className="rounded-md bg-sky-500/15 text-sky-400 px-2 py-0.5 text-[10px] font-bold border border-sky-500/20">
                          {c.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    dir={isEngDesc ? "ltr" : "rtl"}
                    className={`text-xs leading-6 ${mutedClass} ${
                      isEngDesc ? "text-left font-sans" : "text-right"
                    }`}
                  >
                    <BidiStatement text={c.description} />
                  </p>
                  {showTranslations && c.translation && (
                    <div
                      dir="rtl"
                      className="mt-2.5 pt-2 border-t border-border/40 text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed text-right bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl p-2.5 border border-emerald-500/20"
                    >
                      <span className="block text-[10px] font-black text-emerald-800 dark:text-emerald-400 mb-0.5">🌐 الترجمة العربية:</span>
                      {c.translation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

