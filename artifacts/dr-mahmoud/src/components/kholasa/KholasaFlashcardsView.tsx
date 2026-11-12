import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Shuffle,
  CheckCircle2,
  Eye,
  Filter,
  Volume2,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish, isSpeechSupported, speakEnglishText, stopSpeech } from "./kholasa-speech";
import type { KholasaFlashcard } from "./types";

interface KholasaFlashcardsViewProps {
  cards: KholasaFlashcard[];
  materialId?: number;
  darkSurface?: boolean;
}

export function KholasaFlashcardsView({
  cards,
  materialId,
  darkSurface = false,
}: KholasaFlashcardsViewProps) {
  const storageKey = materialId ? `kholasa_fc_mastered_${materialId}` : null;
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);
  const [speakingMode, setSpeakingMode] = useState<"front" | "back" | "both" | null>(null);
  const speechAvailable = isSpeechSupported();

  useEffect(() => {
    return () => stopSpeech();
  }, [materialId]);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>(() => {
    if (!storageKey) return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!storageKey) {
      setMasteredIds({});
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      setMasteredIds(saved ? JSON.parse(saved) : {});
    } catch {
      setMasteredIds({});
    }
    setIndex(0);
    setFlipped(false);
    setShuffledOrder(null);
  }, [storageKey]);

  const updateMastered = (cardId: string, val: boolean) => {
    setMasteredIds((prev) => {
      const next = { ...prev, [cardId]: val };
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const resetProgress = () => {
    setMasteredIds({});
    setOnlyUnmastered(false);
    setIndex(0);
    setFlipped(false);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  };

  const orderedCards = useMemo(() => {
    if (!Array.isArray(cards) || cards.length === 0) return [];
    const base =
      !shuffledOrder || shuffledOrder.length !== cards.length
        ? cards
        : shuffledOrder.map((i) => cards[i]).filter(Boolean);
    if (!onlyUnmastered) return base;
    const filtered = base.filter((c) => !masteredIds[c.id]);
    return filtered;
  }, [cards, shuffledOrder, onlyUnmastered, masteredIds]);

  const totalCards = Array.isArray(cards) ? cards.length : 0;
  const masteredCount = Array.isArray(cards)
    ? cards.filter((c) => Boolean(masteredIds[c.id])).length
    : 0;

  if (totalCards === 0) {
    return (
      <div
        dir="rtl"
        className={`rounded-2xl border p-10 text-center ${
          darkSurface ? "border-white/10 bg-white/5 text-slate-300" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-bold">لا توجد عناصر تسميع متاحة لهذا الدرس حالياً.</p>
      </div>
    );
  }

  if (orderedCards.length === 0 && onlyUnmastered) {
    return (
      <div
        dir="rtl"
        className={`rounded-2xl border p-10 text-center space-y-3 ${
          darkSurface ? "border-emerald-500/30 bg-emerald-950/25 text-white" : "border-emerald-500/30 bg-emerald-500/5 text-foreground"
        }`}
      >
        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
        <p className="text-base font-black">أحسنت! أتقنت جميع عناصر التسميع في هذا الدرس ({totalCards} عنصر) 🎉</p>
        <div className="flex items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOnlyUnmastered(false)}>
            عرض كل التسميع
          </Button>
          <Button type="button" size="sm" onClick={resetProgress}>
            إعادة التسميع من البداية
          </Button>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(index, orderedCards.length - 1);
  const card = orderedCards[safeIndex];
  const isFrontEng = isPrimarilyEnglish(card.front);
  const isBackEng = isPrimarilyEnglish(card.back);

  const handleSpeak = (mode: "front" | "back" | "both", text: string) => {
    if (speakingMode === mode) {
      stopSpeech();
      setSpeakingMode(null);
      return;
    }
    speakEnglishText(text, {
      onStart: () => setSpeakingMode(mode),
      onEnd: () => setSpeakingMode((cur) => (cur === mode ? null : cur)),
    });
  };

  const handleShuffle = () => {
    stopSpeech();
    setSpeakingMode(null);
    const arr = cards.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledOrder(arr);
    setIndex(0);
    setFlipped(false);
  };

  const nextCard = () => {
    stopSpeech();
    setSpeakingMode(null);
    setFlipped(false);
    setIndex((i) => (i + 1) % orderedCards.length);
  };

  const prevCard = () => {
    stopSpeech();
    setSpeakingMode(null);
    setFlipped(false);
    setIndex((i) => (i - 1 + orderedCards.length) % orderedCards.length);
  };

  return (
    <div className="space-y-4 text-right max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 px-3 py-1 text-xs font-extrabold">
            <Layers className="h-3.5 w-3.5" /> التسميع {safeIndex + 1} من {orderedCards.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-500 px-2.5 py-1 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> أتقنت {masteredCount} / {totalCards}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={onlyUnmastered ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setOnlyUnmastered((v) => !v);
              setIndex(0);
              setFlipped(false);
            }}
            className={`h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              !onlyUnmastered && darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> المتبقية فقط
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffle}
            className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" /> خلط
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-2 w-full rounded-full overflow-hidden ${darkSurface ? "bg-white/10" : "bg-muted"}`}>
        <div
          className="h-full bg-gradient-to-l from-purple-500 to-sky-500 transition-all duration-300"
          style={{ width: `${Math.round(((safeIndex + 1) / orderedCards.length) * 100)}%` }}
        />
      </div>

      {/* 3D Flipping Flashcard Surface */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "إظهار وجه المصطلح" : "قلب الكارت لكشف الإجابة"}
        className="w-full text-center cursor-pointer block focus:outline-none group"
        style={{ perspective: "1200px" }}
      >
        <motion.div
          key={`${card.id}-${safeIndex}`}
          initial={{ opacity: 0.7, scale: 0.97, rotateY: 0 }}
          animate={{ opacity: 1, scale: 1, rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative grid w-full min-h-[260px]"
        >
          {/* Front Face */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            className={`col-start-1 row-start-1 rounded-3xl border p-6 sm:p-8 flex flex-col items-center justify-center shadow-md transition-colors ${
              darkSurface
                ? "border-white/15 bg-gradient-to-br from-slate-900 to-slate-950 text-white group-hover:border-sky-400/60"
                : "border-border bg-gradient-to-br from-card to-muted/30 text-foreground group-hover:border-primary/50 shadow-sm"
            }`}
          >
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-sky-500/15 text-sky-500">
              <Eye className="h-3 w-3" />
              {card.tag || "المصطلح / السؤال"}
            </span>
            <div
              dir={isFrontEng ? "ltr" : "rtl"}
              className="text-base sm:text-xl font-black leading-relaxed max-w-xl"
            >
              <BidiStatement text={card.front} />
            </div>
            <span className={`mt-4 inline-flex items-center gap-1 text-[11px] font-bold ${darkSurface ? "text-slate-400" : "text-muted-foreground"}`}>
              <RotateCcw className="h-3 w-3" /> اضغط لقلب الكارت ومعرفة الإجابة
            </span>
          </div>

          {/* Back Face */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            className={`col-start-1 row-start-1 rounded-3xl border p-6 sm:p-8 flex flex-col items-center justify-center shadow-md ${
              darkSurface
                ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/60 to-slate-950 text-white"
                : "border-emerald-500/45 bg-gradient-to-br from-emerald-500/10 to-card text-foreground shadow-sm"
            }`}
          >
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-500/15 text-emerald-500">
              <Sparkles className="h-3 w-3" /> الإجابة والشرح
            </span>
            <div className="space-y-3 max-w-xl w-full">
              <div
                dir={isBackEng ? "ltr" : "rtl"}
                className="text-sm sm:text-base font-bold leading-relaxed text-center"
              >
                <BidiStatement text={card.back} />
              </div>
              {card.translation && (
                <p
                  dir="rtl"
                  className="pt-2.5 border-t border-emerald-500/25 text-xs sm:text-sm text-emerald-500 font-semibold leading-relaxed text-center"
                >
                  {card.translation}
                </p>
              )}
            </div>
            <span className={`mt-4 inline-flex items-center gap-1 text-[11px] font-bold ${darkSurface ? "text-emerald-300/70" : "text-emerald-600/80"}`}>
              <RotateCcw className="h-3 w-3" /> اضغط للرجوع لوجه الكارت
            </span>
          </div>
        </motion.div>
      </button>

      {/* Pronunciation Controls for English / Languages cards */}
      {speechAvailable && (isFrontEng || isBackEng) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isFrontEng && (
            <Button
              type="button"
              variant={speakingMode === "front" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeak("front", card.front)}
              className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                speakingMode !== "front" && darkSurface ? "border-white/15 bg-white/5 text-sky-300 hover:bg-white/10" : ""
              }`}
            >
              {speakingMode === "front" ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-4 w-4" />}
              {speakingMode === "front" ? "إيقاف" : "نطق الكلمة / المصطلح"}
            </Button>
          )}
          {isBackEng && (
            <Button
              type="button"
              variant={speakingMode === "back" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeak("back", card.back)}
              className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                speakingMode !== "back" && darkSurface ? "border-white/15 bg-white/5 text-emerald-300 hover:bg-white/10" : ""
              }`}
            >
              {speakingMode === "back" ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-4 w-4" />}
              {speakingMode === "back" ? "إيقاف" : "نطق التعريف"}
            </Button>
          )}
          {isFrontEng && isBackEng && (
            <Button
              type="button"
              variant={speakingMode === "both" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeak("both", `${card.front}. ${card.back}`)}
              className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                speakingMode !== "both" && darkSurface ? "border-white/15 bg-white/5 text-purple-300 hover:bg-white/10" : ""
              }`}
            >
              {speakingMode === "both" ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-4 w-4" />}
              {speakingMode === "both" ? "إيقاف" : "نطق الكل"}
            </Button>
          )}
        </div>
      )}

      {/* Navigation & Mastery Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prevCard}
            className={`h-10 rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            <ChevronRight className="h-4 w-4" /> السابقة
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextCard}
            className={`h-10 rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            التالية <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updateMastered(card.id, false);
              nextCard();
            }}
            className={`h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
              darkSurface ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-500/30 text-amber-600"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> أراجعها لاحقاً
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              updateMastered(card.id, true);
              nextCard();
            }}
            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" /> أتقنتها ✓
          </Button>
        </div>
      </div>
    </div>
  );
}
