import { randomBytes, timingSafeEqual } from "crypto";
import {
  auditLogsTable,
  bookingsTable,
  codeRecoveryRequestsTable,
  db,
  essayExamSubmissionsTable,
  monthlySubscriptionsTable,
  paymentReceiptsTable,
  quizAttemptsTable,
  quizzesTable,
  selfAssessmentSessionsTable,
  siteSettingsTable,
  studentAttendanceTable,
  studentLessonSummariesTable,
  studentsTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getProcessRuntimeStats } from "../lib/runtime-health";
import { getAutoExamFullConfig } from "./auto-exam";

const MONITOR_CONFIG_KEY = "ai_monitor_config";
const MONITOR_REPORTS_KEY = "ai_monitor_reports";
const MONITOR_WATERMARK_KEY = "ai_monitor_watermark";
const SHEET_SETTINGS_KEY = "attendance_google_sheet_config";

export interface MonitorAgentConfig {
  enabled: boolean;
  dailyReportEnabled: boolean;
  dailyReportTime: string; // HH:MM in Africa/Cairo (24h)
  alertOnNewReceipt: boolean;
  alertOnNewBooking: boolean;
  alertOnNewStudent: boolean;
  alertOnRepeatAbsence: boolean;
  alertOnExpiringSubscriptions: boolean;
  telegramEnabled: boolean;
  useAutoExamBot: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  webhookSecret: string;
  webhookRegisteredUrl: string | null;
  geminiKeyOverride?: string;
}

export interface MonitorReportEntry {
  id: string;
  kind: "daily" | "manual" | "alert" | "telegram_query";
  title: string;
  summary: string;
  createdAt: string;
  sentToTelegram: boolean;
  telegramError?: string | null;
  modelUsed?: string | null;
  metricsSnapshot?: Record<string, unknown>;
}

interface MonitorWatermark {
  lastReceiptId: number;
  lastBookingId: number;
  lastStudentId: number;
  lastRecoveryId: number;
  lastEssaySubmissionId: number;
  lastSheetErrorSignature: string;
  lastServerErrorId: string;
  lastDailyReportDate: string;
  alertedExpiringDate: string;
  alertedAbsenceDate: string;
  initializedAt: string;
}

export interface PlatformPulseSnapshot {
  generatedAt: string;
  cairoDate: string;
  cairoTimeLabel: string;
  systemHealth: {
    dbOk: boolean;
    dbLatencyMs: number;
    uptimeSeconds: number;
    processRssMb: number;
    osFreeMemMb: number;
    osTotalMemMb: number;
    osMemUsedPercent: number;
    loadAvg1m: number;
    errorsLast24hCount: number;
    recentErrors: Array<{ method: string; path: string; message: string; at: string }>;
  };
  students: {
    total: number;
    activeApproved: number;
    pendingApproval: number;
    paid: number;
    pendingReview: number;
    unpaid: number;
    newToday: number;
    newLast7Days: number;
    unconfirmedCenterCount: number;
    inactivePaid7Days: number;
  };
  attendanceToday: {
    date: string;
    present: number;
    late: number;
    absent: number;
    byCenter: Array<{ centerName: string; present: number; late: number; absent: number }>;
    absentNamesToday: string[];
    repeatAbsentees7Days: Array<{ studentId: number; name: string; centerName: string; absentDays: number }>;
  };
  financeAndActions: {
    pendingReceiptsCount: number;
    pendingReceiptsLatest: Array<{ id: number; studentName: string; phone: string; createdAt: string }>;
    pendingBookingsCount: number;
    pendingBookingsLatest: Array<{ id: number; name: string; phone: string; message: string; createdAt: string }>;
    pendingRecoveryRequests: number;
    pendingSummaries: number;
    pendingEssaySubmissions: number;
    pendingMonthlySubscriptions: number;
    expiringSubscriptionsNext3Days: number;
    expiringStudentsPreview: Array<{ name: string; phone: string; endsAt: string }>;
  };
  academics: {
    publishedQuizzesCount: number;
    attemptsToday: number;
    attemptsLast7Days: number;
    avgScoreLast7Days: number;
    passRateLast7Days: number;
    selfAssessmentsLast7Days: number;
    lowestAvgQuiz7Days: { title: string; attempts: number; avgScore: number } | null;
    topStudentsLast7Days: Array<{ name: string; avgScore: number; attempts: number }>;
  };
  operations: {
    auditLogsLast24hCount: number;
    recentAuditActions: Array<{ actorName: string; actorRole: string; action: string; details: string; createdAt: string }>;
    googleSheetConfigured: boolean;
    googleSheetLastSyncStatus: string | null;
    googleSheetLastSyncedAt: string | null;
    autoExamTelegramEnabled: boolean;
  };
}

export type TelegramInlineKeyboard = Array<Array<{ text: string; callback_data?: string; url?: string }>>;

export const DEFAULT_TELEGRAM_KEYBOARD: TelegramInlineKeyboard = [
  [
    { text: "📊 تقرير اليوم AI", callback_data: "cmd:/today" },
    { text: "💳 المعلق الآن", callback_data: "cmd:/pending" },
  ],
  [
    { text: "🏫 الغياب والسناتر", callback_data: "cmd:/absent" },
    { text: "📝 الاختبارات", callback_data: "cmd:/exams" },
  ],
  [
    { text: "🖥️ صحة السيرفر", callback_data: "cmd:/health" },
    { text: "🛡️ نشاط المساعدين", callback_data: "cmd:/audit" },
  ],
  [{ text: "🔗 فتح لوحة الوكيل على الموقع", url: "https://drelmahdy.com/admin/ai-agent" }],
];

function getDefaultConfig(): MonitorAgentConfig {
  return {
    enabled: true,
    dailyReportEnabled: true,
    dailyReportTime: "22:00",
    alertOnNewReceipt: true,
    alertOnNewBooking: true,
    alertOnNewStudent: true,
    alertOnRepeatAbsence: true,
    alertOnExpiringSubscriptions: true,
    telegramEnabled: true,
    useAutoExamBot: true,
    telegramBotToken: "",
    telegramChatId: "",
    webhookSecret: randomBytes(18).toString("hex"),
    webhookRegisteredUrl: null,
  };
}

export function getCairoDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getCairoTimeHHMM(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mm = parts.find((p) => p.type === "minute")?.value || "00";
  return `${hh}:${mm}`;
}

export function getCairoHumanTime(date = new Date()): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function getMonitorConfig(): Promise<MonitorAgentConfig> {
  const defaults = getDefaultConfig();
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, MONITOR_CONFIG_KEY))
      .limit(1);
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<MonitorAgentConfig>;
      const merged: MonitorAgentConfig = {
        ...defaults,
        ...parsed,
        webhookSecret: parsed.webhookSecret || defaults.webhookSecret,
      };
      if (!parsed.webhookSecret) {
        await saveMonitorConfig(merged);
      }
      return merged;
    }
  } catch (err) {
    logger.warn({ err }, "[AI_MONITOR] Failed to parse config");
  }
  await saveMonitorConfig(defaults).catch(() => {});
  return defaults;
}

export async function saveMonitorConfig(cfg: MonitorAgentConfig): Promise<void> {
  const serialized = JSON.stringify(cfg);
  const [existing] = await db
    .select({ id: siteSettingsTable.id })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, MONITOR_CONFIG_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(siteSettingsTable)
      .set({ value: serialized, type: "json", updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, MONITOR_CONFIG_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: MONITOR_CONFIG_KEY,
      value: serialized,
      type: "json",
    });
  }
}

export async function getMonitorReportsHistory(): Promise<MonitorReportEntry[]> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, MONITOR_REPORTS_KEY))
      .limit(1);
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

async function saveMonitorReportsHistory(list: MonitorReportEntry[]): Promise<void> {
  const serialized = JSON.stringify(list.slice(0, 60));
  const [row] = await db
    .select({ id: siteSettingsTable.id })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, MONITOR_REPORTS_KEY))
    .limit(1);

  if (row) {
    await db
      .update(siteSettingsTable)
      .set({ value: serialized, type: "json", updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, MONITOR_REPORTS_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: MONITOR_REPORTS_KEY,
      value: serialized,
      type: "json",
    });
  }
}

async function appendMonitorReport(entry: MonitorReportEntry): Promise<void> {
  const existing = await getMonitorReportsHistory();
  await saveMonitorReportsHistory([entry, ...existing]);
}

export async function deleteMonitorReportById(id?: string): Promise<void> {
  if (!id) {
    await saveMonitorReportsHistory([]);
    return;
  }
  const existing = await getMonitorReportsHistory();
  await saveMonitorReportsHistory(existing.filter((r) => r.id !== id));
}

export function getEffectiveGeminiApiKey(cfg?: MonitorAgentConfig): string {
  const override = cfg?.geminiKeyOverride?.trim();
  if (override) return override;
  return (process.env.GEMINI_API_KEY || "").trim();
}

export async function resolveTelegramCredentials(cfg: MonitorAgentConfig): Promise<{
  enabled: boolean;
  botToken: string;
  chatId: string;
  source: "custom" | "auto_exam" | "none";
}> {
  if (!cfg.telegramEnabled) {
    return { enabled: false, botToken: "", chatId: "", source: "none" };
  }
  const customToken = (cfg.telegramBotToken || "").trim();
  const customChat = (cfg.telegramChatId || "").trim();
  if (customToken && customChat) {
    return { enabled: true, botToken: customToken, chatId: customChat, source: "custom" };
  }

  if (cfg.useAutoExamBot) {
    const autoCfg = await getAutoExamFullConfig();
    const fallbackToken = customToken || (autoCfg.channels.telegram.botToken || "").trim();
    const fallbackChat = customChat || (autoCfg.channels.telegram.chatId || "").trim();
    if (fallbackToken && fallbackChat) {
      return { enabled: true, botToken: fallbackToken, chatId: fallbackChat, source: "auto_exam" };
    }
  }

  return { enabled: false, botToken: customToken, chatId: customChat, source: "none" };
}

export async function getMonitorBotStatus(cfg: MonitorAgentConfig) {
  const tg = await resolveTelegramCredentials(cfg);
  if (!tg.botToken) {
    return { connected: false, botUsername: null as string | null, webhookUrl: null as string | null, pendingUpdates: 0 };
  }
  try {
    const [meRes, whRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${tg.botToken}/getMe`).then((r) => r.json()).catch(() => null),
      fetch(`https://api.telegram.org/bot${tg.botToken}/getWebhookInfo`).then((r) => r.json()).catch(() => null),
    ]);
    return {
      connected: Boolean((meRes as any)?.ok),
      botUsername: (meRes as any)?.result?.username || null,
      webhookUrl: (whRes as any)?.result?.url || null,
      pendingUpdates: Number((whRes as any)?.result?.pending_update_count || 0),
    };
  } catch {
    return { connected: false, botUsername: null, webhookUrl: null, pendingUpdates: 0 };
  }
}

export async function sendTelegramMonitorMessage(
  botToken: string,
  chatId: string,
  messageText: string,
  inlineKeyboard?: TelegramInlineKeyboard,
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: "يرجى إدخال Telegram Bot Token و Chat ID" };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const MAX_LEN = 3800;
  const chunks: string[] = [];
  let remaining = String(messageText || "").trim();

  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    let idx = remaining.lastIndexOf("\n\n", MAX_LEN);
    if (idx < 1000) idx = remaining.lastIndexOf("\n", MAX_LEN);
    if (idx < 500) idx = MAX_LEN;
    chunks.push(remaining.slice(0, idx));
    remaining = remaining.slice(idx).trim();
  }

  try {
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunks[i],
          disable_web_page_preview: true,
          ...(isLast && inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as any;
      if (!resp.ok || !data?.ok) {
        return {
          success: false,
          error: data?.description || `Telegram HTTP ${resp.status}`,
        };
      }
    }
    return { success: true };
  } catch (err: any) {
    logger.warn({ err }, "[AI_MONITOR] Failed sending Telegram message");
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function collectPlatformPulse(dateInput?: string): Promise<PlatformPulseSnapshot> {
  const now = new Date();
  const cairoDate = dateInput || getCairoDateString(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoDate = getCairoDateString(sevenDaysAgo);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const dbPingStart = Date.now();
  let dbOk = true;
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - dbPingStart;
  const runtimeStats = getProcessRuntimeStats();

  const [
    allStudents,
    todayAttendance,
    recentAbsences,
    pendingReceipts,
    pendingBookings,
    pendingRecoveryRows,
    pendingSummaryRows,
    pendingEssayRows,
    pendingSubsRows,
    expiringSubsRows,
    publishedQuizRows,
    recentAttempts,
    recentSelfAssessments,
    recentAudits,
    sheetConfigRow,
    autoExamCfg,
  ] = await Promise.all([
    db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        status: studentsTable.status,
        paymentStatus: studentsTable.paymentStatus,
        centerConfirmed: studentsTable.centerConfirmed,
        learningMode: studentsTable.learningMode,
        lastActiveAt: studentsTable.lastActiveAt,
        lastLoginAt: studentsTable.lastLoginAt,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable),
    db
      .select({
        studentId: studentAttendanceTable.studentId,
        status: studentAttendanceTable.status,
        centerName: studentAttendanceTable.centerName,
        studentName: studentsTable.name,
      })
      .from(studentAttendanceTable)
      .leftJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
      .where(eq(studentAttendanceTable.date, cairoDate)),
    db
      .select({
        studentId: studentAttendanceTable.studentId,
        centerName: studentAttendanceTable.centerName,
        studentName: studentsTable.name,
      })
      .from(studentAttendanceTable)
      .leftJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
      .where(
        and(
          gte(studentAttendanceTable.date, sevenDaysAgoDate),
          eq(studentAttendanceTable.status, "absent"),
        ),
      ),
    db
      .select({
        id: paymentReceiptsTable.id,
        snapshotStudentName: paymentReceiptsTable.snapshotStudentName,
        snapshotStudentPhone: paymentReceiptsTable.snapshotStudentPhone,
        createdAt: paymentReceiptsTable.createdAt,
      })
      .from(paymentReceiptsTable)
      .where(eq(paymentReceiptsTable.status, "pending"))
      .orderBy(desc(paymentReceiptsTable.createdAt))
      .limit(12),
    db
      .select({
        id: bookingsTable.id,
        name: bookingsTable.name,
        phone: bookingsTable.phone,
        message: bookingsTable.message,
        createdAt: bookingsTable.createdAt,
      })
      .from(bookingsTable)
      .where(eq(bookingsTable.status, "pending"))
      .orderBy(desc(bookingsTable.createdAt))
      .limit(12),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(codeRecoveryRequestsTable)
      .where(eq(codeRecoveryRequestsTable.status, "pending")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentLessonSummariesTable)
      .where(eq(studentLessonSummariesTable.status, "pending")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(essayExamSubmissionsTable)
      .where(eq(essayExamSubmissionsTable.status, "submitted")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(monthlySubscriptionsTable)
      .where(eq(monthlySubscriptionsTable.paymentStatus, "pending")),
    db
      .select({
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        monthEndDate: monthlySubscriptionsTable.monthEndDate,
      })
      .from(monthlySubscriptionsTable)
      .innerJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
      .where(
        and(
          eq(monthlySubscriptionsTable.paymentStatus, "paid"),
          gte(monthlySubscriptionsTable.monthEndDate, now),
          lte(monthlySubscriptionsTable.monthEndDate, threeDaysLater),
        ),
      )
      .limit(20),
    db
      .select({ id: quizzesTable.id, title: quizzesTable.title })
      .from(quizzesTable)
      .where(eq(quizzesTable.isPublished, true)),
    db
      .select({
        quizId: quizAttemptsTable.quizId,
        quizTitle: quizzesTable.title,
        studentId: quizAttemptsTable.studentId,
        studentName: studentsTable.name,
        score: quizAttemptsTable.score,
        passed: quizAttemptsTable.passed,
        createdAt: quizAttemptsTable.createdAt,
      })
      .from(quizAttemptsTable)
      .leftJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id))
      .leftJoin(studentsTable, eq(quizAttemptsTable.studentId, studentsTable.id))
      .where(gte(quizAttemptsTable.createdAt, sevenDaysAgo)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(selfAssessmentSessionsTable)
      .where(gte(selfAssessmentSessionsTable.createdAt, sevenDaysAgo)),
    db
      .select({
        actorName: auditLogsTable.actorName,
        actorRole: auditLogsTable.actorRole,
        action: auditLogsTable.action,
        details: auditLogsTable.details,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, oneDayAgo))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(15),
    db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, SHEET_SETTINGS_KEY))
      .limit(1),
    getAutoExamFullConfig(),
  ]);

  let activeApproved = 0;
  let pendingApproval = 0;
  let paid = 0;
  let pendingReview = 0;
  let unpaid = 0;
  let newToday = 0;
  let newLast7Days = 0;
  let unconfirmedCenterCount = 0;
  let inactivePaid7Days = 0;

  for (const s of allStudents) {
    if (s.status === "approved" || s.status === "active") activeApproved++;
    if (s.status === "pending") pendingApproval++;
    if (s.paymentStatus === "paid") paid++;
    else if (s.paymentStatus === "pending_review") pendingReview++;
    else unpaid++;

    const createdDate = getCairoDateString(new Date(s.createdAt));
    if (createdDate === cairoDate) newToday++;
    if (new Date(s.createdAt) >= sevenDaysAgo) newLast7Days++;

    if (!s.centerConfirmed && (s.status === "approved" || s.status === "active")) {
      unconfirmedCenterCount++;
    }
    const lastSeen = s.lastActiveAt || s.lastLoginAt || s.createdAt;
    if (s.paymentStatus === "paid" && new Date(lastSeen) < sevenDaysAgo) {
      inactivePaid7Days++;
    }
  }

  let present = 0;
  let late = 0;
  let absent = 0;
  const centerMap = new Map<string, { centerName: string; present: number; late: number; absent: number }>();
  const absentNamesToday: string[] = [];

  for (const row of todayAttendance) {
    const cName = row.centerName || "غير محدد";
    const entry = centerMap.get(cName) || { centerName: cName, present: 0, late: 0, absent: 0 };
    if (row.status === "present") {
      present++;
      entry.present++;
    } else if (row.status === "late") {
      late++;
      entry.late++;
    } else if (row.status === "absent") {
      absent++;
      entry.absent++;
      if (row.studentName) absentNamesToday.push(row.studentName);
    }
    centerMap.set(cName, entry);
  }

  const repeatMap = new Map<number, { studentId: number; name: string; centerName: string; absentDays: number }>();
  for (const r of recentAbsences) {
    const prev = repeatMap.get(r.studentId) || {
      studentId: r.studentId,
      name: r.studentName || `طالب #${r.studentId}`,
      centerName: r.centerName || "غير محدد",
      absentDays: 0,
    };
    prev.absentDays++;
    repeatMap.set(r.studentId, prev);
  }
  const repeatAbsentees7Days = Array.from(repeatMap.values())
    .filter((x) => x.absentDays >= 2)
    .sort((a, b) => b.absentDays - a.absentDays)
    .slice(0, 12);

  let attemptsToday = 0;
  let totalScore7Days = 0;
  let passedCount7Days = 0;
  const quizAgg = new Map<number, { title: string; attempts: number; totalScore: number }>();
  const studentAgg = new Map<number, { name: string; attempts: number; totalScore: number }>();

  for (const a of recentAttempts) {
    if (getCairoDateString(new Date(a.createdAt)) === cairoDate) attemptsToday++;
    totalScore7Days += a.score || 0;
    if (a.passed) passedCount7Days++;

    const qEntry = quizAgg.get(a.quizId) || {
      title: a.quizTitle || `اختبار #${a.quizId}`,
      attempts: 0,
      totalScore: 0,
    };
    qEntry.attempts++;
    qEntry.totalScore += a.score || 0;
    quizAgg.set(a.quizId, qEntry);

    const sEntry = studentAgg.get(a.studentId) || {
      name: a.studentName || `طالب #${a.studentId}`,
      attempts: 0,
      totalScore: 0,
    };
    sEntry.attempts++;
    sEntry.totalScore += a.score || 0;
    studentAgg.set(a.studentId, sEntry);
  }

  let lowestAvgQuiz7Days: { title: string; attempts: number; avgScore: number } | null = null;
  for (const q of quizAgg.values()) {
    if (q.attempts >= 2) {
      const avg = Math.round(q.totalScore / q.attempts);
      if (!lowestAvgQuiz7Days || avg < lowestAvgQuiz7Days.avgScore) {
        lowestAvgQuiz7Days = { title: q.title, attempts: q.attempts, avgScore: avg };
      }
    }
  }

  const topStudentsLast7Days = Array.from(studentAgg.values())
    .map((s) => ({ name: s.name, attempts: s.attempts, avgScore: Math.round(s.totalScore / s.attempts) }))
    .sort((a, b) => b.avgScore - a.avgScore || b.attempts - a.attempts)
    .slice(0, 5);

  let googleSheetConfigured = false;
  let googleSheetLastSyncStatus: string | null = null;
  let googleSheetLastSyncedAt: string | null = null;
  try {
    if (sheetConfigRow[0]?.value) {
      const parsed = JSON.parse(sheetConfigRow[0].value);
      googleSheetConfigured = Boolean(parsed?.webhookUrl);
      googleSheetLastSyncStatus = parsed?.lastSyncStatus || null;
      googleSheetLastSyncedAt = parsed?.lastSyncedAt || null;
    }
  } catch {
    // ignore
  }

  return {
    generatedAt: now.toISOString(),
    cairoDate,
    cairoTimeLabel: getCairoHumanTime(now),
    systemHealth: {
      dbOk,
      dbLatencyMs,
      ...runtimeStats,
    },
    students: {
      total: allStudents.length,
      activeApproved,
      pendingApproval,
      paid,
      pendingReview,
      unpaid,
      newToday,
      newLast7Days,
      unconfirmedCenterCount,
      inactivePaid7Days,
    },
    attendanceToday: {
      date: cairoDate,
      present,
      late,
      absent,
      byCenter: Array.from(centerMap.values()),
      absentNamesToday: absentNamesToday.slice(0, 20),
      repeatAbsentees7Days,
    },
    financeAndActions: {
      pendingReceiptsCount: pendingReceipts.length,
      pendingReceiptsLatest: pendingReceipts.slice(0, 8).map((r) => ({
        id: r.id,
        studentName: r.snapshotStudentName || "طالب",
        phone: r.snapshotStudentPhone || "",
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      pendingBookingsCount: pendingBookings.length,
      pendingBookingsLatest: pendingBookings.slice(0, 8).map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        message: (b.message || "").slice(0, 120),
        createdAt: new Date(b.createdAt).toISOString(),
      })),
      pendingRecoveryRequests: pendingRecoveryRows[0]?.count || 0,
      pendingSummaries: pendingSummaryRows[0]?.count || 0,
      pendingEssaySubmissions: pendingEssayRows[0]?.count || 0,
      pendingMonthlySubscriptions: pendingSubsRows[0]?.count || 0,
      expiringSubscriptionsNext3Days: expiringSubsRows.length,
      expiringStudentsPreview: expiringSubsRows.slice(0, 8).map((x) => ({
        name: x.studentName,
        phone: x.studentPhone,
        endsAt: getCairoDateString(new Date(x.monthEndDate)),
      })),
    },
    academics: {
      publishedQuizzesCount: publishedQuizRows.length,
      attemptsToday,
      attemptsLast7Days: recentAttempts.length,
      avgScoreLast7Days: recentAttempts.length > 0 ? Math.round(totalScore7Days / recentAttempts.length) : 0,
      passRateLast7Days: recentAttempts.length > 0 ? Math.round((passedCount7Days / recentAttempts.length) * 100) : 0,
      selfAssessmentsLast7Days: recentSelfAssessments[0]?.count || 0,
      lowestAvgQuiz7Days,
      topStudentsLast7Days,
    },
    operations: {
      auditLogsLast24hCount: recentAudits.length,
      recentAuditActions: recentAudits.slice(0, 10).map((a) => ({
        actorName: a.actorName || "مجهول",
        actorRole: a.actorRole,
        action: a.action,
        details: (a.details || "").slice(0, 120),
        createdAt: new Date(a.createdAt).toISOString(),
      })),
      googleSheetConfigured,
      googleSheetLastSyncStatus,
      googleSheetLastSyncedAt,
      autoExamTelegramEnabled: Boolean(autoExamCfg.channels.telegram.enabled && autoExamCfg.channels.telegram.botToken),
    },
  };
}

export function buildDeterministicSummary(pulse: PlatformPulseSnapshot): string {
  const lines: string[] = [
    `📊 التقرير التشغيلي لمنصة د. محمود المهدي (${pulse.cairoTimeLabel})`,
    "",
    `🖥️ السيرفر وقاعدة البيانات: ${pulse.systemHealth.dbOk ? "متصل" : "عطل"} (${pulse.systemHealth.dbLatencyMs}ms) | RAM ${pulse.systemHealth.processRssMb}MB | أخطاء 24 ساعة: ${pulse.systemHealth.errorsLast24hCount}`,
    "",
    `👥 الطلاب: إجمالي ${pulse.students.total} | مفعل ${pulse.students.activeApproved} | مدفوع ${pulse.students.paid} | بانتظار المراجعة ${pulse.students.pendingReview}`,
    `🆕 تسجيلات اليوم: ${pulse.students.newToday} | آخر 7 أيام: ${pulse.students.newLast7Days} | لم يؤكدوا السنتر: ${pulse.students.unconfirmedCenterCount}`,
    "",
    `🏫 حضور اليوم (${pulse.attendanceToday.date}): حاضر ${pulse.attendanceToday.present} | متأخر ${pulse.attendanceToday.late} | غائب ${pulse.attendanceToday.absent}`,
  ];

  if (pulse.attendanceToday.byCenter.length > 0) {
    lines.push(
      ...pulse.attendanceToday.byCenter.map(
        (c) => `  • ${c.centerName}: حضور ${c.present} | تأخير ${c.late} | غياب ${c.absent}`,
      ),
    );
  }
  if (pulse.attendanceToday.repeatAbsentees7Days.length > 0) {
    lines.push(
      `⚠️ غياب متكرر (7 أيام): ${pulse.attendanceToday.repeatAbsentees7Days
        .slice(0, 5)
        .map((x) => `${x.name} (${x.absentDays})`)
        .join("، ")}`,
    );
  }

  lines.push(
    "",
    `💳 إجراءات معلقة الآن:`,
    `  • إيصالات دفع منتظرة: ${pulse.financeAndActions.pendingReceiptsCount}`,
    `  • طلبات حجز جديدة: ${pulse.financeAndActions.pendingBookingsCount}`,
    `  • استعادة كود: ${pulse.financeAndActions.pendingRecoveryRequests} | تلخيصات: ${pulse.financeAndActions.pendingSummaries} | مقالي: ${pulse.financeAndActions.pendingEssaySubmissions}`,
    `  • اشتراكات تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days}`,
    "",
    `📝 الاختبارات (7 أيام): ${pulse.academics.attemptsLast7Days} محاولة (اليوم ${pulse.academics.attemptsToday}) | متوسط الدرجات ${pulse.academics.avgScoreLast7Days}% | نسبة النجاح ${pulse.academics.passRateLast7Days}%`,
  );

  if (pulse.academics.lowestAvgQuiz7Days) {
    lines.push(
      `📉 أقل اختبار في المتوسط: "${pulse.academics.lowestAvgQuiz7Days.title}" بمتوسط ${pulse.academics.lowestAvgQuiz7Days.avgScore}%`,
    );
  }
  if (pulse.operations.googleSheetConfigured) {
    lines.push(
      `📄 مزامنة Google Sheets: مفعلة (${pulse.operations.googleSheetLastSyncStatus || "جاهزة"})`,
    );
  }

  return lines.join("\n");
}

function normalizeArabicVariants(word: string): string[] {
  const variants = new Set<string>([word]);
  const base = word
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
  variants.add(base);
  if (word.startsWith("ا")) variants.add("أ" + word.slice(1));
  if (word.startsWith("أ") || word.startsWith("إ")) variants.add("ا" + word.slice(1));
  return Array.from(variants).filter((w) => w.length >= 2);
}

async function gatherTargetedQueryContext(question: string): Promise<string> {
  const clean = question.trim();
  if (!clean) return "";

  const snippets: string[] = [];
  const stopWords = new Set([
    "ما", "من", "في", "على", "عن", "هل", "كم", "اليوم", "الطلاب", "الطالب",
    "سنتر", "تقرير", "حالة", "اخر", "أخر", "اعرض", "طالب", "كود", "درجات",
    "اختبار", "امتحان", "حضور", "غياب", "ايه", "إيه", "فين", "مين",
  ]);
  const rawWords = clean
    .replace(/[؟?!.,،"':;/\\]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .slice(0, 5);

  const searchTerms = Array.from(new Set(rawWords.flatMap(normalizeArabicVariants))).slice(0, 10);

  if (searchTerms.length > 0) {
    const studentConditions = searchTerms.flatMap((w) => [
      ilike(studentsTable.name, `%${w}%`),
      ilike(studentsTable.phone, `%${w}%`),
      ilike(studentsTable.accessCode, `%${w}%`),
      ilike(studentsTable.centerName, `%${w}%`),
    ]);

    const matchedStudents = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        phone: studentsTable.phone,
        parentPhone: studentsTable.parentPhone,
        accessCode: studentsTable.accessCode,
        grade: studentsTable.grade,
        centerName: studentsTable.centerName,
        appointmentSlot: studentsTable.appointmentSlot,
        paymentStatus: studentsTable.paymentStatus,
        status: studentsTable.status,
        centerConfirmed: studentsTable.centerConfirmed,
        learningMode: studentsTable.learningMode,
        lastActiveAt: studentsTable.lastActiveAt,
      })
      .from(studentsTable)
      .where(or(...studentConditions))
      .limit(10);

    if (matchedStudents.length > 0) {
      // For focused queries (<= 5 matched students), enrich with their recent quizzes & attendance
      if (matchedStudents.length <= 5) {
        const ids = matchedStudents.map((s) => s.id);
        const [attempts, attendance] = await Promise.all([
          db
            .select({
              studentId: quizAttemptsTable.studentId,
              quizTitle: quizzesTable.title,
              score: quizAttemptsTable.score,
              passed: quizAttemptsTable.passed,
              createdAt: quizAttemptsTable.createdAt,
            })
            .from(quizAttemptsTable)
            .leftJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id))
            .where(inArray(quizAttemptsTable.studentId, ids))
            .orderBy(desc(quizAttemptsTable.createdAt))
            .limit(20),
          db
            .select({
              studentId: studentAttendanceTable.studentId,
              date: studentAttendanceTable.date,
              status: studentAttendanceTable.status,
              centerName: studentAttendanceTable.centerName,
            })
            .from(studentAttendanceTable)
            .where(inArray(studentAttendanceTable.studentId, ids))
            .orderBy(desc(studentAttendanceTable.date))
            .limit(20),
        ]);

        const enriched = matchedStudents.map((s) => ({
          ...s,
          recentQuizzes: attempts.filter((a) => a.studentId === s.id).slice(0, 5),
          recentAttendance: attendance.filter((a) => a.studentId === s.id).slice(0, 5),
        }));
        snippets.push(`بيانات الطلاب المطابقة وسجلهم الدراسي والحضور:\n${JSON.stringify(enriched, null, 2)}`);
      } else {
        snippets.push(`نتائج مطابقة من جدول الطلاب (أول 10):\n${JSON.stringify(matchedStudents, null, 2)}`);
      }
    }

    // Quiz search if asking about exams/quizzes
    const quizConditions = searchTerms.map((w) => ilike(quizzesTable.title, `%${w}%`));
    const matchedQuizzes = await db
      .select({ id: quizzesTable.id, title: quizzesTable.title, stage: quizzesTable.stage, isPublished: quizzesTable.isPublished })
      .from(quizzesTable)
      .where(or(...quizConditions))
      .limit(5);

    if (matchedQuizzes.length > 0) {
      const qIds = matchedQuizzes.map((q) => q.id);
      const qAttempts = await db
        .select({
          quizId: quizAttemptsTable.quizId,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          studentName: studentsTable.name,
        })
        .from(quizAttemptsTable)
        .leftJoin(studentsTable, eq(quizAttemptsTable.studentId, studentsTable.id))
        .where(inArray(quizAttemptsTable.quizId, qIds))
        .orderBy(desc(quizAttemptsTable.score))
        .limit(40);

      const quizDetails = matchedQuizzes.map((q) => {
        const list = qAttempts.filter((a) => a.quizId === q.id);
        const avg = list.length > 0 ? Math.round(list.reduce((sum, a) => sum + a.score, 0) / list.length) : 0;
        const passCount = list.filter((a) => a.passed).length;
        return {
          ...q,
          sampledAttempts: list.length,
          avgScore: avg,
          passedCount: passCount,
          topScores: list.slice(0, 5),
        };
      });
      snippets.push(`تفاصيل الاختبارات المطابقة:\n${JSON.stringify(quizDetails, null, 2)}`);
    }
  }

  return snippets.join("\n\n");
}

async function callGeminiWithFallback(
  apiKey: string,
  systemInstruction: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
): Promise<{ text: string; modelUsed: string } | null> {
  if (!apiKey) return null;

  const models = ["gemini-4-hydrogen", "gemini-3.5-flash-lite"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 2048,
          },
        }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text().catch(() => "");
        logger.warn({ model, status: resp.status, errTxt: errTxt.slice(0, 200) }, "[AI_MONITOR] Gemini model failed");
        continue;
      }
      const data = (await resp.json()) as any;
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts
            .filter((p: any) => !p?.thought && typeof p?.text === "string")
            .map((p: any) => p.text)
            .join("\n")
            .replace(/\*\*/g, "")
            .replace(/^#{1,4}\s*/gm, "")
            .trim()
        : "";
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err) {
      logger.warn({ err, model }, "[AI_MONITOR] Gemini fetch error");
    }
  }
  return null;
}

export async function generatePlatformReport(options: {
  kind: "daily" | "manual";
  sendToTelegram?: boolean;
  customFocus?: string;
}): Promise<MonitorReportEntry> {
  const cfg = await getMonitorConfig();
  const pulse = await collectPlatformPulse();
  const apiKey = getEffectiveGeminiApiKey(cfg);

  const systemInstruction = [
    "أنت المساعد التنفيذي الذكي ومراقب التشغيل لمنصة د. محمود المهدي التعليمية.",
    "اكتب تقرير متابعة احترافي وواضح باللغة العربية مناسب للقراءة السريعة على الموبايل وتليجرام.",
    "تجنب علامات الماركداون مثل ** أو ### واستخدم الرموز التعبيرية والشرطات المرتبة فقط.",
    "اعتمد حصراً على الأرقام والأسماء الموجودة في البيانات المرفقة، ولا تخترع أي أرقام.",
    "قسّم التقرير بوضوح إلى: 1) ملخص سريع 2) ما يحتاج تدخل فوري من د. محمود 3) السناتر والحضور 4) الاختبارات والأكاديمي 5) صحة السيرفر والملاحظات.",
  ].join(" ");

  const prompt = [
    options.customFocus ? `تركيز مطلوب: ${options.customFocus}` : "أعد التقرير التشغيلي الشامل الحالي للمنصة.",
    "",
    "البيانات اللحظية الدقيقة من قاعدة البيانات والسيرفر:",
    JSON.stringify(pulse),
  ].join("\n");

  const aiResult = await callGeminiWithFallback(apiKey, systemInstruction, [
    { role: "user", parts: [{ text: prompt }] },
  ]);
  const summary = aiResult?.text || buildDeterministicSummary(pulse);

  let sentToTelegram = false;
  let telegramError: string | null = null;
  if (options.sendToTelegram) {
    const tg = await resolveTelegramCredentials(cfg);
    if (tg.enabled) {
      const tgRes = await sendTelegramMonitorMessage(tg.botToken, tg.chatId, summary, DEFAULT_TELEGRAM_KEYBOARD);
      sentToTelegram = tgRes.success;
      telegramError = tgRes.error || null;
    } else {
      telegramError = "قناة تليجرام غير مفعلة أو ينقصها Token / Chat ID";
    }
  }

  const entry: MonitorReportEntry = {
    id: `rep_${Date.now()}_${randomBytes(3).toString("hex")}`,
    kind: options.kind,
    title:
      options.kind === "daily"
        ? `التقرير اليومي الآلي — ${pulse.cairoDate}`
        : `تقرير متابعة فوري — ${pulse.cairoTimeLabel}`,
    summary,
    createdAt: new Date().toISOString(),
    sentToTelegram,
    telegramError,
    modelUsed: aiResult?.modelUsed || "deterministic-db",
    metricsSnapshot: {
      studentsTotal: pulse.students.total,
      paid: pulse.students.paid,
      presentToday: pulse.attendanceToday.present,
      absentToday: pulse.attendanceToday.absent,
      pendingReceipts: pulse.financeAndActions.pendingReceiptsCount,
      pendingBookings: pulse.financeAndActions.pendingBookingsCount,
      attemptsToday: pulse.academics.attemptsToday,
      errors24h: pulse.systemHealth.errorsLast24hCount,
    },
  };

  await appendMonitorReport(entry);
  return entry;
}

export async function askMonitorAgent(
  question: string,
  history?: Array<{ role: "user" | "assistant"; text: string }>,
): Promise<{ answer: string; modelUsed: string; generatedAt: string }> {
  const cfg = await getMonitorConfig();
  const [pulse, extraContext] = await Promise.all([
    collectPlatformPulse(),
    gatherTargetedQueryContext(question),
  ]);
  const apiKey = getEffectiveGeminiApiKey(cfg);

  const systemInstruction = [
    "أنت الوكيل الذكي ومساعد الإدارة الرسمي لدكتور محمود المهدي على منصته التعليمية (drelmahdy.com).",
    "تجاوب باللغة العربية بشكل دقيق ومختصر ومفيد، وتعتمد فقط على بيانات قاعدة البيانات والسيرفر الفعلية المقدمة لك.",
    "إذا سألك الدكتور عن طالب أو اختبار أو سنتر أو حسابات أو أخطاء سيرفر، اعرض الأرقام والأسماء الحقيقية، واذكر الخطوة العملية التالية.",
    "تجنب علامات ** و ### حتى يكون النص نظيفاً في الشات وتليجرام.",
  ].join(" ");

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const m of history.slice(-6)) {
      if (m.text?.trim()) {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text.trim().slice(0, 1500) }],
        });
      }
    }
  }

  const currentUserMsg = [
    `سؤال د. محمود الآن: ${question}`,
    "",
    "نبض المنصة والسيرفر الآن:",
    JSON.stringify(pulse),
    extraContext ? `\nبيانات تفصيلية مطابقة للاستعلام:\n${extraContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  contents.push({ role: "user", parts: [{ text: currentUserMsg }] });

  const aiResult = await callGeminiWithFallback(apiKey, systemInstruction, contents);
  if (aiResult) {
    return {
      answer: aiResult.text,
      modelUsed: aiResult.modelUsed,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    answer: `تعذر الوصول لمحرك Gemini حالياً، إليك الملخص الحي المباشر من قاعدة البيانات:\n\n${buildDeterministicSummary(pulse)}`,
    modelUsed: "deterministic-fallback",
    generatedAt: new Date().toISOString(),
  };
}

async function getWatermark(): Promise<MonitorWatermark | null> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, MONITOR_WATERMARK_KEY))
      .limit(1);
    if (row?.value) {
      return JSON.parse(row.value) as MonitorWatermark;
    }
  } catch {
    // ignore
  }
  return null;
}

async function saveWatermark(wm: MonitorWatermark): Promise<void> {
  const serialized = JSON.stringify(wm);
  const [row] = await db
    .select({ id: siteSettingsTable.id })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, MONITOR_WATERMARK_KEY))
    .limit(1);

  if (row) {
    await db
      .update(siteSettingsTable)
      .set({ value: serialized, type: "json", updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, MONITOR_WATERMARK_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: MONITOR_WATERMARK_KEY,
      value: serialized,
      type: "json",
    });
  }
}

let isMonitorTickRunning = false;

/**
 * Runs every 60s from server scheduler:
 * 1) Watches for new receipts, bookings, new students, recovery requests, essay submissions, sheet sync errors, and server 5xx errors
 * 2) Runs daily proactive checks for expiring subscriptions & repeat absences (non-spam, once/day)
 * 3) Dispatches scheduled daily executive AI report at configured Cairo time
 */
export async function runMonitorAgentSchedulerTick(): Promise<void> {
  if (isMonitorTickRunning) return;
  isMonitorTickRunning = true;

  try {
    const cfg = await getMonitorConfig();
    if (!cfg.enabled) return;

    const tg = await resolveTelegramCredentials(cfg);
    const todayCairo = getCairoDateString();
    const nowHHMM = getCairoTimeHHMM();

    const [
      latestReceiptRows,
      latestBookingRows,
      latestStudentRows,
      latestRecoveryRows,
      latestEssayRows,
      sheetCfgRow,
    ] = await Promise.all([
      db
        .select({
          id: paymentReceiptsTable.id,
          name: paymentReceiptsTable.snapshotStudentName,
          phone: paymentReceiptsTable.snapshotStudentPhone,
        })
        .from(paymentReceiptsTable)
        .orderBy(desc(paymentReceiptsTable.id))
        .limit(1),
      db
        .select({
          id: bookingsTable.id,
          name: bookingsTable.name,
          phone: bookingsTable.phone,
        })
        .from(bookingsTable)
        .orderBy(desc(bookingsTable.id))
        .limit(1),
      db
        .select({
          id: studentsTable.id,
          name: studentsTable.name,
          grade: studentsTable.grade,
          learningMode: studentsTable.learningMode,
        })
        .from(studentsTable)
        .orderBy(desc(studentsTable.id))
        .limit(1),
      db
        .select({ id: codeRecoveryRequestsTable.id })
        .from(codeRecoveryRequestsTable)
        .orderBy(desc(codeRecoveryRequestsTable.id))
        .limit(1),
      db
        .select({
          id: essayExamSubmissionsTable.id,
          studentName: essayExamSubmissionsTable.studentName,
        })
        .from(essayExamSubmissionsTable)
        .orderBy(desc(essayExamSubmissionsTable.id))
        .limit(1),
      db
        .select({ value: siteSettingsTable.value })
        .from(siteSettingsTable)
        .where(eq(siteSettingsTable.key, SHEET_SETTINGS_KEY))
        .limit(1),
    ]);

    const curMaxReceiptId = latestReceiptRows[0]?.id || 0;
    const curMaxBookingId = latestBookingRows[0]?.id || 0;
    const curMaxStudentId = latestStudentRows[0]?.id || 0;
    const curMaxRecoveryId = latestRecoveryRows[0]?.id || 0;
    const curMaxEssayId = latestEssayRows[0]?.id || 0;

    let currentSheetError = "";
    try {
      if (sheetCfgRow[0]?.value) {
        const parsed = JSON.parse(sheetCfgRow[0].value);
        if (typeof parsed?.lastSyncStatus === "string" && parsed.lastSyncStatus.startsWith("error:")) {
          currentSheetError = `${parsed.lastSyncedAt || ""}:${parsed.lastSyncStatus}`;
        }
      }
    } catch {
      // ignore
    }

    const runtimeStats = getProcessRuntimeStats();
    const latestServerErr = runtimeStats.recentErrors[0];

    let wm = await getWatermark();
    if (!wm) {
      wm = {
        lastReceiptId: curMaxReceiptId,
        lastBookingId: curMaxBookingId,
        lastStudentId: curMaxStudentId,
        lastRecoveryId: curMaxRecoveryId,
        lastEssaySubmissionId: curMaxEssayId,
        lastSheetErrorSignature: currentSheetError,
        lastServerErrorId: latestServerErr?.id || "",
        lastDailyReportDate: "",
        alertedExpiringDate: "",
        alertedAbsenceDate: "",
        initializedAt: new Date().toISOString(),
      };
      await saveWatermark(wm);
    } else {
      const alertLines: string[] = [];
      const alertButtons: TelegramInlineKeyboard = [];

      if (cfg.alertOnNewReceipt && curMaxReceiptId > wm.lastReceiptId) {
        const diff = curMaxReceiptId - wm.lastReceiptId;
        const r = latestReceiptRows[0];
        alertLines.push(
          `💳 إيصال دفع جديد (${diff > 1 ? `${diff} إيصالات، آخرهم` : "الطالب"}: ${r?.name || "طالب"} - ${r?.phone || ""})`,
        );
        alertButtons.push([{ text: "💳 مراجعة الإيصالات", url: "https://drelmahdy.com/admin/payments" }]);
      }

      if (cfg.alertOnNewBooking && curMaxBookingId > wm.lastBookingId) {
        const b = latestBookingRows[0];
        alertLines.push(`📅 طلب حجز جديد من الموقع: ${b?.name || ""} (${b?.phone || ""})`);
        alertButtons.push([{ text: "📅 فتح الحجوزات", url: "https://drelmahdy.com/admin/center-bookings" }]);
      }

      if (cfg.alertOnNewStudent && curMaxStudentId > wm.lastStudentId) {
        const s = latestStudentRows[0];
        alertLines.push(`🎓 تسجيل طالب جديد: ${s?.name || ""} (${s?.grade || s?.learningMode || ""})`);
      }

      if (curMaxRecoveryId > wm.lastRecoveryId) {
        alertLines.push(`🔑 طلب استعادة كود طالب جديد (#${curMaxRecoveryId})`);
      }

      if (curMaxEssayId > wm.lastEssaySubmissionId) {
        alertLines.push(`📝 تسليم امتحان مقالي جديد بانتظار التصحيح: ${latestEssayRows[0]?.studentName || ""}`);
      }

      if (currentSheetError && currentSheetError !== wm.lastSheetErrorSignature) {
        alertLines.push(`⚠️ فشل مزامنة Google Sheets: ${currentSheetError}`);
      }

      if (latestServerErr && latestServerErr.id !== wm.lastServerErrorId && runtimeStats.errorsLast24hCount >= 3) {
        alertLines.push(
          `🚨 خطأ سيرفر 500 في (${latestServerErr.method} ${latestServerErr.path}): ${latestServerErr.message}`,
        );
      }

      // Daily proactive subscription expiry check (after 13:00 Cairo time)
      if (cfg.alertOnExpiringSubscriptions && wm.alertedExpiringDate !== todayCairo && nowHHMM >= "13:00") {
        wm.alertedExpiringDate = todayCairo;
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const expiringRows = await db
          .select({ name: studentsTable.name, phone: studentsTable.phone })
          .from(monthlySubscriptionsTable)
          .innerJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
          .where(
            and(
              eq(monthlySubscriptionsTable.paymentStatus, "paid"),
              gte(monthlySubscriptionsTable.monthEndDate, now),
              lte(monthlySubscriptionsTable.monthEndDate, threeDaysLater),
            ),
          )
          .limit(10);
        if (expiringRows.length > 0) {
          alertLines.push(
            `⏳ تنبيه الاشتراكات: ${expiringRows.length} طلاب ينتهي اشتراكهم خلال 3 أيام (${expiringRows
              .slice(0, 4)
              .map((x) => x.name)
              .join("، ")})`,
          );
        }
      }

      // Daily proactive repeat absence check (after 21:00 Cairo time)
      if (cfg.alertOnRepeatAbsence && wm.alertedAbsenceDate !== todayCairo && nowHHMM >= "21:00") {
        wm.alertedAbsenceDate = todayCairo;
        const sevenDaysAgoDate = getCairoDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const absRows = await db
          .select({
            studentId: studentAttendanceTable.studentId,
            name: studentsTable.name,
            centerName: studentAttendanceTable.centerName,
          })
          .from(studentAttendanceTable)
          .leftJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
          .where(and(gte(studentAttendanceTable.date, sevenDaysAgoDate), eq(studentAttendanceTable.status, "absent")));

        const counts = new Map<number, { name: string; center: string; n: number }>();
        for (const r of absRows) {
          const item = counts.get(r.studentId) || {
            name: r.name || `#${r.studentId}`,
            center: r.centerName || "سنتر",
            n: 0,
          };
          item.n++;
          counts.set(r.studentId, item);
        }
        const repeaters = Array.from(counts.values()).filter((x) => x.n >= 2);
        if (repeaters.length > 0) {
          alertLines.push(
            `⚠️ متابعة الغياب: ${repeaters.length} طلاب غابوا مرتين فأكثر هذا الأسبوع (${repeaters
              .slice(0, 4)
              .map((x) => `${x.name} [${x.center}]`)
              .join("، ")})`,
          );
        }
      }

      wm.lastReceiptId = Math.max(wm.lastReceiptId, curMaxReceiptId);
      wm.lastBookingId = Math.max(wm.lastBookingId, curMaxBookingId);
      wm.lastStudentId = Math.max(wm.lastStudentId, curMaxStudentId);
      wm.lastRecoveryId = Math.max(wm.lastRecoveryId, curMaxRecoveryId);
      wm.lastEssaySubmissionId = Math.max(wm.lastEssaySubmissionId, curMaxEssayId);
      if (currentSheetError) wm.lastSheetErrorSignature = currentSheetError;
      if (latestServerErr) wm.lastServerErrorId = latestServerErr.id;

      if (alertLines.length > 0) {
        const msg = `🔔 تنبيه فوري من مراقب المنصة (${getCairoHumanTime()}):\n\n${alertLines.join("\n")}`;
        alertButtons.push([{ text: "📊 تقرير الآن", callback_data: "cmd:/today" }]);

        let sent = false;
        let tgErr: string | null = null;
        if (tg.enabled) {
          const res = await sendTelegramMonitorMessage(tg.botToken, tg.chatId, msg, alertButtons);
          sent = res.success;
          tgErr = res.error || null;
        }
        await appendMonitorReport({
          id: `alert_${Date.now()}_${randomBytes(3).toString("hex")}`,
          kind: "alert",
          title: alertLines[0].slice(0, 75),
          summary: msg,
          createdAt: new Date().toISOString(),
          sentToTelegram: sent,
          telegramError: tgErr,
          modelUsed: "event-watcher",
        });
      }

      // Scheduled Daily Executive Report stored inside watermark (avoids racing with config saves)
      if (cfg.dailyReportEnabled && wm.lastDailyReportDate !== todayCairo && nowHHMM >= (cfg.dailyReportTime || "22:00")) {
        wm.lastDailyReportDate = todayCairo;
        await saveWatermark(wm);
        await generatePlatformReport({
          kind: "daily",
          sendToTelegram: tg.enabled,
        });
        logger.info({ todayCairo }, "[AI_MONITOR] Daily executive report generated & dispatched");
      } else {
        await saveWatermark(wm);
      }
    }
  } catch (err) {
    logger.warn({ err }, "[AI_MONITOR] Tick execution error");
  } finally {
    isMonitorTickRunning = false;
  }
}

export async function getLastDailyReportTimestamp(): Promise<string | null> {
  const wm = await getWatermark();
  return wm?.lastDailyReportDate || null;
}

export function verifyWebhookSecret(supplied: string, expected: string): boolean {
  if (!supplied || !expected) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function executeTelegramCommand(text: string, chatId: string, botToken: string): Promise<void> {
  let reply = "";
  let keyboard: TelegramInlineKeyboard | undefined = DEFAULT_TELEGRAM_KEYBOARD;
  const cmd = text.split(/\s+/)[0].toLowerCase();

  try {
    if (cmd === "/start" || cmd === "/help" || cmd === "/menu") {
      reply = [
        "🤖 أهلاً بك د. محمود — لوحة التحكم السريعة للوكيل الذكي:",
        "",
        "• /today — تقرير شامل بالذكاء الاصطناعي لحالة المنصة الآن",
        "• /pending — الإيصالات والحجوزات والتلخيصات والمقالي المعلقة",
        "• /absent — غياب اليوم والمتغيبون بشكل متكرر",
        "• /exams — إحصائيات الاختبارات وأعلى الطلاب آخر 7 أيام",
        "• /health — صحة السيرفر وقاعدة البيانات والأخطاء",
        "• /audit — آخر تحركات المساعدين والإدارة (24 ساعة)",
        "• /student الاسم — بحث فوري عن طالب ودرجاته وحضوره",
        "",
        "💬 أو اكتب أي سؤال مباشر بالعربي وسأبحث في قاعدة البيانات وأرد عليك.",
      ].join("\n");
    } else if (cmd === "/today" || cmd === "/report") {
      const rep = await generatePlatformReport({ kind: "manual", sendToTelegram: false });
      reply = rep.summary;
    } else if (cmd === "/absent") {
      const pulse = await collectPlatformPulse();
      const lines = [
        `🏫 حالة الحضور اليوم (${pulse.attendanceToday.date}):`,
        `حاضر: ${pulse.attendanceToday.present} | متأخر: ${pulse.attendanceToday.late} | غائب: ${pulse.attendanceToday.absent}`,
        "",
        ...(pulse.attendanceToday.byCenter.length > 0
          ? [
              "توزيع السناتر اليوم:",
              ...pulse.attendanceToday.byCenter.map(
                (c) => `• ${c.centerName}: حضور ${c.present} | تأخير ${c.late} | غياب ${c.absent}`,
              ),
              "",
            ]
          : []),
        ...(pulse.attendanceToday.absentNamesToday.length > 0
          ? [`غائبون اليوم (أول 20):`, ...pulse.attendanceToday.absentNamesToday.map((n) => `• ${n}`), ""]
          : ["لا توجد حالات غياب مسجلة اليوم حتى الآن.", ""]),
        ...(pulse.attendanceToday.repeatAbsentees7Days.length > 0
          ? [
              `⚠️ غياب متكرر آخر 7 أيام:`,
              ...pulse.attendanceToday.repeatAbsentees7Days.map(
                (x) => `• ${x.name} (${x.centerName}) — ${x.absentDays} مرات`,
              ),
            ]
          : []),
      ];
      reply = lines.join("\n");
    } else if (cmd === "/pending") {
      const pulse = await collectPlatformPulse();
      reply = [
        `📌 الإجراءات المعلقة الآن:`,
        `• إيصالات دفع منتظرة: ${pulse.financeAndActions.pendingReceiptsCount}`,
        ...pulse.financeAndActions.pendingReceiptsLatest.map((r) => `   - ${r.studentName} (${r.phone})`),
        `• طلبات حجز جديدة: ${pulse.financeAndActions.pendingBookingsCount}`,
        ...pulse.financeAndActions.pendingBookingsLatest.map((b) => `   - ${b.name} (${b.phone})`),
        `• طلبات استعادة كود: ${pulse.financeAndActions.pendingRecoveryRequests}`,
        `• تلخيصات بانتظار المراجعة: ${pulse.financeAndActions.pendingSummaries}`,
        `• مقالي بانتظار التصحيح: ${pulse.financeAndActions.pendingEssaySubmissions}`,
        `• اشتراكات تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days}`,
      ].join("\n");
      keyboard = [
        [
          { text: "💳 مراجعة الإيصالات", url: "https://drelmahdy.com/admin/payments" },
          { text: "📅 فتح الحجوزات", url: "https://drelmahdy.com/admin/center-bookings" },
        ],
        [{ text: "📊 التقرير الكامل", callback_data: "cmd:/today" }],
      ];
    } else if (cmd === "/exams") {
      const pulse = await collectPlatformPulse();
      reply = [
        `📝 أداء الاختبارات (آخر 7 أيام):`,
        `• الاختبارات المنشورة: ${pulse.academics.publishedQuizzesCount}`,
        `• محاولات اليوم: ${pulse.academics.attemptsToday} | إجمالي 7 أيام: ${pulse.academics.attemptsLast7Days}`,
        `• متوسط الدرجات: ${pulse.academics.avgScoreLast7Days}% | نسبة النجاح: ${pulse.academics.passRateLast7Days}%`,
        ...(pulse.academics.lowestAvgQuiz7Days
          ? [`• أقل اختبار في المتوسط: ${pulse.academics.lowestAvgQuiz7Days.title} (${pulse.academics.lowestAvgQuiz7Days.avgScore}%)`]
          : []),
        ...(pulse.academics.topStudentsLast7Days.length > 0
          ? [
              "",
              "🏆 الأعلى متوسطاً هذا الأسبوع:",
              ...pulse.academics.topStudentsLast7Days.map((s) => `• ${s.name}: ${s.avgScore}% (${s.attempts} محاولات)`),
            ]
          : []),
      ].join("\n");
    } else if (cmd === "/health") {
      const pulse = await collectPlatformPulse();
      const uptimeH = Math.floor(pulse.systemHealth.uptimeSeconds / 3600);
      const uptimeM = Math.floor((pulse.systemHealth.uptimeSeconds % 3600) / 60);
      reply = [
        `🖥️ صحة السيرفر وقاعدة البيانات (${pulse.cairoTimeLabel}):`,
        `• قاعدة البيانات: ${pulse.systemHealth.dbOk ? "متصلة ✅" : "غير متصلة ❌"} (${pulse.systemHealth.dbLatencyMs}ms)`,
        `• مدة التشغيل المستمر: ${uptimeH} ساعة و ${uptimeM} دقيقة`,
        `• ذاكرة Node: ${pulse.systemHealth.processRssMb}MB | ذاكرة السيرفر المستخدمة: ${pulse.systemHealth.osMemUsedPercent}% (متاح ${pulse.systemHealth.osFreeMemMb}MB)`,
        `• معدل الحمل: ${pulse.systemHealth.loadAvg1m}`,
        `• مزامنة Google Sheets: ${pulse.operations.googleSheetConfigured ? (pulse.operations.googleSheetLastSyncStatus || "مفعلة ✅") : "غير مربوطة"}`,
        `• أخطاء السيرفر (500) آخر 24 ساعة: ${pulse.systemHealth.errorsLast24hCount}`,
        ...(pulse.systemHealth.recentErrors.length > 0
          ? pulse.systemHealth.recentErrors.slice(0, 4).map((e) => `   ⚠️ ${e.method} ${e.path}: ${e.message}`)
          : []),
      ].join("\n");
    } else if (cmd === "/audit") {
      const pulse = await collectPlatformPulse();
      reply = [
        `🛡️ سجل نشاط الإدارة والمساعدين (آخر 24 ساعة - إجمالي ${pulse.operations.auditLogsLast24hCount}):`,
        ...(pulse.operations.recentAuditActions.length > 0
          ? pulse.operations.recentAuditActions.map(
              (a) => `• [${a.actorName}] ${a.action}${a.details ? `: ${a.details}` : ""}`,
            )
          : ["لا توجد عمليات مسجلة خلال آخر 24 ساعة."]),
      ].join("\n");
    } else {
      const cleanQuestion = text.replace(/^\/(ask|student)\s*/i, "").trim() || text;
      const res = await askMonitorAgent(cleanQuestion);
      reply = res.answer;

      await appendMonitorReport({
        id: `tg_${Date.now()}_${randomBytes(3).toString("hex")}`,
        kind: "telegram_query",
        title: `سؤال تليجرام: ${cleanQuestion.slice(0, 60)}`,
        summary: `السؤال: ${cleanQuestion}\n\nالإجابة:\n${reply}`,
        createdAt: new Date().toISOString(),
        sentToTelegram: true,
        modelUsed: res.modelUsed,
      });
    }
  } catch (err: any) {
    logger.error({ err, text }, "[AI_MONITOR] Telegram command execution failed");
    reply = `⚠️ حدث خطأ أثناء تنفيذ الأمر (${cmd}): ${err?.message || "خطأ غير متوقع"}. جرب مرة أخرى أو راجع لوحة الأدمن.`;
  }

  if (reply) {
    await sendTelegramMonitorMessage(botToken, chatId, reply, keyboard);
  }
}

export async function handleTelegramWebhookUpdate(update: any): Promise<void> {
  const cfg = await getMonitorConfig();
  const tg = await resolveTelegramCredentials(cfg);
  if (!tg.botToken) return;

  // Handle Inline Keyboard Button callbacks
  if (update?.callback_query) {
    const cb = update.callback_query;
    const cbId = cb.id;
    const cbChatId = cb.message?.chat?.id ? String(cb.message.chat.id) : "";
    const cbData = typeof cb.data === "string" ? cb.data : "";

    await fetch(`https://api.telegram.org/bot${tg.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cbId, text: "جاري التحميل..." }),
    }).catch(() => {});

    if (!tg.chatId || cbChatId !== tg.chatId) {
      logger.warn({ incomingChatId: cbChatId }, "[AI_MONITOR] Rejected unauthorized Telegram callback");
      return;
    }
    if (cbData.startsWith("cmd:")) {
      await executeTelegramCommand(cbData.slice(4), cbChatId, tg.botToken);
    }
    return;
  }

  const msg = update?.message || update?.edited_message;
  const chatId = msg?.chat?.id ? String(msg.chat.id) : "";
  const text = typeof msg?.text === "string" ? msg.text.trim() : "";
  if (!chatId || !text) return;

  if (text === "/myid" || text === "/id") {
    await sendTelegramMonitorMessage(tg.botToken, chatId, `معرف الشات الخاص بك (Chat ID):\n${chatId}`);
    return;
  }

  if (!tg.chatId || chatId !== tg.chatId) {
    logger.warn({ incomingChatId: chatId }, "[AI_MONITOR] Rejected unauthorized Telegram chat message");
    return;
  }

  await executeTelegramCommand(text, chatId, tg.botToken);
}
