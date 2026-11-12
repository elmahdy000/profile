import { createHash } from "crypto";
import path from "path";
import fs from "fs";
import type { Response } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  questionBankTable,
  studentMistakesTable,
  type QuizQuestion,
  type studentsTable,
} from "@workspace/db";
import { privateUploadDir } from "../routes/learning/shared";

export const kholasaMindmapsDir = path.join(privateUploadDir, "kholasa-mindmaps");
fs.mkdirSync(kholasaMindmapsDir, { recursive: true });

// ── Cairo Calendar Helpers (from D:\kholasa\src\lib\date.ts) ─────────────────
const CAIRO_TZ = "Africa/Cairo";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getCairoDayKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

export function shiftDayKey(dayKey: string, deltaDays: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function calculateStreak(
  days: Iterable<string>,
  todayKey: string = getCairoDayKey(),
): number {
  const completed = new Set(days);
  let cursor = completed.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

// ── Active & Paid Student Access Guard ────────────────────────────────────────
export function assertActivePaidStudent(
  res: Response,
): typeof studentsTable.$inferSelect | null {
  const student = res.locals.student as typeof studentsTable.$inferSelect | undefined;
  if (!student || student.status !== "approved" || student.paymentStatus !== "paid") {
    res.status(403).json({
      error: "هذه الميزة متاحة فقط للطلاب المفعلين والمسددين للاشتراك الشهري.",
      code: "PAYMENT_REQUIRED",
    });
    return null;
  }
  return student;
}

// ── Unified Option Resolution & Grading ───────────────────────────────────────
export function resolveCorrectOptionIndex(q: QuizQuestion): number {
  let resolved = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
  if (q.correctAnswer && Array.isArray(q.options)) {
    const matchIdx = q.options.findIndex((opt) => opt?.trim() === q.correctAnswer?.trim());
    if (matchIdx >= 0) {
      resolved = matchIdx;
    }
  }
  return resolved;
}

export function gradeQuestionOption(
  q: QuizQuestion,
  selectedOption: number,
): { isCorrect: boolean; resolvedCorrectOption: number; normalizedOption: number } {
  const normalizedOption =
    Number.isInteger(selectedOption) &&
    selectedOption >= 0 &&
    Array.isArray(q.options) &&
    selectedOption < q.options.length
      ? selectedOption
      : -1;

  const resolvedCorrectOption = resolveCorrectOptionIndex(q);
  const selectedText =
    normalizedOption >= 0 ? q.options[normalizedOption]?.trim() : undefined;
  const correctText =
    q.correctAnswer?.trim() ||
    (Array.isArray(q.options) ? q.options[resolvedCorrectOption]?.trim() : undefined);

  const isCorrect = Boolean(
    normalizedOption >= 0 &&
      ((selectedText && correctText && selectedText === correctText) ||
        normalizedOption === resolvedCorrectOption),
  );

  return { isCorrect, resolvedCorrectOption, normalizedOption };
}

// ── Safe Question Hash for Mistake Deduplication ──────────────────────────────
export function normalizePromptKey(prompt: string): string {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hashQuestionPrompt(prompt: string): string {
  return createHash("sha256").update(normalizePromptKey(prompt)).digest("hex").slice(0, 32);
}

export interface MistakeRecordingItem {
  question: QuizQuestion;
  questionBankId?: number | null;
  selectedOption: number;
  isCorrect: boolean;
  unit?: string | null;
  lesson?: string | null;
  concept?: string | null;
}

/**
 * Safely records wrong answers into student_mistakes and promotes previously
 * missed questions to mastered when answered correctly.
 * Uses batched DB lookups (never N+1) and never throws.
 */
export async function recordSubmissionMistakes(params: {
  studentId: number;
  stage?: string | null;
  unit?: string | null;
  lesson?: string | null;
  sourceType: "quiz" | "self_assessment" | "daily_challenge" | "mistakes_practice";
  sourceId?: number | null;
  items: MistakeRecordingItem[];
}): Promise<void> {
  try {
    const { studentId, stage, unit, lesson, sourceType, sourceId, items } = params;
    if (!studentId || !Array.isArray(items) || items.length === 0) return;

    const validItems = items.filter(
      (it) => it?.question && it.question.prompt && Array.isArray(it.question.options) && it.question.options.length >= 2,
    );
    if (validItems.length === 0) return;

    const wrongItems = validItems.filter((it) => !it.isCorrect);
    const correctItems = validItems.filter((it) => it.isCorrect);

    // 1. Batched question_bank metadata enrichment for wrong items
    const qbById = new Map<number, { id: number; unit: string | null; lesson: string | null; concept: string | null }>();
    const qbByPrompt = new Map<string, { id: number; unit: string | null; lesson: string | null; concept: string | null }>();

    if (wrongItems.length > 0) {
      const idsToFetch = Array.from(
        new Set(
          wrongItems
            .filter((it) => it.questionBankId && it.questionBankId > 0 && (!it.unit || !it.lesson))
            .map((it) => Number(it.questionBankId)),
        ),
      );
      if (idsToFetch.length > 0) {
        const rows = await db
          .select({
            id: questionBankTable.id,
            unit: questionBankTable.unit,
            lesson: questionBankTable.lesson,
            concept: questionBankTable.concept,
          })
          .from(questionBankTable)
          .where(inArray(questionBankTable.id, idsToFetch));
        for (const r of rows) qbById.set(r.id, r);
      }

      const promptsToLookup = Array.from(
        new Set(
          wrongItems
            .filter((it) => !it.questionBankId)
            .map((it) => it.question.prompt.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      if (promptsToLookup.length > 0) {
        const rows = await db
          .select({
            id: questionBankTable.id,
            unit: questionBankTable.unit,
            lesson: questionBankTable.lesson,
            concept: questionBankTable.concept,
            promptKey: sql<string>`lower(trim(${questionBankTable.question}->>'prompt'))`,
          })
          .from(questionBankTable)
          .where(inArray(sql`lower(trim(${questionBankTable.question}->>'prompt'))`, promptsToLookup));
        for (const r of rows) {
          if (r.promptKey && !qbByPrompt.has(r.promptKey)) {
            qbByPrompt.set(r.promptKey, {
              id: r.id,
              unit: r.unit,
              lesson: r.lesson,
              concept: r.concept,
            });
          }
        }
      }
    }

    const now = new Date();

    // 2. Upsert wrong answers (deduplicated per student & normalized prompt hash)
    for (const item of wrongItems) {
      const q = item.question;
      const qHash = hashQuestionPrompt(q.prompt);

      const meta =
        (item.questionBankId ? qbById.get(item.questionBankId) : undefined) ||
        qbByPrompt.get(q.prompt.trim().toLowerCase());

      const qbId = item.questionBankId ?? meta?.id ?? null;
      const qUnit = item.unit ?? unit ?? meta?.unit ?? null;
      const qLesson = item.lesson ?? lesson ?? meta?.lesson ?? null;
      const qConcept = item.concept ?? q.concept ?? meta?.concept ?? null;
      const resolvedCorrect = resolveCorrectOptionIndex(q);

      const snapshot: QuizQuestion = {
        prompt: q.prompt,
        options: q.options,
        correctIndex: resolvedCorrect,
        correctAnswer: q.correctAnswer || q.options[resolvedCorrect],
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        questionType: q.questionType,
        translation: q.translation,
        concept: qConcept ?? undefined,
      };

      await db
        .insert(studentMistakesTable)
        .values({
          studentId,
          questionBankId: qbId,
          questionHash: qHash,
          stage: stage ?? null,
          unit: qUnit,
          lesson: qLesson,
          concept: qConcept,
          sourceType,
          sourceId: sourceId ?? null,
          lastWrongOption: Number.isInteger(item.selectedOption) ? item.selectedOption : -1,
          wrongCount: 1,
          correctStreak: 0,
          mastered: false,
          questionSnapshot: snapshot,
          lastWrongAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [studentMistakesTable.studentId, studentMistakesTable.questionHash],
          set: {
            questionBankId: sql`COALESCE(${studentMistakesTable.questionBankId}, ${qbId})`,
            unit: sql`COALESCE(${studentMistakesTable.unit}, ${qUnit})`,
            lesson: sql`COALESCE(${studentMistakesTable.lesson}, ${qLesson})`,
            concept: sql`COALESCE(${studentMistakesTable.concept}, ${qConcept})`,
            wrongCount: sql`${studentMistakesTable.wrongCount} + 1`,
            correctStreak: 0,
            mastered: false,
            masteredAt: null,
            lastWrongOption: Number.isInteger(item.selectedOption) ? item.selectedOption : -1,
            sourceType,
            sourceId: sourceId ?? null,
            questionSnapshot: snapshot,
            lastWrongAt: now,
            updatedAt: now,
          },
        });
    }

    // 3. Batch-promote previously wrong questions when answered correctly
    if (correctItems.length > 0) {
      const correctHashes = Array.from(
        new Set(correctItems.map((it) => hashQuestionPrompt(it.question.prompt))),
      );
      await db
        .update(studentMistakesTable)
        .set({
          correctStreak: sql`${studentMistakesTable.correctStreak} + 1`,
          mastered: true,
          masteredAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(studentMistakesTable.studentId, studentId),
            eq(studentMistakesTable.mastered, false),
            inArray(studentMistakesTable.questionHash, correctHashes),
          ),
        );
    }
  } catch (err) {
    console.error("[kholasa] Non-blocking recordSubmissionMistakes error:", err);
  }
}
