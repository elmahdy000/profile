import { Router, type IRouter } from "express";
import { db, podcastsTable } from "@workspace/db";
import { CreatePodcastBody, UpdatePodcastBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List podcasts
router.get("/podcasts", async (_req, res, next) => {
  try {
    const episodes = await db.select().from(podcastsTable);
    const formatted = episodes.map(ep => ({
      id: ep.id,
      title: ep.title,
      desc: ep.desc,
      duration: ep.duration,
      youtubeUrl: ep.youtubeUrl || null,
      audioUrl: ep.audioUrl || null,
      createdAt: ep.createdAt.toISOString(),
    }));
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Create podcast (Admin only)
router.post("/podcasts", requireAdmin, async (req, res, next) => {
  try {
    const validated = CreatePodcastBody.parse(req.body);
    const [inserted] = await db
      .insert(podcastsTable)
      .values({
        title: validated.title,
        desc: validated.desc,
        duration: validated.duration,
        youtubeUrl: validated.youtubeUrl,
        audioUrl: validated.audioUrl,
      })
      .returning();

    res.status(201).json({
      id: inserted.id,
      title: inserted.title,
      desc: inserted.desc,
      duration: inserted.duration,
      youtubeUrl: inserted.youtubeUrl || null,
      audioUrl: inserted.audioUrl || null,
      createdAt: inserted.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Update podcast (Admin only)
router.put("/podcasts/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const validated = UpdatePodcastBody.parse(req.body);

    const [updated] = await db
      .update(podcastsTable)
      .set({
        title: validated.title,
        desc: validated.desc,
        duration: validated.duration,
        youtubeUrl: validated.youtubeUrl,
        audioUrl: validated.audioUrl,
      })
      .where(eq(podcastsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Podcast episode not found" });
      return;
    }

    res.json({
      id: updated.id,
      title: updated.title,
      desc: updated.desc,
      duration: updated.duration,
      youtubeUrl: updated.youtubeUrl || null,
      audioUrl: updated.audioUrl || null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Delete podcast (Admin only)
router.delete("/podcasts/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db
      .delete(podcastsTable)
      .where(eq(podcastsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Podcast episode not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
