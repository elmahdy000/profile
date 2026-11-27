import { randomBytes, timingSafeEqual } from "crypto";
import {
  auditLogsTable,
  bookingsTable,
  codeRecoveryRequestsTable,
  coursesTable,
  db,
  essayExamSubmissionsTable,
  learningFilesTable,
  monthlySubscriptionsTable,
  paymentReceiptsTable,
  quizAttemptsTable,
  quizzesTable,
  selfAssessmentEntitlementsTable,
  selfAssessmentSessionsTable,
  siteSettingsTable,
  studentAttendanceTable,
  studentDailyChallengesTable,
  studentLessonSummariesTable,
  studentMistakesTable,
  studentsTable,
  videoProgressTable,
  videosTable,
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

export interface GeneratedExportFile {
  id: string;
  filename: string;
  title: string;
  format: "csv" | "html";
  mimeType: string;
  rowCount: number;
  sizeBytes: number;
  contentBase64: string;
  createdAt: string;
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
  files?: Array<Omit<GeneratedExportFile, "contentBase64">>;
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
    onlineCount: number;
    centerCount: number;
    newToday: number;
    newLast7Days: number;
    unconfirmedCenterCount: number;
    inactivePaid7Days: number;
    byStage: Array<{ stage: string; total: number; paid: number }>;
    byCenter: Array<{ centerName: string; total: number; paid: number; unconfirmed: number }>;
    pendingApprovalList: Array<{ name: string; phone: string; grade: string; createdAt: string }>;
    inactivePaidPreview: Array<{ name: string; phone: string; grade: string; centerName: string }>;
  };
  attendanceToday: {
    date: string;
    present: number;
    late: number;
    absent: number;
    byCenter: Array<{ centerName: string; present: number; late: number; absent: number }>;
    absentStudentsToday: Array<{ name: string; phone: string; parentPhone: string; centerName: string }>;
    absentNamesToday: string[];
    repeatAbsentees7Days: Array<{
      studentId: number;
      name: string;
      phone: string;
      centerName: string;
      absentDays: number;
    }>;
  };
  financeAndActions: {
    totalSubscriptionsCount: number;
    paidSubscriptionsCount: number;
    paidRevenueEgpTotal: number;
    paidRevenueLast30DaysEgp: number;
    pendingSubscriptionsAmountEgp: number;
    pendingMonthlySubscriptions: number;
    expiringSubscriptionsNext3Days: number;
    expiringStudentsPreview: Array<{ name: string; phone: string; endsAt: string }>;
    selfAssessmentPaidPacksTotal: number;
    pendingReceiptsCount: number;
    pendingReceiptsLatest: Array<{ id: number; studentName: string; phone: string; createdAt: string }>;
    pendingBookingsCount: number;
    pendingBookingsLatest: Array<{ id: number; name: string; phone: string; message: string; createdAt: string }>;
    pendingRecoveryRequests: number;
    pendingRecoveriesList: Array<{ name: string; phone: string; createdAt: string }>;
    pendingSummaries: number;
    pendingEssaySubmissions: number;
  };
  academics: {
    publishedCoursesCount: number;
    publishedVideosCount: number;
    publishedFilesCount: number;
    publishedQuizzesCount: number;
    videoViewsLast7Days: number;
    videoCompletionsLast7Days: number;
    dailyChallengesCompleted7Days: number;
    activeMistakeItemsCount: number;
    attemptsToday: number;
    attemptsLast7Days: number;
    avgScoreLast7Days: number;
    passRateLast7Days: number;
    selfAssessmentsLast7Days: number;
    lowestAvgQuiz7Days: { title: string; attempts: number; avgScore: number } | null;
    topStudentsLast7Days: Array<{ name: string; avgScore: number; attempts: number }>;
    atRiskQuizStudents7Days: Array<{ name: string; avgScore: number; attempts: number }>;
  };
  operations: {
    auditLogsLast24hCount: number;
    auditBreakdownByActor24h: Array<{ actorName: string; actorRole: string; count: number }>;
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
    { text: "📊 تقرير متكامل AI", callback_data: "cmd:/today" },
    { text: "📁 ملف إكسل شامل", callback_data: "cmd:/export_today" },
  ],
  [
    { text: "💳 المالية والمعلق", callback_data: "cmd:/pending" },
    { text: "🏫 الغياب والسناتر", callback_data: "cmd:/absent" },
  ],
  [
    { text: "📝 الاختبارات", callback_data: "cmd:/exams" },
    { text: "🖥️ السيرفر والمساعدين", callback_data: "cmd:/health" },
  ],
  [{ text: "🔗 فتح لوحة الوكيل على الموقع", url: "https://drelmahdy.com/admin/ai-agent" }],
];

// In-memory LRU store for generated export files (up to 40 files)
const exportStore = new Map<string, GeneratedExportFile>();

function storeGeneratedExportFile(file: GeneratedExportFile): void {
  exportStore.set(file.id, file);
  if (exportStore.size > 40) {
    const oldestKey = exportStore.keys().next().value;
    if (oldestKey) exportStore.delete(oldestKey);
  }
}

export function getGeneratedExportFile(id: string): GeneratedExportFile | null {
  return exportStore.get(id) || null;
}

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

export async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  file: GeneratedExportFile,
  caption?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: "Telegram credentials missing" };
  }
  try {
    const buf = Buffer.from(file.contentBase64, "base64");
    const form = new FormData();
    form.append("chat_id", chatId);
    if (caption) {
      form.append("caption", caption.slice(0, 950));
    }
    form.append("document", new Blob([buf], { type: file.mimeType }), file.filename);

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: form,
    });
    const data = (await resp.json().catch(() => ({}))) as any;
    if (!resp.ok || !data?.ok) {
      return { success: false, error: data?.description || `Telegram sendDocument HTTP ${resp.status}` };
    }
    return { success: true };
  } catch (err: any) {
    logger.warn({ err }, "[AI_MONITOR] Failed sendDocument to Telegram");
    return { success: false, error: err?.message || "Network error sending document" };
  }
}

function buildCsvFile(title: string, columns: string[], rows: unknown[][]): GeneratedExportFile {
  const escapeCell = (val: unknown) => {
    const s = String(val ?? "").replace(/\r?\n/g, " ");
    return `"${s.replace(/"/g, '""')}"`;
  };
  const headerLine = columns.map(escapeCell).join(",");
  const bodyLines = rows.map((r) => columns.map((_, idx) => escapeCell(r?.[idx] ?? "")).join(","));
  const csvContent = "\uFEFF" + [headerLine, ...bodyLines].join("\r\n");
  const safeBase = title.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "report";
  const filename = `${safeBase}_${getCairoDateString()}.csv`;
  const buf = Buffer.from(csvContent, "utf8");
  const file: GeneratedExportFile = {
    id: `exp_${Date.now()}_${randomBytes(3).toString("hex")}`,
    filename,
    title,
    format: "csv",
    mimeType: "text/csv;charset=utf-8",
    rowCount: rows.length,
    sizeBytes: buf.length,
    contentBase64: buf.toString("base64"),
    createdAt: new Date().toISOString(),
  };
  storeGeneratedExportFile(file);
  return file;
}

function buildHtmlReportFile(title: string, columns: string[], rows: unknown[][]): GeneratedExportFile {
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const ths = columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const trs = rows
    .map((r) => `<tr>${columns.map((_, idx) => `<td>${esc(r?.[idx] ?? "")}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; }
  .card { background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 6px; color: #1e3a8a; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: right; }
  th { background: #1e293b; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
  <div class="card">
    <h1>${esc(title)}</h1>
    <div class="meta">منصة د. محمود المهدي — تاريخ التصدير: ${esc(getCairoHumanTime())} — عدد الصفوف: ${rows.length}</div>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </div>
</body>
</html>`;

  const safeBase = title.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "report";
  const filename = `${safeBase}_${getCairoDateString()}.html`;
  const buf = Buffer.from(html, "utf8");
  const file: GeneratedExportFile = {
    id: `exp_${Date.now()}_${randomBytes(3).toString("hex")}`,
    filename,
    title,
    format: "html",
    mimeType: "text/html;charset=utf-8",
    rowCount: rows.length,
    sizeBytes: buf.length,
    contentBase64: buf.toString("base64"),
    createdAt: new Date().toISOString(),
  };
  storeGeneratedExportFile(file);
  return file;
}

export async function collectPlatformPulse(dateInput?: string): Promise<PlatformPulseSnapshot> {
  const now = new Date();
  const cairoDate = dateInput || getCairoDateString(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
    pendingRecoveriesJoined,
    pendingSummaryRows,
    pendingEssayRows,
    allSubscriptions,
    selfPacksRows,
    publishedCoursesRows,
    publishedVideosRows,
    publishedFilesRows,
    publishedQuizRows,
    recentVideoProgress,
    recentChallenges,
    activeMistakesRows,
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
        phone: studentsTable.phone,
        grade: studentsTable.grade,
        centerName: studentsTable.centerName,
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
        studentPhone: studentsTable.phone,
        parentPhone: studentsTable.parentPhone,
      })
      .from(studentAttendanceTable)
      .leftJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
      .where(eq(studentAttendanceTable.date, cairoDate)),
    db
      .select({
        studentId: studentAttendanceTable.studentId,
        centerName: studentAttendanceTable.centerName,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
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
      .limit(15),
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
      .limit(15),
    db
      .select({
        id: codeRecoveryRequestsTable.id,
        name: studentsTable.name,
        phone: studentsTable.phone,
        createdAt: codeRecoveryRequestsTable.createdAt,
      })
      .from(codeRecoveryRequestsTable)
      .leftJoin(studentsTable, eq(codeRecoveryRequestsTable.studentId, studentsTable.id))
      .where(eq(codeRecoveryRequestsTable.status, "pending"))
      .orderBy(desc(codeRecoveryRequestsTable.createdAt))
      .limit(15),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentLessonSummariesTable)
      .where(eq(studentLessonSummariesTable.status, "pending")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(essayExamSubmissionsTable)
      .where(eq(essayExamSubmissionsTable.status, "submitted")),
    db
      .select({
        id: monthlySubscriptionsTable.id,
        studentId: monthlySubscriptionsTable.studentId,
        studentName: studentsTable.name,
        studentPhone: studentsTable.phone,
        amountDue: monthlySubscriptionsTable.amountDue,
        paymentStatus: monthlySubscriptionsTable.paymentStatus,
        paymentDate: monthlySubscriptionsTable.paymentDate,
        monthEndDate: monthlySubscriptionsTable.monthEndDate,
      })
      .from(monthlySubscriptionsTable)
      .leftJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id)),
    db
      .select({ totalPacks: sql<number>`coalesce(sum(${selfAssessmentEntitlementsTable.totalPurchasedAttempts}), 0)::int` })
      .from(selfAssessmentEntitlementsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.isPublished, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(videosTable).where(eq(videosTable.isPublished, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(learningFilesTable).where(eq(learningFilesTable.isPublished, true)),
    db.select({ id: quizzesTable.id, title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.isPublished, true)),
    db
      .select({
        completed: videoProgressTable.completed,
      })
      .from(videoProgressTable)
      .where(gte(videoProgressTable.updatedAt, sevenDaysAgo)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentDailyChallengesTable)
      .where(and(eq(studentDailyChallengesTable.completed, true), gte(studentDailyChallengesTable.createdAt, sevenDaysAgo))),
    db.select({ count: sql<number>`count(*)::int` }).from(studentMistakesTable).where(eq(studentMistakesTable.mastered, false)),
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
      .limit(30),
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
  let onlineCount = 0;
  let centerCount = 0;
  let newToday = 0;
  let newLast7Days = 0;
  let unconfirmedCenterCount = 0;
  let inactivePaid7Days = 0;
  const stageMap = new Map<string, { stage: string; total: number; paid: number }>();
  const studentCenterMap = new Map<string, { centerName: string; total: number; paid: number; unconfirmed: number }>();
  const pendingApprovalList: Array<{ name: string; phone: string; grade: string; createdAt: string }> = [];
  const inactivePaidPreview: Array<{ name: string; phone: string; grade: string; centerName: string }> = [];

  for (const s of allStudents) {
    if (s.status === "approved" || s.status === "active") activeApproved++;
    if (s.status === "pending") {
      pendingApproval++;
      if (pendingApprovalList.length < 10) {
        pendingApprovalList.push({
          name: s.name,
          phone: s.phone,
          grade: s.grade || "غير محدد",
          createdAt: new Date(s.createdAt).toISOString(),
        });
      }
    }
    if (s.paymentStatus === "paid") paid++;
    else if (s.paymentStatus === "pending_review") pendingReview++;
    else unpaid++;

    if (s.learningMode === "online") onlineCount++;
    else centerCount++;

    const stName = s.grade || "غير محدد";
    const stEntry = stageMap.get(stName) || { stage: stName, total: 0, paid: 0 };
    stEntry.total++;
    if (s.paymentStatus === "paid") stEntry.paid++;
    stageMap.set(stName, stEntry);

    if (s.learningMode !== "online" || s.centerName) {
      const cKey = s.centerName || "أوفلاين بدون سنتر";
      const cEntry = studentCenterMap.get(cKey) || { centerName: cKey, total: 0, paid: 0, unconfirmed: 0 };
      cEntry.total++;
      if (s.paymentStatus === "paid") cEntry.paid++;
      if (!s.centerConfirmed) cEntry.unconfirmed++;
      studentCenterMap.set(cKey, cEntry);
    }

    const createdDate = getCairoDateString(new Date(s.createdAt));
    if (createdDate === cairoDate) newToday++;
    if (new Date(s.createdAt) >= sevenDaysAgo) newLast7Days++;

    if (!s.centerConfirmed && (s.status === "approved" || s.status === "active")) {
      unconfirmedCenterCount++;
    }
    const lastSeen = s.lastActiveAt || s.lastLoginAt || s.createdAt;
    if (s.paymentStatus === "paid" && new Date(lastSeen) < sevenDaysAgo) {
      inactivePaid7Days++;
      if (inactivePaidPreview.length < 10) {
        inactivePaidPreview.push({
          name: s.name,
          phone: s.phone,
          grade: s.grade || "",
          centerName: s.centerName || s.learningMode,
        });
      }
    }
  }

  let present = 0;
  let late = 0;
  let absent = 0;
  const centerMap = new Map<string, { centerName: string; present: number; late: number; absent: number }>();
  const absentStudentsToday: Array<{ name: string; phone: string; parentPhone: string; centerName: string }> = [];

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
      if (row.studentName && absentStudentsToday.length < 30) {
        absentStudentsToday.push({
          name: row.studentName,
          phone: row.studentPhone || "",
          parentPhone: row.parentPhone || "",
          centerName: cName,
        });
      }
    }
    centerMap.set(cName, entry);
  }

  const repeatMap = new Map<
    number,
    { studentId: number; name: string; phone: string; centerName: string; absentDays: number }
  >();
  for (const r of recentAbsences) {
    const prev = repeatMap.get(r.studentId) || {
      studentId: r.studentId,
      name: r.studentName || `طالب #${r.studentId}`,
      phone: r.studentPhone || "",
      centerName: r.centerName || "غير محدد",
      absentDays: 0,
    };
    prev.absentDays++;
    repeatMap.set(r.studentId, prev);
  }
  const repeatAbsentees7Days = Array.from(repeatMap.values())
    .filter((x) => x.absentDays >= 2)
    .sort((a, b) => b.absentDays - a.absentDays)
    .slice(0, 15);

  let paidSubscriptionsCount = 0;
  let paidRevenueEgpTotal = 0;
  let paidRevenueLast30DaysEgp = 0;
  let pendingMonthlySubscriptions = 0;
  let pendingSubscriptionsAmountEgp = 0;
  const expiringStudentsPreview: Array<{ name: string; phone: string; endsAt: string }> = [];

  for (const sub of allSubscriptions) {
    if (sub.paymentStatus === "paid") {
      paidSubscriptionsCount++;
      paidRevenueEgpTotal += sub.amountDue || 0;
      if (sub.paymentDate && new Date(sub.paymentDate) >= thirtyDaysAgo) {
        paidRevenueLast30DaysEgp += sub.amountDue || 0;
      }
      if (sub.monthEndDate && new Date(sub.monthEndDate) >= now && new Date(sub.monthEndDate) <= threeDaysLater) {
        expiringStudentsPreview.push({
          name: sub.studentName || `#${sub.studentId}`,
          phone: sub.studentPhone || "",
          endsAt: getCairoDateString(new Date(sub.monthEndDate)),
        });
      }
    } else if (sub.paymentStatus === "pending") {
      pendingMonthlySubscriptions++;
      pendingSubscriptionsAmountEgp += sub.amountDue || 0;
    }
  }

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

  const studentScoresList = Array.from(studentAgg.values()).map((s) => ({
    name: s.name,
    attempts: s.attempts,
    avgScore: Math.round(s.totalScore / s.attempts),
  }));
  const topStudentsLast7Days = [...studentScoresList]
    .sort((a, b) => b.avgScore - a.avgScore || b.attempts - a.attempts)
    .slice(0, 5);
  const atRiskQuizStudents7Days = studentScoresList
    .filter((s) => s.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 8);

  const auditByActor = new Map<string, { actorName: string; actorRole: string; count: number }>();
  for (const a of recentAudits) {
    const key = `${a.actorRole}:${a.actorName || "مجهول"}`;
    const cur = auditByActor.get(key) || {
      actorName: a.actorName || "مجهول",
      actorRole: a.actorRole,
      count: 0,
    };
    cur.count++;
    auditByActor.set(key, cur);
  }

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
      onlineCount,
      centerCount,
      newToday,
      newLast7Days,
      unconfirmedCenterCount,
      inactivePaid7Days,
      byStage: Array.from(stageMap.values()).sort((a, b) => b.total - a.total).slice(0, 10),
      byCenter: Array.from(studentCenterMap.values()).sort((a, b) => b.total - a.total).slice(0, 12),
      pendingApprovalList,
      inactivePaidPreview,
    },
    attendanceToday: {
      date: cairoDate,
      present,
      late,
      absent,
      byCenter: Array.from(centerMap.values()),
      absentStudentsToday,
      absentNamesToday: absentStudentsToday.map((s) => s.name).slice(0, 20),
      repeatAbsentees7Days,
    },
    financeAndActions: {
      totalSubscriptionsCount: allSubscriptions.length,
      paidSubscriptionsCount,
      paidRevenueEgpTotal,
      paidRevenueLast30DaysEgp,
      pendingSubscriptionsAmountEgp,
      pendingMonthlySubscriptions,
      expiringSubscriptionsNext3Days: expiringStudentsPreview.length,
      expiringStudentsPreview: expiringStudentsPreview.slice(0, 10),
      selfAssessmentPaidPacksTotal: selfPacksRows[0]?.totalPacks || 0,
      pendingReceiptsCount: pendingReceipts.length,
      pendingReceiptsLatest: pendingReceipts.slice(0, 10).map((r) => ({
        id: r.id,
        studentName: r.snapshotStudentName || "طالب",
        phone: r.snapshotStudentPhone || "",
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      pendingBookingsCount: pendingBookings.length,
      pendingBookingsLatest: pendingBookings.slice(0, 10).map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        message: (b.message || "").slice(0, 120),
        createdAt: new Date(b.createdAt).toISOString(),
      })),
      pendingRecoveryRequests: pendingRecoveriesJoined.length,
      pendingRecoveriesList: pendingRecoveriesJoined.slice(0, 10).map((x) => ({
        name: x.name || "طالب",
        phone: x.phone || "",
        createdAt: new Date(x.createdAt).toISOString(),
      })),
      pendingSummaries: pendingSummaryRows[0]?.count || 0,
      pendingEssaySubmissions: pendingEssayRows[0]?.count || 0,
    },
    academics: {
      publishedCoursesCount: publishedCoursesRows[0]?.count || 0,
      publishedVideosCount: publishedVideosRows[0]?.count || 0,
      publishedFilesCount: publishedFilesRows[0]?.count || 0,
      publishedQuizzesCount: publishedQuizRows.length,
      videoViewsLast7Days: recentVideoProgress.length,
      videoCompletionsLast7Days: recentVideoProgress.filter((v) => v.completed).length,
      dailyChallengesCompleted7Days: recentChallenges[0]?.count || 0,
      activeMistakeItemsCount: activeMistakesRows[0]?.count || 0,
      attemptsToday,
      attemptsLast7Days: recentAttempts.length,
      avgScoreLast7Days: recentAttempts.length > 0 ? Math.round(totalScore7Days / recentAttempts.length) : 0,
      passRateLast7Days: recentAttempts.length > 0 ? Math.round((passedCount7Days / recentAttempts.length) * 100) : 0,
      selfAssessmentsLast7Days: recentSelfAssessments[0]?.count || 0,
      lowestAvgQuiz7Days,
      topStudentsLast7Days,
      atRiskQuizStudents7Days,
    },
    operations: {
      auditLogsLast24hCount: recentAudits.length,
      auditBreakdownByActor24h: Array.from(auditByActor.values()),
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
    `📊 التقرير التنفيذي المتكامل لمنصة د. محمود المهدي (${pulse.cairoTimeLabel})`,
    "",
    `1) 👥 الطلاب والتوزيع:`,
    `  • الإجمالي: ${pulse.students.total} (مفعل: ${pulse.students.activeApproved} | بانتظار التفعيل: ${pulse.students.pendingApproval})`,
    `  • الدفع: مدفوع ${pulse.students.paid} | قيد المراجعة ${pulse.students.pendingReview} | غير مدفوع ${pulse.students.unpaid}`,
    `  • النمط: سناتر ${pulse.students.centerCount} | أونلاين ${pulse.students.onlineCount} | لم يؤكد السنتر: ${pulse.students.unconfirmedCenterCount}`,
    `  • تسجيلات جديدة: اليوم +${pulse.students.newToday} | آخر 7 أيام +${pulse.students.newLast7Days} | خاملين (+7 أيام): ${pulse.students.inactivePaid7Days}`,
    ...(pulse.students.byCenter.length > 0
      ? ["  • توزيع السناتر:", ...pulse.students.byCenter.slice(0, 6).map((c) => `     - ${c.centerName}: ${c.total} طالب (مدفوع ${c.paid})`)]
      : []),
    "",
    `2) 💳 المالية والمدفوعات:`,
    `  • إجمالي اشتراكات مدفوعة: ${pulse.financeAndActions.paidRevenueEgpTotal} ج.م (${pulse.financeAndActions.paidSubscriptionsCount} اشتراك)`,
    `  • محصّل آخر 30 يوم: ${pulse.financeAndActions.paidRevenueLast30DaysEgp} ج.م | مستحقات معلقة: ${pulse.financeAndActions.pendingSubscriptionsAmountEgp} ج.م (${pulse.financeAndActions.pendingMonthlySubscriptions})`,
    `  • تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days} اشتراك | باقات تقييم مباعة: ${pulse.financeAndActions.selfAssessmentPaidPacksTotal}`,
    "",
    `3) 📌 قائمة الإجراءات المنتظرة الآن:`,
    `  • إيصالات دفع: ${pulse.financeAndActions.pendingReceiptsCount} | حجوزات جديدة: ${pulse.financeAndActions.pendingBookingsCount}`,
    `  • استعادة كود: ${pulse.financeAndActions.pendingRecoveryRequests} | تلخيصات: ${pulse.financeAndActions.pendingSummaries} | مقالي: ${pulse.financeAndActions.pendingEssaySubmissions}`,
    "",
    `4) 🏫 الحضور والغياب (${pulse.attendanceToday.date}):`,
    `  • اليوم: حاضر ${pulse.attendanceToday.present} | متأخر ${pulse.attendanceToday.late} | غائب ${pulse.attendanceToday.absent}`,
    ...(pulse.attendanceToday.byCenter.length > 0
      ? pulse.attendanceToday.byCenter.map((c) => `     - ${c.centerName}: حضور ${c.present} | تأخير ${c.late} | غياب ${c.absent}`)
      : []),
    ...(pulse.attendanceToday.repeatAbsentees7Days.length > 0
      ? [`  • غياب متكرر (7 أيام): ${pulse.attendanceToday.repeatAbsentees7Days.slice(0, 6).map((x) => `${x.name} (${x.absentDays})`).join("، ")}`]
      : []),
    "",
    `5) 📝 المحتوى والأداء الأكاديمي (7 أيام):`,
    `  • المكتبة: ${pulse.academics.publishedCoursesCount} كورسات | ${pulse.academics.publishedVideosCount} فيديو | ${pulse.academics.publishedFilesCount} ملف | ${pulse.academics.publishedQuizzesCount} اختبار`,
    `  • التفاعل: ${pulse.academics.videoViewsLast7Days} مشاهدة فيديو (اكتمال ${pulse.academics.videoCompletionsLast7Days}) | تحديات يومية: ${pulse.academics.dailyChallengesCompleted7Days}`,
    `  • الاختبارات: ${pulse.academics.attemptsLast7Days} محاولة (اليوم ${pulse.academics.attemptsToday}) | متوسط ${pulse.academics.avgScoreLast7Days}% | نجاح ${pulse.academics.passRateLast7Days}%`,
    ...(pulse.academics.lowestAvgQuiz7Days
      ? [`  • أصعب اختبار مؤخراً: "${pulse.academics.lowestAvgQuiz7Days.title}" (${pulse.academics.lowestAvgQuiz7Days.avgScore}%)`]
      : []),
    "",
    `6) 🛡️ المساعدين وصحة السيرفر:`,
    `  • حركات الإدارة والمساعدين (24 ساعة): ${pulse.operations.auditLogsLast24hCount} | Google Sheet: ${pulse.operations.googleSheetConfigured ? (pulse.operations.googleSheetLastSyncStatus || "مفعل") : "غير مربوط"}`,
    `  • السيرفر والـ DB: ${pulse.systemHealth.dbOk ? "متصل" : "عطل"} (${pulse.systemHealth.dbLatencyMs}ms) | RAM ${pulse.systemHealth.osMemUsedPercent}% | أخطاء 500: ${pulse.systemHealth.errorsLast24hCount}`,
  ];
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

// ── Gemini Function Calling Declarations & Executor ─────────────────────────────

const MONITOR_TOOL_DECLARATIONS = [
  {
    name: "query_students",
    description: "البحث في قائمة الطلاب وتصفيتهم حسب السنتر أو المرحلة أو حالة الدفع أو نوع الدراسة أو الخمول وإرجاع حتى 200 طالب بالاسم والهاتف وولي الأمر والكود.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: { type: "STRING", description: "بحث بالاسم أو الهاتف أو الكود أو اسم السنتر" },
        centerName: { type: "STRING", description: "تصفية باسم السنتر مثل الحناوي أو فلل الجامعة" },
        grade: { type: "STRING", description: "المرحلة أو الصف مثل أولى ثانوي أو تانية ثانوي" },
        learningMode: { type: "STRING", description: "online أو offline أو center" },
        paymentStatus: { type: "STRING", description: "paid أو pending_review أو unpaid" },
        status: { type: "STRING", description: "approved أو pending" },
        centerConfirmed: { type: "BOOLEAN", description: "true للطلاب الذين أكدوا السنتر، false لغير المؤكدين" },
        inactiveDays: { type: "INTEGER", description: "عدد أيام عدم التفاعل لإرجاع المنقطعين" },
        limit: { type: "INTEGER", description: "الحد الأقصى للنتائج (افتراضي 50 وحتى 200)" },
      },
    },
  },
  {
    name: "query_attendance",
    description: "استعراض سجلات الحضور والغياب والتأخير ليوم معين أو لآخر عدة أيام مع تصفية حسب السنتر والحالة وإظهار هواتف أولياء الأمور.",
    parameters: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING", description: "تاريخ محدد بصيغة YYYY-MM-DD (الافتراضي اليوم)" },
        daysBack: { type: "INTEGER", description: "عدد الأيام السابقة للبحث بدلاً من يوم واحد (مثل 7)" },
        centerName: { type: "STRING", description: "اسم السنتر" },
        status: { type: "STRING", description: "present أو late أو absent" },
        limit: { type: "INTEGER", description: "الحد الأقصى للصفوف (حتى 200)" },
      },
    },
  },
  {
    name: "query_quiz_results",
    description: "جلب نتائج ودرجات الاختبارات والطلاب الذين امتحنوا أو لم يمتحنوا، وأعلى وأقل الدرجات.",
    parameters: {
      type: "OBJECT",
      properties: {
        quizSearch: { type: "STRING", description: "اسم الاختبار أو جزء منه" },
        stage: { type: "STRING", description: "المرحلة الدراسية" },
        onlyFailed: { type: "BOOLEAN", description: "true لإظهار الراسبين فقط" },
        limit: { type: "INTEGER", description: "الحد الأقصى للمحاولات (حتى 200)" },
      },
    },
  },
  {
    name: "query_finance_and_subscriptions",
    description: "تفاصيل المالية والاشتراكات الشهرية وإيصالات الدفع وباقات التقييم الذاتي والمستحقات المالية بالأسماء والأرقام.",
    parameters: {
      type: "OBJECT",
      properties: {
        filter: { type: "STRING", description: "all أو paid أو pending أو expiring أو receipts أو packs" },
        daysWindow: { type: "INTEGER", description: "نطاق الأيام للاشتراكات القريبة من الانتهاء أو المحصلة" },
        limit: { type: "INTEGER", description: "الحد الأقصى للنتائج (حتى 150)" },
      },
    },
  },
  {
    name: "query_pending_queues",
    description: "استعراض كافة قوائم الانتظار: الحجوزات الجديدة، إيصالات الدفع، طلبات التسجيل، طلبات استعادة الكود، التلخيصات، والامتحانات المقالية.",
    parameters: {
      type: "OBJECT",
      properties: {
        queueType: { type: "STRING", description: "all أو bookings أو receipts أو students أو recoveries أو summaries أو essays" },
      },
    },
  },
  {
    name: "query_student_dossier",
    description: "ملف شامل (360 درجة) لطالب محدد: بياناته، هاتف ولي الأمر، سجل حضوره، كل درجات اختباراتِه، اشتراكاته، وعدد مشاهدات الفيديوهات.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: { type: "STRING", description: "اسم الطالب أو رقمه أو كوده" },
      },
      required: ["search"],
    },
  },
  {
    name: "query_content_and_audits",
    description: "سجل نشاط المساعدين والإدارة، تفاعل الفيديوهات، أكثر المفاهيم التي يخطئ فيها الطلاب، وأخطاء السيرفر.",
    parameters: {
      type: "OBJECT",
      properties: {
        focus: { type: "STRING", description: "audits أو videos أو mistakes أو health" },
        actorSearch: { type: "STRING", description: "اسم المساعد أو المشرف للتصفية" },
        limit: { type: "INTEGER" },
      },
      required: ["focus"],
    },
  },
  {
    name: "export_report_file",
    description: "توليد ملف حقيقي (CSV لبرنامج Excel أو HTML قابل للطباعة) وإرفاقه للتحميل أو إرساله مباشرة للمستخدم على تليجرام عند طلب كشف أو شيت أو ملف أو قائمة كاملة.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "عنوان واضح للتقرير أو الكشف" },
        format: { type: "STRING", description: "csv (الافتراضي لإكسل) أو html (لتقرير منسق للطباعة)" },
        columns: { type: "ARRAY", items: { type: "STRING" }, description: "عناوين الأعمدة بالعربي" },
        rows: {
          type: "ARRAY",
          items: { type: "ARRAY", items: { type: "STRING" } },
          description: "صفوف البيانات مطابقة لترتيب الأعمدة",
        },
      },
      required: ["title", "columns", "rows"],
    },
  },
];

async function executeMonitorTool(
  name: string,
  args: Record<string, any>,
  createdFiles: GeneratedExportFile[],
): Promise<unknown> {
  try {
    if (name === "query_students") {
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
      const conditions: any[] = [];
      if (args.search) {
        const terms = normalizeArabicVariants(String(args.search).trim());
        conditions.push(
          or(
            ...terms.flatMap((t) => [
              ilike(studentsTable.name, `%${t}%`),
              ilike(studentsTable.phone, `%${t}%`),
              ilike(studentsTable.accessCode, `%${t}%`),
              ilike(studentsTable.centerName, `%${t}%`),
            ]),
          ),
        );
      }
      if (args.centerName) {
        const terms = normalizeArabicVariants(String(args.centerName).trim());
        conditions.push(or(...terms.map((t) => ilike(studentsTable.centerName, `%${t}%`))));
      }
      if (args.grade) {
        const terms = normalizeArabicVariants(String(args.grade).trim());
        conditions.push(or(...terms.map((t) => ilike(studentsTable.grade, `%${t}%`))));
      }
      if (args.learningMode) {
        const lm = String(args.learningMode).toLowerCase();
        if (lm === "online") conditions.push(eq(studentsTable.learningMode, "online"));
        else conditions.push(or(eq(studentsTable.learningMode, "offline"), eq(studentsTable.learningMode, "center")));
      }
      if (args.paymentStatus) conditions.push(eq(studentsTable.paymentStatus, String(args.paymentStatus)));
      if (args.status) conditions.push(eq(studentsTable.status, String(args.status)));
      if (typeof args.centerConfirmed === "boolean") {
        conditions.push(eq(studentsTable.centerConfirmed, args.centerConfirmed));
      }
      if (args.inactiveDays) {
        const cutoff = new Date(Date.now() - Number(args.inactiveDays) * 24 * 60 * 60 * 1000);
        conditions.push(or(lte(studentsTable.lastActiveAt, cutoff), sql`${studentsTable.lastActiveAt} IS NULL`));
      }

      const rows = await db
        .select({
          id: studentsTable.id,
          name: studentsTable.name,
          phone: studentsTable.phone,
          parentPhone: studentsTable.parentPhone,
          accessCode: studentsTable.accessCode,
          grade: studentsTable.grade,
          learningMode: studentsTable.learningMode,
          centerName: studentsTable.centerName,
          appointmentSlot: studentsTable.appointmentSlot,
          centerConfirmed: studentsTable.centerConfirmed,
          paymentStatus: studentsTable.paymentStatus,
          status: studentsTable.status,
          lastActiveAt: studentsTable.lastActiveAt,
        })
        .from(studentsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(studentsTable.id))
        .limit(limit);

      return { count: rows.length, students: rows };
    }

    if (name === "query_attendance") {
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 200);
      const conditions: any[] = [];
      if (args.daysBack) {
        const startDate = getCairoDateString(new Date(Date.now() - Number(args.daysBack) * 24 * 60 * 60 * 1000));
        conditions.push(gte(studentAttendanceTable.date, startDate));
      } else {
        conditions.push(eq(studentAttendanceTable.date, String(args.date || getCairoDateString())));
      }
      if (args.centerName) {
        const terms = normalizeArabicVariants(String(args.centerName).trim());
        conditions.push(or(...terms.map((t) => ilike(studentAttendanceTable.centerName, `%${t}%`))));
      }
      if (args.status) conditions.push(eq(studentAttendanceTable.status, String(args.status)));

      const rows = await db
        .select({
          date: studentAttendanceTable.date,
          status: studentAttendanceTable.status,
          centerName: studentAttendanceTable.centerName,
          appointmentSlot: studentAttendanceTable.appointmentSlot,
          recordedBy: studentAttendanceTable.recordedBy,
          notes: studentAttendanceTable.notes,
          studentName: studentsTable.name,
          studentPhone: studentsTable.phone,
          parentPhone: studentsTable.parentPhone,
          accessCode: studentsTable.accessCode,
        })
        .from(studentAttendanceTable)
        .leftJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
        .where(and(...conditions))
        .orderBy(desc(studentAttendanceTable.date), desc(studentAttendanceTable.id))
        .limit(limit);

      return { count: rows.length, records: rows };
    }

    if (name === "query_quiz_results") {
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 200);
      const qConds: any[] = [];
      if (args.quizSearch) {
        const terms = normalizeArabicVariants(String(args.quizSearch).trim());
        qConds.push(or(...terms.map((t) => ilike(quizzesTable.title, `%${t}%`))));
      }
      if (args.stage) {
        const terms = normalizeArabicVariants(String(args.stage).trim());
        qConds.push(or(...terms.map((t) => ilike(quizzesTable.stage, `%${t}%`))));
      }

      const quizzes = await db
        .select({
          id: quizzesTable.id,
          title: quizzesTable.title,
          stage: quizzesTable.stage,
          passingScore: quizzesTable.passingScore,
          isPublished: quizzesTable.isPublished,
        })
        .from(quizzesTable)
        .where(qConds.length > 0 ? and(...qConds) : undefined)
        .orderBy(desc(quizzesTable.id))
        .limit(10);

      if (quizzes.length === 0) {
        return { quizzes: [], attempts: [] };
      }

      const qIds = quizzes.map((q) => q.id);
      const aConds: any[] = [inArray(quizAttemptsTable.quizId, qIds)];
      if (args.onlyFailed === true) aConds.push(eq(quizAttemptsTable.passed, false));

      const attempts = await db
        .select({
          quizId: quizAttemptsTable.quizId,
          quizTitle: quizzesTable.title,
          studentName: studentsTable.name,
          studentPhone: studentsTable.phone,
          studentGrade: studentsTable.grade,
          studentCenter: studentsTable.centerName,
          score: quizAttemptsTable.score,
          passed: quizAttemptsTable.passed,
          timeSpentSeconds: quizAttemptsTable.timeSpentSeconds,
          createdAt: quizAttemptsTable.createdAt,
        })
        .from(quizAttemptsTable)
        .leftJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id))
        .leftJoin(studentsTable, eq(quizAttemptsTable.studentId, studentsTable.id))
        .where(and(...aConds))
        .orderBy(desc(quizAttemptsTable.score), desc(quizAttemptsTable.createdAt))
        .limit(limit);

      return { quizzes, attemptsCount: attempts.length, attempts };
    }

    if (name === "query_finance_and_subscriptions") {
      const filter = String(args.filter || "all").toLowerCase();
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 150);
      const now = new Date();
      const daysWin = Number(args.daysWindow) || 3;
      const futureCutoff = new Date(now.getTime() + daysWin * 24 * 60 * 60 * 1000);

      if (filter === "receipts") {
        const receipts = await db
          .select({
            id: paymentReceiptsTable.id,
            studentName: paymentReceiptsTable.snapshotStudentName,
            phone: paymentReceiptsTable.snapshotStudentPhone,
            status: paymentReceiptsTable.status,
            reviewedByName: paymentReceiptsTable.reviewedByName,
            createdAt: paymentReceiptsTable.createdAt,
          })
          .from(paymentReceiptsTable)
          .orderBy(desc(paymentReceiptsTable.createdAt))
          .limit(limit);
        return { count: receipts.length, receipts };
      }

      if (filter === "packs") {
        const packs = await db
          .select({
            studentName: selfAssessmentEntitlementsTable.studentName,
            phone: selfAssessmentEntitlementsTable.phone,
            paidAttemptsBalance: selfAssessmentEntitlementsTable.paidAttemptsBalance,
            totalPurchasedAttempts: selfAssessmentEntitlementsTable.totalPurchasedAttempts,
            receiptStatus: selfAssessmentEntitlementsTable.receiptStatus,
            updatedAt: selfAssessmentEntitlementsTable.updatedAt,
          })
          .from(selfAssessmentEntitlementsTable)
          .orderBy(desc(selfAssessmentEntitlementsTable.updatedAt))
          .limit(limit);
        return { count: packs.length, packs };
      }

      const subConds: any[] = [];
      if (filter === "paid") subConds.push(eq(monthlySubscriptionsTable.paymentStatus, "paid"));
      else if (filter === "pending") subConds.push(eq(monthlySubscriptionsTable.paymentStatus, "pending"));
      else if (filter === "expiring") {
        subConds.push(
          and(
            eq(monthlySubscriptionsTable.paymentStatus, "paid"),
            gte(monthlySubscriptionsTable.monthEndDate, now),
            lte(monthlySubscriptionsTable.monthEndDate, futureCutoff),
          ),
        );
      }

      const subs = await db
        .select({
          id: monthlySubscriptionsTable.id,
          studentName: studentsTable.name,
          studentPhone: studentsTable.phone,
          centerName: studentsTable.centerName,
          amountDue: monthlySubscriptionsTable.amountDue,
          paymentStatus: monthlySubscriptionsTable.paymentStatus,
          paymentDate: monthlySubscriptionsTable.paymentDate,
          monthStartDate: monthlySubscriptionsTable.monthStartDate,
          monthEndDate: monthlySubscriptionsTable.monthEndDate,
        })
        .from(monthlySubscriptionsTable)
        .leftJoin(studentsTable, eq(monthlySubscriptionsTable.studentId, studentsTable.id))
        .where(subConds.length > 0 ? and(...subConds) : undefined)
        .orderBy(desc(monthlySubscriptionsTable.updatedAt))
        .limit(limit);

      const totalEgp = subs.reduce((acc, s) => acc + (s.amountDue || 0), 0);
      return { count: subs.length, totalEgp, subscriptions: subs };
    }

    if (name === "query_pending_queues") {
      const qt = String(args.queueType || "all").toLowerCase();
      const out: Record<string, unknown> = {};

      if (qt === "all" || qt === "bookings") {
        out.pendingBookings = await db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.status, "pending"))
          .orderBy(desc(bookingsTable.createdAt))
          .limit(30);
      }
      if (qt === "all" || qt === "receipts") {
        out.pendingReceipts = await db
          .select({
            id: paymentReceiptsTable.id,
            studentId: paymentReceiptsTable.studentId,
            studentName: paymentReceiptsTable.snapshotStudentName,
            phone: paymentReceiptsTable.snapshotStudentPhone,
            createdAt: paymentReceiptsTable.createdAt,
          })
          .from(paymentReceiptsTable)
          .where(eq(paymentReceiptsTable.status, "pending"))
          .orderBy(desc(paymentReceiptsTable.createdAt))
          .limit(30);
      }
      if (qt === "all" || qt === "students") {
        out.pendingStudents = await db
          .select({
            id: studentsTable.id,
            name: studentsTable.name,
            phone: studentsTable.phone,
            grade: studentsTable.grade,
            centerName: studentsTable.centerName,
            createdAt: studentsTable.createdAt,
          })
          .from(studentsTable)
          .where(eq(studentsTable.status, "pending"))
          .orderBy(desc(studentsTable.createdAt))
          .limit(30);
      }
      if (qt === "all" || qt === "recoveries") {
        out.pendingRecoveries = await db
          .select({
            id: codeRecoveryRequestsTable.id,
            studentName: studentsTable.name,
            phone: studentsTable.phone,
            accessCode: studentsTable.accessCode,
            createdAt: codeRecoveryRequestsTable.createdAt,
          })
          .from(codeRecoveryRequestsTable)
          .leftJoin(studentsTable, eq(codeRecoveryRequestsTable.studentId, studentsTable.id))
          .where(eq(codeRecoveryRequestsTable.status, "pending"))
          .orderBy(desc(codeRecoveryRequestsTable.createdAt))
          .limit(30);
      }
      if (qt === "all" || qt === "summaries") {
        out.pendingSummaries = await db
          .select({
            id: studentLessonSummariesTable.id,
            studentName: studentsTable.name,
            lessonTitle: studentLessonSummariesTable.lessonTitle,
            createdAt: studentLessonSummariesTable.createdAt,
          })
          .from(studentLessonSummariesTable)
          .leftJoin(studentsTable, eq(studentLessonSummariesTable.studentId, studentsTable.id))
          .where(eq(studentLessonSummariesTable.status, "pending"))
          .orderBy(desc(studentLessonSummariesTable.createdAt))
          .limit(30);
      }
      if (qt === "all" || qt === "essays") {
        out.pendingEssays = await db
          .select({
            id: essayExamSubmissionsTable.id,
            studentName: essayExamSubmissionsTable.studentName,
            studentPhone: essayExamSubmissionsTable.studentPhone,
            submittedAt: essayExamSubmissionsTable.submittedAt,
          })
          .from(essayExamSubmissionsTable)
          .where(eq(essayExamSubmissionsTable.status, "submitted"))
          .orderBy(desc(essayExamSubmissionsTable.submittedAt))
          .limit(30);
      }
      return out;
    }

    if (name === "query_student_dossier") {
      const search = String(args.search || "").trim();
      const terms = normalizeArabicVariants(search);
      const students = await db
        .select()
        .from(studentsTable)
        .where(
          or(
            ...terms.flatMap((t) => [
              ilike(studentsTable.name, `%${t}%`),
              ilike(studentsTable.phone, `%${t}%`),
              ilike(studentsTable.accessCode, `%${t}%`),
            ]),
          ),
        )
        .limit(5);

      if (students.length === 0) return { found: 0, students: [] };

      const ids = students.map((s) => s.id);
      const [attempts, attendance, subs, receipts, vidProgress] = await Promise.all([
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
          .limit(30),
        db
          .select()
          .from(studentAttendanceTable)
          .where(inArray(studentAttendanceTable.studentId, ids))
          .orderBy(desc(studentAttendanceTable.date))
          .limit(30),
        db
          .select()
          .from(monthlySubscriptionsTable)
          .where(inArray(monthlySubscriptionsTable.studentId, ids))
          .orderBy(desc(monthlySubscriptionsTable.monthEndDate))
          .limit(10),
        db
          .select({
            id: paymentReceiptsTable.id,
            studentId: paymentReceiptsTable.studentId,
            status: paymentReceiptsTable.status,
            createdAt: paymentReceiptsTable.createdAt,
          })
          .from(paymentReceiptsTable)
          .where(inArray(paymentReceiptsTable.studentId, ids))
          .limit(10),
        db
          .select({
            studentId: videoProgressTable.studentId,
            completed: videoProgressTable.completed,
            progress: videoProgressTable.progress,
          })
          .from(videoProgressTable)
          .where(inArray(videoProgressTable.studentId, ids)),
      ]);

      return {
        found: students.length,
        dossiers: students.map((s) => ({
          profile: {
            id: s.id,
            name: s.name,
            phone: s.phone,
            parentPhone: s.parentPhone,
            accessCode: s.accessCode,
            grade: s.grade,
            centerName: s.centerName,
            appointmentSlot: s.appointmentSlot,
            centerConfirmed: s.centerConfirmed,
            learningMode: s.learningMode,
            status: s.status,
            paymentStatus: s.paymentStatus,
            subscriptionEndDate: s.subscriptionEndDate,
            lastActiveAt: s.lastActiveAt,
          },
          quizzes: attempts.filter((a) => a.studentId === s.id),
          attendance: attendance.filter((a) => a.studentId === s.id),
          subscriptions: subs.filter((x) => x.studentId === s.id),
          receipts: receipts.filter((x) => x.studentId === s.id),
          videosWatchedCount: vidProgress.filter((v) => v.studentId === s.id).length,
          videosCompletedCount: vidProgress.filter((v) => v.studentId === s.id && v.completed).length,
        })),
      };
    }

    if (name === "query_content_and_audits") {
      const focus = String(args.focus || "audits").toLowerCase();
      const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 100);

      if (focus === "audits") {
        const cond = args.actorSearch ? ilike(auditLogsTable.actorName, `%${String(args.actorSearch)}%`) : undefined;
        const logs = await db
          .select()
          .from(auditLogsTable)
          .where(cond)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit);
        return { count: logs.length, logs };
      }

      if (focus === "mistakes") {
        const rows = await db
          .select({
            stage: studentMistakesTable.stage,
            unit: studentMistakesTable.unit,
            lesson: studentMistakesTable.lesson,
            concept: studentMistakesTable.concept,
            wrongCount: studentMistakesTable.wrongCount,
            mastered: studentMistakesTable.mastered,
          })
          .from(studentMistakesTable)
          .orderBy(desc(studentMistakesTable.wrongCount))
          .limit(limit);
        return { count: rows.length, topMistakes: rows };
      }

      if (focus === "health") {
        return getProcessRuntimeStats();
      }

      const videos = await db
        .select({
          id: videosTable.id,
          title: videosTable.title,
          stage: videosTable.stage,
          category: videosTable.category,
          viewsCount: sql<number>`count(${videoProgressTable.id})::int`,
          completedCount: sql<number>`coalesce(sum(case when ${videoProgressTable.completed} then 1 else 0 end), 0)::int`,
        })
        .from(videosTable)
        .leftJoin(videoProgressTable, eq(videosTable.id, videoProgressTable.videoId))
        .groupBy(videosTable.id)
        .orderBy(desc(sql`count(${videoProgressTable.id})`))
        .limit(limit);
      return { count: videos.length, videos };
    }

    if (name === "export_report_file") {
      const title = String(args.title || "تقرير_المنصة");
      const format = String(args.format || "csv").toLowerCase() === "html" ? "html" : "csv";
      const columns = Array.isArray(args.columns) ? args.columns.map(String) : ["البيان", "القيمة"];
      const rows = Array.isArray(args.rows) ? args.rows : [];
      const file =
        format === "html"
          ? buildHtmlReportFile(title, columns, rows)
          : buildCsvFile(title, columns, rows);
      createdFiles.push(file);
      return {
        success: true,
        fileId: file.id,
        filename: file.filename,
        format: file.format,
        rowCount: file.rowCount,
        note: "File generated and queued for attachment to user.",
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err: any) {
    logger.warn({ err, tool: name }, "[AI_MONITOR] Tool execution failed");
    return { error: err?.message || "Tool execution failed" };
  }
}

async function runGeminiAgentLoop(options: {
  apiKey: string;
  systemInstruction: string;
  initialContents: Array<{ role: string; parts: any[] }>;
  enableTools: boolean;
  maxOutputTokens?: number;
}): Promise<{ text: string; modelUsed: string; files: GeneratedExportFile[] } | null> {
  if (!options.apiKey) return null;

  const models = ["gemini-4-hydrogen", "gemini-3.5-flash-lite"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const contents: any[] = [...options.initialContents];
      const generatedFiles: GeneratedExportFile[] = [];

      // Up to 5 tool-calling turns per user request
      for (let step = 0; step < 5; step++) {
        const payload: any = {
          systemInstruction: { parts: [{ text: options.systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: options.maxOutputTokens || 3200,
          },
        };
        if (options.enableTools) {
          payload.tools = [{ functionDeclarations: MONITOR_TOOL_DECLARATIONS }];
        }

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": options.apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errTxt = await resp.text().catch(() => "");
          logger.warn({ model, step, status: resp.status, errTxt: errTxt.slice(0, 250) }, "[AI_MONITOR] Gemini error");
          break; // try next fallback model
        }

        const data = (await resp.json()) as any;
        const candidateContent = data?.candidates?.[0]?.content;
        const parts: any[] = Array.isArray(candidateContent?.parts) ? candidateContent.parts : [];

        const functionCalls = parts.filter((p) => p?.functionCall?.name);
        if (functionCalls.length > 0 && options.enableTools) {
          // Preserve the entire candidateContent verbatim (including thoughtSignature)
          contents.push(candidateContent);

          const responseParts = await Promise.all(
            functionCalls.map(async (fc) => {
              const fnName = fc.functionCall.name;
              const fnArgs = fc.functionCall.args || {};
              const result = await executeMonitorTool(fnName, fnArgs, generatedFiles);
              return {
                functionResponse: {
                  name: fnName,
                  response: { result },
                },
              };
            }),
          );

          contents.push({ role: "user", parts: responseParts });
          continue;
        }

        const text = parts
          .filter((p) => !p?.thought && typeof p?.text === "string")
          .map((p) => p.text)
          .join("\n")
          .replace(/\*\*/g, "")
          .replace(/^#{1,4}\s*/gm, "")
          .trim();

        if (text) {
          return { text, modelUsed: model, files: generatedFiles };
        }
        break;
      }
    } catch (err) {
      logger.warn({ err, model }, "[AI_MONITOR] Gemini agent loop error");
    }
  }
  return null;
}

function buildPulseExcelExport(pulse: PlatformPulseSnapshot): GeneratedExportFile {
  const columns = ["القسم", "البند", "القيمة", "التفاصيل"];
  const rows: string[][] = [
    ["الطلاب", "إجمالي الطلاب", String(pulse.students.total), `مفعل ${pulse.students.activeApproved} | معلق ${pulse.students.pendingApproval}`],
    ["الطلاب", "حالة الدفع", String(pulse.students.paid), `مدفوع ${pulse.students.paid} | قيد المراجعة ${pulse.students.pendingReview} | غير مدفوع ${pulse.students.unpaid}`],
    ["الطلاب", "سناتر وأونلاين", `${pulse.students.centerCount} / ${pulse.students.onlineCount}`, `لم يؤكدوا السنتر: ${pulse.students.unconfirmedCenterCount}`],
    ["المالية", "إجمالي اشتراكات مدفوعة", `${pulse.financeAndActions.paidRevenueEgpTotal} ج.م`, `${pulse.financeAndActions.paidSubscriptionsCount} اشتراك (آخر 30 يوم: ${pulse.financeAndActions.paidRevenueLast30DaysEgp} ج.م)`],
    ["المالية", "مستحقات واشتراكات معلقة", `${pulse.financeAndActions.pendingSubscriptionsAmountEgp} ج.م`, `عدد ${pulse.financeAndActions.pendingMonthlySubscriptions} | تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days}`],
    ["قوائم الانتظار", "إيصالات دفع وحجوزات", `${pulse.financeAndActions.pendingReceiptsCount} / ${pulse.financeAndActions.pendingBookingsCount}`, `استعادة كود ${pulse.financeAndActions.pendingRecoveryRequests} | تلخيصات ${pulse.financeAndActions.pendingSummaries} | مقالي ${pulse.financeAndActions.pendingEssaySubmissions}`],
    ["الحضور", `حضور اليوم (${pulse.attendanceToday.date})`, String(pulse.attendanceToday.present), `متأخر ${pulse.attendanceToday.late} | غائب ${pulse.attendanceToday.absent}`],
    ["الأكاديمي", "الاختبارات (7 أيام)", String(pulse.academics.attemptsLast7Days), `متوسط ${pulse.academics.avgScoreLast7Days}% | نجاح ${pulse.academics.passRateLast7Days}%`],
    ["الأكاديمي", "المحتوى والتفاعل", `${pulse.academics.publishedVideosCount} فيديو`, `مشاهدات 7 أيام: ${pulse.academics.videoViewsLast7Days} | تحديات يومية: ${pulse.academics.dailyChallengesCompleted7Days}`],
    ["السيرفر", "حالة الخادم وقاعدة البيانات", pulse.systemHealth.dbOk ? "متصل" : "عطل", `استجابة ${pulse.systemHealth.dbLatencyMs}ms | RAM ${pulse.systemHealth.osMemUsedPercent}% | أخطاء 500: ${pulse.systemHealth.errorsLast24hCount}`],
  ];

  for (const c of pulse.students.byCenter) {
    rows.push(["توزيع السناتر", c.centerName, String(c.total), `مدفوع ${c.paid} | غير مؤكد السنتر ${c.unconfirmed}`]);
  }
  for (const st of pulse.students.byStage) {
    rows.push(["توزيع المراحل", st.stage, String(st.total), `مدفوع ${st.paid}`]);
  }
  for (const abs of pulse.attendanceToday.absentStudentsToday) {
    rows.push(["غياب اليوم", abs.name, abs.centerName, `هاتف ${abs.phone} | ولي الأمر ${abs.parentPhone}`]);
  }
  for (const r of pulse.financeAndActions.pendingReceiptsLatest) {
    rows.push(["إيصالات معلقة", r.studentName, r.phone, r.createdAt]);
  }
  for (const b of pulse.financeAndActions.pendingBookingsLatest) {
    rows.push(["حجوزات معلقة", b.name, b.phone, b.message]);
  }
  return buildCsvFile(`تقرير_المنصة_الشامل`, columns, rows);
}

export async function generatePlatformReport(options: {
  kind: "daily" | "manual";
  sendToTelegram?: boolean;
  customFocus?: string;
  includeFile?: boolean;
}): Promise<MonitorReportEntry> {
  const cfg = await getMonitorConfig();
  const pulse = await collectPlatformPulse();
  const apiKey = getEffectiveGeminiApiKey(cfg);

  const systemInstruction = [
    "أنت المدير التنفيذي الذكي ومحلل البيانات لمنصة د. محمود المهدي التعليمية.",
    "اكتب تقريراً تشغيلياً متكاملاً وشاملاً لكل أقسام المنصة باللغة العربية المرتبة (بدون رموز ** أو ###).",
    "اعتمد حصراً على الأرقام والأسماء الفعلية الموجودة في البيانات المرفقة دون اختراع أي أرقام.",
    "يجب أن يغطي التقرير الأقسام التالية بوضوح وأرقام محددة:",
    "1) الملخص التنفيذي وما يحتاج تدخل د. محمود فوراً (مع ذكر الأسماء والأرقام للإيصالات والحجوزات واستعادة الأكواد).",
    "2) الطلاب والتوزيع (الأعداد، المدفوع vs المعلق، توزيع السناتر والمراحل، غير المؤكدين، الخاملين).",
    "3) المالية والاشتراكات (المحصّل بالجنيه، المستحقات المعلقة، الاشتراكات المنتهية خلال 3 أيام بالأسماء).",
    "4) الحضور والغياب في السناتر (تفصيل كل سنتر، غياب اليوم، وتكرار الغياب).",
    "5) الأداء الأكاديمي والمحتوى (الاختبارات، نسبة النجاح، أصعب اختبار، المتعثرين، مشاهدات الفيديو والتحدي اليومي).",
    "6) نشاط المساعدين وصحة السيرفر ومزامنة Google Sheets.",
  ].join(" ");

  const prompt = [
    options.customFocus ? `تركيز خاص مطلوب: ${options.customFocus}` : "أعد التقرير التشغيلي الشامل المتكامل الآن.",
    "",
    "البيانات الكاملة اللحظية من قاعدة البيانات:",
    JSON.stringify(pulse),
  ].join("\n");

  const aiResult = await runGeminiAgentLoop({
    apiKey,
    systemInstruction,
    initialContents: [{ role: "user", parts: [{ text: prompt }] }],
    enableTools: false,
    maxOutputTokens: 3500,
  });

  const summary = aiResult?.text || buildDeterministicSummary(pulse);
  const attachFile = options.includeFile || options.kind === "daily" ? buildPulseExcelExport(pulse) : null;

  let sentToTelegram = false;
  let telegramError: string | null = null;
  if (options.sendToTelegram) {
    const tg = await resolveTelegramCredentials(cfg);
    if (tg.enabled) {
      const tgRes = await sendTelegramMonitorMessage(tg.botToken, tg.chatId, summary, DEFAULT_TELEGRAM_KEYBOARD);
      sentToTelegram = tgRes.success;
      telegramError = tgRes.error || null;
      if (attachFile && tgRes.success) {
        await sendTelegramDocument(
          tg.botToken,
          tg.chatId,
          attachFile,
          `📁 ملف Excel للتقرير الشامل (${pulse.cairoDate})`,
        );
      }
    } else {
      telegramError = "قناة تليجرام غير مفعلة أو ينقصها Token / Chat ID";
    }
  }

  const entry: MonitorReportEntry = {
    id: `rep_${Date.now()}_${randomBytes(3).toString("hex")}`,
    kind: options.kind,
    title:
      options.kind === "daily"
        ? `التقرير المتكامل اليومي — ${pulse.cairoDate}`
        : `تقرير متابعة متكامل — ${pulse.cairoTimeLabel}`,
    summary,
    createdAt: new Date().toISOString(),
    sentToTelegram,
    telegramError,
    modelUsed: aiResult?.modelUsed || "deterministic-db",
    ...(attachFile
      ? {
          files: [
            {
              id: attachFile.id,
              filename: attachFile.filename,
              title: attachFile.title,
              format: attachFile.format,
              mimeType: attachFile.mimeType,
              rowCount: attachFile.rowCount,
              sizeBytes: attachFile.sizeBytes,
              createdAt: attachFile.createdAt,
            },
          ],
        }
      : {}),
    metricsSnapshot: {
      studentsTotal: pulse.students.total,
      paid: pulse.students.paid,
      revenueEgp: pulse.financeAndActions.paidRevenueEgpTotal,
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
): Promise<{
  answer: string;
  modelUsed: string;
  generatedAt: string;
  files: GeneratedExportFile[];
}> {
  const cfg = await getMonitorConfig();
  const pulse = await collectPlatformPulse();
  const apiKey = getEffectiveGeminiApiKey(cfg);

  const systemInstruction = [
    "أنت الوكيل الذكي ومساعد الإدارة الكامل لدكتور محمود المهدي على منصته التعليمية (drelmahdy.com).",
    "لديك أدوات قراءة حقيقية لقاعدة البيانات وأداة export_report_file لتصدير أي كشف أو جدول لملف CSV أو HTML.",
    "القواعد الإلزامية:",
    "1) إذا طلب د. محمود تفاصيل عن طلاب أو سنتر معين أو غياب أو درجات امتحان أو مالية أو حجوزات أو ملف لطالب محدد، استخدم الأداة المناسبة أولاً لجلب البيانات الحقيقية الكاملة ولا تعتمد على التخمين.",
    "2) إذا طلب شيت أو ملف أو كشف أو قائمة كاملة (أو كانت القائمة طويلة > 10 صفوف)، استدعِ أداة export_report_file بالصفوف الحقيقية التي جلبتها ليصل الملف فوراً للمستخدم.",
    "3) تجاوب بالعربية بوضوح ودقة دون ** أو ###، واذكر الأرقام والأسماء الفعلية كما وردت من الأدوات.",
  ].join(" ");

  const contents: Array<{ role: string; parts: any[] }> = [];
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

  contents.push({
    role: "user",
    parts: [
      {
        text: [
          `طلب د. محمود الآن: ${question}`,
          "",
          `نبض المنصة الموجز (${pulse.cairoTimeLabel}): إجمالي الطلاب ${pulse.students.total} (مدفوع ${pulse.students.paid}) | حضور اليوم ${pulse.attendanceToday.present} | غياب ${pulse.attendanceToday.absent} | إيصالات معلقة ${pulse.financeAndActions.pendingReceiptsCount} | حجوزات معلقة ${pulse.financeAndActions.pendingBookingsCount}.`,
          "استخدم أدوات البحث والتصدير عند الحاجة لإحضار البيانات الدقيقة وتنفيذ الطلب بالكامل.",
        ].join("\n"),
      },
    ],
  });

  const aiResult = await runGeminiAgentLoop({
    apiKey,
    systemInstruction,
    initialContents: contents,
    enableTools: true,
    maxOutputTokens: 3200,
  });

  if (aiResult) {
    return {
      answer: aiResult.text,
      modelUsed: aiResult.modelUsed,
      generatedAt: new Date().toISOString(),
      files: aiResult.files,
    };
  }

  return {
    answer: `تعذر الوصول لمحرك Gemini حالياً، إليك الملخص المتكامل المباشر من قاعدة البيانات:\n\n${buildDeterministicSummary(pulse)}`,
    modelUsed: "deterministic-fallback",
    generatedAt: new Date().toISOString(),
    files: [],
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

      if (cfg.dailyReportEnabled && wm.lastDailyReportDate !== todayCairo && nowHHMM >= (cfg.dailyReportTime || "22:00")) {
        wm.lastDailyReportDate = todayCairo;
        await saveWatermark(wm);
        await generatePlatformReport({
          kind: "daily",
          sendToTelegram: tg.enabled,
          includeFile: true,
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
  let filesToSend: GeneratedExportFile[] = [];
  let keyboard: TelegramInlineKeyboard | undefined = DEFAULT_TELEGRAM_KEYBOARD;
  const cmd = text.split(/\s+/)[0].toLowerCase();

  try {
    // Show "typing..." action in Telegram so user knows the agent is processing
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }).catch(() => {});

    if (cmd === "/start" || cmd === "/help" || cmd === "/menu") {
      reply = [
        "🤖 أهلاً بك د. محمود — الوكيل الذكي المتكامل لمنصتك:",
        "",
        "الأوامر السريعة:",
        "• /today — تقرير متكامل بالذكاء الاصطناعي (طلاب + مالية + حضور + اختبارات + سيرفر)",
        "• /export_today — إرسال ملف Excel (CSV) شامل لحالة المنصة",
        "• /pending — المعلق الآن (إيصالات، حجوزات، استعادة أكواد، تلخيصات، مقالي)",
        "• /absent — غياب اليوم والمتغيبون بشكل متكرر بأرقام الهواتف",
        "• /exams — أداء الاختبارات والمحتوى وأصعب اختبار",
        "• /health — صحة السيرفر وقاعدة البيانات",
        "• /audit — سجل نشاط المساعدين (24 ساعة)",
        "",
        "💬 اطلب أي حاجة مباشرة بالعربي! أمثلة:",
        "• \"ابعتلي شيت طلبة سنتر الحناوي بأرقامهم وأكوادهم\"",
        "• \"هاتلي درجات آخر امتحان واللي مدخلوش\"",
        "• \"اعرض ملف الطالب أحمد محمد بالكامل\"",
        "• \"مين دفع الشهر ده ومين لسه مدفعش؟\"",
      ].join("\n");
    } else if (cmd === "/export_today") {
      const pulse = await collectPlatformPulse();
      const file = buildPulseExcelExport(pulse);
      await sendTelegramDocument(
        botToken,
        chatId,
        file,
        `📊 ملف Excel الشامل للمنصة — ${pulse.cairoDate} (${file.rowCount} سجل)`,
      );
      reply = `✅ تم تجهيز وإرسال ملف التقرير الشامل (${file.filename}) أعلاه.`;
    } else if (cmd === "/today" || cmd === "/report") {
      const rep = await generatePlatformReport({ kind: "manual", sendToTelegram: false, includeFile: true });
      reply = rep.summary;
      if (rep.files && rep.files.length > 0) {
        const f = getGeneratedExportFile(rep.files[0].id);
        if (f) filesToSend.push(f);
      }
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
        ...(pulse.attendanceToday.absentStudentsToday.length > 0
          ? [
              `غائبون اليوم:`,
              ...pulse.attendanceToday.absentStudentsToday.map(
                (s) => `• ${s.name} (${s.centerName}) — ت: ${s.phone}${s.parentPhone ? ` / ولي أمر: ${s.parentPhone}` : ""}`,
              ),
              "",
            ]
          : ["لا توجد حالات غياب مسجلة اليوم حتى الآن.", ""]),
        ...(pulse.attendanceToday.repeatAbsentees7Days.length > 0
          ? [
              `⚠️ غياب متكرر آخر 7 أيام:`,
              ...pulse.attendanceToday.repeatAbsentees7Days.map(
                (x) => `• ${x.name} (${x.centerName}) — ${x.absentDays} مرات — ت: ${x.phone}`,
              ),
            ]
          : []),
      ];
      reply = lines.join("\n");
    } else if (cmd === "/pending") {
      const pulse = await collectPlatformPulse();
      reply = [
        `📌 الإجراءات والمستحقات المعلقة الآن:`,
        `• إيصالات دفع منتظرة: ${pulse.financeAndActions.pendingReceiptsCount}`,
        ...pulse.financeAndActions.pendingReceiptsLatest.map((r) => `   - ${r.studentName} (${r.phone})`),
        `• طلبات حجز جديدة: ${pulse.financeAndActions.pendingBookingsCount}`,
        ...pulse.financeAndActions.pendingBookingsLatest.map((b) => `   - ${b.name} (${b.phone})`),
        `• طلبات استعادة كود: ${pulse.financeAndActions.pendingRecoveryRequests}`,
        ...pulse.financeAndActions.pendingRecoveriesList.map((r) => `   - ${r.name} (${r.phone})`),
        `• طلبات تسجيل طلاب معلقة: ${pulse.students.pendingApproval}`,
        `• تلخيصات بانتظار المراجعة: ${pulse.financeAndActions.pendingSummaries}`,
        `• مقالي بانتظار التصحيح: ${pulse.financeAndActions.pendingEssaySubmissions}`,
        `• اشتراكات معلقة: ${pulse.financeAndActions.pendingMonthlySubscriptions} (${pulse.financeAndActions.pendingSubscriptionsAmountEgp} ج.م)`,
        `• اشتراكات تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days}`,
      ].join("\n");
      keyboard = [
        [
          { text: "💳 مراجعة الإيصالات", url: "https://drelmahdy.com/admin/payments" },
          { text: "📅 فتح الحجوزات", url: "https://drelmahdy.com/admin/center-bookings" },
        ],
        [{ text: "📊 التقرير المتكامل", callback_data: "cmd:/today" }],
      ];
    } else if (cmd === "/exams") {
      const pulse = await collectPlatformPulse();
      reply = [
        `📝 أداء الاختبارات والمحتوى (آخر 7 أيام):`,
        `• الكورسات: ${pulse.academics.publishedCoursesCount} | الفيديوهات: ${pulse.academics.publishedVideosCount} | الاختبارات: ${pulse.academics.publishedQuizzesCount}`,
        `• تفاعل الفيديوهات: ${pulse.academics.videoViewsLast7Days} مشاهدة (اكتمال ${pulse.academics.videoCompletionsLast7Days}) | تحديات يومية: ${pulse.academics.dailyChallengesCompleted7Days}`,
        `• محاولات الاختبارات: ${pulse.academics.attemptsLast7Days} (اليوم ${pulse.academics.attemptsToday}) | متوسط ${pulse.academics.avgScoreLast7Days}% | نجاح ${pulse.academics.passRateLast7Days}%`,
        ...(pulse.academics.lowestAvgQuiz7Days
          ? [`• أقل اختبار في المتوسط: ${pulse.academics.lowestAvgQuiz7Days.title} (${pulse.academics.lowestAvgQuiz7Days.avgScore}%)`]
          : []),
        ...(pulse.academics.topStudentsLast7Days.length > 0
          ? ["", "🏆 الأعلى متوسطاً:", ...pulse.academics.topStudentsLast7Days.map((s) => `• ${s.name}: ${s.avgScore}% (${s.attempts} محاولات)`)]
          : []),
        ...(pulse.academics.atRiskQuizStudents7Days.length > 0
          ? ["", "⚠️ يحتاجون متابعة (<60%):", ...pulse.academics.atRiskQuizStudents7Days.map((s) => `• ${s.name}: ${s.avgScore}%`)]
          : []),
      ].join("\n");
    } else if (cmd === "/health") {
      const pulse = await collectPlatformPulse();
      const uptimeH = Math.floor(pulse.systemHealth.uptimeSeconds / 3600);
      const uptimeM = Math.floor((pulse.systemHealth.uptimeSeconds % 3600) / 60);
      reply = [
        `🖥️ صحة السيرفر وقاعدة البيانات (${pulse.cairoTimeLabel}):`,
        `• قاعدة البيانات: ${pulse.systemHealth.dbOk ? "متصلة ✅" : "غير متصلة ❌"} (${pulse.systemHealth.dbLatencyMs}ms)`,
        `• مدة التشغيل: ${uptimeH} ساعة و ${uptimeM} دقيقة | الحمل: ${pulse.systemHealth.loadAvg1m}`,
        `• ذاكرة Node: ${pulse.systemHealth.processRssMb}MB | ذاكرة السيرفر: ${pulse.systemHealth.osMemUsedPercent}% (متاح ${pulse.systemHealth.osFreeMemMb}MB)`,
        `• مزامنة Google Sheets: ${pulse.operations.googleSheetConfigured ? (pulse.operations.googleSheetLastSyncStatus || "مفعلة ✅") : "غير مربوطة"}`,
        `• أخطاء السيرفر (500) آخر 24 ساعة: ${pulse.systemHealth.errorsLast24hCount}`,
        ...(pulse.systemHealth.recentErrors.length > 0
          ? pulse.systemHealth.recentErrors.slice(0, 4).map((e) => `   ⚠️ ${e.method} ${e.path}: ${e.message}`)
          : []),
      ].join("\n");
    } else if (cmd === "/audit") {
      const pulse = await collectPlatformPulse();
      reply = [
        `🛡️ سجل نشاط الإدارة والمساعدين (آخر 24 ساعة - ${pulse.operations.auditLogsLast24hCount} عملية):`,
        ...pulse.operations.auditBreakdownByActor24h.map((b) => `• ${b.actorName} (${b.actorRole}): ${b.count} عملية`),
        "",
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
      filesToSend = res.files;

      await appendMonitorReport({
        id: `tg_${Date.now()}_${randomBytes(3).toString("hex")}`,
        kind: "telegram_query",
        title: `طلب تليجرام: ${cleanQuestion.slice(0, 60)}`,
        summary: `الطلب: ${cleanQuestion}\n\nالرد:\n${reply}`,
        createdAt: new Date().toISOString(),
        sentToTelegram: true,
        modelUsed: res.modelUsed,
        ...(filesToSend.length > 0
          ? {
              files: filesToSend.map(({ contentBase64: _b, ...meta }) => meta),
            }
          : {}),
      });
    }
  } catch (err: any) {
    logger.error({ err, text }, "[AI_MONITOR] Telegram command execution failed");
    reply = `⚠️ حدث خطأ أثناء تنفيذ طلبك (${cmd}): ${err?.message || "خطأ غير متوقع"}. جرب مرة أخرى أو راجع لوحة الأدمن.`;
  }

  if (reply) {
    await sendTelegramMonitorMessage(botToken, chatId, reply, keyboard);
  }
  for (const f of filesToSend) {
    await sendTelegramDocument(botToken, chatId, f, `📁 ${f.title} (${f.rowCount} سجل)`);
  }
}

export async function handleTelegramWebhookUpdate(update: any): Promise<void> {
  const cfg = await getMonitorConfig();
  const tg = await resolveTelegramCredentials(cfg);
  if (!tg.botToken) return;

  if (update?.callback_query) {
    const cb = update.callback_query;
    const cbId = cb.id;
    const cbChatId = cb.message?.chat?.id ? String(cb.message.chat.id) : "";
    const cbData = typeof cb.data === "string" ? cb.data : "";

    await fetch(`https://api.telegram.org/bot${tg.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cbId, text: "جاري تجهيز المطلوب..." }),
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
