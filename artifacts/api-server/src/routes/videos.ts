import { Router, type IRouter } from "express";
import { db, videosTable } from "@workspace/db";
import { CreateVideoBody, UpdateVideoBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// List all videos and playlists
router.get("/videos", async (_req, res, next) => {
  try {
    const videos = await db
      .select()
      .from(videosTable)
      .orderBy(asc(videosTable.order));
    res.json(videos);
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
