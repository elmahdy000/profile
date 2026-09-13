import { createHmac, timingSafeEqual } from "crypto";
import {
  coursesTable,
  db,
  questionBankTable,
  quizzesTable,
  siteSettingsTable,
  studentNotificationsTable,
  studentsTable,
  videosTable,
  type QuizQuestion,
} from "@workspace/db";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { canStudentAccessContent } from "../middleware/student-auth";
import { logger } from "../lib/logger";

export interface AutoExamSettings {
  enabled: boolean;
  timeOfDay: string; // "08:00" 24h format
  questionsCount: number; // default 10
  passingScore: number; // default 60%
  durationMinutes: number; // default 20
  targetCourseId: number | null; // null = auto-rotate across all courses with questions
  targetStage: string; // "all" or specific stage
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
    webhookUrl?: string;
  };
  lastRunDate?: string; // "YYYY-MM-DD"
  lastGeneratedQuizId?: number;
}

export const DEFAULT_AUTO_EXAM_SETTINGS: AutoExamSettings = {
  enabled: false,
  timeOfDay: "08:00",
  questionsCount: 10,
  passingScore: 60,
  durationMinutes: 20,
  targetCourseId: null,
  targetStage: "all",
  difficultyDistribution: {
    easy: 3,
    medium: 5,
    hard: 2,
  },
  telegram: {
    enabled: false,
    botToken: "",
    chatId: "",
  },
  whatsapp: {
    enabled: false,
    phoneNumber: "",
    webhookUrl: "",
  },
};

const SETTINGS_KEY = "auto_exam_settings";

const tokenSecret = (() => {
  return process.env.STREAM_TOKEN_SECRET || process.env.ADMIN_PASSWORD || "dr-mahmoud-auto-exam-secret-salt";
})();

export function createApprovalToken(quizId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 72 * 3600; // 72 hours
  const payload = `${quizId}.${expiresAt}`;
  const signature = createHmac("sha256", tokenSecret).update(payload).digest("hex");
  return `${expiresAt}.${signature}`;
}

export function isValidApprovalToken(quizId: number, token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiresAtStr, suppliedSig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expectedSig = createHmac("sha256", tokenSecret).update(`${quizId}.${expiresAt}`).digest("hex");
  const supplied = Buffer.from(suppliedSig);
  const expected = Buffer.from(expectedSig);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function getAutoExamSettings(): Promise<AutoExamSettings> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, SETTINGS_KEY))
      .limit(1);
    if (!row?.value) {
      return { ...DEFAULT_AUTO_EXAM_SETTINGS };
    }
    const parsed = JSON.parse(row.value) as Partial<AutoExamSettings>;
    return {
      ...DEFAULT_AUTO_EXAM_SETTINGS,
      ...parsed,
      difficultyDistribution: {
        ...DEFAULT_AUTO_EXAM_SETTINGS.difficultyDistribution,
        ...(parsed.difficultyDistribution || {}),
      },
      telegram: {
        ...DEFAULT_AUTO_EXAM_SETTINGS.telegram,
        ...(parsed.telegram || {}),
      },
      whatsapp: {
        ...DEFAULT_AUTO_EXAM_SETTINGS.whatsapp,
        ...(parsed.whatsapp || {}),
      },
    };
  } catch (err) {
    logger.error({ err }, "[AUTO_EXAM] Failed to read settings, using defaults");
    return { ...DEFAULT_AUTO_EXAM_SETTINGS };
  }
}

export async function saveAutoExamSettings(settings: AutoExamSettings): Promise<void> {
  const value = JSON.stringify(settings);
  await db
    .insert(siteSettingsTable)
    .values({
      key: SETTINGS_KEY,
      value,
      type: "json",
    })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: {
        value,
        type: "json",
        updatedAt: new Date(),
      },
    });
}

function normalizePrompt(text: string): string {
  return String(text || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

/**
 * Generate a new draft exam from the test bank and return it without publishing.
 */
export async function generateDailyDraftExam(customSettings?: AutoExamSettings): Promise<{
  quiz: typeof quizzesTable.$inferSelect;
  courseTitle: string;
  approvalToken: string;
  messageText: string;
}> {
  const settings = customSettings || (await getAutoExamSettings());

  // 1. Select course: specific course or auto-rotate to a course with question bank entries
  let courseId = settings.targetCourseId;
  let targetCourse: { id: number; title: string; category: string; stages: string[] | null } | null = null;

  if (courseId) {
    const [found] = await db
      .select({
        id: coursesTable.id,
        title: coursesTable.title,
        category: coursesTable.category,
        stages: coursesTable.stages,
      })
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .limit(1);
    if (found) targetCourse = found;
  }

  if (!targetCourse) {
    // Find courses with questions in the bank
    const coursesWithQuestions = await db
      .select({
        courseId: questionBankTable.courseId,
        count: sql<number>`count(*)`,
      })
      .from(questionBankTable)
      .where(sql`${questionBankTable.courseId} IS NOT NULL`)
      .groupBy(questionBankTable.courseId)
      .having(sql`count(*) >= 5`);

    if (coursesWithQuestions.length > 0) {
      // Pick one randomly or rotate based on day
      const dayNum = new Date().getDate();
      const chosen = coursesWithQuestions[dayNum % coursesWithQuestions.length];
      if (chosen?.courseId) {
        courseId = chosen.courseId;
        const [found] = await db
          .select({
            id: coursesTable.id,
            title: coursesTable.title,
            category: coursesTable.category,
            stages: coursesTable.stages,
          })
          .from(coursesTable)
          .where(eq(coursesTable.id, chosen.courseId))
          .limit(1);
        if (found) targetCourse = found;
      }
    }
  }

  // 2. Fetch available bank questions for this course or category
  let questionsQuery = db.select().from(questionBankTable);
  const conditions = [];
  if (courseId) {
    conditions.push(eq(questionBankTable.courseId, courseId));
  }
  if (settings.targetStage && settings.targetStage !== "all") {
    conditions.push(
      or(
        eq(questionBankTable.stage, settings.targetStage),
        sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([settings.targetStage])}::jsonb`,
      ),
    );
  }

  const rawQuestions = await (conditions.length ? questionsQuery.where(and(...conditions)) : questionsQuery);

  if (!rawQuestions || rawQuestions.length === 0) {
    throw new Error(
      `لا توجد أسئلة كافية في بنك الأسئلة للكورس المختار (${targetCourse?.title || "كل الكورسات"}). يرجى إضافة أسئلة في بنك الأسئلة أولاً.`,
    );
  }

  // 3. Automated Quality Filter: Ensure questions are complete, have >= 2 choices, and valid correctIndex
  const qualityQuestions = rawQuestions.filter((row) => {
    const q = row.question;
    if (!q || typeof q.prompt !== "string" || !q.prompt.trim()) return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (q.options.some((opt) => !String(opt || "").trim())) return false;
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
    return true;
  });

  if (qualityQuestions.length < 3) {
    throw new Error(`عدد الأسئلة الصالحة والمكتملة في بنك الأسئلة أقل من 3 أسئلة (تم العثور على ${qualityQuestions.length} فقط).`);
  }

  // 4. Retrieve prompts from recent quizzes (last 5 quizzes) to prevent repetition
  const recentQuizzes = await db
    .select({ questions: quizzesTable.questions })
    .from(quizzesTable)
    .orderBy(desc(quizzesTable.id))
    .limit(5);

  const recentlyUsedPrompts = new Set<string>();
  for (const rz of recentQuizzes) {
    if (Array.isArray(rz.questions)) {
      for (const q of rz.questions) {
        if (q?.prompt) recentlyUsedPrompts.add(normalizePrompt(q.prompt));
      }
    }
  }

  // Prefer questions not used recently, but fall back if needed
  const freshQuestions = qualityQuestions.filter((q) => !recentlyUsedPrompts.has(normalizePrompt(q.question.prompt)));
  const questionPool = freshQuestions.length >= settings.questionsCount ? freshQuestions : qualityQuestions;

  // 5. Balanced Difficulty Selection
  const targetTotal = Math.min(settings.questionsCount, questionPool.length);
  const easyTarget = Math.round(targetTotal * (settings.difficultyDistribution.easy / 10));
  const medTarget = Math.round(targetTotal * (settings.difficultyDistribution.medium / 10));
  const hardTarget = targetTotal - easyTarget - medTarget;

  const easyPool = questionPool.filter((q) => q.difficulty === "easy").sort(() => Math.random() - 0.5);
  const medPool = questionPool.filter((q) => q.difficulty === "medium").sort(() => Math.random() - 0.5);
  const hardPool = questionPool.filter((q) => q.difficulty === "hard").sort(() => Math.random() - 0.5);

  const selectedRows: typeof questionPool = [];
  const selectedPrompts = new Set<string>();

  const canAdd = (item: (typeof questionPool)[0]) => {
    const norm = normalizePrompt(item.question.prompt);
    return !selectedPrompts.has(norm);
  };

  const addOne = (item: (typeof questionPool)[0]) => {
    selectedRows.push(item);
    selectedPrompts.add(normalizePrompt(item.question.prompt));
  };

  for (const item of easyPool) {
    if (selectedRows.filter((r) => r.difficulty === "easy").length >= easyTarget) break;
    if (canAdd(item)) addOne(item);
  }
  for (const item of medPool) {
    if (selectedRows.filter((r) => r.difficulty === "medium").length >= medTarget) break;
    if (canAdd(item)) addOne(item);
  }
  for (const item of hardPool) {
    if (selectedRows.filter((r) => r.difficulty === "hard").length >= hardTarget) break;
    if (canAdd(item)) addOne(item);
  }

  // Fill up remainder to targetTotal if any pool was short
  if (selectedRows.length < targetTotal) {
    const remaining = [...questionPool].sort(() => Math.random() - 0.5);
    for (const item of remaining) {
      if (selectedRows.length >= targetTotal) break;
      if (canAdd(item)) addOne(item);
    }
  }

  // Shuffle final questions order
  selectedRows.sort(() => Math.random() - 0.5);

  const finalQuestions: QuizQuestion[] = selectedRows.map((r) => ({
    prompt: r.question.prompt,
    options: r.question.options,
    correctIndex: r.question.correctIndex,
    explanation: r.question.explanation || undefined,
    imageUrl: r.question.imageUrl || undefined,
    points: r.points || r.question.points || 1,
  }));

  const todayDateStr = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const courseTitle = targetCourse?.title || "الكورس العام";
  const examTitle = `اختبار يومي تجريبي: ${courseTitle} (${todayDateStr})`;
  const stages = targetCourse?.stages?.length ? targetCourse.stages : ["عام"];

  // 6. Insert as DRAFT (isPublished = false)
  const [createdQuiz] = await db
    .insert(quizzesTable)
    .values({
      title: examTitle,
      courseId: targetCourse?.id || null,
      scope: "course",
      description: `اختبار مراجعة يومي تم توليده آلياً من بنك الأسئلة لكورس ${courseTitle}. بانتظار اعتماد المعلم.`,
      category: targetCourse?.category || "عام",
      stage: stages[0] || "عام",
      stages,
      durationMinutes: settings.durationMinutes,
      passingScore: settings.passingScore,
      maxAttempts: 3,
      shuffleQuestions: true,
      showExplanations: true,
      questions: finalQuestions,
      isPublished: false, // ALWAYS false until approved by instructor!
    })
    .returning();

  const approvalToken = createApprovalToken(createdQuiz.id);

  // 7. Format complete exam review message
  const optionLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
  const questionsFormatted = finalQuestions
    .map((q, idx) => {
      const correctLetter = optionLetters[q.correctIndex] || String(q.correctIndex + 1);
      const optionsText = q.options.map((opt, oIdx) => `  ${optionLetters[oIdx] || oIdx + 1}) ${opt}`).join("\n");
      const explText = q.explanation ? `\n  💡 التفسير: ${q.explanation}` : "";
      return `📌 *السؤال (${idx + 1}):*\n${q.prompt}\n${optionsText}\n  ✅ *الإجابة الصحيحة:* (${correctLetter})${explText}`;
    })
    .join("\n\n────────────────\n\n");

  const approvalUrl = `https://drelmahdy.com/api/admin/learning/quizzes/${createdQuiz.id}/quick-approve?token=${approvalToken}`;

  const messageText = `🎓 *نموذج اختبار يومي جديد بانتظار اعتمادك* 📋\n\n` +
    `🏷️ *الكورس:* ${courseTitle}\n` +
    `📅 *التاريخ:* ${todayDateStr}\n` +
    `🔢 *عدد الأسئلة:* ${finalQuestions.length} سؤال\n` +
    `⏱️ *المدة:* ${settings.durationMinutes} دقيقة | 🎯 *النجاح:* ${settings.passingScore}%\n` +
    `🔒 *الحالة:* مسودة (لم يُنشر للطلاب بعد)\n\n` +
    `═══════════════════\n` +
    `📝 *تفاصيل ونصوص الأسئلة والإجابات:*\n\n` +
    `${questionsFormatted}\n\n` +
    `═══════════════════\n` +
    `👉 *للاعتماد والنشر المباشر للطلاب فوراً:* اضغط الزر أدناه أو الرابط:\n` +
    `${approvalUrl}`;

  // Update lastGeneratedQuizId and lastRunDate
  const todayIso = new Date().toISOString().split("T")[0];
  await saveAutoExamSettings({
    ...settings,
    lastRunDate: todayIso,
    lastGeneratedQuizId: createdQuiz.id,
  });

  return {
    quiz: createdQuiz,
    courseTitle,
    approvalToken,
    messageText,
  };
}

/**
 * Send the generated exam to Telegram Bot with inline interactive buttons.
 */
export async function sendExamToTelegram(
  botToken: string,
  chatId: string,
  quiz: typeof quizzesTable.$inferSelect,
  approvalToken: string,
  messageText: string,
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: "Telegram Bot Token or Chat ID is missing" };
  }

  const approvalUrl = `https://drelmahdy.com/api/admin/learning/quizzes/${quiz.id}/quick-approve?token=${approvalToken}`;
  const platformPreviewUrl = `https://drelmahdy.com/platform?tab=exams`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ اعتماد ونشر الاختبار للطلاب الآن",
          url: approvalUrl,
        },
      ],
      [
        {
          text: "👁️ معاينة الاختبار على المنصة",
          url: platformPreviewUrl,
        },
      ],
    ],
  };

  try {
    // Telegram has a 4096 character limit per message.
    // If message is longer, split into chunks and put buttons on the last chunk.
    const maxChunk = 3800;
    const chunks: string[] = [];
    let remaining = messageText;

    while (remaining.length > maxChunk) {
      // Find a suitable split point
      let splitAt = remaining.lastIndexOf("\n\n────────────────\n\n", maxChunk);
      if (splitAt === -1 || splitAt < 1000) {
        splitAt = remaining.lastIndexOf("\n\n", maxChunk);
      }
      if (splitAt === -1) {
        splitAt = maxChunk;
      }
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trim();
    }
    chunks.push(remaining);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: chunks[i],
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      };
      if (isLast) {
        body.reply_markup = inlineKeyboard;
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        // Retry with plain text without markdown if markdown failed
        const plainBody = { ...body, parse_mode: undefined };
        const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plainBody),
        });
        if (!retryRes.ok) {
          logger.error({ errText }, "[AUTO_EXAM] Telegram API error");
          return { success: false, error: errText };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "[AUTO_EXAM] Failed to send Telegram message");
    return { success: false, error: err.message || "Network error sending to Telegram" };
  }
}

/**
 * Send WhatsApp notification via configured webhook (e.g. UltraMsg, Green API, or custom).
 */
export async function sendExamToWhatsApp(
  webhookUrl: string,
  phoneNumber: string,
  messageText: string,
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: "WhatsApp Webhook URL is not configured" };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phoneNumber,
        message: messageText,
        body: messageText,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send WhatsApp message" };
  }
}

/**
 * One-click approve and publish a quiz draft.
 */
export async function approveAndPublishQuiz(quizId: number): Promise<{
  success: boolean;
  quiz: typeof quizzesTable.$inferSelect;
  notifiedCount: number;
  alreadyPublished?: boolean;
}> {
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
  if (!quiz) {
    throw new Error("الاختبار غير موجود");
  }

  if (quiz.isPublished) {
    return { success: true, quiz, notifiedCount: 0, alreadyPublished: true };
  }

  // Update quiz to published
  const [updatedQuiz] = await db
    .update(quizzesTable)
    .set({
      isPublished: true,
      updatedAt: new Date(),
    })
    .where(eq(quizzesTable.id, quizId))
    .returning();

  // If linked to a lesson, link it to videosTable
  if (updatedQuiz.videoId) {
    await db
      .update(videosTable)
      .set({ quizId: updatedQuiz.id })
      .where(eq(videosTable.id, updatedQuiz.videoId));
  }

  // Send in-platform notification to enrolled/matching students
  let notifiedCount = 0;
  try {
    const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
    const recipients = approvedStudents.filter((student) =>
      canStudentAccessContent(student, updatedQuiz.category, updatedQuiz.stage, updatedQuiz.stages, updatedQuiz.courseId),
    );
    if (recipients.length > 0) {
      await db.insert(studentNotificationsTable).values(
        recipients.map((student) => ({
          studentId: student.id,
          type: "quiz",
          title: "اختبار جديد متاح لك",
          message: `${updatedQuiz.title} متاح الآن داخل منصة الاختبارات. اختبر معلوماتك الآن!`,
        })),
      );
      notifiedCount = recipients.length;
    }
  } catch (notifErr) {
    logger.error({ err: notifErr }, "[AUTO_EXAM] Failed to notify students");
  }

  return { success: true, quiz: updatedQuiz, notifiedCount };
}

/**
 * Background scheduler check that runs periodically (every 60s).
 */
export async function runAutoExamSchedulerTick(): Promise<void> {
  try {
    const settings = await getAutoExamSettings();
    if (!settings.enabled) return;

    // Get current time in Cairo timezone (Africa/Cairo)
    const nowCairo = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const currentHours = String(nowCairo.getHours()).padStart(2, "0");
    const currentMinutes = String(nowCairo.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = nowCairo.toISOString().split("T")[0];

    // Check if time matches and has not already run today
    if (currentTimeStr === settings.timeOfDay && settings.lastRunDate !== todayStr) {
      logger.info({ currentTimeStr, todayStr }, "[AUTO_EXAM] Scheduled trigger matched! Generating daily draft exam...");
      const result = await generateDailyDraftExam(settings);

      if (settings.telegram.enabled && settings.telegram.botToken && settings.telegram.chatId) {
        await sendExamToTelegram(
          settings.telegram.botToken,
          settings.telegram.chatId,
          result.quiz,
          result.approvalToken,
          result.messageText,
        );
        logger.info("[AUTO_EXAM] Sent daily exam review to Telegram!");
      }

      if (settings.whatsapp.enabled && settings.whatsapp.webhookUrl) {
        await sendExamToWhatsApp(
          settings.whatsapp.webhookUrl,
          settings.whatsapp.phoneNumber,
          result.messageText,
        );
        logger.info("[AUTO_EXAM] Sent daily exam review to WhatsApp!");
      }
    }
  } catch (err) {
    logger.error({ err }, "[AUTO_EXAM] Error during auto exam scheduler tick");
  }
}
