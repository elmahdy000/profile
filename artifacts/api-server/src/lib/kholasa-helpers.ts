import { createHash } from "crypto";
import path from "path";
import fs from "fs";
import type { Response } from "express";
import { and, eq, sql } from "drizzle-orm";
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

// ── Safe Question Hash for Mistake Deduplication ──────────────────────────────
export function hashQuestionPrompt(prompt: string): string {
  const normalized = String(prompt || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
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
 * Never throws — safe to call inside quiz/self-assessment/daily submit paths.
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

    const now = new Date();

    for (const item of items) {
      const q = item.question;
      if (!q || !q.prompt || !Array.isArray(q.options) || q.options.length < 2) continue;
      const qHash = hashQuestionPrompt(q.prompt);

      if (!item.isCorrect) {
        let qbId = item.questionBankId ?? null;
        let qConcept = item.concept ?? q.concept ?? null;
        let qUnit = item.unit ?? unit ?? null;
        let qLesson = item.lesson ?? lesson ?? null;

        // Best-effort match in question_bank if questionBankId wasn't provided
        if (!qbId) {
          try {
            const [matched] = await db
              .select({
                id: questionBankTable.id,
                unit: questionBankTable.unit,
                lesson: questionBankTable.lesson,
                concept: questionBankTable.concept,
              })
              .from(questionBankTable)
              .where(sql`lower(trim(${questionBankTable.question}->>'prompt')) = lower(trim(${q.prompt}))`)
              .limit(1);
            if (matched) {
              qbId = matched.id;
              qUnit = qUnit || matched.unit;
              qLesson = qLesson || matched.lesson;
              qConcept = qConcept || matched.concept;
            }
          } catch {}
        }

        const snapshot: QuizQuestion = {
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          correctAnswer: q.correctAnswer || q.options[q.correctIndex],
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
      } else {
        // Answered correctly: if there is an existing unresolved mistake, mark it mastered
        const [existing] = await db
          .select({ id: studentMistakesTable.id, mastered: studentMistakesTable.mastered })
          .from(studentMistakesTable)
          .where(
            and(
              eq(studentMistakesTable.studentId, studentId),
              eq(studentMistakesTable.questionHash, qHash),
            ),
          )
          .limit(1);

        if (existing && !existing.mastered) {
          await db
            .update(studentMistakesTable)
            .set({
              correctStreak: sql`${studentMistakesTable.correctStreak} + 1`,
              mastered: true,
              masteredAt: now,
              updatedAt: now,
            })
            .where(eq(studentMistakesTable.id, existing.id));
        }
      }
    }
  } catch (err) {
    console.error("[kholasa] Non-blocking recordSubmissionMistakes error:", err);
  }
}

