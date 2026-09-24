import webpush from "web-push";
import { db, pushSubscriptionsTable, studentsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BGFL4X-Jh191lcTAvMBRH_kpcnX8t1q5RYTiJdTPcondkDV5t6qd5DnDztmNeNqCvllC3cO-sXerLqrlt95D97o";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "8gm9gP9_ajtEQPzm8kukr0BSF0Z9AtkpXaP8o8bXkps";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@drelmahdy.com";

// Configure web-push with VAPID details
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error("[WebPush] Failed to initialize VAPID details:", e);
}

// Ensure database table exists on initialization
let tableInitialized = false;
export async function ensurePushSubscriptionsTable() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_student ON push_subscriptions(student_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
    `);
    tableInitialized = true;
  } catch (err) {
    console.error("[WebPush] Error ensuring push_subscriptions table:", err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

/**
 * Save or update a student's push subscription
 */
export async function savePushSubscription(params: {
  studentId?: number | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  await ensurePushSubscriptionsTable();
  const { studentId, endpoint, p256dh, auth, userAgent } = params;

  try {
    await db
      .insert(pushSubscriptionsTable)
      .values({
        studentId: studentId ?? null,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          studentId: studentId ?? null,
          p256dh,
          auth,
          userAgent: userAgent || null,
          updatedAt: new Date(),
        },
      });
    return true;
  } catch (err) {
    console.error("[WebPush] Failed to save push subscription:", err);
    return false;
  }
}

/**
 * Remove an invalid / expired push subscription
 */
export async function removePushSubscription(endpoint: string) {
  try {
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  } catch (err) {
    console.error("[WebPush] Failed to remove subscription:", err);
  }
}

/**
 * Send a push notification to a single subscriber
 */
async function sendRawPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const formattedPayload = JSON.stringify({
      title: payload.title || "أكاديمية د. محمود المهدي",
      body: payload.body || "لديك إشعار جديد",
      icon: payload.icon || "/web-app-manifest-192x192.png",
      badge: payload.badge || "/favicon-96x96.png",
      url: payload.url || "/platform",
      tag: payload.tag || "drelmahdy-alert",
    });

    await webpush.sendNotification(pushSubscription, formattedPayload);
    return true;
  } catch (error: any) {
    // 404 or 410 means the subscription has expired or unsubscribed
    if (error.statusCode === 404 || error.statusCode === 410) {
      await removePushSubscription(sub.endpoint);
    } else {
      console.error("[WebPush] Error sending notification:", error.message || error);
    }
    return false;
  }
}

/**
 * Send a Web Push notification to a specific student by ID (across all their registered devices)
 */
export async function sendPushToStudent(studentId: number, payload: PushPayload) {
  await ensurePushSubscriptionsTable();
  try {
    const subs = await db
      .select({
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
      })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.studentId, studentId));

    if (!subs.length) return { sent: 0 };

    const results = await Promise.allSettled(subs.map((s) => sendRawPush(s, payload)));
    const successful = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return { sent: successful };
  } catch (err) {
    console.error("[WebPush] sendPushToStudent failed:", err);
    return { sent: 0 };
  }
}

/**
 * Send a Web Push notification to all active students (e.g. general broadcast, new course, new quiz)
 * Even if their browser or device is currently closed!
 */
export async function sendPushToAllStudents(
  payload: PushPayload,
  targetGrade?: string
) {
  await ensurePushSubscriptionsTable();
  try {
    let targetStudentIds: number[] | null = null;

    if (targetGrade && targetGrade !== "all") {
      const matchingStudents = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.grade, targetGrade));
      targetStudentIds = matchingStudents.map((s) => s.id);
      if (!targetStudentIds.length) return { sent: 0 };
    }

    const query = db
      .select({
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
      })
      .from(pushSubscriptionsTable);

    const subs = targetStudentIds
      ? await query.where(inArray(pushSubscriptionsTable.studentId, targetStudentIds))
      : await query;

    if (!subs.length) return { sent: 0 };

    const results = await Promise.allSettled(subs.map((s) => sendRawPush(s, payload)));
    const successful = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return { sent: successful };
  } catch (err) {
    console.error("[WebPush] sendPushToAllStudents failed:", err);
    return { sent: 0 };
  }
}
