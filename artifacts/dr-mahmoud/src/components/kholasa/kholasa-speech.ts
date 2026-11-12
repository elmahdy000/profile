/**
 * Bilingual direction detection, translation splitting, and browser SpeechSynthesis
 * helpers for Kholasa English / Languages study components.
 */

export function isPrimarilyEnglish(text?: string | null): boolean {
  if (!text) return false;
  const cleaned = text.trim();
  if (!cleaned) return false;

  const latinMatches = cleaned.match(/[A-Za-z]/g);
  const arabicMatches = cleaned.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g);

  const latinCount = latinMatches ? latinMatches.length : 0;
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  if (latinCount === 0) return false;
  if (arabicCount === 0) return latinCount >= 2;
  return latinCount > arabicCount * 1.35;
}

export function splitModelAnswerTranslation(text?: string | null): {
  main: string;
  translation: string | null;
} {
  if (!text) return { main: "", translation: null };
  let cleaned = text.trim();
  // Clean trailing metadata tags such as "تقيمات اللغات"
  cleaned = cleaned.replace(/\s*تقيم[اإ]ت\s+اللغات\s*$/i, "").trim();

  // Match any translation marker: [الترجمة]:, الترجمة العربية للتفسير:, الترجمة العربية:, الترجمة الآلية:, الترجمة:, ترجمة:
  const markerRegex = /(?:\r?\n)+\s*(?:\[\s*الترجمة\s*\]|\[\s*ترجمة\s*\]|الترجمة\s+العربية\s+للتفسير|الترجمة\s+العربية|الترجمة\s+الآلية|الترجمة|ترجمة)\s*:\s*|(?:\s+|^)(?:\[\s*الترجمة\s*\]|الترجمة\s+العربية\s+للتفسير|الترجمة\s+العربية|الترجمة\s+الآلية)\s*:\s*/i;
  const match = cleaned.match(markerRegex);
  if (match && match.index !== undefined) {
    const main = cleaned.slice(0, match.index).trim();
    const translation = cleaned.slice(match.index + match[0].length).trim();
    return {
      main: main || cleaned,
      translation: translation || null,
    };
  }

  // Fallback: If text has multiple paragraphs where the first is English and the second is Arabic
  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    const first = paragraphs[0];
    const rest = paragraphs.slice(1).join("\n\n");
    if (isPrimarilyEnglish(first) && !isPrimarilyEnglish(rest)) {
      return {
        main: first,
        translation: rest,
      };
    }
  }

  return { main: cleaned, translation: null };
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function cleanTextForSpeech(text: string): string {
  const { main } = splitModelAnswerTranslation(text);
  return main
    .replace(/```[\s\S]*?```/g, " code snippet ")
    .replace(/[*_`#>~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speech synthesis cancellation errors
  }
}

export function speakEnglishText(
  rawText: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    rate?: number;
  },
): boolean {
  if (!isSpeechSupported()) return false;
  const text = cleanTextForSpeech(rawText);
  if (!text) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = callbacks?.rate ?? 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.toLowerCase() === "en-us") ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en-")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => callbacks?.onStart?.();
    utterance.onend = () => callbacks?.onEnd?.();
    utterance.onerror = () => callbacks?.onEnd?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    callbacks?.onEnd?.();
    return false;
  }
}

