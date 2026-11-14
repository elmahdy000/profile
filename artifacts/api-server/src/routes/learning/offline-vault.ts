import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, studentBookmarksTable } from "@workspace/db";
import { requireStudent } from "../../middleware/student-auth";
import { assertActivePaidStudent } from "../../lib/kholasa-helpers";

const router: IRouter = Router();

// ── 1. GET /api/learning/offline-vault ──────────────────────────────────────────
// Retrieve all saved offline lessons & questions for the authenticated student
router.get("/learning/offline-vault", requireStudent, async (_req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const rows = await db
      .select()
      .from(studentBookmarksTable)
      .where(eq(studentBookmarksTable.studentId, student.id))
      .orderBy(desc(studentBookmarksTable.createdAt));

    const lessons: any[] = [];
    const questions: any[] = [];
    const other: any[] = [];

    for (const r of rows) {
      let parsedPayload: any = null;
      if (r.note) {
        try {
          parsedPayload = JSON.parse(r.note);
        } catch {
          parsedPayload = { text: r.note };
        }
      }

      const item = {
        id: r.id,
        itemType: r.itemType,
        itemKey: r.itemKey,
        title: r.title,
        videoId: r.videoId,
        materialId: r.materialId,
        createdAt: r.createdAt,
        payload: parsedPayload,
      };

      if (r.itemType === "lesson") {
        lessons.push(item);
      } else if (r.itemType === "question") {
        questions.push(item);
      } else {
        other.push(item);
      }
    }

    res.json({
      success: true,
      totalCount: rows.length,
      lessons,
      questions,
      other,
    });
  } catch (error) {
    next(error);
  }
});

// ── 2. POST /api/learning/offline-vault/save ───────────────────────────────────
// Save or update an item in student's cloud account vault
router.post("/learning/offline-vault/save", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const itemType = String(req.body?.itemType || "lesson").trim();
    const itemKey = String(req.body?.itemKey || "").trim();
    const title = req.body?.title ? String(req.body.title).trim() : null;
    const videoId = req.body?.videoId ? Number(req.body.videoId) : null;
    const materialId = req.body?.materialId ? Number(req.body.materialId) : null;
    const payload = req.body?.payload;

    if (!itemKey) {
      res.status(400).json({ error: "itemKey مطلوب لحفظ العنصر" });
      return;
    }

    let noteStr: string | null = null;
    if (payload !== undefined && payload !== null) {
      try {
        noteStr = typeof payload === "string" ? payload : JSON.stringify(payload);
      } catch {
        noteStr = String(payload);
      }
    } else if (req.body?.note) {
      noteStr = String(req.body.note);
    }

    const [existing] = await db
      .select({ id: studentBookmarksTable.id })
      .from(studentBookmarksTable)
      .where(
        and(
          eq(studentBookmarksTable.studentId, student.id),
          eq(studentBookmarksTable.itemType, itemType),
          eq(studentBookmarksTable.itemKey, itemKey),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(studentBookmarksTable)
        .set({
          title,
          note: noteStr,
          videoId: videoId && Number.isInteger(videoId) ? videoId : undefined,
          materialId: materialId && Number.isInteger(materialId) ? materialId : undefined,
        })
        .where(eq(studentBookmarksTable.id, existing.id));

      res.json({
        success: true,
        saved: true,
        updated: true,
        id: existing.id,
      });
    } else {
      const [inserted] = await db
        .insert(studentBookmarksTable)
        .values({
          studentId: student.id,
          itemType,
          itemKey,
          title,
          note: noteStr,
          videoId: videoId && Number.isInteger(videoId) ? videoId : null,
          materialId: materialId && Number.isInteger(materialId) ? materialId : null,
        })
        .returning({ id: studentBookmarksTable.id });

      res.json({
        success: true,
        saved: true,
        created: true,
        id: inserted?.id,
      });
    }
  } catch (error) {
    next(error);
  }
});

// ── 3. POST /api/learning/offline-vault/remove ─────────────────────────────────
// Remove an item from student's cloud account vault
router.post("/learning/offline-vault/remove", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const itemType = String(req.body?.itemType || "").trim();
    const itemKey = String(req.body?.itemKey || "").trim();

    if (!itemKey || !itemType) {
      res.status(400).json({ error: "itemType و itemKey مطلوبان لحذف العنصر" });
      return;
    }

    await db
      .delete(studentBookmarksTable)
      .where(
        and(
          eq(studentBookmarksTable.studentId, student.id),
          eq(studentBookmarksTable.itemType, itemType),
          eq(studentBookmarksTable.itemKey, itemKey),
        ),
      );

    res.json({
      success: true,
      removed: true,
    });
  } catch (error) {
    next(error);
  }
});

// ── 4. POST /api/learning/offline-vault/bulk-sync ──────────────────────────────
// Sync multiple items in bulk from client storage to student account
router.post("/learning/offline-vault/bulk-sync", requireStudent, async (req, res, next) => {
  try {
    const student = assertActivePaidStudent(res);
    if (!student) return;

    const items: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
    let synced = 0;

    for (const it of items) {
      const itemType = String(it.itemType || "lesson").trim();
      const itemKey = String(it.itemKey || "").trim();
      if (!itemKey) continue;

      let noteStr: string | null = null;
      if (it.payload) {
        try {
          noteStr = typeof it.payload === "string" ? it.payload : JSON.stringify(it.payload);
        } catch {
          noteStr = String(it.payload);
        }
      }

      const [existing] = await db
        .select({ id: studentBookmarksTable.id })
        .from(studentBookmarksTable)
        .where(
          and(
            eq(studentBookmarksTable.studentId, student.id),
            eq(studentBookmarksTable.itemType, itemType),
            eq(studentBookmarksTable.itemKey, itemKey),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(studentBookmarksTable)
          .set({
            title: it.title || undefined,
            note: noteStr || undefined,
          })
          .where(eq(studentBookmarksTable.id, existing.id));
      } else {
        await db.insert(studentBookmarksTable).values({
          studentId: student.id,
          itemType,
          itemKey,
          title: it.title || null,
          note: noteStr,
          videoId: it.videoId && Number.isInteger(it.videoId) ? it.videoId : null,
          materialId: it.materialId && Number.isInteger(it.materialId) ? it.materialId : null,
        });
      }
      synced++;
    }

    res.json({
      success: true,
      syncedCount: synced,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
