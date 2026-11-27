import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import {
  db,
  studentAttendanceTable,
  studentsTable,
  parentsTable,
  studentNotificationsTable,
  siteSettingsTable,
} from "@workspace/db";
import { requireAdmin, getAdminIdentity } from "../middleware/auth";
import { requireStudent } from "../middleware/student-auth";
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

function normalizeSlot(s?: string | null): string {
  if (!s) return "";
  return String(s)
    .replace(/\(الساعة\s+/g, "(")
    .replace(/الساعة\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArabicText(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/أكاديمية\s*/g, "")
    .replace(/اكاديمية\s*/g, "")
    .replace(/اكاديمي\s*/g, "")
    .replace(/أكاديمي\s*/g, "")
    .replace(/academy\s*/gi, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\(\)\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeCenterName(raw?: string | null): string {
  if (!raw) return "بدون سنتر محدد";
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return "بدون سنتر محدد";
  const norm = normalizeArabicText(trimmed);
  if (norm.includes("رافال") || norm.includes("rafal")) return "سنتر رافال (Rafal) - عربي";
  if (norm.includes("زاج") || norm.includes("zag")) return "سنتر زاج (Zag) - عربي";
  if (norm.includes("فيوتشر") || norm.includes("future")) return "سنتر فيوتشر (Future) - عربي";
  if (norm.includes("المجد") || norm.includes("مجد") || norm.includes("magd")) return "سنتر المجد (El-Magd) - لغات";
  if (norm.includes("حناوي") || norm.includes("hennawy") || norm.includes("hannawy")) return "سنتر الحناوي - لغات";
  if (norm.includes("قنايات") || norm.includes("qanayat")) return "سنتر القنايات - عربي";
  if (norm.includes("اديوفيرس") || norm.includes("eduverse")) return "سنتر إديوفيرس (EduVerse) - لغات";
  return trimmed;
}

function matchesCenterQuery(centerValue: string | null | undefined, query: string): boolean {
  const normQuery = normalizeArabicText(query);
  if (!normQuery) return true;
  if (canonicalizeCenterName(centerValue) === canonicalizeCenterName(query)) return true;
  const c = normalizeArabicText(centerValue);
  if (!c) return false;
  if (c === normQuery || c.includes(normQuery) || normQuery.includes(c)) return true;
  const queryKeywords = normQuery
    .split(" ")
    .filter((w) => w.length >= 3 && w !== "سنتر" && w !== "لغات" && w !== "عربي");
  if (queryKeywords.length > 0 && queryKeywords.some((kw) => c.includes(kw))) return true;
  return false;
}

const GOOGLE_SHEET_SETTINGS_KEY = "attendance_google_sheet_config";

interface AttendanceGoogleSheetConfig {
  webhookUrl: string;
  secretToken?: string;
  autoSyncOnScan: boolean;
  lastSyncedAt?: string | null;
  lastSyncStatus?: string | null;
}

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (payload.action === "ping") {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, message: "Connected to Google Sheet successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = String(payload.sheetTitle || payload.date || "الحضور").slice(0, 90);
    var sheet = ss.getSheetByName(sheetName);

    var headers = [
      "معرف الطالب",
      "كود الطالب",
      "اسم الطالب",
      "رقم الهاتف",
      "هاتف ولي الأمر",
      "المرحلة",
      "السنتر",
      "الموعد / المجموعة",
      "حالة الحضور",
      "وقت الحضور",
      "ملاحظات",
      "بواسطة",
      "التاريخ"
    ];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.setRightToLeft(true);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#1e3a8a")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var rows = Array.isArray(payload.rows) ? payload.rows : [];
    var existingLastRow = sheet.getLastRow();
    var rowIndexByKey = {};
    if (existingLastRow > 1) {
      var existingData = sheet.getRange(2, 1, existingLastRow - 1, headers.length).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var key = String(existingData[i][0]) + "|" + String(existingData[i][12]);
        rowIndexByKey[key] = i + 2;
      }
    }

    var updated = 0;
    var inserted = 0;
    for (var r = 0; r < rows.length; r++) {
      var item = rows[r];
      var rowValues = [
        item.studentId || "",
        item.accessCode || "",
        item.name || "",
        item.phone || "",
        item.parentPhone || "",
        item.grade || "",
        item.centerName || "",
        item.appointmentSlot || "",
        item.statusAr || item.status || "",
        item.checkInTime || "",
        item.notes || "",
        item.recordedBy || "",
        item.date || payload.date || ""
      ];
      var rowKey = String(item.studentId || "") + "|" + String(item.date || payload.date || "");
      if (rowIndexByKey[rowKey]) {
        sheet.getRange(rowIndexByKey[rowKey], 1, 1, headers.length).setValues([rowValues]);
        updated++;
      } else {
        sheet.appendRow(rowValues);
        inserted++;
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sheetName: sheetName, inserted: inserted, updated: updated }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

let cachedSheetConfig: { data: AttendanceGoogleSheetConfig; fetchedAt: number } | null = null;

async function getGoogleSheetConfig(): Promise<AttendanceGoogleSheetConfig> {
  const now = Date.now();
  if (cachedSheetConfig && now - cachedSheetConfig.fetchedAt < 10_000) {
    return cachedSheetConfig.data;
  }
  const fallback: AttendanceGoogleSheetConfig = {
    webhookUrl: "",
    secretToken: "",
    autoSyncOnScan: true,
    lastSyncedAt: null,
    lastSyncStatus: null,
  };
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, GOOGLE_SHEET_SETTINGS_KEY))
      .limit(1);
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      const data: AttendanceGoogleSheetConfig = {
        webhookUrl: String(parsed.webhookUrl || "").trim(),
        secretToken: String(parsed.secretToken || "").trim(),
        autoSyncOnScan: parsed.autoSyncOnScan !== false,
        lastSyncedAt: parsed.lastSyncedAt || null,
        lastSyncStatus: parsed.lastSyncStatus || null,
      };
      cachedSheetConfig = { data, fetchedAt: now };
      return data;
    }
  } catch {
    // ignore parse error
  }
  cachedSheetConfig = { data: fallback, fetchedAt: now };
  return fallback;
}

async function saveGoogleSheetConfig(config: AttendanceGoogleSheetConfig): Promise<void> {
  cachedSheetConfig = { data: config, fetchedAt: Date.now() };
  await db
    .insert(siteSettingsTable)
    .values({
      key: GOOGLE_SHEET_SETTINGS_KEY,
      value: JSON.stringify(config),
      type: "json",
    })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: {
        value: JSON.stringify(config),
        type: "json",
        updatedAt: new Date(),
      },
    });
}

function isValidAppsScriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "script.google.com" || parsed.hostname === "script.googleusercontent.com")
    );
  } catch {
    return false;
  }
}

async function postToGoogleSheetWebhook(
  config: AttendanceGoogleSheetConfig,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!config.webhookUrl || !isValidAppsScriptUrl(config.webhookUrl)) {
    return { ok: false, error: "رابط Google Apps Script غير مضبوط أو غير صالح" };
  }
  try {
    const resp = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...(config.secretToken ? { secret: config.secretToken } : {}),
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await resp.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    if (!resp.ok || (parsed && parsed.ok === false)) {
      return { ok: false, error: parsed?.error || `HTTP ${resp.status}` };
    }
    return { ok: true, data: parsed };
  } catch (err: any) {
    return { ok: false, error: err?.message || "تعذر الاتصال بـ Google Apps Script" };
  }
}

function formatStatusAr(status: string): string {
  if (status === "present") return "حاضر";
  if (status === "late") return "متأخر";
  if (status === "absent") return "غائب";
  return "لم يُسجل";
}

function triggerBackgroundSheetSyncRow(row: {
  studentId: number;
  accessCode?: string | null;
  name: string;
  phone?: string | null;
  parentPhone?: string | null;
  grade?: string | null;
  centerName?: string | null;
  appointmentSlot?: string | null;
  status: string;
  checkInTime: string;
  notes?: string | null;
  recordedBy?: string | null;
  date: string;
}) {
  void (async () => {
    try {
      const cfg = await getGoogleSheetConfig();
      if (!cfg.webhookUrl || !cfg.autoSyncOnScan) return;
      const result = await postToGoogleSheetWebhook(cfg, {
        sheetTitle: row.date,
        date: row.date,
        rows: [
          {
            ...row,
            statusAr: formatStatusAr(row.status),
          },
        ],
      });
      await saveGoogleSheetConfig({
        ...cfg,
        lastSyncedAt: new Date().toISOString(),
        lastSyncStatus: result.ok ? "ok" : `error: ${result.error}`,
      });
    } catch {
      // Never block QR scan response
    }
  })();
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
    const requestedStatus: "present" | "late" = req.body.status === "late" ? "late" : "present";
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
      normalizeSlot(slotOverride) !== normalizeSlot(enrolledSlot)
    );
    const isCrossCenter = Boolean(
      centerOverride &&
      centerOverride !== "all" &&
      enrolledCenter &&
      canonicalizeCenterName(centerOverride) !== canonicalizeCenterName(enrolledCenter)
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

    const now = new Date();
    let attendanceRecord = existingRecord;
    let alreadyRecorded = false;

    if (existingRecord && existingRecord.status === requestedStatus) {
      alreadyRecorded = true;
    } else {
      if (existingRecord) {
        // Update status (e.g. absent -> present/late or present <-> late)
        const [updated] = await db
          .update(studentAttendanceTable)
          .set({
            status: requestedStatus,
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
        // Insert new present/late record
        const [inserted] = await db
          .insert(studentAttendanceTable)
          .values({
            studentId: student.id,
            date,
            status: requestedStatus,
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

    // Automatically update student profile center & appointment slot in real time upon attendance recording
    // IMPORTANT: Only update center if the student does NOT already have a confirmed center assigned.
    // This prevents scanner session center from overwriting the student's registered center.
    const studentEnrolledCenter = (student as any).centerName || (student as any).center || null;
    const studentHasCenter = Boolean(studentEnrolledCenter && String(studentEnrolledCenter).trim());
    const shouldUpdateCenter =
      centerName &&
      centerName !== "all" &&
      centerName !== "بدون سنتر محدد" &&
      !studentHasCenter; // Only update if student has no center yet

    if (shouldUpdateCenter) {
      try {
        await db
          .update(studentsTable)
          .set({
            centerName,
            appointmentSlot: (appointmentSlot && appointmentSlot !== "all") ? appointmentSlot : (student as any).appointmentSlot,
            centerConfirmed: true,
            centerConfirmedAt: now,
            learningMode: "offline",
          })
          .where(eq(studentsTable.id, student.id));
      } catch (err) {
        console.error("Failed to update student profile center:", err);
      }
    } else if (
      centerName &&
      centerName !== "all" &&
      centerName !== "بدون سنتر محدد" &&
      studentHasCenter &&
      !isCrossCenter
    ) {
      // Student already has a center — only update the appointmentSlot if a new one was provided from the scanner
      // and learningMode to offline (but never overwrite centerName)
      if (appointmentSlot && appointmentSlot !== "all" && !(student as any).appointmentSlot) {
        try {
          await db
            .update(studentsTable)
            .set({
              appointmentSlot,
              learningMode: "offline",
            })
            .where(eq(studentsTable.id, student.id));
        } catch (err) {
          console.error("Failed to update student appointment slot:", err);
        }
      }
    }

    // Check if parent account is registered
    const [parent] = await db
      .select()
      .from(parentsTable)
      .where(eq(parentsTable.studentId, student.id))
      .limit(1);

    const hasParentAccount = Boolean(parent);
    let parentNotified = Boolean(attendanceRecord?.parentNotified && hasParentAccount);

    // Notify student inbox (and flag parentNotified truthfully only when a parent account exists)
    if (!alreadyRecorded && notifyParent && !attendanceRecord?.parentNotified) {
      const timeStr = getCairoTimeFormatted();
      try {
        await db.insert(studentNotificationsTable).values({
          studentId: student.id,
          title: requestedStatus === "late" ? "تسجيل حضور متأخر ⏰" : "تسجيل حضور الحصة 📍",
          message: `تم تسجيل ${requestedStatus === "late" ? "حضور متأخر للطالب" : "حضور الطالب"} (${student.name}) لحصة اليوم (${date}) الساعة ${timeStr}.`,
          type: "attendance",
        });

        await db
          .update(studentAttendanceTable)
          .set({
            parentNotified: hasParentAccount,
            parentNotifiedAt: hasParentAccount ? new Date() : null,
          })
          .where(eq(studentAttendanceTable.id, attendanceRecord.id));

        parentNotified = hasParentAccount;
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

    const checkInTimeDisplay = attendanceRecord?.attendedAt
      ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(attendanceRecord.attendedAt))
      : getCairoTimeFormatted();

    if (!alreadyRecorded) {
      triggerBackgroundSheetSyncRow({
        studentId: student.id,
        accessCode: student.accessCode,
        name: student.name,
        phone: student.phone,
        parentPhone: student.parentPhone,
        grade: student.grade,
        centerName,
        appointmentSlot: (student as any).appointmentSlot || appointmentSlot,
        status: requestedStatus,
        checkInTime: checkInTimeDisplay,
        notes: attendanceRecord?.notes || (isCrossGroup ? `تعويض (${enrolledSlot})` : ""),
        recordedBy,
        date,
      });
    }

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
      hasParentAccount,
      parent: parent ? { id: parent.id, name: parent.name, phone: parent.phone, parentCode: parent.parentCode } : null,
      message: scanMessage,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 1.5. POST /api/admin/attendance/bulk-sync ────────────────────────────────
// Batch sync queued offline attendance records
router.post("/admin/attendance/bulk-sync", requireAdmin, async (req: Request, res, next) => {
  try {
    const rawScans = Array.isArray(req.body.scans) ? req.body.scans : [];
    if (rawScans.length === 0) {
      res.json({ success: true, syncedCount: 0, results: [] });
      return;
    }

    const adminIdentity = getAdminIdentity(req);
    const recordedBy =
      adminIdentity?.username ||
      (adminIdentity?.role === "superadmin" ? "د. محمود المهدي (أوفلاين مزامنة)" : "مشرف مساعد (أوفلاين مزامنة)");

    const results: Array<{
      localId: string;
      qrCode: string;
      studentId?: number;
      studentName?: string;
      success: boolean;
      alreadyRecorded?: boolean;
      isCrossGroup?: boolean;
      isCrossCenter?: boolean;
      error?: string;
    }> = [];

    let syncedCount = 0;

    for (const scanItem of rawScans) {
      const localId = String(scanItem.localId || "");
      const rawInput = String(scanItem.qrCode ?? scanItem.code ?? "").trim();
      const date = String(scanItem.date || getTodayCairoDate()).trim();
      const centerOverride = scanItem.centerName ? String(scanItem.centerName).trim() : null;
      const slotOverride = scanItem.appointmentSlot ? String(scanItem.appointmentSlot).trim() : null;
      const notes = scanItem.notes ? String(scanItem.notes).trim() : null;
      const notifyParent = scanItem.notifyParent !== false;
      const scannedAtDate = scanItem.scannedAt ? new Date(scanItem.scannedAt) : new Date();

      if (!rawInput) {
        results.push({
          localId,
          qrCode: rawInput,
          success: false,
          error: "كود الطالب مفقود",
        });
        continue;
      }

      try {
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
          results.push({
            localId,
            qrCode: rawInput,
            success: false,
            error: "صيغة كود غير صالحة",
          });
          continue;
        }

        const [student] = await db
          .select()
          .from(studentsTable)
          .where(sql`(${sql.join(lookupConditions, sql` OR `)})`)
          .limit(1);

        if (!student) {
          results.push({
            localId,
            qrCode: rawInput,
            success: false,
            error: "لم يتم العثور على طالب بهذا الكود",
          });
          continue;
        }

        const centerName =
          centerOverride && centerOverride !== "all"
            ? centerOverride
            : (student as any).centerName || (student as any).center || "السنتر الرئيسي";
        const appointmentSlot =
          slotOverride && slotOverride !== "all"
            ? slotOverride
            : (student as any).appointmentSlot || null;
        const academicStage = student.grade || "عام";

        const enrolledSlot = (student as any).appointmentSlot || null;
        const enrolledCenter = (student as any).centerName || (student as any).center || null;
        const isCrossGroup = Boolean(
          slotOverride &&
            slotOverride !== "all" &&
            enrolledSlot &&
            normalizeSlot(slotOverride) !== normalizeSlot(enrolledSlot)
        );
        const isCrossCenter = Boolean(
          centerOverride &&
            centerOverride !== "all" &&
            enrolledCenter &&
            centerOverride.trim() !== enrolledCenter.trim() &&
            !centerOverride.includes(enrolledCenter.trim()) &&
            !enrolledCenter.includes(centerOverride.trim())
        );

        // Check if attendance already recorded today
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

        const now = isNaN(scannedAtDate.getTime()) ? new Date() : scannedAtDate;
        let attendanceRecord = existingRecord;
        let alreadyRecorded = false;

        if (existingRecord && existingRecord.status === "present") {
          alreadyRecorded = true;
        } else {
          if (existingRecord) {
            const [updated] = await db
              .update(studentAttendanceTable)
              .set({
                status: "present",
                attendedAt: now,
                recordedBy,
                centerName,
                appointmentSlot,
                academicStage,
                notes: notes || (isCrossGroup ? `حضور تعويضي أوفلاين (الموعد الأصلي: ${enrolledSlot})` : existingRecord.notes),
                updatedAt: new Date(),
              })
              .where(eq(studentAttendanceTable.id, existingRecord.id))
              .returning();
            attendanceRecord = updated;
          } else {
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
                notes: notes || (isCrossGroup ? `حضور تعويضي أوفلاين (الموعد الأصلي: ${enrolledSlot})` : "تسجيل أوفلاين متزامن"),
                parentNotified: false,
              })
              .returning();
            attendanceRecord = inserted;
          }
          syncedCount++;
        }

        // Notify parent if requested and not notified yet
        if (!alreadyRecorded && notifyParent && !attendanceRecord?.parentNotified) {
          const timeStr = new Intl.DateTimeFormat("ar-EG", {
            timeZone: "Africa/Cairo",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }).format(now);

          try {
            await db.insert(studentNotificationsTable).values({
              studentId: student.id,
              title: "تسجيل حضور الحصة 📍 (مزامنة)",
              message: `تم تأكيد تسجيل حضور الطالب (${student.name}) لحصة اليوم (${date}) في تمام الساعة ${timeStr}. نتمنى له دوام التوفيق والتميز.`,
              type: "attendance",
            });

            await db
              .update(studentAttendanceTable)
              .set({
                parentNotified: true,
                parentNotifiedAt: new Date(),
              })
              .where(eq(studentAttendanceTable.id, attendanceRecord.id));
          } catch (notifErr) {
            console.error("Failed to insert bulk attendance notification:", notifErr);
          }
        }

        results.push({
          localId,
          qrCode: rawInput,
          studentId: student.id,
          studentName: student.name,
          success: true,
          alreadyRecorded,
          isCrossGroup,
          isCrossCenter,
        });
      } catch (scanErr: any) {
        results.push({
          localId,
          qrCode: rawInput,
          success: false,
          error: scanErr.message || "فشل تسجيل حضور الطالب",
        });
      }
    }

    if (syncedCount > 0) {
      await logAudit(
        req,
        "ATTENDANCE_BULK_SYNC",
        "attendance",
        null,
        `مزامنة حضور أوفلاين لـ ${syncedCount} طالب بنجاح`
      );
    }

    res.json({
      success: true,
      syncedCount,
      totalReceived: rawScans.length,
      results,
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

    // Fetch ONLY approved center/offline students OR students who actually have an attendance record on this date
    // (Prevents online-only students from polluting center rosters and crushing attendance rates)
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
      .where(
        sql`(
          ${studentsTable.status} = 'approved'
          AND (
            (${studentsTable.centerName} IS NOT NULL AND TRIM(${studentsTable.centerName}) != '' AND LOWER(${studentsTable.centerName}) != 'null')
            OR (${studentsTable.appointmentSlot} IS NOT NULL AND TRIM(${studentsTable.appointmentSlot}) != '' AND LOWER(${studentsTable.appointmentSlot}) != 'null')
          )
        ) OR ${studentsTable.id} IN (
          SELECT student_id FROM student_attendance WHERE date = ${date}
        )`
      )
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
      const center = canonicalizeCenterName(c);
      const slot = normalizeSlot(s) || "بدون موعد محدد";
      return `${center}:::${slot}`;
    };

    const getOrCreateGroupEntry = (center: string, slot: string) => {
      const canonicalCenter = canonicalizeCenterName(center);
      const canonicalSlot = normalizeSlot(slot) || "بدون موعد محدد";
      const key = `${canonicalCenter}:::${canonicalSlot}`;
      if (!groupStatsMap.has(key)) {
        groupStatsMap.set(key, {
          centerName: canonicalCenter,
          appointmentSlot: canonicalSlot,
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

    // 1. Tally enrolled students & their own attendance status cleanly (no cross-group inflation!)
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const enrolledMarkedByGroup = new Map<string, number>();

    students.forEach((st) => {
      if (st.centerName || st.appointmentSlot) {
        const homeCenter = st.centerName || "بدون سنتر محدد";
        const homeSlot = st.appointmentSlot || "بدون موعد محدد";
        const homeKey = getGroupKey(homeCenter, homeSlot);
        const entry = getOrCreateGroupEntry(homeCenter, homeSlot);
        entry.totalEnrolled += 1;

        const att = attendanceMap.get(st.id);
        if (att) {
          // Student was marked today (either in home group or as makeup in another group)
          enrolledMarkedByGroup.set(homeKey, (enrolledMarkedByGroup.get(homeKey) || 0) + 1);
          const attendedInOtherGroup =
            Boolean(att.appointmentSlot && st.appointmentSlot && normalizeSlot(att.appointmentSlot) !== normalizeSlot(st.appointmentSlot)) ||
            Boolean(att.centerName && st.centerName && !matchesCenterQuery(att.centerName, st.centerName));

          if (!attendedInOtherGroup) {
            if (att.status === "present") entry.presentCount += 1;
            else if (att.status === "absent") entry.absentCount += 1;
            else if (att.status === "late") entry.lateCount += 1;
          } else {
            // Count student as attended in their home group's stats AND record makeup in the visited group
            if (att.status === "present") entry.presentCount += 1;
            else if (att.status === "late") entry.lateCount += 1;
            else if (att.status === "absent") entry.absentCount += 1;

            const visitedEntry = getOrCreateGroupEntry(
              att.centerName || homeCenter,
              att.appointmentSlot || homeSlot
            );
            visitedEntry.makeupCount += 1;
          }
        }
      }
    });

    // 2. Also include walk-in / unattached attendance rows (students without an enrolled group)
    attendanceRows.forEach((att) => {
      const st = studentMap.get(att.studentId);
      if (st && (st.centerName || st.appointmentSlot)) return; // Already tallied above
      const attCenter = att.centerName || "بدون سنتر محدد";
      const attSlot = att.appointmentSlot || "بدون موعد محدد";
      const entry = getOrCreateGroupEntry(attCenter, attSlot);
      if (att.status === "present") entry.presentCount += 1;
      else if (att.status === "absent") entry.absentCount += 1;
      else if (att.status === "late") entry.lateCount += 1;
    });

    // 3. Finalize rates and unmarked accurately (never > 100% and never hides absent home-group students)
    groupStatsMap.forEach((g, key) => {
      const homeMarked = enrolledMarkedByGroup.get(key) || 0;
      g.unmarkedCount = Math.max(0, g.totalEnrolled - homeMarked);
      g.attendanceRate = g.totalEnrolled > 0
        ? Math.min(100, Math.round(((g.presentCount + g.lateCount) / g.totalEnrolled) * 100))
        : (g.presentCount + g.lateCount > 0 ? 100 : 0);
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
      const isCrossGroup = Boolean(actualSlot && enrolledSlot && normalizeSlot(actualSlot) !== normalizeSlot(enrolledSlot));

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
      records = records.filter(
        (r) => matchesCenterQuery(r.centerName, centerFilter) || matchesCenterQuery(r.enrolledCenter, centerFilter)
      );
    }
    if (slotFilter && slotFilter !== "all") {
      const targetSlot = normalizeSlot(slotFilter);
      records = records.filter((r) => normalizeSlot(r.appointmentSlot) === targetSlot || normalizeSlot(r.enrolledSlot) === targetSlot);
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

    // Only assign student profile center if the student does NOT already have a confirmed center
    // (Never overwrite a student's permanent center during a makeup session or fallback to generic label)
    const studentEnrolledCenter = (student as any).centerName || (student as any).center || null;
    const studentHasCenter = Boolean(studentEnrolledCenter && String(studentEnrolledCenter).trim());
    const effectiveCenter = centerOverride && centerOverride !== "all" ? centerOverride : null;
    const effectiveSlot = slotOverride && slotOverride !== "all" ? slotOverride : null;
    if (
      (status === "present" || status === "late") &&
      !studentHasCenter &&
      effectiveCenter &&
      effectiveCenter !== "بدون سنتر محدد" &&
      effectiveCenter !== "السنتر الرئيسي"
    ) {
      try {
        await db
          .update(studentsTable)
          .set({
            centerName: effectiveCenter,
            appointmentSlot: effectiveSlot || (student as any).appointmentSlot,
            centerConfirmed: true,
            centerConfirmedAt: now,
            learningMode: "offline",
          })
          .where(eq(studentsTable.id, student.id));
      } catch (err) {
        console.error("Failed to update student profile center manually:", err);
      }
    }

    // Check if parent account actually exists
    const [parent] = await db
      .select({ id: parentsTable.id })
      .from(parentsTable)
      .where(eq(parentsTable.studentId, studentId))
      .limit(1);
    const hasParentAccount = Boolean(parent);

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
          parentNotified = hasParentAccount;
        } else if (status === "absent") {
          await db.insert(studentNotificationsTable).values({
            studentId,
            title: "إخطار غياب عن الحصة ⚠️",
            message: `نحيطكم علماً بعدم حضور الطالب (${student.name}) لحصة اليوم (${date}). يرجى المتابعة للتأكد من مستواه.`,
            type: "attendance_absent",
          });
          parentNotified = hasParentAccount;
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

    triggerBackgroundSheetSyncRow({
      studentId: student.id,
      accessCode: student.accessCode,
      name: student.name,
      phone: student.phone,
      parentPhone: student.parentPhone,
      grade: student.grade,
      centerName,
      appointmentSlot,
      status,
      checkInTime: updatedAttendance?.attendedAt
        ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(updatedAttendance.attendedAt))
        : "",
      notes: notes || "",
      recordedBy,
      date,
    });

    res.json({
      success: true,
      attendance: updatedAttendance,
      parentNotified,
      hasParentAccount,
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

    // Get all approved students assigned to offline centers (never mark online students absent)
    let students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        grade: studentsTable.grade,
        centerName: (studentsTable as any).centerName,
        appointmentSlot: (studentsTable as any).appointmentSlot,
      })
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.status, "approved"),
          sql`(${studentsTable.centerName} IS NOT NULL AND TRIM(${studentsTable.centerName}) != '' AND LOWER(${studentsTable.centerName}) != 'null')`
        )
      );

    if (stageFilter && stageFilter !== "all") {
      students = students.filter((s) => s.grade?.toLowerCase().includes(stageFilter.toLowerCase()));
    }
    if (centerFilter && centerFilter !== "all") {
      students = students.filter((s) => matchesCenterQuery(s.centerName, centerFilter));
    }
    if (slotFilter && slotFilter !== "all") {
      const targetSlot = normalizeSlot(slotFilter);
      students = students.filter((s) => normalizeSlot(s.appointmentSlot) === targetSlot);
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

    await db.insert(studentAttendanceTable).values(insertValues).onConflictDoNothing();

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

// ─── 5. DELETE /api/admin/attendance/:studentId ───────────────────────────────
// Undo / remove a student's attendance record for a specific date
router.delete("/admin/attendance/:studentId", requireAdmin, async (req: Request, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const date = String(req.query.date || getTodayCairoDate()).trim();
    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      res.status(400).json({ error: "معرّف الطالب غير صحيح" });
      return;
    }

    const deleted = await db
      .delete(studentAttendanceTable)
      .where(
        and(
          eq(studentAttendanceTable.studentId, studentId),
          eq(studentAttendanceTable.date, date)
        )
      )
      .returning();

    await logAudit(
      req,
      "ATTENDANCE_UNDO",
      "attendance",
      studentId,
      `تراجع عن تسجيل حضور الطالب #${studentId} بتاريخ ${date}`
    );

    res.json({
      success: true,
      deletedCount: deleted.length,
      message: "تم التراجع عن تسجيل الحضور بنجاح",
    });
  } catch (error) {
    next(error);
  }
});

// ─── 6. STUDENT DAILY PLATFORM CHECK-IN (إثبات الحضور اليومي على المنصة) ──────
const DAILY_CHECKIN_LAUNCH_DATE = "2026-11-24";
let dailyCheckinTableReady = false;

async function ensureDailyCheckinTable() {
  if (dailyCheckinTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_daily_checkins (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (student_id, date)
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_student_daily_checkins_student_date
    ON student_daily_checkins (student_id, date DESC)
  `);
  dailyCheckinTableReady = true;
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getArabicShortDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "short",
  }).format(dt);
}

async function buildDailyCheckinStatus(student: typeof studentsTable.$inferSelect) {
  await ensureDailyCheckinTable();
  const today = getTodayCairoDate();
  const yesterday = addDaysYmd(today, -1);

  const rawRows = await db.execute(sql`
    SELECT date, checked_in_at
    FROM student_daily_checkins
    WHERE student_id = ${student.id}
    ORDER BY date DESC
    LIMIT 60
  `);
  const rows: Array<{ date: string; checked_in_at: string }> = Array.isArray(rawRows)
    ? (rawRows as any)
    : ((rawRows as any)?.rows || []);

  const dateSet = new Set(rows.map((r) => String(r.date).slice(0, 10)));
  const checkedInToday = dateSet.has(today);

  // Compute current streak (counting back from today if checked in, else from yesterday)
  let streakDays = 0;
  let cursor = checkedInToday ? today : yesterday;
  while (dateSet.has(cursor)) {
    streakDays++;
    cursor = addDaysYmd(cursor, -1);
  }

  // Compute missed days ONLY since max(launchDate, studentCreatedDate) up to yesterday
  const createdYmd = student.createdAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(student.createdAt))
    : DAILY_CHECKIN_LAUNCH_DATE;
  const effectiveStart = createdYmd > DAILY_CHECKIN_LAUNCH_DATE ? createdYmd : DAILY_CHECKIN_LAUNCH_DATE;

  let missedDaysCount = 0;
  let missedYesterday = false;
  if (effectiveStart <= yesterday) {
    let day = effectiveStart;
    let guard = 0;
    while (day <= yesterday && guard < 90) {
      if (!dateSet.has(day)) {
        missedDaysCount++;
        if (day === yesterday) missedYesterday = true;
      }
      day = addDaysYmd(day, 1);
      guard++;
    }
  }

  // Last 7 days mini-calendar (oldest -> today)
  const recentDays = [];
  for (let offset = -6; offset <= 0; offset++) {
    const ymd = addDaysYmd(today, offset);
    recentDays.push({
      date: ymd,
      dayLabel: getArabicShortDay(ymd),
      checkedIn: dateSet.has(ymd),
      isToday: offset === 0,
      isMissed: ymd >= effectiveStart && ymd < today && !dateSet.has(ymd),
    });
  }

  // If student missed yesterday, send ONE warning notification today (deduped)
  if (missedYesterday && missedDaysCount > 0) {
    try {
      const existingWarn = await db.execute(sql`
        SELECT id FROM student_notifications
        WHERE student_id = ${student.id}
          AND type = 'daily_absence_warning'
          AND created_at >= (NOW() AT TIME ZONE 'Africa/Cairo')::date
        LIMIT 1
      `);
      const warnRows = Array.isArray(existingWarn) ? existingWarn : ((existingWarn as any)?.rows || []);
      if (warnRows.length === 0) {
        const msg =
          missedDaysCount >= 3
            ? `تنبيه مهم! وصلت لـ ${missedDaysCount} أيام غياب عن المنصة. تكرار الغياب أكتر من 3 مرات بيؤدي لإغلاق المنصة — التزم بتسجيل حضورك اليومي من النهارده.`
            : `ملاحظناش تسجيل حضورك على المنصة امبارح (إجمالي الغياب: ${missedDaysCount} من 3). خليك ملتزم بالدخول يومياً عشان تكرار الغياب أكتر من 3 مرات بيؤدي لإغلاق المنصة.`;
        await db.insert(studentNotificationsTable).values({
          studentId: student.id,
          title: "⚠️ تنبيه غياب يومي عن المنصة",
          message: msg,
          type: "daily_absence_warning",
        });
      }
    } catch (err) {
      console.error("Failed to insert daily absence warning:", err);
    }
  }

  return {
    todayDate: today,
    checkedInToday,
    streakDays,
    totalCheckins: rows.length,
    missedDaysCount,
    missedYesterday,
    maxAllowedMisses: 3,
    recentDays,
  };
}

// GET /api/learning/daily-checkin/status
router.get("/learning/daily-checkin/status", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const status = await buildDailyCheckinStatus(student);
    res.setHeader("Cache-Control", "no-store");
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// POST /api/learning/daily-checkin
router.post("/learning/daily-checkin", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    await ensureDailyCheckinTable();
    const today = getTodayCairoDate();

    await db.execute(sql`
      INSERT INTO student_daily_checkins (student_id, date, checked_in_at)
      VALUES (${student.id}, ${today}, NOW())
      ON CONFLICT (student_id, date) DO NOTHING
    `);

    const status = await buildDailyCheckinStatus(student);
    res.json({ success: true, ...status });
  } catch (error) {
    next(error);
  }
});

// ─── Google Apps Script Webhook Sync Endpoints ────────────────────────────────

router.get("/admin/attendance/google-sheet-config", requireAdmin, async (_req: Request, res, next) => {
  try {
    const cfg = await getGoogleSheetConfig();
    res.json({
      success: true,
      webhookUrl: cfg.webhookUrl,
      hasSecret: Boolean(cfg.secretToken),
      autoSyncOnScan: cfg.autoSyncOnScan,
      lastSyncedAt: cfg.lastSyncedAt || null,
      lastSyncStatus: cfg.lastSyncStatus || null,
      appsScriptCode: APPS_SCRIPT_TEMPLATE,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/admin/attendance/google-sheet-config", requireAdmin, async (req: Request, res, next) => {
  try {
    const webhookUrl = String(req.body?.webhookUrl || "").trim();
    const secretToken = String(req.body?.secretToken || "").trim();
    const autoSyncOnScan = req.body?.autoSyncOnScan !== false;

    if (webhookUrl && !isValidAppsScriptUrl(webhookUrl)) {
      res.status(400).json({
        error: "يجب أن يبدأ الرابط بـ https://script.google.com/ أو https://script.googleusercontent.com/",
      });
      return;
    }

    const current = await getGoogleSheetConfig();
    const nextConfig: AttendanceGoogleSheetConfig = {
      webhookUrl,
      secretToken: secretToken || (webhookUrl ? current.secretToken : ""),
      autoSyncOnScan,
      lastSyncedAt: current.lastSyncedAt || null,
      lastSyncStatus: webhookUrl ? current.lastSyncStatus || null : null,
    };

    await saveGoogleSheetConfig(nextConfig);
    res.json({
      success: true,
      webhookUrl: nextConfig.webhookUrl,
      autoSyncOnScan: nextConfig.autoSyncOnScan,
      lastSyncedAt: nextConfig.lastSyncedAt,
      lastSyncStatus: nextConfig.lastSyncStatus,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/attendance/google-sheet-test", requireAdmin, async (req: Request, res, next) => {
  try {
    const suppliedUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl.trim() : "";
    const current = await getGoogleSheetConfig();
    const targetConfig: AttendanceGoogleSheetConfig = {
      ...current,
      webhookUrl: suppliedUrl || current.webhookUrl,
    };

    const result = await postToGoogleSheetWebhook(targetConfig, { action: "ping" });
    if (!result.ok) {
      res.status(400).json({ error: result.error || "فشل اختبار الاتصال بـ Google Sheets" });
      return;
    }

    res.json({
      success: true,
      message: "تم الاتصال بملف Google Sheets بنجاح ✓",
      remote: result.data,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/attendance/sync-google-sheet", requireAdmin, async (req: Request, res, next) => {
  try {
    const cfg = await getGoogleSheetConfig();
    if (!cfg.webhookUrl || !isValidAppsScriptUrl(cfg.webhookUrl)) {
      res.status(400).json({ error: "يرجى ربط رابط Google Apps Script أولاً من إعدادات Google Sheets" });
      return;
    }

    const date = String(req.body?.date || getTodayCairoDate()).trim();
    const sheetTitle = String(req.body?.sheetTitle || date).trim().slice(0, 90);
    const adminIdentity = getAdminIdentity(req);
    const recordedBy = adminIdentity?.username || "المشرف";
    const incomingRows = Array.isArray(req.body?.rows) ? req.body.rows : null;

    let rowsToSend: Array<Record<string, unknown>> = [];
    if (incomingRows && incomingRows.length > 0) {
      rowsToSend = incomingRows.map((r: any) => ({
        studentId: Number(r.studentId) || "",
        accessCode: r.accessCode || "",
        name: r.name || "",
        phone: r.phone || "",
        parentPhone: r.parentPhone || "",
        grade: r.grade || "",
        centerName: r.centerName || r.center || r.enrolledCenter || "أونلاين",
        appointmentSlot: r.appointmentSlot || r.enrolledSlot || "",
        status: r.status || "unmarked",
        statusAr: formatStatusAr(String(r.status || "unmarked")),
        checkInTime: r.checkInTime || "",
        notes: r.notes || (r.isCrossGroup && r.enrolledSlot ? `تعويض (${r.enrolledSlot})` : ""),
        recordedBy: r.recordedBy || recordedBy,
        date,
      }));
    } else {
      const dbRows = await db
        .select({
          studentId: studentsTable.id,
          accessCode: studentsTable.accessCode,
          name: studentsTable.name,
          phone: studentsTable.phone,
          parentPhone: studentsTable.parentPhone,
          grade: studentsTable.grade,
          centerName: studentAttendanceTable.centerName,
          appointmentSlot: studentAttendanceTable.appointmentSlot,
          status: studentAttendanceTable.status,
          attendedAt: studentAttendanceTable.attendedAt,
          notes: studentAttendanceTable.notes,
          recordedBy: studentAttendanceTable.recordedBy,
        })
        .from(studentAttendanceTable)
        .innerJoin(studentsTable, eq(studentAttendanceTable.studentId, studentsTable.id))
        .where(eq(studentAttendanceTable.date, date));

      rowsToSend = dbRows.map((r) => ({
        studentId: r.studentId,
        accessCode: r.accessCode || "",
        name: r.name || "",
        phone: r.phone || "",
        parentPhone: r.parentPhone || "",
        grade: r.grade || "",
        centerName: r.centerName || "بدون سنتر محدد",
        appointmentSlot: r.appointmentSlot || "",
        status: r.status,
        statusAr: formatStatusAr(r.status),
        checkInTime: r.attendedAt
          ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(r.attendedAt))
          : "",
        notes: r.notes || "",
        recordedBy: r.recordedBy || recordedBy,
        date,
      }));
    }

    if (rowsToSend.length === 0) {
      res.status(400).json({ error: "لا توجد سجلات حضور مسجلة لليوم لترحيلها" });
      return;
    }

    const pushRes = await postToGoogleSheetWebhook(cfg, {
      sheetTitle,
      date,
      rows: rowsToSend,
    });

    await saveGoogleSheetConfig({
      ...cfg,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: pushRes.ok ? `ok (${rowsToSend.length})` : `error: ${pushRes.error}`,
    });

    if (!pushRes.ok) {
      res.status(502).json({ error: pushRes.error || "تعذر إرسال البيانات إلى Google Sheets" });
      return;
    }

    res.json({
      success: true,
      syncedCount: rowsToSend.length,
      sheetTitle,
      remote: pushRes.data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
