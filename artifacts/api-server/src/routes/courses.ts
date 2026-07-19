import { Router, type IRouter } from "express";
import { db, coursesTable, curriculumsTable, videosTable } from "@workspace/db";
import { CreateCourseBody, UpdateCourseBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List courses
router.get("/courses", async (_req, res, next) => {
  try {
    const [courses, curriculums, videos] = await Promise.all([
      db.select().from(coursesTable),
      db.select().from(curriculumsTable),
      db.select().from(videosTable),
    ]);

    const formatted = courses.map((c) => {
      // Find matching curriculum lessons
      const matchingCurriculums = curriculums.filter(
        (curr) =>
          curr.subject.toLowerCase() === c.category.toLowerCase() ||
          c.title.toLowerCase().includes(curr.subject.toLowerCase()) ||
          c.tags.some(
            (tag) => tag.toLowerCase() === curr.subject.toLowerCase(),
          ),
      );

      // Find matching YouTube videos/playlists
      const matchingVideos = videos.filter(
        (vid) =>
          vid.courseId === c.id ||
          vid.category.toLowerCase() === c.category.toLowerCase() ||
          c.title.toLowerCase().includes(vid.category.toLowerCase()),
      );

      return {
        id: c.id,
        title: c.title,
        age: c.age,
        duration: c.duration,
        sessions: c.sessions,
        level: c.level,
        category: c.category,
        tags: c.tags,
        img: c.img,
        lessonsCount: matchingCurriculums.length,
        videosCount: matchingVideos.length,
      };
    });
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Create course (Admin only)
router.post("/courses", requireAdmin, async (req, res, next) => {
  try {
    const validated = CreateCourseBody.parse(req.body);
    const [inserted] = await db
      .insert(coursesTable)
      .values({
        title: validated.title,
        age: validated.age,
        duration: validated.duration,
        sessions: validated.sessions,
        level: validated.level,
        category: validated.category,
        tags: validated.tags,
        img: validated.img,
      })
      .returning();

    res.status(201).json({
      id: inserted.id,
      title: inserted.title,
      age: inserted.age,
      duration: inserted.duration,
      sessions: inserted.sessions,
      level: inserted.level,
      category: inserted.category,
      tags: inserted.tags,
      img: inserted.img,
    });
  } catch (error) {
    next(error);
  }
});

// Update course (Admin only)
router.put("/courses/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const validated = UpdateCourseBody.parse(req.body);

    const [updated] = await db
      .update(coursesTable)
      .set({
        title: validated.title,
        age: validated.age,
        duration: validated.duration,
        sessions: validated.sessions,
        level: validated.level,
        category: validated.category,
        tags: validated.tags,
        img: validated.img,
      })
      .where(eq(coursesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    await db
      .update(videosTable)
      .set({ category: updated.title })
      .where(eq(videosTable.courseId, id));

    res.json({
      id: updated.id,
      title: updated.title,
      age: updated.age,
      duration: updated.duration,
      sessions: updated.sessions,
      level: updated.level,
      category: updated.category,
      tags: updated.tags,
      img: updated.img,
    });
  } catch (error) {
    next(error);
  }
});

// Delete course (Admin only)
router.delete("/courses/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [linkedVideo] = await db
      .select({ id: videosTable.id })
      .from(videosTable)
      .where(eq(videosTable.courseId, id))
      .limit(1);
    if (linkedVideo) {
      res
        .status(409)
        .json({ error: "مينفعش تحذف الكورس وفيه فيديوهات مرتبطة بيه" });
      return;
    }
    const [deleted] = await db
      .delete(coursesTable)
      .where(eq(coursesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
