import { Router, type IRouter } from "express";
import { db, bookingsTable } from "@workspace/db";
import { CreateBookingBody } from "@workspace/api-zod";
import { requireAdmin, requireSuperAdmin } from "../middleware/auth";
import { logAudit } from "./learning";
import { fixedWindowRateLimit } from "../middleware/rate-limit";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();
const createBookingLimit = fixedWindowRateLimit({
  name: "booking-create",
  limit: 5,
  windowMs: 60 * 60 * 1000,
});
const BOOKING_STATUSES = new Set(["pending", "confirmed", "completed"]);

// Create booking
router.post("/bookings", createBookingLimit, async (req, res, next) => {
  try {
    const validated = CreateBookingBody.parse(req.body);

    // Bound and sanitize free-text fields. The generated zod schema only checks
    // that these are strings; enforce sane lengths/format here so the DB isn't
    // filled with empty, oversized, or non-numeric junk. See audit fix (MEDIUM).
    const name = validated.name.trim();
    const phone = validated.phone.trim();
    const message = validated.message.trim();
    const digits = phone.replace(/[^\d]/g, "");

    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: "الاسم يجب أن يكون بين حرفين و100 حرف" });
      return;
    }
    if (digits.length < 8 || digits.length > 15) {
      res.status(400).json({ error: "رقم الهاتف غير صحيح" });
      return;
    }
    if (message.length > 1000) {
      res.status(400).json({ error: "الرسالة طويلة جداً" });
      return;
    }

    const [inserted] = await db.insert(bookingsTable).values({
      name,
      phone,
      message,
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
    const bookings = await db
      .select()
      .from(bookingsTable)
      .orderBy(desc(bookingsTable.createdAt));

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
    const status = String(req.body.status ?? "");

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid booking id" });
      return;
    }
    if (!BOOKING_STATUSES.has(status)) {
      res.status(400).json({ error: "Invalid booking status" });
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

// Delete booking (Super Admin only)
router.delete("/bookings/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "رقم الحجز غير صحيح" });
      return;
    }
    const [deleted] = await db
      .delete(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "الحجز غير موجود" });
      return;
    }

    await logAudit(req, "DELETE_BOOKING", "booking", String(id), `حذف طلب حجز باسم: ${deleted.name} (${deleted.phone})`);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
