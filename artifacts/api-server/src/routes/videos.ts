import { Router, type IRouter } from "express";
import { db, videosTable } from "@workspace/db";
import { CreateVideoBody, UpdateVideoBody } from "@workspace/api-zod";
import { requireAdmin, isAdminRequest } from "../middleware/auth";
import { eq, asc } from "drizzle-orm";
import fs from "fs";
import path from "path";

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

      const isLocalFile = v.youtubeUrl.startsWith("/uploads/");
      const videoSrcUrl = isUnlocked
        ? (isLocalFile ? `/api/videos/${v.id}/stream` : v.youtubeUrl)
        : "locked";

      return {
        id: v.id,
        category: v.category,
        title: v.title,
        description: v.description,
        youtubeUrl: videoSrcUrl,
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

// Stream locally uploaded video files securely using Range Requests
router.get("/videos/:id/stream", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const video = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.id, id))
      .then((rows) => rows[0]);

    if (!video) {
      res.status(404).json({ error: "Video entry not found" });
      return;
    }

    if (!video.youtubeUrl.startsWith("/uploads/")) {
      res.status(400).json({ error: "This video is not locally hosted" });
      return;
    }

    // Determine first free video of each category
    const videos = await db
      .select()
      .from(videosTable)
      .orderBy(asc(videosTable.order));

    const videosByCategory: Record<string, typeof videos> = {};
    for (const v of videos) {
      if (!videosByCategory[v.category]) {
        videosByCategory[v.category] = [];
      }
      videosByCategory[v.category].push(v);
    }

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

    // Check credentials (query keys or header keys)
    const keysHeader = (req.query.keys as string || req.headers["x-unlock-keys"] as string || "").toLowerCase();
    const isFirstVideo = firstVideoIds.has(video.id);
    const studentKeys = keysHeader
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    const isUnlocked =
      !video.isProtected ||
      isFirstVideo ||
      (video.accessKey && studentKeys.includes(video.accessKey.toLowerCase().trim()));

    const isAdmin = isAdminRequest(req);

    if (!isUnlocked && !isAdmin) {
      res.status(403).json({ error: "This content is protected and locked." });
      return;
    }

    const filename = video.youtubeUrl.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "public", "uploads", filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Video file not found on disk" });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send("Requested range not satisfiable\n" + start + " >= " + fileSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
