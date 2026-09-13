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
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { canStudentAccessContent } from "../middleware/student-auth";
import { logger } from "../lib/logger";

export interface AutoExamSchedule {
  id: string;
  title: string;
  enabled: boolean;
  timeOfDay: string; // "08:00" 24h format in Cairo time
  stage: string; // "all" or specific stage name
  unit?: string; // "all" or specific unit
  lesson?: string; // "all" or specific lesson
  courseId?: number | null;
  questionsCount: number; // default 10
  durationMinutes: number; // default 20
  passingScore: number; // default 60%
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  lastRunDate?: string; // "YYYY-MM-DD"
  lastGeneratedQuizId?: number;
}

export interface AutoExamChannelsConfig {
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
}

export interface AutoExamFullConfig {
  channels: AutoExamChannelsConfig;
  schedules: AutoExamSchedule[];
}

export const DEFAULT_CHANNELS_CONFIG: AutoExamChannelsConfig = {
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

export const DEFAULT_SCHEDULE: AutoExamSchedule = {
  id: "sched_default",
  title: "اختبار المراجعة اليومي العام",
  enabled: true,
  timeOfDay: "08:00",
  stage: "all",
  unit: "all",
  lesson: "all",
  courseId: null,
  questionsCount: 10,
  durationMinutes: 20,
  passingScore: 60,
  difficultyDistribution: {
    easy: 3,
    medium: 5,
    hard: 2,
  },
};

const SCHEDULES_SETTINGS_KEY = "auto_exam_schedules";
const LEGACY_SETTINGS_KEY = "auto_exam_settings";

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

/**
 * Retrieve the full auto-exam config (channels + schedules list)
 */
export async function getAutoExamFullConfig(): Promise<AutoExamFullConfig> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, SCHEDULES_SETTINGS_KEY))
      .limit(1);

    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<AutoExamFullConfig>;
      return {
        channels: {
          telegram: {
            ...DEFAULT_CHANNELS_CONFIG.telegram,
            ...(parsed.channels?.telegram || {}),
          },
          whatsapp: {
            ...DEFAULT_CHANNELS_CONFIG.whatsapp,
            ...(parsed.channels?.whatsapp || {}),
          },
        },
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      };
    }

    // Check legacy single-schedule config if exists
    const [legacyRow] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, LEGACY_SETTINGS_KEY))
      .limit(1);

    if (legacyRow?.value) {
      const legacy = JSON.parse(legacyRow.value) as any;
      const initialSchedule: AutoExamSchedule = {
        id: "sched_" + Date.now(),
        title: "الجدول اليومي الأساسي",
        enabled: Boolean(legacy.enabled),
        timeOfDay: legacy.timeOfDay || "08:00",
        stage: legacy.targetStage || "all",
        unit: "all",
        lesson: "all",
        courseId: legacy.targetCourseId || null,
        questionsCount: legacy.questionsCount || 10,
        durationMinutes: legacy.durationMinutes || 20,
        passingScore: legacy.passingScore || 60,
        difficultyDistribution: legacy.difficultyDistribution || { easy: 3, medium: 5, hard: 2 },
        lastRunDate: legacy.lastRunDate,
        lastGeneratedQuizId: legacy.lastGeneratedQuizId,
      };

      const migratedConfig: AutoExamFullConfig = {
        channels: {
          telegram: {
            ...DEFAULT_CHANNELS_CONFIG.telegram,
            ...(legacy.telegram || {}),
          },
          whatsapp: {
            ...DEFAULT_CHANNELS_CONFIG.whatsapp,
            ...(legacy.whatsapp || {}),
          },
        },
        schedules: [initialSchedule],
      };

      // Save migrated structure
      await saveAutoExamFullConfig(migratedConfig);
      return migratedConfig;
    }

    return {
      channels: { ...DEFAULT_CHANNELS_CONFIG },
      schedules: [{ ...DEFAULT_SCHEDULE }],
    };
  } catch (err) {
    logger.error({ err }, "[AUTO_EXAM] Failed to read full config, using defaults");
    return {
      channels: { ...DEFAULT_CHANNELS_CONFIG },
      schedules: [{ ...DEFAULT_SCHEDULE }],
    };
  }
}

/**
 * Save full auto-exam config (channels + schedules)
 */
export async function saveAutoExamFullConfig(config: AutoExamFullConfig): Promise<void> {
  const value = JSON.stringify(config);
  await db
    .insert(siteSettingsTable)
    .values({
      key: SCHEDULES_SETTINGS_KEY,
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

function normalizeText(text: string): string {
  return String(text || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

/**
 * Generate a new draft exam for a specific schedule and return it without publishing.
 */
export async function generateDraftExamForSchedule(
  schedule: AutoExamSchedule,
  channels?: AutoExamChannelsConfig,
): Promise<{
  quiz: typeof quizzesTable.$inferSelect;
  courseTitle: string;
  stageName: string;
  unitName: string;
  lessonName: string;
  approvalToken: string;
  messageText: string;
}> {
  // 1. Resolve Target Course
  // 1. Resolve Target Course (ONLY if explicitly set by schedule)
  let targetCourse: { id: number; title: string; category: string; stages: string[] | null } | null = null;

  if (schedule.courseId) {
    const [found] = await db
      .select({
        id: coursesTable.id,
        title: coursesTable.title,
        category: coursesTable.category,
        stages: coursesTable.stages,
      })
      .from(coursesTable)
      .where(eq(coursesTable.id, schedule.courseId))
      .limit(1);
    if (found) targetCourse = found;
  }

  // 2. Build question bank filters for this specific schedule
  const conditions = [];

  // ONLY filter questions by courseId if explicitly chosen by instructor
  if (schedule.courseId) {
    conditions.push(eq(questionBankTable.courseId, schedule.courseId));
  }

  if (schedule.stage && schedule.stage !== "all") {
    conditions.push(
      or(
        eq(questionBankTable.stage, schedule.stage),
        sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([schedule.stage])}::jsonb`,
        ilike(questionBankTable.stage, `%${schedule.stage.trim()}%`),
      ),
    );
  }

  if (schedule.unit && schedule.unit !== "all") {
    conditions.push(
      or(
        eq(questionBankTable.unit, schedule.unit),
        ilike(questionBankTable.unit, `%${schedule.unit.trim()}%`),
      ),
    );
  }

  if (schedule.lesson && schedule.lesson !== "all") {
    conditions.push(
      or(
        eq(questionBankTable.lesson, schedule.lesson),
        ilike(questionBankTable.lesson, `%${schedule.lesson.trim()}%`),
      ),
    );
  }

  let rawQuestions = await (conditions.length
    ? db.select().from(questionBankTable).where(and(...conditions))
    : db.select().from(questionBankTable));

  // Smart fallback 1: If specific lesson had 0 questions, try falling back to the unit
  if ((!rawQuestions || rawQuestions.length === 0) && schedule.lesson && schedule.lesson !== "all") {
    logger.warn({ schedule }, "[AUTO_EXAM] No questions found for exact lesson, attempting fallback to unit");
    const fallbackConditions = [];
    if (schedule.courseId) fallbackConditions.push(eq(questionBankTable.courseId, schedule.courseId));
    if (schedule.stage && schedule.stage !== "all") {
      fallbackConditions.push(
        or(
          eq(questionBankTable.stage, schedule.stage),
          sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([schedule.stage])}::jsonb`,
          ilike(questionBankTable.stage, `%${schedule.stage.trim()}%`),
        ),
      );
    }
    if (schedule.unit && schedule.unit !== "all") {
      fallbackConditions.push(
        or(
          eq(questionBankTable.unit, schedule.unit),
          ilike(questionBankTable.unit, `%${schedule.unit.trim()}%`),
        ),
      );
    }
    if (fallbackConditions.length) {
      rawQuestions = await db.select().from(questionBankTable).where(and(...fallbackConditions));
    }
  }

  // Smart fallback 2: If still 0, try falling back to the stage
  if ((!rawQuestions || rawQuestions.length === 0) && schedule.stage && schedule.stage !== "all") {
    logger.warn({ schedule }, "[AUTO_EXAM] No questions found for unit, attempting fallback to stage");
    const stageConditions = [
      or(
        eq(questionBankTable.stage, schedule.stage),
        sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([schedule.stage])}::jsonb`,
        ilike(questionBankTable.stage, `%${schedule.stage.trim()}%`),
      ),
    ];
    rawQuestions = await db.select().from(questionBankTable).where(and(...stageConditions));
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    const scopeDesc = [
      schedule.stage && schedule.stage !== "all" ? `المرحلة: ${schedule.stage}` : "",
      schedule.unit && schedule.unit !== "all" ? `الوحدة: ${schedule.unit}` : "",
      schedule.lesson && schedule.lesson !== "all" ? `الدرس: ${schedule.lesson}` : "",
    ].filter(Boolean).join(" · ");

    throw new Error(
      `لا توجد أسئلة كافية في بنك الأسئلة للنطاق المحدد لـ (${schedule.title}) [${scopeDesc || "عام"}]. يرجى إضافة أسئلة في بنك الأسئلة أولاً.`,
    );
  }

  // Resolve target course if not yet set
  if (!targetCourse) {
    const detectedCourseId = rawQuestions.find((q) => q.courseId)?.courseId;
    if (detectedCourseId) {
      const [found] = await db
        .select({
          id: coursesTable.id,
          title: coursesTable.title,
          category: coursesTable.category,
          stages: coursesTable.stages,
        })
        .from(coursesTable)
        .where(eq(coursesTable.id, detectedCourseId))
        .limit(1);
      if (found) targetCourse = found;
    }
  }

  if (!targetCourse && schedule.unit && schedule.unit !== "all") {
    const allCourses = await db.select().from(coursesTable);
    const matchingUnit = allCourses.find(
      (c) => c.title && (c.title.includes(schedule.unit!) || schedule.unit!.includes(c.title)),
    );
    if (matchingUnit) targetCourse = matchingUnit;
  }

  if (!targetCourse && schedule.stage && schedule.stage !== "all") {
    const allCourses = await db.select().from(coursesTable);
    const matching = allCourses.find((c) =>
      Array.isArray(c.stages) ? c.stages.includes(schedule.stage) : false,
    );
    if (matching) targetCourse = matching;
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

  if (qualityQuestions.length === 0) {
    throw new Error(`الأسئلة المتوفرة في بنك الأسئلة لنطاق (${schedule.title}) تحتاج إلى مراجعة وتنسيق خيارات.`);
  }

  // 4. Exclude questions recently used in the last 15 quizzes to ensure fresh daily questions
  const recentQuizzes = await db
    .select({ questions: quizzesTable.questions })
    .from(quizzesTable)
    .orderBy(desc(quizzesTable.createdAt))
    .limit(15);

  const recentNormalizedPrompts = new Set<string>();
  for (const qz of recentQuizzes) {
    if (Array.isArray(qz.questions)) {
      for (const item of qz.questions) {
        if (item?.prompt) {
          recentNormalizedPrompts.add(normalizeText(item.prompt));
        }
      }
    }
  }

  const freshQuestions = qualityQuestions.filter(
    (row) => !recentNormalizedPrompts.has(normalizeText(row.question.prompt)),
  );

  const questionPool = freshQuestions.length >= Math.min(schedule.questionsCount, 5) ? freshQuestions : qualityQuestions;

  // 5. Categorize and select according to difficulty distribution
  const easyPool = questionPool.filter((q) => (q.difficulty || "medium") === "easy");
  const medPool = questionPool.filter((q) => (q.difficulty || "medium") === "medium");
  const hardPool = questionPool.filter((q) => (q.difficulty || "medium") === "hard");

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const targetEasy = Math.max(0, schedule.difficultyDistribution.easy);
  const targetMed = Math.max(0, schedule.difficultyDistribution.medium);
  const targetHard = Math.max(0, schedule.difficultyDistribution.hard);

  const selectedRows: typeof questionBankTable.$inferSelect[] = [];
  const pickedIds = new Set<number>();

  const pickFromPool = (pool: typeof questionBankTable.$inferSelect[], count: number) => {
    const shuffled = shuffle(pool.filter((q) => !pickedIds.has(q.id)));
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selectedRows.push(shuffled[i]);
      pickedIds.add(shuffled[i].id);
    }
  };

  pickFromPool(easyPool, targetEasy);
  pickFromPool(medPool, targetMed);
  pickFromPool(hardPool, targetHard);

  // Fill remainder if target total questions count is not reached
  const targetTotal = Math.min(schedule.questionsCount, qualityQuestions.length);
  if (selectedRows.length < targetTotal) {
    const remainderPool = shuffle(qualityQuestions.filter((q) => !pickedIds.has(q.id)));
    for (const q of remainderPool) {
      if (selectedRows.length >= targetTotal) break;
      selectedRows.push(q);
      pickedIds.add(q.id);
    }
  }

  const finalQuestions: QuizQuestion[] = selectedRows.map((r) => ({
    prompt: r.question.prompt.trim(),
    options: r.question.options.map((opt) => String(opt).trim()),
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

  const courseTitle = targetCourse?.title || (schedule.stage !== "all" ? schedule.stage : "الكورس العام");
  const stageName = schedule.stage !== "all" ? schedule.stage : (targetCourse?.stages?.[0] || "عام");
  const unitName = schedule.unit && schedule.unit !== "all" ? schedule.unit : "شامل المنهج";
  const lessonName = schedule.lesson && schedule.lesson !== "all" ? schedule.lesson : "شامل الوحدة";

  const examTitle = `${schedule.title} (${todayDateStr})`;
  const stages = targetCourse?.stages?.length ? targetCourse.stages : [stageName];

  // 6. Insert as DRAFT (isPublished = false)
  const [createdQuiz] = await db
    .insert(quizzesTable)
    .values({
      title: examTitle,
      courseId: targetCourse?.id || null,
      scope: "course",
      description: `اختبار مراجعة يومي تم توليده آلياً من جدول (${schedule.title}) لنطاق [${stageName} · ${unitName}]. بانتظار اعتماد المعلم.`,
      category: targetCourse?.category || "عام",
      stage: stageName,
      stages,
      durationMinutes: schedule.durationMinutes,
      passingScore: schedule.passingScore,
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

  const messageText =
    `🎓 *اختبار يومي جديد بانتظار اعتمادك* 📋\n\n` +
    `🔖 *اسم الجدول:* ${schedule.title}\n` +
    `📚 *المرحلة:* ${stageName}\n` +
    `📖 *الوحدة / الدرس:* ${unitName} · ${lessonName}\n` +
    `📅 *التاريخ:* ${todayDateStr}\n` +
    `🔢 *عدد الأسئلة:* ${finalQuestions.length} سؤال\n` +
    `⏱️ *المدة:* ${schedule.durationMinutes} دقيقة | 🎯 *النجاح:* ${schedule.passingScore}%\n` +
    `🔒 *الحالة:* مسودة خاصة (لم يُنشر للطلاب بعد)\n\n` +
    `═══════════════════\n` +
    `📝 *تفاصيل الأسئلة والإجابات النموذجية:*\n\n` +
    `${questionsFormatted}\n\n` +
    `═══════════════════\n` +
    `👉 *للاعتماد والنشر المباشر للطلاب فوراً:* اضغط الزر أدناه أو الرابط:\n` +
    `${approvalUrl}`;

  // Update schedule's lastRunDate and lastGeneratedQuizId
  const todayIso = new Date().toISOString().split("T")[0];
  const fullConfig = await getAutoExamFullConfig();
  const updatedSchedules = fullConfig.schedules.map((s) => {
    if (s.id === schedule.id) {
      return {
        ...s,
        lastRunDate: todayIso,
        lastGeneratedQuizId: createdQuiz.id,
      };
    }
    return s;
  });

  await saveAutoExamFullConfig({
    ...fullConfig,
    schedules: updatedSchedules,
  });

  return {
    quiz: createdQuiz,
    courseTitle,
    stageName,
    unitName,
    lessonName,
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

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const MAX_CHUNK_LENGTH = 3800;
    if (messageText.length <= MAX_CHUNK_LENGTH) {
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "Markdown",
          reply_markup: inlineKeyboard,
        }),
      });
      const data = (await response.json()) as any;
      if (!data.ok) {
        // Fallback without markdown parsing if syntax error occurred in prompt
        const fallbackResp = await fetch(telegramApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText.replace(/[*_`]/g, ""),
            reply_markup: inlineKeyboard,
          }),
        });
        const fallbackData = (await fallbackResp.json()) as any;
        if (!fallbackData.ok) {
          return { success: false, error: fallbackData.description || "Failed to send Telegram message" };
        }
      }
      return { success: true };
    }

    // Split into chunks if message is very long
    const chunks: string[] = [];
    let remaining = messageText;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK_LENGTH) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = remaining.lastIndexOf("\n\n", MAX_CHUNK_LENGTH);
      if (splitIdx < 1000) splitIdx = remaining.lastIndexOf("\n", MAX_CHUNK_LENGTH);
      if (splitIdx < 500) splitIdx = MAX_CHUNK_LENGTH;
      chunks.push(remaining.slice(0, splitIdx));
      remaining = remaining.slice(splitIdx).trim();
    }

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunks[i],
          ...(isLast ? { reply_markup: inlineKeyboard } : {}),
        }),
      });
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "[AUTO_EXAM] Failed to send exam review to Telegram");
    return { success: false, error: err.message || "Network error sending to Telegram" };
  }
}

/**
 * Send the generated exam to WhatsApp via Webhook URL / Gateway
 */
export async function sendExamToWhatsApp(
  webhookUrl: string,
  phoneNumber: string,
  messageText: string,
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: "WhatsApp Webhook URL is missing" };
  }

  try {
    const payload = {
      phone: phoneNumber,
      message: messageText,
      chatId: phoneNumber ? `${phoneNumber.replace(/[^0-9]/g, "")}@c.us` : undefined,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `WhatsApp gateway returned HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "[AUTO_EXAM] Failed to send exam review to WhatsApp");
    return { success: false, error: err.message || "Network error sending to WhatsApp" };
  }
}

/**
 * Approve and instantly publish a quiz.
 */
export async function approveAndPublishQuiz(quizId: number): Promise<{
  success: boolean;
  quiz: typeof quizzesTable.$inferSelect;
  notifiedCount: number;
  alreadyPublished?: boolean;
}> {
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);

  if (!quiz) {
    throw new Error("الاختبار غير موجود في النظام");
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
 * Evaluates ALL enabled schedules against current Cairo time.
 */
export async function runAutoExamSchedulerTick(): Promise<void> {
  try {
    const config = await getAutoExamFullConfig();
    const activeSchedules = (config.schedules || []).filter((s) => s.enabled);
    if (activeSchedules.length === 0) return;

    // Current time in Cairo timezone (Africa/Cairo)
    const nowCairo = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const currentHours = String(nowCairo.getHours()).padStart(2, "0");
    const currentMinutes = String(nowCairo.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = nowCairo.toISOString().split("T")[0];

    for (const schedule of activeSchedules) {
      // Check if time matches and has not already run today
      if (currentTimeStr === schedule.timeOfDay && schedule.lastRunDate !== todayStr) {
        logger.info(
          { scheduleId: schedule.id, scheduleTitle: schedule.title, currentTimeStr, todayStr },
          "[AUTO_EXAM] Schedule matched! Generating daily draft exam...",
        );

        try {
          const result = await generateDraftExamForSchedule(schedule, config.channels);

          if (
            config.channels.telegram.enabled &&
            config.channels.telegram.botToken &&
            config.channels.telegram.chatId
          ) {
            await sendExamToTelegram(
              config.channels.telegram.botToken,
              config.channels.telegram.chatId,
              result.quiz,
              result.approvalToken,
              result.messageText,
            );
            logger.info({ scheduleId: schedule.id }, "[AUTO_EXAM] Sent schedule exam review to Telegram!");
          }

          if (config.channels.whatsapp.enabled && config.channels.whatsapp.webhookUrl) {
            await sendExamToWhatsApp(
              config.channels.whatsapp.webhookUrl,
              config.channels.whatsapp.phoneNumber,
              result.messageText,
            );
            logger.info({ scheduleId: schedule.id }, "[AUTO_EXAM] Sent schedule exam review to WhatsApp!");
          }
        } catch (schedErr) {
          logger.error({ err: schedErr, scheduleId: schedule.id }, "[AUTO_EXAM] Failed to run single schedule");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "[AUTO_EXAM] Error during auto exam scheduler tick");
  }
}
