import { Router, type IRouter } from "express";
import { db, videosTable } from "@workspace/db";
import { CreateVideoBody, UpdateVideoBody } from "@workspace/api-zod";
import { requireAdmin, isAdminRequest } from "../middleware/auth";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// List all videos and playlists with gating logic
router.get("/videos", async (req, res, next) => {
  try {
    const videos = await db
      .select()
      .from(videosTable)
      .orderBy(asc(videosTable.order));

    const isAdmin = isAdminRequest(req);

    if (isAdmin) {
      // Admins see everything including raw access keys
      res.json(videos);
      return;
    }

    // 1. Group videos by category to find the first video of each category
    const videosByCategory: Record<string, typeof videos> = {};
    for (const v of videos) {
      if (!videosByCategory[v.category]) {
        videosByCategory[v.category] = [];
      }
      videosByCategory[v.category].push(v);
    }

    // 2. Determine the first video ID for each category (lowest order, then lowest id)
    const firstVideoIds = new Set<number>();
    for (const cat in videosByCategory) {
      const list = videosByCategory[cat];
      list.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.id - b.id;
      });
      if (list.length > 0) {
        firstVideoIds.add(list[0].id);
      }
    }

    // 3. Parse student's unlocked keys from x-unlock-keys header
    const unlockKeysHeader = (req.headers["x-unlock-keys"] as string || "").toLowerCase();
    const studentKeys = unlockKeysHeader
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    // 4. Return masked videos to the student
    const studentVideos = videos.map((v) => {
      const isFirstVideo = firstVideoIds.has(v.id);
      const isUnlocked =
        !v.isProtected ||
        isFirstVideo ||
        (v.accessKey && studentKeys.includes(v.accessKey.toLowerCase().trim()));

      return {
        id: v.id,
        category: v.category,
        title: v.title,
        description: v.description,
        youtubeUrl: isUnlocked ? v.youtubeUrl : "locked",
        type: v.type,
        order: v.order,
        isProtected: v.isProtected,
        accessKey: null, // Never leak access key to clients!
        createdAt: v.createdAt,
      };
    });

    res.json(studentVideos);
  } catch (error) {
    next(error);
  }
});

// Create video (Admin only)
router.post("/videos", requireAdmin, async (req, res, next) => {
  try {
    const validated = CreateVideoBody.parse(req.body);
    const [inserted] = await db
      .insert(videosTable)
      .values({
        category: validated.category,
        title: validated.title,
        description: validated.description ?? null,
        youtubeUrl: validated.youtubeUrl,
        type: validated.type,
        order: validated.order ?? 0,
        isProtected: validated.isProtected ?? false,
        accessKey: validated.accessKey ?? null,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (error) {
    next(error);
  }
});

// Update video (Admin only)
router.put("/videos/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const validated = UpdateVideoBody.parse(req.body);

    const [updated] = await db
      .update(videosTable)
      .set({
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.youtubeUrl !== undefined && { youtubeUrl: validated.youtubeUrl }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.order !== undefined && { order: validated.order }),
        ...(validated.isProtected !== undefined && { isProtected: validated.isProtected }),
        ...(validated.accessKey !== undefined && { accessKey: validated.accessKey }),
      })
      .where(eq(videosTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Video entry not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete video (Admin only)
router.delete("/videos/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db
      .delete(videosTable)
      .where(eq(videosTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Video entry not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
