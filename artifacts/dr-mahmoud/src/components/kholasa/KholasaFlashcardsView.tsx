import { useState, useMemo } from "react";
import { Layers, RotateCcw, ChevronRight, ChevronLeft, Shuffle, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BidiStatement } from "./BidiStatement";
import type { KholasaFlashcard } from "./types";

interface KholasaFlashcardsViewProps {
  cards: KholasaFlashcard[];
  darkSurface?: boolean;
}

export function KholasaFlashcardsView({ cards, darkSurface = false }: KholasaFlashcardsViewProps) {
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});

  const orderedCards = useMemo(() => {
    if (!Array.isArray(cards) || cards.length === 0) return [];
    if (!shuffledOrder || shuffledOrder.length !== cards.length) return cards;
    return shuffledOrder.map((i) => cards[i]).filter(Boolean);
  }, [cards, shuffledOrder]);

  if (orderedCards.length === 0) {
    return (
      <div
        dir="rtl"
        className={`rounded-2xl border p-10 text-center ${
          darkSurface ? "border-white/10 bg-white/5 text-slate-300" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-bold">لا توجد بطاقات مراجعة متاحة لهذا الدرس حالياً.</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, orderedCards.length - 1);
  const card = orderedCards[safeIndex];
  const masteredCount = Object.values(masteredIds).filter(Boolean).length;

  const handleShuffle = () => {
    const arr = orderedCards.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledOrder(arr);
    setIndex(0);
    setFlipped(false);
  };

  const nextCard = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % orderedCards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + orderedCards.length) % orderedCards.length);
  };

  return (
    <div className="space-y-4 text-right max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 px-3 py-1 text-xs font-extrabold">
            <Layers className="h-3.5 w-3.5" /> بطاقة {safeIndex + 1} من {orderedCards.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-500 px-2.5 py-1 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> أتقنت {masteredCount}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
            darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
          }`}
        >
          <Shuffle className="h-3.5 w-3.5" /> ترتيب عشوائي
        </Button>
      </div>

      {/* Progress Bar */}
      <div className={`h-2 w-full rounded-full overflow-hidden ${darkSurface ? "bg-white/10" : "bg-muted"}`}>
        <div
          className="h-full bg-gradient-to-l from-purple-500 to-sky-500 transition-all duration-300"
          style={{ width: `${Math.round(((safeIndex + 1) / orderedCards.length) * 100)}%` }}
        />
      </div>

      {/* Flashcard Surface */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={`w-full min-h-[240px] rounded-3xl border p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer shadow-md ${
          flipped
            ? darkSurface
              ? "border-emerald-500/40 bg-emerald-950/30 text-white"
              : "border-emerald-500/40 bg-emerald-500/5 text-foreground"
            : darkSurface
              ? "border-white/15 bg-slate-950/80 text-white hover:border-sky-400/50"
              : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
      >
        <span
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            flipped
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-sky-500/15 text-sky-500"
          }`}
        >
          <Eye className="h-3 w-3" />
          {flipped ? "الإجابة والشرح" : card.tag || "المصطلح / المفهوم — اضغط لكشف الإجابة"}
        </span>

        {!flipped ? (
          <div className="text-base sm:text-xl font-black leading-relaxed max-w-xl">
            <BidiStatement text={card.front} />
          </div>
        ) : (
          <div className="space-y-3 max-w-xl">
            <div className="text-sm sm:text-base font-bold leading-relaxed">
              <BidiStatement text={card.back} />
            </div>
            {card.translation && (
              <p className="pt-2 border-t border-border/40 text-xs sm:text-sm text-emerald-500 font-semibold leading-relaxed">
                {card.translation}
              </p>
            )}
          </div>
        )}
      </button>

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
              setMasteredIds((prev) => ({ ...prev, [card.id]: false }));
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
              setMasteredIds((prev) => ({ ...prev, [card.id]: true }));
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

