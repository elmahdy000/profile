import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import {
  db,
  studentAttendanceTable,
  studentsTable,
  parentsTable,
  studentNotificationsTable,
} from "@workspace/db";
import { requireAdmin, getAdminIdentity } from "../middleware/auth";
import { logAudit } from "./learning";

const router: IRouter = Router();

// Helper to normalize Arabic digits
function normalizeArabicDigits(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
}

function cleanDigits(str: string): string {
  return normalizeArabicDigits(str).replace(/[^\d]/g, "");
}

function getTodayCairoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCairoTimeFormatted(): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date());
}

// ─── 1. POST /api/admin/attendance/scan ───────────────────────────────────────
// Rapid QR Code Scanner Attendance Endpoint
router.post("/admin/attendance/scan", requireAdmin, async (req: Request, res, next) => {
  try {
    const rawInput = String(req.body.qrCode ?? req.body.code ?? "").trim();
    if (!rawInput) {
      res.status(400).json({ error: "كود الطالب مطلوب" });
      return;
    }

    const date = String(req.body.date || getTodayCairoDate()).trim();
    const centerOverride = req.body.centerName ? String(req.body.centerName).trim() : null;
    const slotOverride = req.body.appointmentSlot ? String(req.body.appointmentSlot).trim() : null;
    const notes = req.body.notes ? String(req.body.notes).trim() : null;
    const notifyParent = req.body.notifyParent !== false;

    // Smart QR Code Parsing:
    // 1. STD-ID-PHONE pattern (e.g. STD-547-01012345678)
    // 2. ID:547 pattern
    // 3. Access Code (e.g. MHD-9281)
    // 4. Student Phone (e.g. 01012345678)
    // 5. Raw Student ID number (e.g. 547)
    let extractedStudentId: number | null = null;
    let extractedPhone = "";
    let extractedAccessCode = "";

    const stdMatch = rawInput.match(/^STD-(\d+)-?(\d+)?$/i);
    if (stdMatch) {
      extractedStudentId = Number(stdMatch[1]);
      if (stdMatch[2]) extractedPhone = stdMatch[2];
    } else if (/^ID:\s*(\d+)$/i.test(rawInput)) {
      extractedStudentId = Number(rawInput.replace(/^ID:\s*/i, ""));
    } else {
      const cleanInputDigits = cleanDigits(rawInput);
      if (cleanInputDigits.length >= 8 && cleanInputDigits.startsWith("01")) {
        extractedPhone = cleanInputDigits;
      } else if (/^\d+$/.test(rawInput) && Number(rawInput) > 0 && Number(rawInput) < 100000) {
        extractedStudentId = Number(rawInput);
      }
      extractedAccessCode = normalizeArabicDigits(rawInput).toUpperCase();
    }

    // Build lookup query
    const lookupConditions: any[] = [];
    if (extractedStudentId && Number.isSafeInteger(extractedStudentId)) {
      lookupConditions.push(eq(studentsTable.id, extractedStudentId));
    }
    if (extractedAccessCode) {
      lookupConditions.push(sql`UPPER(${studentsTable.accessCode}) = ${extractedAccessCode}`);
    }
    if (extractedPhone) {
      lookupConditions.push(
        sql`REPLACE(TRANSLATE(${studentsTable.phone}, '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '') LIKE ${`%${extractedPhone.slice(-8)}%`}`
      );
    }

    if (lookupConditions.length === 0) {
      res.status(404).json({ error: "كود غير صالح أو لم يتم التعرف على صيغة الطالب" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(sql`(${sql.join(lookupConditions, sql` OR `)})`)
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "لم يتم العثور على طالب بهذا الكود أو الـ QR" });
      return;
    }

    const adminIdentity = getAdminIdentity(req);
    const recordedBy = adminIdentity?.username || (adminIdentity?.role === "superadmin" ? "د. محمود المهدي" : "مشرف مساعد");
    const centerName = (centerOverride && centerOverride !== "all") ? centerOverride : (student as any).centerName || (student as any).center || "السنتر الرئيسي";
    const appointmentSlot = (slotOverride && slotOverride !== "all") ? slotOverride : ((student as any).appointmentSlot || null);
    const academicStage = student.grade || "عام";

    const enrolledSlot = (student as any).appointmentSlot || null;
    const enrolledCenter = (student as any).centerName || (student as any).center || null;
    const isCrossGroup = Boolean(
      slotOverride &&
      slotOverride !== "all" &&
      enrolledSlot &&
      slotOverride !== enrolledSlot
    );
    const isCrossCenter = Boolean(
      centerOverride &&
      centerOverride !== "all" &&
      enrolledCenter &&
      centerOverride !== enrolledCenter
    );

    // Check if attendance already recorded today for this student
    const [existingRecord] = await db
      .select()
      .from(studentAttendanceTable)
      .where(
        and(
          eq(studentAttendanceTable.studentId, student.id),
          eq(studentAttendanceTable.date, date)
        )
      )
      .limit(1);

    let attendanceRecord = existingRecord;
    let alreadyRecorded = false;

    if (existingRecord && existingRecord.status === "present") {
      alreadyRecorded = true;
    } else {
      const now = new Date();
      if (existingRecord) {
        // Update from absent/late to present
        const [updated] = await db
          .update(studentAttendanceTable)
          .set({
            status: "present",
            attendedAt: now,
            recordedBy,
            centerName,
            appointmentSlot,
            academicStage,
            notes: notes || (isCrossGroup ? `حضور تعويضي (الموعد الأصلي: ${enrolledSlot})` : existingRecord.notes),
            updatedAt: now,
          })
          .where(eq(studentAttendanceTable.id, existingRecord.id))
          .returning();
        attendanceRecord = updated;
      } else {
        // Insert new present record
        const [inserted] = await db
          .insert(studentAttendanceTable)
          .values({
            studentId: student.id,
            date,
            status: "present",
            attendedAt: now,
            recordedBy,
            centerName,
            appointmentSlot,
            academicStage,
            notes: notes || (isCrossGroup ? `حضور تعويضي (الموعد الأصلي: ${enrolledSlot})` : null),
            parentNotified: false,
          })
          .returning();
        attendanceRecord = inserted;
      }
    }

    // Check if parent account is registered
    const [parent] = await db
      .select()
      .from(parentsTable)
      .where(eq(parentsTable.studentId, student.id))
      .limit(1);

    let parentNotified = attendanceRecord?.parentNotified ?? false;

    // If parent exists and not yet notified for this session, notify parent
    if (!alreadyRecorded && notifyParent && (!attendanceRecord?.parentNotified)) {
      const timeStr = getCairoTimeFormatted();
      try {
        await db.insert(studentNotificationsTable).values({
          studentId: student.id,
          title: "تسجيل حضور الحصة 📍",
          message: `تم تسجيل حضور الطالب (${student.name}) لحصة اليوم (${date}) في تمام الساعة ${timeStr}. نتمنى له دوام التوفيق والتميز.`,
          type: "attendance",
        });

        await db
          .update(studentAttendanceTable)
          .set({
            parentNotified: true,
            parentNotifiedAt: new Date(),
          })
          .where(eq(studentAttendanceTable.id, attendanceRecord.id));

        parentNotified = true;
      } catch (err) {
        console.error("Failed to insert attendance notification:", err);
      }
    }

    await logAudit(
      req,
      "ATTENDANCE_SCAN",
      "attendance",
      student.id,
      `تسجيل حضور الطالب ${student.name} (كود: ${student.accessCode || student.id}) في تاريخ ${date}`
    );

    let scanMessage = `تم تسجيل حضور (${student.name}) بنجاح!`;
    if (alreadyRecorded) {
      scanMessage = `الطالب (${student.name}) مسجل حضوره مسبقاً اليوم الساعة ${new Date(existingRecord.attendedAt || "").toLocaleTimeString("ar-EG", { hour: "numeric", minute: "numeric", hour12: true })}`;
    } else if (isCrossGroup) {
      scanMessage = `تم تسجيل حضور (${student.name}) بنجاح كـ تعويض! (موعده الأصلي: ${enrolledSlot})`;
    }

    res.json({
      success: true,
      alreadyRecorded,
      isCrossGroup,
      isCrossCenter,
      enrolledSlot,
      enrolledCenter,
      activeSlot: appointmentSlot,
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        parentPhone: student.parentPhone,
        grade: student.grade,
        accessCode: student.accessCode,
        avatarUrl: student.avatarUrl,
        centerName,
        appointmentSlot: (student as any).appointmentSlot,
        paymentStatus: student.paymentStatus,
      },
      attendance: {
        ...attendanceRecord,
        checkInTime: attendanceRecord?.attendedAt
          ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(attendanceRecord.attendedAt))
          : getCairoTimeFormatted(),
      },
      parentNotified,
      parent: parent ? { id: parent.id, name: parent.name, phone: parent.phone, parentCode: parent.parentCode } : null,
      message: scanMessage,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 2. GET /api/admin/attendance/daily ────────────────────────────────────────
// Full Daily Attendance Sheet with Filtering & Real-time Counts & Group Breakdown
router.get("/admin/attendance/daily", requireAdmin, async (req: Request, res, next) => {
  try {
    const date = String(req.query.date || getTodayCairoDate()).trim();
    const stageFilter = req.query.stage ? String(req.query.stage).trim() : null;
    const centerFilter = req.query.center ? String(req.query.center).trim() : null;
    const slotFilter = req.query.slot ? String(req.query.slot).trim() : null;
    const statusFilter = req.query.status ? String(req.query.status).trim() : null;
    const searchFilter = req.query.search ? String(req.query.search).trim() : null;

    // Fetch all active/approved students
    const students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        phone: studentsTable.phone,
        parentPhone: studentsTable.parentPhone,
        grade: studentsTable.grade,
        accessCode: studentsTable.accessCode,
        paymentStatus: studentsTable.paymentStatus,
        status: studentsTable.status,
        centerName: (studentsTable as any).centerName,
        appointmentSlot: (studentsTable as any).appointmentSlot,
      })
      .from(studentsTable)
      .where(eq(studentsTable.status, "approved"))
      .orderBy(studentsTable.name);

    // Fetch all attendance records for this date
    const attendanceRows = await db
      .select()
      .from(studentAttendanceTable)
      .where(eq(studentAttendanceTable.date, date));

    const attendanceMap = new Map(attendanceRows.map((r) => [r.studentId, r]));

    // Fetch all parent records to flag who has registered parent accounts
    const parentRows = await db.select({ studentId: parentsTable.studentId, parentName: parentsTable.name }).from(parentsTable);
    const parentMap = new Map(parentRows.map((p) => [p.studentId, p.parentName]));

    // Calculate Group Breakdown across all students and attendance records
    // Key: `${centerName}:::${appointmentSlot}`
    const groupStatsMap = new Map<string, {
      centerName: string;
      appointmentSlot: string;
      totalEnrolled: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      unmarkedCount: number;
      makeupCount: number;
      attendanceRate: number;
    }>();

    const getGroupKey = (c?: string | null, s?: string | null) => {
      const center = (c && c.trim()) || "بدون سنتر محدد";
      const slot = (s && s.trim()) || "بدون موعد محدد";
      return `${center}:::${slot}`;
    };

    const getOrCreateGroupEntry = (center: string, slot: string) => {
      const key = getGroupKey(center, slot);
      if (!groupStatsMap.has(key)) {
        groupStatsMap.set(key, {
          centerName: (center && center.trim()) || "بدون سنتر محدد",
          appointmentSlot: (slot && slot.trim()) || "بدون موعد محدد",
          totalEnrolled: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          unmarkedCount: 0,
          makeupCount: 0,
          attendanceRate: 0,
        });
      }
      return groupStatsMap.get(key)!;
    };

    // 1. Tally enrolled students
    students.forEach((st) => {
      if (st.centerName || st.appointmentSlot) {
        const entry = getOrCreateGroupEntry(st.centerName || "بدون سنتر محدد", st.appointmentSlot || "بدون موعد محدد");
        entry.totalEnrolled += 1;
      }
    });

    // 2. Tally attendance records
    attendanceRows.forEach((att) => {
      const attCenter = att.centerName || "بدون سنتر محدد";
      const attSlot = att.appointmentSlot || "بدون موعد محدد";
      const entry = getOrCreateGroupEntry(attCenter, attSlot);
      if (att.status === "present") entry.presentCount += 1;
      else if (att.status === "absent") entry.absentCount += 1;
      else if (att.status === "late") entry.lateCount += 1;

      // Check if student was enrolled in another group (makeup session)
      const st = students.find((s) => s.id === att.studentId);
      if (st && st.appointmentSlot && att.appointmentSlot && st.appointmentSlot !== att.appointmentSlot) {
        entry.makeupCount += 1;
      }
    });

    // 3. Finalize rates and unmarked
    groupStatsMap.forEach((g) => {
      const marked = g.presentCount + g.absentCount + g.lateCount;
      g.unmarkedCount = Math.max(0, g.totalEnrolled - marked);
      g.attendanceRate = g.totalEnrolled > 0
        ? Math.round(((g.presentCount + g.lateCount) / g.totalEnrolled) * 100)
        : (g.presentCount > 0 ? 100 : 0);
    });

    const groupBreakdown = Array.from(groupStatsMap.values()).sort((a, b) => {
      if (a.centerName !== b.centerName) return a.centerName.localeCompare(b.centerName, "ar");
      return a.appointmentSlot.localeCompare(b.appointmentSlot, "ar");
    });

    // Build unified student records
    let records = students.map((st) => {
      const att = attendanceMap.get(st.id);
      const parentRegistered = parentMap.has(st.id);
      const enrolledSlot = st.appointmentSlot || null;
      const actualSlot = att?.appointmentSlot || enrolledSlot || null;
      const enrolledCenter = st.centerName || null;
      const actualCenter = att?.centerName || enrolledCenter || "السنتر الرئيسي";
      const isCrossGroup = Boolean(actualSlot && enrolledSlot && actualSlot !== enrolledSlot);

      return {
        studentId: st.id,
        name: st.name,
        phone: st.phone,
        parentPhone: st.parentPhone,
        grade: st.grade || "عام",
        accessCode: st.accessCode || `STD-${st.id}`,
        paymentStatus: st.paymentStatus,
        centerName: actualCenter,
        appointmentSlot: actualSlot,
        enrolledSlot,
        enrolledCenter,
        isCrossGroup,
        status: att?.status || "unmarked", // "present" | "absent" | "late" | "unmarked"
        attendedAt: att?.attendedAt || null,
        recordedBy: att?.recordedBy || null,
        parentNotified: att?.parentNotified ?? false,
        parentRegistered,
        parentName: parentMap.get(st.id) || null,
        notes: att?.notes || null,
      };
    });

    // Apply filters
    if (stageFilter && stageFilter !== "all") {
      records = records.filter((r) => r.grade?.toLowerCase().includes(stageFilter.toLowerCase()));
    }
    if (centerFilter && centerFilter !== "all") {
      records = records.filter((r) => r.centerName?.toLowerCase().includes(centerFilter.toLowerCase()) || r.enrolledCenter?.toLowerCase().includes(centerFilter.toLowerCase()));
    }
    if (slotFilter && slotFilter !== "all") {
      records = records.filter((r) => r.appointmentSlot === slotFilter || r.enrolledSlot === slotFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      records = records.filter((r) => r.status === statusFilter);
    }
    if (searchFilter) {
      const s = searchFilter.toLowerCase();
      records = records.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.phone.includes(s) ||
          (r.parentPhone && r.parentPhone.includes(s)) ||
          r.accessCode.toLowerCase().includes(s)
      );
    }

    // Calculate daily statistics
    const totalStudents = records.length;
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const unmarkedCount = records.filter((r) => r.status === "unmarked").length;
    const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

    const statsObj = {
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      unmarkedCount,
      attendanceRate,
    };

    res.json({
      success: true,
      date,
      summary: statsObj,
      stats: statsObj,
      groupBreakdown,
      records: records.map((r) => ({
        ...r,
        id: r.studentId,
        center: r.centerName,
        checkInTime: r.attendedAt
          ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(r.attendedAt))
          : null,
        hasParentAccount: r.parentRegistered,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ─── 3. POST /api/admin/attendance/manual-status ──────────────────────────────
// Toggle or set attendance status manually (present / absent / late)
router.post("/admin/attendance/manual-status", requireAdmin, async (req: Request, res, next) => {
  try {
    const studentId = Number(req.body.studentId);
    const date = String(req.body.date || getTodayCairoDate()).trim();
    const status = String(req.body.status || "present").trim(); // "present" | "absent" | "late"
    const notes = req.body.notes ? String(req.body.notes).trim() : null;
    const centerOverride = req.body.centerName ? String(req.body.centerName).trim() : null;
    const slotOverride = req.body.appointmentSlot ? String(req.body.appointmentSlot).trim() : null;
    const notifyParent = req.body.notifyParent !== false;

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      res.status(400).json({ error: "معرّف الطالب غير صحيح" });
      return;
    }

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
    if (!student) {
      res.status(404).json({ error: "الطالب غير موجود" });
      return;
    }

    const adminIdentity = getAdminIdentity(req);
    const recordedBy = adminIdentity?.username || "مشرف مساعد";
    const now = new Date();
    const centerName = (centerOverride && centerOverride !== "all") ? centerOverride : (student as any).centerName || "السنتر الرئيسي";
    const appointmentSlot = (slotOverride && slotOverride !== "all") ? slotOverride : (student as any).appointmentSlot || null;

    const [existing] = await db
      .select()
      .from(studentAttendanceTable)
      .where(and(eq(studentAttendanceTable.studentId, studentId), eq(studentAttendanceTable.date, date)))
      .limit(1);

    let updatedAttendance;
    if (existing) {
      const [row] = await db
        .update(studentAttendanceTable)
        .set({
          status,
          attendedAt: status === "present" || status === "late" ? now : null,
          recordedBy,
          centerName: centerName || existing.centerName,
          appointmentSlot: appointmentSlot || existing.appointmentSlot,
          notes: notes || existing.notes,
          updatedAt: now,
        })
        .where(eq(studentAttendanceTable.id, existing.id))
        .returning();
      updatedAttendance = row;
    } else {
      const [row] = await db
        .insert(studentAttendanceTable)
        .values({
          studentId,
          date,
          status,
          attendedAt: status === "present" || status === "late" ? now : null,
          recordedBy,
          centerName,
          appointmentSlot,
          academicStage: student.grade,
          notes,
        })
        .returning();
      updatedAttendance = row;
    }

    // Parent Notification handling
    let parentNotified = false;
    if (notifyParent) {
      try {
        if (status === "present" || status === "late") {
          const timeStr = getCairoTimeFormatted();
          await db.insert(studentNotificationsTable).values({
            studentId,
            title: status === "late" ? "تسجيل حضور متأخر ⚠️" : "تسجيل حضور الحصة 📍",
            message: `تم تسجيل ${status === "late" ? "حضور متأخر لـ" : "حضور"} الطالب (${student.name}) لحصة اليوم (${date}) الساعة ${timeStr}.`,
            type: "attendance",
          });
          parentNotified = true;
        } else if (status === "absent") {
          await db.insert(studentNotificationsTable).values({
            studentId,
            title: "إخطار غياب عن الحصة ⚠️",
            message: `نحيطكم علماً بعدم حضور الطالب (${student.name}) لحصة اليوم (${date}). يُرجى التواصل والمتابعة للتأكد من سلامته ومستواه.`,
            type: "attendance_absent",
          });
          parentNotified = true;
        }

        if (parentNotified) {
          await db
            .update(studentAttendanceTable)
            .set({ parentNotified: true, parentNotifiedAt: new Date() })
            .where(eq(studentAttendanceTable.id, updatedAttendance.id));
        }
      } catch (err) {
        console.error("Failed to notify parent:", err);
      }
    }

    res.json({
      success: true,
      attendance: updatedAttendance,
      parentNotified,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 4. POST /api/admin/attendance/bulk-absent ────────────────────────────────
// Bulk mark all remaining unmarked students as absent (optionally scoped to stage, center, or slot)
router.post("/admin/attendance/bulk-absent", requireAdmin, async (req: Request, res, next) => {
  try {
    const date = String(req.body.date || getTodayCairoDate()).trim();
    const stageFilter = req.body.stage || req.body.grade ? String(req.body.stage || req.body.grade).trim() : null;
    const centerFilter = req.body.center || req.body.centerName ? String(req.body.center || req.body.centerName).trim() : null;
    const slotFilter = req.body.slot || req.body.appointmentSlot ? String(req.body.slot || req.body.appointmentSlot).trim() : null;
    const notifyParents = req.body.notifyParents === true;

    // Get all approved students
    let students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        grade: studentsTable.grade,
        centerName: (studentsTable as any).centerName,
        appointmentSlot: (studentsTable as any).appointmentSlot,
      })
      .from(studentsTable)
      .where(eq(studentsTable.status, "approved"));

    if (stageFilter && stageFilter !== "all") {
      students = students.filter((s) => s.grade?.toLowerCase().includes(stageFilter.toLowerCase()));
    }
    if (centerFilter && centerFilter !== "all") {
      students = students.filter((s) => s.centerName?.toLowerCase().includes(centerFilter.toLowerCase()));
    }
    if (slotFilter && slotFilter !== "all") {
      students = students.filter((s) => s.appointmentSlot === slotFilter);
    }

    // Get all students with an existing record today
    const existingRows = await db
      .select({ studentId: studentAttendanceTable.studentId })
      .from(studentAttendanceTable)
      .where(eq(studentAttendanceTable.date, date));

    const markedIds = new Set(existingRows.map((r) => r.studentId));
    const unmarkedStudents = students.filter((s) => !markedIds.has(s.id));

    if (unmarkedStudents.length === 0) {
      res.json({ success: true, markedCount: 0, markedAbsentCount: 0, message: "لا يوجد طلاب متبقين لتسجيل غيابهم ضمن هذا النطاق" });
      return;
    }

    const adminIdentity = getAdminIdentity(req);
    const recordedBy = adminIdentity?.username || "مشرف مساعد";
    const now = new Date();

    const insertValues = unmarkedStudents.map((s) => ({
      studentId: s.id,
      date,
      status: "absent",
      attendedAt: null,
      recordedBy,
      centerName: s.centerName || centerFilter || "السنتر الرئيسي",
      appointmentSlot: s.appointmentSlot || slotFilter || null,
      academicStage: s.grade,
      notes: slotFilter ? `غياب تلقائي لمجموعة: ${slotFilter}` : "غياب تلقائي للطلاب المتبقين في كشف اليومية",
      parentNotified: notifyParents,
      parentNotifiedAt: notifyParents ? now : null,
    }));

    await db.insert(studentAttendanceTable).values(insertValues);

    if (notifyParents) {
      const notifs = unmarkedStudents.map((s) => ({
        studentId: s.id,
        title: "إخطار غياب عن الحصة ⚠️",
        message: `نحيطكم علماً بغياب الطالب (${s.name}) عن حضور حصة اليوم (${date}). برجاء المتابعة مع الإدارة.`,
        type: "attendance_absent",
      }));
      await db.insert(studentNotificationsTable).values(notifs).catch((e) => console.error("Bulk notif error:", e));
    }

    await logAudit(
      req,
      "ATTENDANCE_BULK_ABSENT",
      "attendance",
      null,
      `تسجيل غياب جماعي لـ ${unmarkedStudents.length} طالب لتاريخ ${date} (سنتر: ${centerFilter || "الكل"} - موعد: ${slotFilter || "الكل"})`
    );

    res.json({
      success: true,
      markedCount: unmarkedStudents.length,
      markedAbsentCount: unmarkedStudents.length,
      parentsNotifiedCount: notifyParents ? unmarkedStudents.length : 0,
      message: `تم تسجيل غياب ${unmarkedStudents.length} طالب بنجاح!`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
