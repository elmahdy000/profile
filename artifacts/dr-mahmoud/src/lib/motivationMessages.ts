import type { Quiz } from "@/types/platform";

export type MotivationTier = "start" | "milestone" | "excellent" | "great" | "good" | "encourage";

const MOTIVATION_DECKS: Record<MotivationTier, string[]> = {
  start: [
    "سمّي الله وركّز يا بطل.. أنت قدّها وقدود! 💪",
    "اقرأ كل سؤال بهدوء، الإجابة الصح بتندهلك! ✨",
    "بداية قوية إن شاء الله.. خلّي تركيزك في السما! 🚀",
    "كل سؤال بتحله خطوة أقرب للدرجة النهائية! 🎯",
    "خد نفس عميق وابدأ بثقة.. إنت مذاكر وتعبك مش هيروح هدر! 🌟",
    "يلا نوريهم الشغل العالي النهارده! 🔥",
    "ركّز في التفاصيل الصغيرة.. هي اللي بتفرق الأوائل! 💡",
    "بالتوفيق يا نجم.. خلي بالك من الوقت وابدأ بالسهل! ⏱️",
    "الفرصة دي بتاعتك.. استمتع بالحل وأثبت لنفسك! 🏆",
    "أنت بطل وتقدر تقفّلها النهارده.. يلا بينا! ⚡",
    "خطوة خطوة وبهداوة.. مفيش سؤال هيقف قدامك! 🧠",
    "توكل على الله وابدأ.. مستنيين نتيجة تشرّف! 🌈",
  ],
  milestone: [
    "عاش يا بطل! ماشي بسرعة وثبات ممتازين! 🔥",
    "شغل عالي أوي.. كمّل بنفس التركيز! ⚡",
    "ممتاز! عدّيت جزء كبير وقربت تخلّص! 🚀",
    "الله ينور عليك.. تركيزك عالي النهارده! ✨",
    "أداء يفرّح بجد.. فاضل شوية صغيرين وتقفّلها! 🎯",
    "يا سلام على الهدوء والثقة.. كمّل يا نجم! 🌟",
    "إنت كده في السليم.. راجع قبل ما تسلّم! 💡",
    "بطل والله! خطواتك ثابتة وواضحة! 💪",
    "قربت توصل لخط النهاية.. استمر يا وحش! 🏆",
    "مجهودك باين في كل سؤال.. عاش جداً! 🌈",
    "حلو أوي التقدم ده.. خليك بنفس الحماس! 🎉",
    "تمام التمام! خلّص اللي فاضل بنفس القوة! 🧠",
  ],
  excellent: [
    "إيه العظمة دي يا بطل؟! أداء عالمي وتستاهل الدرجة النهائية! 🏆🔥",
    "قفّلت اللعبة بجد! فخورين بيك جداً يا نجم! 🌟🎉",
    "مستوى أوائل جمهورية! استمر على القمة دي! 🚀👑",
    "شابوه بجد! تركيز ومذاكرة ونتيجة تشرّف! 💯✨",
    "إنت النهارده في حتة تانية خالص.. عاش يا وحش! ⚡🏆",
    "نتيجة ترفع الراس! ربنا يبارك في تعبك ومجهودك! 🌈💪",
    "مفيش كلام يوصف الجمال ده.. أداء خيالي! 🎯🔥",
    "أستاذ ورئيس قسم! كمّل بنفس القوة دي دايماً! 🥇✨",
    "برافو عليك مليون مرة.. تعبك جاب نتيجة تحفة! 🎉🌟",
    "إنت قدوة بجد.. حافظ على المستوى الجبار ده! 💎🚀",
    "ده مش مجرد نجاح.. ده تألق وابداع! 🏆💫",
    "عاش عاش عاش! النتيجة دي تستاهل احتفال! 🎊🔥",
  ],
  great: [
    "عاش جداً يا بطل! نتيجة قوية أوي وفاضلك تكة على التقفيل! 🌟💪",
    "شغل محترم جداً! راجع الغلطات الصغيرة وهتقفّل الجاية! 🚀✨",
    "أداء ممتاز يفرّح! أنت قريب جداً من الـ 100%! 🎯🔥",
    "برافو عليك يا نجم! مستوى ثابت وبيعلى كل مرة! 📈👏",
    "حلو أوي أوي! بص على الأسئلة اللي وقعت منك عشان متتكررش! 💡🌟",
    "نتيجة جميلة ومشرّفة! الجاية إن شاء الله تقفيل كامل! 🏆✨",
    "تعبك باين جداً في النتيجة دي.. كمّل يا بطل! 💪🌈",
    "ما شاء الله عليك! خطوة بسيطة وتبقى في القمة! ⚡🎯",
    "أداء يطمن ويفرح القلب.. استمر بنفس الحماس! 🔥🎉",
    "شاطر جداً! فرقت معاك كام سؤال بس وهتعدي الـ 95%! 🌟🚀",
    "ممتاز يا بطل! واضح إنك فاهم الدرس كويس أوي! 🧠👏",
    "عاش يا نجم! كل امتحان مستواك بيبقى أقوى من اللي قبله! 💫🏆",
  ],
  good: [
    "نجاح حلو يا بطل! ومع مراجعة بسيطة هتشوف فرق كبير المرة الجاية! 💪✨",
    "عدّيت الامتحان بنجاح! دلوقتي وقت تقوّي النقط اللي وقعت منك! 🎯💡",
    "بداية كويسة جداً! راجع الشرح تحت وهتلاقي نفسك بتطير في الجاية! 🚀🌟",
    "عاش إنك كمّلت ونجحت! المرة الجاية عاوزينك فوق الـ 85%! 🔥📈",
    "مجهود يُحترم يا نجم! شوية تركيز زيادة وهتقفّلها! ⚡👏",
    "حلو إنك نجحت! بص على الأخطاء كأنها كنز هيرفع درجتك الجاية! 💎🧠",
    "خطوة كويسة لقدام! استمر في الحل وهتلاحظ تطور رهيب! 🌈💪",
    "أنت ماشي في الطريق الصح.. بس عندك أحسن من كده بكتير! 🌟🚀",
    "نجحت يا بطل! خصص 10 دقايق تراجع اللي غلطت فيه وهتفرق معاك! 💡✅",
    "كويس جداً إنك عدّيتها.. والجاية هتكون أقوى بكتير! 🎯🔥",
    "برافو على المحاولة والنجاح! كل مرة بتتعلم أكتر! 👏✨",
    "تمام يا نجم! الخطوة الجاية نرفع النسبة ونقرب من القمة! 🏆💪",
  ],
  encourage: [
    "ولا يهمك خالص يا بطل! كل غلط النهارده هو درجة زيادة في امتحان آخر السنة! 💪🌟",
    "الوقعة دي هي اللي بتعلّمك الصح.. راجع الشرح وجرّب تاني وهتكسر الدنيا! 🔥🚀",
    "مفيش بطل بيوصل من غير ما يتعثر.. المهم إنك بتحاول وبتتعلم! 💡❤️",
    "أحسن حاجة إنك اكتشفت النقط دي دلوقتي مش في الامتحان الكبير! 🎯✨",
    "خدها تحدي مع نفسك.. راجع الدرس 10 دقايق وادخل تاني وهتشوف الفرق! ⚡💪",
    "إنت أذكى وأقوى من الدرجة دي بكتير.. بس محتاج تراجع الأسئلة بهدوء! 🧠🌈",
    "متزعلش أبداً! كل سؤال غلطت فيه دلوقتي عمرك ما هتغلط فيه تاني! 💎👏",
    "البدايات الصعبة بتعمل أبطال جامدين.. يلا راجع الشرح تحت وورينا! 🚀🔥",
    "ده تدريب مش نهاية المطاف.. كل محاولة بتقرّبك من النجاح الكبير! 🌟💪",
    "ركز في تفسير كل سؤال غلط تحت، وادخل تاني بثقة أكبر! 💡🎯",
    "المهم إنك مقفلتش وكمّلت.. المرة الجاية هتبقى أحسن بكتير بإذن الله! ✨🏆",
    "كلنا بنغلط عشان نتعلم.. خد نفس وراجع النقط الناقصة وانطلق! 🌈⚡",
  ],
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Picks a unique motivational phrase from the requested tier using a persisted
 * shuffle-bag in localStorage so the student NEVER sees the same phrase twice
 * in a row (and cycles through all phrases before any repeats).
 */
export function getNextMotivationMessage(tier: MotivationTier): string {
  const pool = MOTIVATION_DECKS[tier] || MOTIVATION_DECKS.good;
  if (typeof window === "undefined") {
    return pool[0];
  }

  const deckKey = `dr_mahmoud_motivation_deck_v1_${tier}`;
  const lastKey = `dr_mahmoud_motivation_last_v1_${tier}`;

  try {
    let deck: number[] = [];
    const raw = window.localStorage.getItem(deckKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        deck = parsed.filter((n) => typeof n === "number" && n >= 0 && n < pool.length);
      }
    }

    const lastIdxRaw = window.localStorage.getItem(lastKey);
    const lastIdx = lastIdxRaw !== null ? Number(lastIdxRaw) : -1;

    if (deck.length === 0) {
      deck = shuffleArray(pool.map((_, i) => i));
      // Prevent back-to-back repeat across reshuffle boundary
      if (deck.length > 1 && deck[0] === lastIdx) {
        const swapWith = 1 + Math.floor(Math.random() * (deck.length - 1));
        [deck[0], deck[swapWith]] = [deck[swapWith], deck[0]];
      }
    }

    const nextIdx = deck.shift()!;
    window.localStorage.setItem(deckKey, JSON.stringify(deck));
    window.localStorage.setItem(lastKey, String(nextIdx));
    return pool[nextIdx] || pool[0];
  } catch {
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export function getMotivationTierForScore(score: number, passed: boolean): MotivationTier {
  if (score >= 90) return "excellent";
  if (score >= 75 && passed) return "great";
  if (passed || score >= 60) return "good";
  return "encourage";
}

export function isQuizHomework(quiz?: Partial<Quiz> | null): boolean {
  if (!quiz) return false;
  return Boolean(
    quiz.isHomework ||
      quiz.scope === "homework" ||
      quiz.category === "واجب" ||
      quiz.category === "homework" ||
      quiz.title?.includes("واجب") ||
      quiz.title?.toLowerCase().includes("homework")
  );
}

/**
 * Returns the explicit duration set by the admin, or null if untimed.
 */
export function getEffectiveQuizDurationMinutes(quiz?: Partial<Quiz> | null): number | null {
  if (!quiz) return null;
  if (quiz.durationMinutes && quiz.durationMinutes > 0) {
    return quiz.durationMinutes;
  }
  return null;
}

/** Formats duration in minutes cleanly in Arabic (e.g. 2880 -> "48 ساعة", 90 -> "90 دقيقة"). */
export function formatQuizDurationAr(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "مفتوح";
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours === 1) return "ساعة واحدة";
    if (hours === 2) return "ساعتان";
    if (hours >= 3 && hours <= 10) return `${hours} ساعات`;
    return `${hours} ساعة`;
  }
  return `${minutes} دقيقة`;
}

/** Formats countdown seconds as HH:MM:SS when >= 1 hour, otherwise MM:SS. */
export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatExamDayAndTime(isoDate?: string | null): {
  dayName: string;
  dateLabel: string;
  timeLabel: string;
  fullLabel: string;
} | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;

  try {
    const dayName = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
    }).format(d);

    const dateLabel = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      day: "numeric",
      month: "short",
    }).format(d);

    const timeLabel = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    return {
      dayName,
      dateLabel,
      timeLabel,
      fullLabel: `${dayName} ${dateLabel} · ${timeLabel}`,
    };
  } catch {
    return null;
  }
}
