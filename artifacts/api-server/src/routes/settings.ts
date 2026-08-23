import { Router, type IRouter, type Response } from "express";
import { db, siteSettingsTable, studentsTable, studentNotificationsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { eq, or, sql } from "drizzle-orm";

const router: IRouter = Router();

const SENSITIVE_KEYS = new Set(["admin_password_hash", "subadmin_password_hash"]);

interface CenterItem {
  id?: string;
  name: string;
  daysStr?: string;
  timeStr?: string;
  grade?: string;
  area?: string;
}

/**
 * Detect changes in center name, days, or time, and notify all registered students automatically.
 */
async function processCenterChangeNotifications(oldJson?: string | null, newJson?: string | null) {
  if (!newJson) return { notifiedCount: 0, changesCount: 0 };
  try {
    const oldCenters: CenterItem[] = oldJson ? JSON.parse(oldJson) : [];
    const newCenters: CenterItem[] = JSON.parse(newJson);
    if (!Array.isArray(newCenters)) return { notifiedCount: 0, changesCount: 0 };

    let totalNotified = 0;
    let changesCount = 0;

    const oldMap = new Map<string, CenterItem>();
    oldCenters.forEach((c, idx) => {
      const key = c.id || `idx-${idx}`;
      oldMap.set(key, c);
      if (c.name) oldMap.set(c.name.trim(), c);
    });

    for (let i = 0; i < newCenters.length; i++) {
      const newC = newCenters[i];
      const key = newC.id || `idx-${i}`;
      const oldC = oldMap.get(key) || (newC.name ? oldMap.get(newC.name.trim()) : undefined);

      if (!oldC) continue; // New center added, no legacy registered students to notify yet

      const nameChanged = oldC.name && newC.name && oldC.name.trim() !== newC.name.trim();
      const daysChanged = oldC.daysStr && newC.daysStr && oldC.daysStr.trim() !== newC.daysStr.trim();
      const timeChanged = oldC.timeStr && newC.timeStr && oldC.timeStr.trim() !== newC.timeStr.trim();

      if (nameChanged || daysChanged || timeChanged) {
        changesCount++;
        const oldName = oldC.name.trim();
        const newName = newC.name.trim();
        const newSlot = `${newC.daysStr || ""} (الساعة ${newC.timeStr || ""})`.trim();

        // Query students enrolled in this center (matching old or new center name)
        const matchedStudents = await db
          .select({ id: studentsTable.id, name: studentsTable.name, centerName: studentsTable.centerName })
          .from(studentsTable)
          .where(
            or(
              eq(studentsTable.centerName, oldName),
              eq(studentsTable.centerName, newName),
              sql`${studentsTable.centerName} LIKE ${`%${oldName}%`}`
            )
          );

        for (const student of matchedStudents) {
          // Update student record with new center name and appointment slot
          await db
            .update(studentsTable)
            .set({
              centerName: newName,
              appointmentSlot: newSlot,
              updatedAt: new Date(),
            })
            .where(eq(studentsTable.id, student.id));

          let changeMsg = "";
          if (nameChanged && (daysChanged || timeChanged)) {
            changeMsg = `تم تعديل اسم السنتر إلى (${newName}) وتحديث المواعيد لتصبح: ${newC.daysStr || ""} الساعة ${newC.timeStr || ""}.`;
          } else if (nameChanged) {
            changeMsg = `تم تحديث اسم سنترك إلى (${newName}). المواعيد ثابتة كما هي.`;
          } else {
            changeMsg = `تنبيه هام! تم تحديث مواعيد سنتر (${newName}). المواعيد الجديدة هي: ${newC.daysStr || ""} الساعة ${newC.timeStr || ""}. يرجى الحضور في الموعد الجديد.`;
          }

          await db.insert(studentNotificationsTable).values({
            studentId: student.id,
            title: `تغيير في بيانات/مواعيد سنترك 📢`,
            message: changeMsg,
            type: "warning",
          });

          totalNotified++;
        }
      }
    }

    return { notifiedCount: totalNotified, changesCount };
  } catch (err) {
    console.error("Failed to process center change notifications:", err);
    return { notifiedCount: 0, changesCount: 0 };
  }
}

// ── SSE broadcast system ──────────────────────────────────────────────────────
// Keeps track of all active SSE clients listening to /api/settings/stream.
const sseClients = new Set<Response>();

function broadcastSettingsChanged() {
  const data = `event: settings_changed\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Public SSE stream — no auth required (only emits a change signal, no data)
router.get("/settings/stream", (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write("retry: 5000\n\n");
  res.write(`event: connected\ndata: {}\n\n`);

  sseClients.add(res);

  // Keep-alive ping every 25 seconds to prevent proxy timeouts
  const ping = setInterval(() => {
    try { res.write(": keep-alive\n\n"); } catch { /* ignore */ }
  }, 25_000);

  _req.on("close", () => {
    sseClients.delete(res);
    clearInterval(ping);
  });
});

// List all settings — public keys only (no password hashes)
router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await db.select().from(siteSettingsTable);
    const formatted = settings.reduce((acc, curr) => {
      if (SENSITIVE_KEYS.has(curr.key)) return acc;
      acc[curr.key] = { value: curr.value, type: curr.type };
      return acc;
    }, {} as Record<string, any>);
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Update or create a setting (admin only)
router.post("/settings", requireAdmin, async (req, res, next) => {
  try {
    const { key, value, type } = req.body;
    
    if (!key) {
      res.status(400).json({ error: "Missing key field" });
      return;
    }

    // Upsert logic
    const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    
    let result;
    if (existing.length > 0) {
      if (key === "offline_centers_list") {
        await processCenterChangeNotifications(existing[0].value, value);
      }
      [result] = await db.update(siteSettingsTable)
        .set({ value, type: type || existing[0].type })
        .where(eq(siteSettingsTable.key, key))
        .returning();
    } else {
      if (key === "offline_centers_list") {
        await processCenterChangeNotifications(null, value);
      }
      [result] = await db.insert(siteSettingsTable)
        .values({ key, value, type: type || "text" })
        .returning();
    }

    res.json(result);
    broadcastSettingsChanged();
  } catch (error) {
    next(error);
  }
});

// Batch update settings (admin only)
router.put("/settings/batch", requireAdmin, async (req, res, next) => {
  try {
    const { settings } = req.body; // Array of { key, value, type }
    if (!settings || !Array.isArray(settings)) {
      res.status(400).json({ error: "Missing or invalid settings array" });
      return;
    }

    const results = [];
    let notificationSummary = { notifiedCount: 0, changesCount: 0 };

    for (const item of settings) {
      if (!item.key) continue;
      
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, item.key));
      if (existing.length > 0) {
        if (item.key === "offline_centers_list") {
          notificationSummary = await processCenterChangeNotifications(existing[0].value, item.value);
        }
        const [updated] = await db.update(siteSettingsTable)
          .set({ value: item.value, type: item.type || existing[0].type })
          .where(eq(siteSettingsTable.key, item.key))
          .returning();
        results.push(updated);
      } else {
        if (item.key === "offline_centers_list") {
          notificationSummary = await processCenterChangeNotifications(null, item.value);
        }
        const [inserted] = await db.insert(siteSettingsTable)
          .values({ key: item.key, value: item.value, type: item.type || "text" })
          .returning();
        results.push(inserted);
      }
    }

    res.json({ results, notificationSummary });
    broadcastSettingsChanged();
  } catch (error) {
    next(error);
  }
});

export default router;

