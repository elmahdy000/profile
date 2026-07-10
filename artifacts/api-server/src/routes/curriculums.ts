import { Router, type IRouter } from "express";
import { db, curriculumsTable } from "@workspace/db";
import { CreateCurriculumBody, UpdateCurriculumBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// List all curriculums
router.get("/curriculums", async (_req, res, next) => {
  try {
    const curriculums = await db
      .select()
      .from(curriculumsTable)
      .orderBy(asc(curriculumsTable.order));
    res.json(curriculums);
  } catch (error) {
    next(error);
  }
});

// Create curriculum (Admin only)
router.post("/curriculums", requireAdmin, async (req, res, next) => {
  try {
    const validated = CreateCurriculumBody.parse(req.body);
    const [inserted] = await db
      .insert(curriculumsTable)
      .values({
        subject: validated.subject,
        title: validated.title,
        description: validated.description ?? null,
        images: validated.images,
        order: validated.order ?? 0,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (error) {
    next(error);
  }
});

// Update curriculum (Admin only)
router.put("/curriculums/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const validated = UpdateCurriculumBody.parse(req.body);

    const [updated] = await db
      .update(curriculumsTable)
      .set({
        ...(validated.subject !== undefined && { subject: validated.subject }),
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.images !== undefined && { images: validated.images }),
        ...(validated.order !== undefined && { order: validated.order }),
      })
      .where(eq(curriculumsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Curriculum item not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete curriculum (Admin only)
router.delete("/curriculums/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db
      .delete(curriculumsTable)
      .where(eq(curriculumsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Curriculum item not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
