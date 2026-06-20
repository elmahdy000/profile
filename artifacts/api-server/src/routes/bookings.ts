import { Router, type IRouter } from "express";
import { db, bookingsTable } from "@workspace/db";
import { CreateBookingBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Create booking
router.post("/bookings", async (req, res, next) => {
  try {
    const validated = CreateBookingBody.parse(req.body);
    const [inserted] = await db.insert(bookingsTable).values({
      name: validated.name,
      phone: validated.phone,
      message: validated.message,
    }).returning();

    res.status(201).json({
      id: inserted.id,
      name: inserted.name,
      phone: inserted.phone,
      message: inserted.message,
      status: inserted.status,
      createdAt: inserted.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// List bookings (requires admin authorization header to view bookings list)
router.get("/bookings", requireAdmin, async (_req, res, next) => {
  try {
    const bookings = await db.select().from(bookingsTable);
    const formatted = bookings.map(b => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      message: b.message,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    }));
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Update booking status (Admin only)
router.put("/bookings/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: "Missing status field" });
      return;
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      message: updated.message,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Delete booking (Admin only)
router.delete("/bookings/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db
      .delete(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
