import type { QuizQuestion } from "@/types/platform";

const ARABIC_ORDINALS: Record<string, number> = {
  "الأول": 1,
  "الاول": 1,
  "الأولى": 1,
  "الاولى": 1,
  "الثاني": 2,
  "الثانية": 2,
  "الثالث": 3,
  "الثالثة": 3,
  "الرابع": 4,
  "الرابعة": 4,
  "الخامس": 5,
  "الخامسة": 5,
  "السادس": 6,
  "السادسة": 6,
  "السابع": 7,
  "السابعة": 7,
  "الثامن": 8,
  "الثامنة": 8,
  "التاسع": 9,
  "التاسعة": 9,
  "العاشر": 10,
  "العاشرة": 10,
};

function parseOrderWeight(label?: string | null): number {
  const s = String(label || "").trim();
  if (!s) return 9999;

  // Match patterns like "Lesson 1-2", "1-1", "Unit 2", "2-3"
  const dashed = s.match(/(\d+)\s*[-–.]\s*(\d+)/);
  if (dashed) {
    return Number(dashed[1]) * 100 + Number(dashed[2]);
  }

  const numMatch = s.match(/\d+/);
  if (numMatch) {
    return Number(numMatch[0]);
  }

  for (const [word, val] of Object.entries(ARABIC_ORDINALS)) {
    if (s.includes(word)) return val;
  }

  return 9998;
}

/**
 * Groups questions by (unit, lesson) in logical curriculum order.
 * If shuffleWithinGroup is true, randomizes question order INSIDE each lesson while keeping lesson sections intact.
 */
export function groupQuestionsByLesson<T extends QuizQuestion>(
  questions: T[],
  shuffleWithinGroup = false,
): T[] {
  const groups = new Map<string, { unit: string; lesson: string; items: T[] }>();

  for (const q of questions) {
    const unit = (q.unit || "").trim();
    const lesson = (q.lesson || "").trim();
    const key = `${unit}|||${lesson}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = { unit, lesson, items: [] };
      groups.set(key, entry);
    }
    entry.items.push(q);
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const ua = parseOrderWeight(a.unit);
    const ub = parseOrderWeight(b.unit);
    if (ua !== ub) return ua - ub;
    if (a.unit !== b.unit) return a.unit.localeCompare(b.unit, "ar");
    const la = parseOrderWeight(a.lesson);
    const lb = parseOrderWeight(b.lesson);
    if (la !== lb) return la - lb;
    return a.lesson.localeCompare(b.lesson, "ar");
  });

  const result: T[] = [];
  for (const grp of sortedGroups) {
    const items = [...grp.items];
    if (shuffleWithinGroup && items.length > 1) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    result.push(...items);
  }
  return result;
}

export interface QuizSectionInfo {
  key: string;
  unit: string;
  lesson: string;
  startIndex: number;
  endIndex: number;
  count: number;
  answeredCount: number;
  correctCount: number;
}

export function analyzeQuizSections(
  questions: Array<QuizQuestion & { _originalIndex?: number }>,
  quizAnswers: number[],
  essayTextAnswers: Record<number, string>,
  details?: Array<{ questionIndex: number; prompt?: string; isCorrect: boolean }>,
  hasResult = false,
): {
  hasMultipleUnits: boolean;
  hasMultipleLessons: boolean;
  contiguousSectionsByStartIndex: Map<number, QuizSectionInfo>;
  aggregatedSections: QuizSectionInfo[];
} {
  const unitSet = new Set<string>();
  const lessonSet = new Set<string>();
  const contiguousSectionsByStartIndex = new Map<number, QuizSectionInfo>();
  const aggregatedMap = new Map<string, QuizSectionInfo>();

  const detailByIdx = new Map<number, boolean>();
  if (details) {
    for (const d of details) {
      detailByIdx.set(d.questionIndex, Boolean(d.isCorrect));
    }
  }

  let currentSec: QuizSectionInfo | null = null;

  questions.forEach((q, qi) => {
    const unit = (q.unit || "").trim();
    const lesson = (q.lesson || "").trim();
    if (unit) unitSet.add(unit);
    if (lesson) lessonSet.add(lesson);

    const origIdx = typeof q._originalIndex === "number" ? q._originalIndex : qi;
    const isEssay = q.questionType === "essay" || !q.options || q.options.length === 0;
    const isAnswered = isEssay
      ? Boolean((essayTextAnswers[origIdx] ?? essayTextAnswers[qi] ?? "").trim())
      : (quizAnswers[qi] ?? -1) >= 0;

    let isCorrect = false;
    if (hasResult) {
      if (detailByIdx.has(origIdx)) {
        isCorrect = Boolean(detailByIdx.get(origIdx));
      } else if (typeof q.correctIndex === "number" && quizAnswers[qi] === q.correctIndex) {
        isCorrect = true;
      }
    }

    const secKey = `${unit}|||${lesson}`;
    if (!currentSec || currentSec.key !== secKey) {
      currentSec = {
        key: secKey,
        unit,
        lesson,
        startIndex: qi,
        endIndex: qi,
        count: 0,
        answeredCount: 0,
        correctCount: 0,
      };
      contiguousSectionsByStartIndex.set(qi, currentSec);
    }

    currentSec.endIndex = qi;
    currentSec.count += 1;
    if (isAnswered) currentSec.answeredCount += 1;
    if (isCorrect) currentSec.correctCount += 1;

    let agg = aggregatedMap.get(secKey);
    if (!agg) {
      agg = {
        key: secKey,
        unit,
        lesson,
        startIndex: qi,
        endIndex: qi,
        count: 0,
        answeredCount: 0,
        correctCount: 0,
      };
      aggregatedMap.set(secKey, agg);
    }
    agg.endIndex = qi;
    agg.count += 1;
    if (isAnswered) agg.answeredCount += 1;
    if (isCorrect) agg.correctCount += 1;
  });

  return {
    hasMultipleUnits: unitSet.size > 1,
    hasMultipleLessons: lessonSet.size > 1,
    contiguousSectionsByStartIndex,
    aggregatedSections: Array.from(aggregatedMap.values()).filter(
      (s) => Boolean(s.lesson || s.unit),
    ),
  };
}
