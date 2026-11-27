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
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
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
  lastDailyReportDate?: string | null;
  lastHourlyCheckHour?: string | null;
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
  alertedExpiringDate: string;
  initializedAt: string;
}

export interface PlatformPulseSnapshot {
  generatedAt: string;
  cairoDate: string;
  cairoTimeLabel: string;
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
    pendingBookingsLatest: Array<{ id: number; name: string; phone: string; createdAt: string }>;
    pendingRecoveryRequests: number;
    pendingSummaries: number;
    pendingEssaySubmissions: number;
    pendingMonthlySubscriptions: number;
    expiringSubscriptionsNext3Days: number;
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
    lastDailyReportDate: null,
    lastHourlyCheckHour: null,
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

async function appendMonitorReport(entry: MonitorReportEntry): Promise<void> {
  const existing = await getMonitorReportsHistory();
  const next = [entry, ...existing].slice(0, 50);
  const serialized = JSON.stringify(next);

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

export async function sendTelegramMonitorMessage(
  botToken: string,
  chatId: string,
  messageText: string,
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
    for (const chunk of chunks) {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          disable_web_page_preview: true,
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
      .limit(10),
    db
      .select({
        id: bookingsTable.id,
        name: bookingsTable.name,
        phone: bookingsTable.phone,
        createdAt: bookingsTable.createdAt,
      })
      .from(bookingsTable)
      .where(eq(bookingsTable.status, "pending"))
      .orderBy(desc(bookingsTable.createdAt))
      .limit(10),
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
      .select({ count: sql<number>`count(*)::int` })
      .from(monthlySubscriptionsTable)
      .where(
        and(
          eq(monthlySubscriptionsTable.paymentStatus, "paid"),
          gte(monthlySubscriptionsTable.monthEndDate, now),
          lte(monthlySubscriptionsTable.monthEndDate, threeDaysLater),
        ),
      ),
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
      pendingReceiptsLatest: pendingReceipts.slice(0, 5).map((r) => ({
        id: r.id,
        studentName: r.snapshotStudentName || "طالب",
        phone: r.snapshotStudentPhone || "",
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      pendingBookingsCount: pendingBookings.length,
      pendingBookingsLatest: pendingBookings.slice(0, 5).map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        createdAt: new Date(b.createdAt).toISOString(),
      })),
      pendingRecoveryRequests: pendingRecoveryRows[0]?.count || 0,
      pendingSummaries: pendingSummaryRows[0]?.count || 0,
      pendingEssaySubmissions: pendingEssayRows[0]?.count || 0,
      pendingMonthlySubscriptions: pendingSubsRows[0]?.count || 0,
      expiringSubscriptionsNext3Days: expiringSubsRows[0]?.count || 0,
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
    `👥 الطلاب: إجمالي ${pulse.students.total} | مفعل ${pulse.students.activeApproved} | مدفوع ${pulse.students.paid} | بانتظار المراجعة ${pulse.students.pendingReview}`,
    `🆕 تسجيلات اليوم: ${pulse.students.newToday} | آخر 7 أيام: ${pulse.students.newLast7Days} | طلاب لم يؤكدوا السنتر: ${pulse.students.unconfirmedCenterCount}`,
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
      `📉 أصعب اختبار مؤخراً: "${pulse.academics.lowestAvgQuiz7Days.title}" بمتوسط ${pulse.academics.lowestAvgQuiz7Days.avgScore}%`,
    );
  }
  if (pulse.operations.googleSheetConfigured) {
    lines.push(
      `📄 مزامنة Google Sheets: مفعلة (${pulse.operations.googleSheetLastSyncStatus || "جاهزة"})`,
    );
  }

  return lines.join("\n");
}

async function callGeminiWithFallback(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
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
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1600,
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

async function gatherTargetedQueryContext(question: string): Promise<string> {
  const clean = question.trim();
  if (!clean) return "";

  const snippets: string[] = [];
  // Extract Arabic/Latin keywords > 2 chars (excluding common words)
  const stopWords = new Set(["ما", "من", "في", "على", "عن", "هل", "كم", "اليوم", "الطلاب", "الطالب", "سنتر", "تقرير", "حالة", "اخر", "أخر"]);
  const words = clean
    .replace(/[؟?!.,،"']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .slice(0, 4);

  if (words.length > 0) {
    const conditions = words.flatMap((w) => [
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
        accessCode: studentsTable.accessCode,
        grade: studentsTable.grade,
        centerName: studentsTable.centerName,
        appointmentSlot: studentsTable.appointmentSlot,
        paymentStatus: studentsTable.paymentStatus,
        status: studentsTable.status,
        centerConfirmed: studentsTable.centerConfirmed,
        lastActiveAt: studentsTable.lastActiveAt,
      })
      .from(studentsTable)
      .where(or(...conditions))
      .limit(12);

    if (matchedStudents.length > 0) {
      snippets.push(`نتائج مطابقة من جدول الطلاب:\n${JSON.stringify(matchedStudents, null, 2)}`);
    }
  }

  return snippets.join("\n\n");
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
    "اكتب تقرير متابعة احترافي ومباشر باللغة العربية الواضحة (مناسب للقراءة السريعة على الموبايل وتليجرام).",
    "اعتمد حصراً على الأرقام والأسماء الموجودة في البيانات المرفقة، ولا تخترع أي أرقام.",
    "قسّم التقرير بوضوح إلى: 1) ملخص سريع 2) أهم ما يحتاج تدخل فوري من د. محمود 3) حالة السناتر والحضور 4) حالة الاختبارات والمحتوى 5) توصيات عملية لليوم.",
  ].join(" ");

  const prompt = [
    options.customFocus ? `تركيز مطلوب: ${options.customFocus}` : "أعد التقرير التشغيلي الشامل الحالي للمنصة.",
    "",
    "البيانات اللحظية الدقيقة من قاعدة البيانات:",
    JSON.stringify(pulse),
  ].join("\n");

  const aiResult = await callGeminiWithFallback(apiKey, systemInstruction, prompt);
  const summary = aiResult?.text || buildDeterministicSummary(pulse);

  let sentToTelegram = false;
  let telegramError: string | null = null;
  if (options.sendToTelegram) {
    const tg = await resolveTelegramCredentials(cfg);
    if (tg.enabled) {
      const tgRes = await sendTelegramMonitorMessage(tg.botToken, tg.chatId, summary);
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
    "تجاوب باللغة العربية بشكل دقيق ومختصر ومفيد، وتعتمد فقط على بيانات قاعدة البيانات الفعلية المقدمة لك.",
    "إذا سألك الدكتور عن مشكلة أو طالب أو سنتر أو حسابات، اعرض الأرقام والأسماء الحقيقية، واذكر الخطوة العملية التالية.",
    "تجنب إطالة المقدمات، وركز على الإجابة الدقيقة.",
  ].join(" ");

  const historyText = Array.isArray(history) && history.length > 0
    ? history
        .slice(-6)
        .map((m) => `${m.role === "user" ? "د. محمود" : "المساعد"}: ${m.text}`)
        .join("\n")
    : "";

  const prompt = [
    historyText ? `سياق الحوار السابق:\n${historyText}\n` : "",
    `سؤال د. محمود الآن: ${question}`,
    "",
    "ملخص قاعدة البيانات الحالي:",
    JSON.stringify(pulse),
    extraContext ? `\nبيانات تفصيلية مطابقة للسؤال:\n${extraContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const aiResult = await callGeminiWithFallback(apiKey, systemInstruction, prompt);
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
 * 1) Watches for new receipts, bookings, new student signups, recovery requests, and essay submissions
 * 2) Fires instant real-time alerts to Admin Monitor feed & Telegram Bot
 * 3) Sends scheduled daily executive AI report at configured Cairo time
 */
export async function runMonitorAgentSchedulerTick(): Promise<void> {
  if (isMonitorTickRunning) return;
  isMonitorTickRunning = true;

  try {
    const cfg = await getMonitorConfig();
    if (!cfg.enabled) return;

    const tg = await resolveTelegramCredentials(cfg);

    // 1. Real-time Delta Alerts
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
        .select({ id: codeRecoveryRequestsTable.id, studentId: codeRecoveryRequestsTable.studentId })
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

    const wm = await getWatermark();
    if (!wm) {
      await saveWatermark({
        lastReceiptId: curMaxReceiptId,
        lastBookingId: curMaxBookingId,
        lastStudentId: curMaxStudentId,
        lastRecoveryId: curMaxRecoveryId,
        lastEssaySubmissionId: curMaxEssayId,
        lastSheetErrorSignature: currentSheetError,
        alertedExpiringDate: "",
        initializedAt: new Date().toISOString(),
      });
    } else {
      const alertLines: string[] = [];

      if (cfg.alertOnNewReceipt && curMaxReceiptId > wm.lastReceiptId) {
        const diff = curMaxReceiptId - wm.lastReceiptId;
        const r = latestReceiptRows[0];
        alertLines.push(
          `💳 إيصال دفع جديد (${diff > 1 ? `${diff} إيصالات، آخرهم` : "الطالب"}: ${r?.name || "طالب"} - ${r?.phone || ""})`,
        );
      }

      if (cfg.alertOnNewBooking && curMaxBookingId > wm.lastBookingId) {
        const b = latestBookingRows[0];
        alertLines.push(`📅 طلب حجز جديد من الموقع: ${b?.name || ""} (${b?.phone || ""})`);
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
        alertLines.push(`⚠️ تنبيه مزامنة Google Sheets: ${currentSheetError}`);
      }

      const nextWm: MonitorWatermark = {
        ...wm,
        lastReceiptId: Math.max(wm.lastReceiptId, curMaxReceiptId),
        lastBookingId: Math.max(wm.lastBookingId, curMaxBookingId),
        lastStudentId: Math.max(wm.lastStudentId, curMaxStudentId),
        lastRecoveryId: Math.max(wm.lastRecoveryId, curMaxRecoveryId),
        lastEssaySubmissionId: Math.max(wm.lastEssaySubmissionId, curMaxEssayId),
        lastSheetErrorSignature: currentSheetError || wm.lastSheetErrorSignature,
      };

      if (alertLines.length > 0) {
        const msg = `🔔 تنبيه فوري من مراقب المنصة (${getCairoHumanTime()}):\n\n${alertLines.join("\n")}\n\n🔗 لوحة الإدارة: https://drelmahdy.com/admin`;
        let sent = false;
        let tgErr: string | null = null;
        if (tg.enabled) {
          const res = await sendTelegramMonitorMessage(tg.botToken, tg.chatId, msg);
          sent = res.success;
          tgErr = res.error || null;
        }
        await appendMonitorReport({
          id: `alert_${Date.now()}_${randomBytes(3).toString("hex")}`,
          kind: "alert",
          title: alertLines[0].slice(0, 70),
          summary: msg,
          createdAt: new Date().toISOString(),
          sentToTelegram: sent,
          telegramError: tgErr,
          modelUsed: "event-watcher",
        });
      }

      await saveWatermark(nextWm);
    }

    // 2. Scheduled Daily Executive Report (Africa/Cairo)
    if (cfg.dailyReportEnabled) {
      const todayCairo = getCairoDateString();
      const nowHHMM = getCairoTimeHHMM();
      const targetHHMM = cfg.dailyReportTime || "22:00";

      if (cfg.lastDailyReportDate !== todayCairo && nowHHMM >= targetHHMM) {
        // Reserve today first so concurrent ticks cannot duplicate
        await saveMonitorConfig({ ...cfg, lastDailyReportDate: todayCairo });
        await generatePlatformReport({
          kind: "daily",
          sendToTelegram: tg.enabled,
        });
        logger.info({ todayCairo }, "[AI_MONITOR] Daily executive report generated & dispatched");
      }
    }
  } catch (err) {
    logger.warn({ err }, "[AI_MONITOR] Tick execution error");
  } finally {
    isMonitorTickRunning = false;
  }
}

export function verifyWebhookSecret(supplied: string, expected: string): boolean {
  if (!supplied || !expected) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleTelegramWebhookUpdate(update: any): Promise<void> {
  const msg = update?.message || update?.edited_message;
  const chatId = msg?.chat?.id ? String(msg.chat.id) : "";
  const text = typeof msg?.text === "string" ? msg.text.trim() : "";
  if (!chatId || !text) return;

  const cfg = await getMonitorConfig();
  const tg = await resolveTelegramCredentials(cfg);
  if (!tg.botToken) return;

  // Strict authorization: only allow messages from the configured admin chatId (or allow /myid diagnostic reply with ID only)
  if (text === "/myid" || text === "/id") {
    await sendTelegramMonitorMessage(
      tg.botToken,
      chatId,
      `معرف الشات الخاص بك (Chat ID):\n${chatId}`,
    );
    return;
  }

  if (!tg.chatId || chatId !== tg.chatId) {
    logger.warn({ incomingChatId: chatId }, "[AI_MONITOR] Rejected unauthorized Telegram chat message");
    return;
  }

  let reply = "";
  const cmd = text.split(/\s+/)[0].toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    reply = [
      "🤖 مرحباً د. محمود — أنا الوكيل الذكي لمراقبة منصتك.",
      "",
      "الأوامر السريعة:",
      "/today — التقرير الفوري لليوم بالذكاء الاصطناعي",
      "/absent — كشف غياب اليوم والغياب المتكرر",
      "/pending — الإيصالات والحجوزات والتلخيصات المعلقة",
      "/exams — أداء الاختبارات خلال 7 أيام",
      "/audit — آخر تحركات المساعدين خلال 24 ساعة",
      "",
      "💬 كما يمكنك كتابة أي سؤال مباشر بالعربي وسأبحث في قاعدة البيانات وأرد عليك فوراً.",
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
      ...(pulse.attendanceToday.absentNamesToday.length > 0
        ? [`قائمة غياب اليوم (أول 20):`, ...pulse.attendanceToday.absentNamesToday.map((n) => `• ${n}`)]
        : ["لا توجد حالات غياب مسجلة اليوم حتى الآن."]),
      "",
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
      ...pulse.financeAndActions.pendingReceiptsLatest.map(
        (r) => `   - ${r.studentName} (${r.phone})`,
      ),
      `• طلبات حجز جديدة: ${pulse.financeAndActions.pendingBookingsCount}`,
      ...pulse.financeAndActions.pendingBookingsLatest.map(
        (b) => `   - ${b.name} (${b.phone})`,
      ),
      `• طلبات استعادة كود: ${pulse.financeAndActions.pendingRecoveryRequests}`,
      `• تلخيصات بانتظار المراجعة: ${pulse.financeAndActions.pendingSummaries}`,
      `• امتحانات مقالية بانتظار التصحيح: ${pulse.financeAndActions.pendingEssaySubmissions}`,
      `• اشتراكات تنتهي خلال 3 أيام: ${pulse.financeAndActions.expiringSubscriptionsNext3Days}`,
    ].join("\n");
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
    const cleanQuestion = text.replace(/^\/ask\s+/i, "").trim();
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

  if (reply) {
    await sendTelegramMonitorMessage(tg.botToken, chatId, reply);
  }
}
