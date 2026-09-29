import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAdmin } from "../../middleware/auth";
import {
  getAutoExamFullConfig,
  saveAutoExamFullConfig,
  generateDraftExamForSchedule,
  sendExamToTelegram,
  sendExamToWhatsApp,
  approveAndPublishQuiz,
  isValidApprovalToken,
  type AutoExamSchedule,
  type AutoExamFullConfig,
  type AutoExamChannelsConfig,
} from "../../services/auto-exam";

const router: IRouter = Router();

// ── Auto-Exam Multi-Schedule Generator & Notification Endpoints ──

// GET /api/admin/learning/auto-exam/config - Get full configuration (channels + all schedules)
router.get(["/admin/learning/auto-exam/config", "/admin/learning/auto-exam/settings"], requireAdmin, async (_req, res, next) => {
  try {
    const config = await getAutoExamFullConfig();
    res.json({ success: true, ...config });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/learning/auto-exam/channels - Update notification channels (Telegram & WhatsApp)
router.put("/admin/learning/auto-exam/channels", requireAdmin, async (req, res, next) => {
  try {
    const config = await getAutoExamFullConfig();
    const updatedChannels: AutoExamChannelsConfig = {
      telegram: {
        ...config.channels.telegram,
        ...(req.body.telegram || {}),
      },
      whatsapp: {
        ...config.channels.whatsapp,
        ...(req.body.whatsapp || {}),
      },
    };

    const newConfig: AutoExamFullConfig = {
      ...config,
      channels: updatedChannels,
    };

    await saveAutoExamFullConfig(newConfig);
    res.json({ success: true, channels: updatedChannels });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/auto-exam/schedules - Create a new schedule
router.post("/admin/learning/auto-exam/schedules", requireAdmin, async (req, res, next) => {
  try {
    const config = await getAutoExamFullConfig();
    const title = String(req.body.title || "").trim();
    if (!title) {
      res.status(400).json({ error: "اسم الجدول مطلوب" });
      return;
    }

    const newSchedule: AutoExamSchedule = {
      id: "sched_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      title,
      enabled: req.body.enabled !== false,
      timeOfDay: req.body.timeOfDay || "08:00",
      stage: req.body.stage || "all",
      unit: req.body.unit || "all",
      lesson: req.body.lesson || "all",
      courseId: req.body.courseId ? Number(req.body.courseId) : null,
      questionsCount: Math.max(1, Number(req.body.questionsCount) || 10),
      durationMinutes: Math.max(0, Number(req.body.durationMinutes) || 20),
      passingScore: Math.max(10, Math.min(100, Number(req.body.passingScore) || 60)),
      difficultyDistribution: {
        easy: Number(req.body.difficultyDistribution?.easy) || 3,
        medium: Number(req.body.difficultyDistribution?.medium) || 5,
        hard: Number(req.body.difficultyDistribution?.hard) || 2,
      },
    };

    const newConfig: AutoExamFullConfig = {
      ...config,
      schedules: [...config.schedules, newSchedule],
    };

    await saveAutoExamFullConfig(newConfig);
    res.json({ success: true, schedule: newSchedule, schedules: newConfig.schedules });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/learning/auto-exam/schedules/:id - Update an existing schedule
router.put("/admin/learning/auto-exam/schedules/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = await getAutoExamFullConfig();
    const scheduleIdx = config.schedules.findIndex((s) => s.id === id);

    if (scheduleIdx === -1) {
      res.status(404).json({ error: "الجدول غير موجود" });
      return;
    }

    const existing = config.schedules[scheduleIdx];
    const updatedSchedule: AutoExamSchedule = {
      ...existing,
      ...(req.body || {}),
      id: existing.id, // prevent ID change
      difficultyDistribution: {
        ...existing.difficultyDistribution,
        ...(req.body.difficultyDistribution || {}),
      },
    };

    const updatedSchedules = [...config.schedules];
    updatedSchedules[scheduleIdx] = updatedSchedule;

    const newConfig: AutoExamFullConfig = {
      ...config,
      schedules: updatedSchedules,
    };

    await saveAutoExamFullConfig(newConfig);
    res.json({ success: true, schedule: updatedSchedule, schedules: updatedSchedules });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/learning/auto-exam/schedules/:id - Delete a schedule
router.delete("/admin/learning/auto-exam/schedules/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = await getAutoExamFullConfig();
    const updatedSchedules = config.schedules.filter((s) => s.id !== id);

    const newConfig: AutoExamFullConfig = {
      ...config,
      schedules: updatedSchedules,
    };

    await saveAutoExamFullConfig(newConfig);
    res.json({ success: true, schedules: updatedSchedules });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/learning/auto-exam/schedules/:id/trigger - Trigger immediate test generation for a specific schedule
router.post(
  ["/admin/learning/auto-exam/schedules/:id/trigger", "/admin/learning/auto-exam/trigger"],
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const config = await getAutoExamFullConfig();

      let targetSchedule: AutoExamSchedule | undefined;
      if (id) {
        targetSchedule = config.schedules.find((s) => s.id === id);
      }
      if (!targetSchedule) {
        // Fallback to first schedule or create temporary one from payload
        targetSchedule = config.schedules[0] || {
          id: "sched_manual",
          title: "اختبار تجريبي فوري",
          enabled: true,
          timeOfDay: "08:00",
          stage: req.body.stage || "all",
          unit: req.body.unit || "all",
          lesson: req.body.lesson || "all",
          courseId: req.body.courseId || null,
          questionsCount: req.body.questionsCount || 10,
          durationMinutes: req.body.durationMinutes || 20,
          passingScore: req.body.passingScore || 60,
          difficultyDistribution: req.body.difficultyDistribution || { easy: 3, medium: 5, hard: 2 },
        };
      }

      // Allow runtime overrides if passed in body
      const effectiveSchedule: AutoExamSchedule = {
        ...targetSchedule,
        ...(req.body || {}),
        difficultyDistribution: {
          ...targetSchedule.difficultyDistribution,
          ...(req.body.difficultyDistribution || {}),
        },
      };

      const result = await generateDraftExamForSchedule(effectiveSchedule, config.channels);
      let telegramResult = null;
      let whatsappResult = null;

      if (
        config.channels.telegram.enabled &&
        config.channels.telegram.botToken &&
        config.channels.telegram.chatId
      ) {
        telegramResult = await sendExamToTelegram(
          config.channels.telegram.botToken,
          config.channels.telegram.chatId,
          result.quiz,
          result.approvalToken,
          result.messageText,
        );
      }

      if (config.channels.whatsapp.enabled && config.channels.whatsapp.webhookUrl) {
        whatsappResult = await sendExamToWhatsApp(
          config.channels.whatsapp.webhookUrl,
          config.channels.whatsapp.phoneNumber,
          result.messageText,
        );
      }

      res.json({
        success: true,
        quiz: result.quiz,
        scheduleTitle: effectiveSchedule.title,
        courseTitle: result.courseTitle,
        stageName: result.stageName,
        unitName: result.unitName,
        lessonName: result.lessonName,
        approvalToken: result.approvalToken,
        approvalUrl: `https://drelmahdy.com/api/admin/learning/quizzes/${result.quiz.id}/quick-approve?token=${result.approvalToken}`,
        telegramResult,
        whatsappResult,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "فشل توليد الاختبار التجريبي" });
    }
  },
);

// GET /api/admin/learning/quizzes/:id/quick-approve - One-click approval link from Telegram / WhatsApp
router.get(["/admin/learning/quizzes/:id/quick-approve", "/learning/quizzes/:id/quick-approve"], async (req, res, next) => {
  try {
    const quizId = Number(req.params.id);
    const token = String(req.query.token || "");

    if (!Number.isInteger(quizId) || quizId <= 0 || !token) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>خطأ في الطلب</title><style>body{font-family:sans-serif;background:#0b1329;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;} .card{background:#111e38;padding:32px;border-radius:24px;text-align:center;max-width:400px;border:1px solid #334155;}</style></head>
        <body><div class="card"><h1 style="color:#ef4444;">❌ رابط غير صالح</h1><p style="color:#94a3b8;">الرابط أو رمز التحقق غير سليم.</p></div></body>
        </html>
      `);
      return;
    }

    const valid = isValidApprovalToken(quizId, token);
    if (!valid) {
      res.status(403).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>انتهت صلاحية الرابط</title><style>body{font-family:sans-serif;background:#0b1329;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;} .card{background:#111e38;padding:32px;border-radius:24px;text-align:center;max-width:420px;border:1px solid #334155;}</style></head>
        <body><div class="card"><h1 style="color:#f59e0b;">⏳ انتهت صلاحية الرابط</h1><p style="color:#94a3b8;">عذراً، هذا الرابط منتهي الصلاحية أو تم استخدامه سابقاً (صلاحية الروابط 72 ساعة). يمكنك الاعتماد من لوحة التحكم مباشرة.</p><a href="/admin" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px;">الذهاب للوحة التحكم</a></div></body>
        </html>
      `);
      return;
    }

    const result = await approveAndPublishQuiz(quizId);
    const quiz = result.quiz;
    const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

    res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تم اعتماد ونشر الاختبار بنجاح</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1329; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #111e38; border: 1px solid #1e293b; border-radius: 24px; padding: 32px; max-width: 460px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .badge { width: 72px; height: 72px; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 20px; color: #10b981; font-size: 36px; }
          h1 { font-size: 20px; font-weight: 900; margin-bottom: 8px; color: #fff; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
          .info { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: right; font-size: 13px; }
          .info div { margin-bottom: 8px; display: flex; justify-content: space-between; }
          .btn { display: inline-block; width: 100%; background: #2563eb; color: #fff; font-weight: 800; font-size: 15px; padding: 14px 0; border-radius: 16px; text-decoration: none; transition: background 0.2s; box-sizing: border-box; }
          .btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h1>تم اعتماد ونشر الاختبار بنجاح!</h1>
          <p>${result.alreadyPublished ? "هذا الاختبار كان معتمداً ومنشوراً بالفعل سابقاً." : "تم تفعيل الاختبار ونشره الآن لجميع الطلاب المؤهلين في الكورس، وتم إرسال إشعارات المنصة إليهم بنجاح."}</p>
          <div class="info">
            <div><span style="color:#94a3b8;">عنوان الاختبار:</span> <strong style="color:#fff;">${quiz.title}</strong></div>
            <div><span style="color:#94a3b8;">عدد الأسئلة:</span> <strong style="color:#10b981;">${qCount} سؤال</strong></div>
            <div><span style="color:#94a3b8;">الطلاب المستهدفين:</span> <strong style="color:#38bdf8;">${result.notifiedCount} طالب</strong></div>
          </div>
          <a href="/platform?tab=exams" class="btn">الانتقال للمنصة ومعاينة الاختبار ↗</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
});

router.get(["/learning/honor-board", "/honor-board"], async (req, res, next) => {
  try {
    const track = typeof req.query.track === "string" ? req.query.track.trim().toLowerCase() : "all";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));

    let trackFilter = "";
    let quizTrackFilter = "";
    if (track === "general" || track === "arabic" || track === "عام" || track === "عربي") {
      trackFilter = "WHERE track_group = 'general'";
      quizTrackFilter = "AND NOT (q.stage ILIKE '%لغات%' OR q.stage ILIKE '%languages%' OR q.title ILIKE '%لغات%' OR q.title ILIKE '%languages%')";
    } else if (track === "languages" || track === "language" || track === "لغات") {
      trackFilter = "WHERE track_group = 'languages'";
      quizTrackFilter = "AND (q.stage ILIKE '%لغات%' OR q.stage ILIKE '%languages%' OR q.title ILIKE '%لغات%' OR q.title ILIKE '%languages%')";
    }

    let searchFilter = "";
    if (search) {
      const cleanSearch = search.replace(/'/g, "''");
      searchFilter = trackFilter ? `AND (student_name ILIKE '%${cleanSearch}%')` : `WHERE (student_name ILIKE '%${cleanSearch}%')`;
    }

    const minQuizzes = typeof req.query.min_quizzes === "string" ? Math.max(1, parseInt(req.query.min_quizzes)) : 5;

    const query = `
      WITH best_attempts AS (
          SELECT 
              qa.student_id,
              qa.quiz_id,
              q.title as quiz_title,
              q.stage as quiz_stage,
              MAX(qa.score) as best_score,
              BOOL_OR(qa.passed) as ever_passed,
              MAX(qa.created_at) as latest_attempt_at,
              COUNT(qa.id) as attempts_count
          FROM quiz_attempts qa
          JOIN quizzes q ON qa.quiz_id = q.id
          WHERE q.is_published = true ${quizTrackFilter}
          GROUP BY qa.student_id, qa.quiz_id, q.title, q.stage
      ),
      student_stats AS (
          SELECT
              ba.student_id,
              COUNT(ba.quiz_id) as quizzes_taken,
              ROUND(AVG(ba.best_score)::numeric, 1) as avg_score,
              MAX(ba.latest_attempt_at) as last_quiz_date,
              json_agg(
                  json_build_object(
                      'quiz_id', ba.quiz_id,
                      'quiz_title', ba.quiz_title,
                      'quiz_stage', ba.quiz_stage,
                      'score', ba.best_score,
                      'passed', ba.ever_passed,
                      'date', ba.latest_attempt_at,
                      'grade_label', CASE 
                          WHEN ba.best_score >= 95 THEN 'امتياز مرتفع'
                          WHEN ba.best_score >= 85 THEN 'ممتاز'
                          WHEN ba.best_score >= 75 THEN 'جيد جداً'
                          WHEN ba.best_score >= 65 THEN 'جيد'
                          ELSE 'مقبول'
                      END
                  ) ORDER BY ba.latest_attempt_at DESC
              ) as quizzes_details
          FROM best_attempts ba
          GROUP BY ba.student_id
          HAVING COUNT(ba.quiz_id) >= ${minQuizzes}
      ),
      classified_students AS (
          SELECT 
              s.id as student_id,
              s.name as student_name,
              s.grade,
              s.learning_mode,
              s.center_name,
              s.avatar_url,
              CASE 
                  WHEN s.grade ILIKE '%لغات%' OR s.grade ILIKE '%languages%' OR COALESCE(s.school_type, '') ILIKE '%languages%' OR COALESCE(s.language_track, '') ILIKE '%لغات%' THEN 'languages'
                  ELSE 'general'
              END as track_group,
              ss.quizzes_taken,
              ss.avg_score,
              ss.last_quiz_date,
              CASE 
                  WHEN ss.avg_score >= 95 THEN 'امتياز مع مرتبة الشرف'
                  WHEN ss.avg_score >= 85 THEN 'ممتاز'
                  WHEN ss.avg_score >= 75 THEN 'جيد جداً'
                  WHEN ss.avg_score >= 65 THEN 'جيد'
                  ELSE 'مقبول'
              END as overall_grade,
              DENSE_RANK() OVER(PARTITION BY CASE WHEN s.grade ILIKE '%لغات%' OR s.grade ILIKE '%languages%' OR COALESCE(s.school_type, '') ILIKE '%languages%' OR COALESCE(s.language_track, '') ILIKE '%لغات%' THEN 'languages' ELSE 'general' END ORDER BY ss.quizzes_taken DESC, ss.avg_score DESC) as track_rank,
              DENSE_RANK() OVER(ORDER BY ss.quizzes_taken DESC, ss.avg_score DESC) as overall_rank,
              ss.quizzes_details
          FROM student_stats ss
          JOIN students s ON ss.student_id = s.id
          WHERE s.status = 'approved'
      )
      SELECT *
      FROM classified_students
      ${trackFilter}
      ${searchFilter}
      ORDER BY quizzes_taken DESC, avg_score DESC, last_quiz_date DESC
      LIMIT ${limit};
    `;

    const result = await db.execute(sql.raw(query));
    const students = Array.isArray(result) ? result : (result as any)?.rows || [];

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT qa.student_id) as total_active_students,
        COUNT(DISTINCT CASE WHEN (s.grade ILIKE '%لغات%' OR s.grade ILIKE '%languages%' OR COALESCE(s.school_type, '') ILIKE '%languages%' OR COALESCE(s.language_track, '') ILIKE '%لغات%') THEN qa.student_id END) as languages_students,
        COUNT(DISTINCT CASE WHEN NOT (s.grade ILIKE '%لغات%' OR s.grade ILIKE '%languages%' OR COALESCE(s.school_type, '') ILIKE '%languages%' OR COALESCE(s.language_track, '') ILIKE '%لغات%') THEN qa.student_id END) as general_students,
        COUNT(qa.id) as total_attempts,
        ROUND(AVG(qa.score)::numeric, 1) as overall_avg_score
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN students s ON qa.student_id = s.id
      WHERE q.is_published = true AND s.status = 'approved';
    `;
    const statsResult = await db.execute(sql.raw(statsQuery));
    const statsRow = Array.isArray(statsResult) ? statsResult[0] : (statsResult as any)?.rows?.[0] || {};

    res.json({
      success: true,
      stats: {
        totalStudents: Number(statsRow?.total_active_students || 0),
        generalStudents: Number(statsRow?.general_students || 0),
        languagesStudents: Number(statsRow?.languages_students || 0),
        totalAttempts: Number(statsRow?.total_attempts || 0),
        overallAvgScore: Number(statsRow?.overall_avg_score || 0),
      },
      students,
    });
  } catch (error) {
    next(error);
  }
});


export default router;
