import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List all settings (public)
router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await db.select().from(siteSettingsTable);
    // Convert array to an object: { key: value }
    const formatted = settings.reduce((acc, curr) => {
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
      [result] = await db.update(siteSettingsTable)
        .set({ value, type: type || existing[0].type })
        .where(eq(siteSettingsTable.key, key))
        .returning();
    } else {
      [result] = await db.insert(siteSettingsTable)
        .values({ key, value, type: type || "text" })
        .returning();
    }

    res.json(result);
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
    for (const item of settings) {
      if (!item.key) continue;
      
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, item.key));
      if (existing.length > 0) {
        const [updated] = await db.update(siteSettingsTable)
          .set({ value: item.value, type: item.type || existing[0].type })
          .where(eq(siteSettingsTable.key, item.key))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await db.insert(siteSettingsTable)
          .values({ key: item.key, value: item.value, type: item.type || "text" })
          .returning();
        results.push(inserted);
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;
