import { Router, type Request } from "express";
import { requireAdmin, requireSuperAdmin } from "../middleware/auth";
import {
  askMonitorAgent,
  collectPlatformPulse,
  DEFAULT_TELEGRAM_KEYBOARD,
  deleteMonitorReportById,
  generatePlatformReport,
  getEffectiveGeminiApiKey,
  getLastDailyReportTimestamp,
  getMonitorBotStatus,
  getMonitorConfig,
  getMonitorReportsHistory,
  handleTelegramWebhookUpdate,
  resolveTelegramCredentials,
  saveMonitorConfig,
  sendTelegramMonitorMessage,
  verifyWebhookSecret,
} from "../services/ai-monitor-agent";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/monitor/state - Superadmin only dashboard state
router.get("/admin/monitor/state", requireAdmin, requireSuperAdmin, async (_req: Request, res, next) => {
  try {
    const [cfg, pulse, reports, lastDailyReportDate] = await Promise.all([
      getMonitorConfig(),
      collectPlatformPulse(),
      getMonitorReportsHistory(),
      getLastDailyReportTimestamp(),
    ]);
    const [tg, botStatus] = await Promise.all([
      resolveTelegramCredentials(cfg),
      getMonitorBotStatus(cfg),
    ]);
    const hasGeminiKey = Boolean(getEffectiveGeminiApiKey(cfg));

    res.json({
      success: true,
      config: {
        enabled: cfg.enabled,
        dailyReportEnabled: cfg.dailyReportEnabled,
        dailyReportTime: cfg.dailyReportTime,
        alertOnNewReceipt: cfg.alertOnNewReceipt,
        alertOnNewBooking: cfg.alertOnNewBooking,
        alertOnNewStudent: cfg.alertOnNewStudent,
        alertOnRepeatAbsence: cfg.alertOnRepeatAbsence,
        alertOnExpiringSubscriptions: cfg.alertOnExpiringSubscriptions,
        telegramEnabled: cfg.telegramEnabled,
        useAutoExamBot: cfg.useAutoExamBot,
        hasCustomBotToken: Boolean(cfg.telegramBotToken),
        telegramChatId: cfg.telegramChatId,
        resolvedTelegramSource: tg.source,
        resolvedTelegramChatId: tg.chatId ? `***${tg.chatId.slice(-4)}` : null,
        hasResolvedTelegram: tg.enabled,
        hasGeminiKey,
        hasGeminiKeyOverride: Boolean(cfg.geminiKeyOverride),
        webhookRegisteredUrl: botStatus.webhookUrl || cfg.webhookRegisteredUrl,
        botUsername: botStatus.botUsername,
        botConnected: botStatus.connected,
        lastDailyReportDate,
      },
      pulse,
      reports,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/monitor/config - Update monitor & Telegram configuration (Superadmin only)
router.put("/admin/monitor/config", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    const current = await getMonitorConfig();
    const b = req.body || {};

    const nextCfg = {
      ...current,
      enabled: typeof b.enabled === "boolean" ? b.enabled : current.enabled,
      dailyReportEnabled: typeof b.dailyReportEnabled === "boolean" ? b.dailyReportEnabled : current.dailyReportEnabled,
      dailyReportTime:
        typeof b.dailyReportTime === "string" && /^\d{2}:\d{2}$/.test(b.dailyReportTime.trim())
          ? b.dailyReportTime.trim()
          : current.dailyReportTime,
      alertOnNewReceipt: typeof b.alertOnNewReceipt === "boolean" ? b.alertOnNewReceipt : current.alertOnNewReceipt,
      alertOnNewBooking: typeof b.alertOnNewBooking === "boolean" ? b.alertOnNewBooking : current.alertOnNewBooking,
      alertOnNewStudent: typeof b.alertOnNewStudent === "boolean" ? b.alertOnNewStudent : current.alertOnNewStudent,
      alertOnRepeatAbsence: typeof b.alertOnRepeatAbsence === "boolean" ? b.alertOnRepeatAbsence : current.alertOnRepeatAbsence,
      alertOnExpiringSubscriptions:
        typeof b.alertOnExpiringSubscriptions === "boolean"
          ? b.alertOnExpiringSubscriptions
          : current.alertOnExpiringSubscriptions,
      telegramEnabled: typeof b.telegramEnabled === "boolean" ? b.telegramEnabled : current.telegramEnabled,
      useAutoExamBot: typeof b.useAutoExamBot === "boolean" ? b.useAutoExamBot : current.useAutoExamBot,
      telegramBotToken:
        typeof b.telegramBotToken === "string" && b.telegramBotToken.trim()
          ? b.telegramBotToken.trim()
          : b.clearCustomBotToken === true
            ? ""
            : current.telegramBotToken,
      telegramChatId:
        typeof b.telegramChatId === "string" ? b.telegramChatId.trim() : current.telegramChatId,
      geminiKeyOverride:
        typeof b.geminiKeyOverride === "string" && b.geminiKeyOverride.trim()
          ? b.geminiKeyOverride.trim()
          : b.clearGeminiKeyOverride === true
            ? undefined
            : current.geminiKeyOverride,
    };

    await saveMonitorConfig(nextCfg);
    const tg = await resolveTelegramCredentials(nextCfg);

    res.json({
      success: true,
      hasResolvedTelegram: tg.enabled,
      resolvedTelegramSource: tg.source,
      hasGeminiKey: Boolean(getEffectiveGeminiApiKey(nextCfg)),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/monitor/run-report - Generate executive AI report now
router.post("/admin/monitor/run-report", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    const sendToTelegram = Boolean(req.body?.sendToTelegram);
    const customFocus = typeof req.body?.focus === "string" ? req.body.focus.trim().slice(0, 300) : undefined;
    const report = await generatePlatformReport({
      kind: "manual",
      sendToTelegram,
      customFocus,
    });
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/monitor/reports/:id? - Delete single or clear all reports
router.delete("/admin/monitor/reports/:id", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    await deleteMonitorReportById(String(req.params.id || ""));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/monitor/reports", requireAdmin, requireSuperAdmin, async (_req: Request, res, next) => {
  try {
    await deleteMonitorReportById();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/monitor/chat - Interactive AI Q&A with live DB context
router.post("/admin/monitor/chat", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (!question) {
      res.status(400).json({ error: "اكتب سؤالك أولاً" });
      return;
    }
    const history = Array.isArray(req.body?.history) ? req.body.history : undefined;
    const sendToTelegram = Boolean(req.body?.sendToTelegram);

    const result = await askMonitorAgent(question, history);

    let telegramSent = false;
    let telegramError: string | null = null;
    if (sendToTelegram) {
      const cfg = await getMonitorConfig();
      const tg = await resolveTelegramCredentials(cfg);
      if (tg.enabled) {
        const tgRes = await sendTelegramMonitorMessage(
          tg.botToken,
          tg.chatId,
          `💬 سؤال: ${question}\n\n${result.answer}`,
          DEFAULT_TELEGRAM_KEYBOARD,
        );
        telegramSent = tgRes.success;
        telegramError = tgRes.error || null;
      } else {
        telegramError = "بوت تليجرام غير مضبوط";
      }
    }

    res.json({
      success: true,
      answer: result.answer,
      modelUsed: result.modelUsed,
      generatedAt: result.generatedAt,
      telegramSent,
      telegramError,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/monitor/telegram-test - Verify Telegram Bot connection (optionally with unsaved credentials)
router.post("/admin/monitor/telegram-test", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    const cfg = await getMonitorConfig();
    const resolved = await resolveTelegramCredentials(cfg);
    const botToken =
      (typeof req.body?.botToken === "string" && req.body.botToken.trim()) || resolved.botToken;
    const chatId =
      (typeof req.body?.chatId === "string" && req.body.chatId.trim()) || resolved.chatId;

    if (!botToken || !chatId) {
      res.status(400).json({
        error: "لم يتم ضبط Bot Token و Chat ID بعد. أضفهما ثم اضغط اختبار، أو فعّل استيراد بوت الاختبارات اليومية.",
      });
      return;
    }

    const pulse = await collectPlatformPulse();
    const testMsg = [
      "✅ تم ربط وكيل المراقبة الذكي بتليجرام بنجاح!",
      `🏫 إجمالي الطلاب: ${pulse.students.total} | حضور اليوم: ${pulse.attendanceToday.present}`,
      `💳 إيصالات معلقة: ${pulse.financeAndActions.pendingReceiptsCount} | حجوزات معلقة: ${pulse.financeAndActions.pendingBookingsCount}`,
      `🖥️ قاعدة البيانات: ${pulse.systemHealth.dbOk ? "متصلة" : "عطل"} (${pulse.systemHealth.dbLatencyMs}ms)`,
      "",
      "اختر أي أمر من الأزرار بالأسفل أو اكتب سؤالك مباشرة:",
    ].join("\n");

    const result = await sendTelegramMonitorMessage(botToken, chatId, testMsg, DEFAULT_TELEGRAM_KEYBOARD);
    if (!result.success) {
      res.status(502).json({ error: result.error || "فشل الإرسال إلى تليجرام" });
      return;
    }
    res.json({ success: true, message: "تم إرسال رسالة الاختبار مع لوحة الأزرار إلى تليجرام بنجاح ✅" });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/monitor/telegram-webhook-setup - Register 2-way interactive Telegram Webhook + Slash Menu
router.post("/admin/monitor/telegram-webhook-setup", requireAdmin, requireSuperAdmin, async (req: Request, res, next) => {
  try {
    const cfg = await getMonitorConfig();
    const resolved = await resolveTelegramCredentials(cfg);
    const botToken =
      (typeof req.body?.botToken === "string" && req.body.botToken.trim()) || resolved.botToken;
    if (!botToken) {
      res.status(400).json({ error: "يرجى إدخال Telegram Bot Token أولاً" });
      return;
    }

    const webhookUrl = `https://drelmahdy.com/api/monitor/telegram-webhook/${cfg.webhookSecret}`;
    const [whResp, cmdResp] = await Promise.all([
      fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
        }),
      }),
      fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            { command: "today", description: "التقرير الفوري بالذكاء الاصطناعي" },
            { command: "pending", description: "الإيصالات والحجوزات المعلقة" },
            { command: "absent", description: "غياب اليوم والغياب المتكرر" },
            { command: "exams", description: "أداء الاختبارات خلال 7 أيام" },
            { command: "health", description: "صحة السيرفر وقاعدة البيانات" },
            { command: "audit", description: "سجل نشاط المساعدين (24 ساعة)" },
            { command: "menu", description: "عرض أزرار التحكم السريعة" },
          ],
        }),
      }),
    ]);

    const data = (await whResp.json().catch(() => ({}))) as any;
    await cmdResp.json().catch(() => null);

    if (!whResp.ok || !data?.ok) {
      res.status(502).json({ error: data?.description || "فشل تفعيل Webhook على تليجرام" });
      return;
    }

    await saveMonitorConfig({ ...cfg, webhookRegisteredUrl: webhookUrl });
    res.json({
      success: true,
      webhookUrl,
      message: "تم تفعيل الرد التفاعلي وقائمة أوامر تليجرام بنجاح ✅ جرب إرسال /menu في البوت الآن.",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/monitor/telegram-webhook/:secret - Public endpoint verified by secret token
router.post("/monitor/telegram-webhook/:secret", async (req: Request, res) => {
  try {
    const suppliedSecret = String(req.params.secret || "");
    const cfg = await getMonitorConfig();
    if (!verifyWebhookSecret(suppliedSecret, cfg.webhookSecret)) {
      res.status(403).json({ ok: false });
      return;
    }
    res.status(200).json({ ok: true });
    void handleTelegramWebhookUpdate(req.body).catch((err) => {
      logger.warn({ err }, "[AI_MONITOR] Async webhook handling error");
    });
  } catch {
    res.status(200).json({ ok: true });
  }
});

export default router;
