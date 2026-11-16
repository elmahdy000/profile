/**
 * Offline Attendance Engine (Dr. Mahmoud Elmahdy Educational Platform)
 * Enables seamless QR scanning, instant student lookup, and local attendance recording
 * when there is no internet connection, and automatically syncs when connection is restored.
 */

export interface CachedStudentInfo {
  studentId: number;
  name: string;
  phone: string;
  accessCode: string;
  grade: string;
  center?: string | null;
  appointmentSlot?: string | null;
  enrolledCenter?: string | null;
  enrolledSlot?: string | null;
  parentPhone?: string | null;
  parentName?: string | null;
  avatarUrl?: string | null;
  cachedAt?: number;
}

export interface QueuedAttendanceScan {
  id: string; // unique local ID e.g. "scan_17317654321_547"
  qrCode: string;
  date: string;
  centerName?: string;
  appointmentSlot?: string;
  status: "present" | "late";
  notes?: string;
  notifyParent: boolean;
  scannedAt: string; // ISO string or Cairo time
  studentInfo?: CachedStudentInfo;
  synced: boolean;
  retryCount?: number;
  error?: string;
}

const DB_NAME = "DrElmahdyAttendance_v1";
const DB_VERSION = 1;
const STORE_ROSTER = "roster_cache";
const STORE_QUEUE = "offline_queue";

export const EVENT_ATTENDANCE_QUEUE_CHANGED = "dr_attendance_queue_changed";

// Fallback LocalStorage keys
const LS_ROSTER_KEY = "dr_offline_roster_cache_fallback";
const LS_QUEUE_KEY = "dr_offline_attendance_queue_fallback";

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB غير مدعوم في هذا المتصفح"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ROSTER)) {
        const rosterStore = db.createObjectStore(STORE_ROSTER, { keyPath: "studentId" });
        rosterStore.createIndex("accessCode", "accessCode", { unique: false });
        rosterStore.createIndex("phone", "phone", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
        queueStore.createIndex("synced", "synced", { unique: false });
        queueStore.createIndex("date", "date", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function dispatchQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_ATTENDANCE_QUEUE_CHANGED));
  }
}

// ── Arabic & Digit Helpers ───────────────────────────────────────────────────

export function normalizeDigits(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
}

export function cleanDigits(str: string): string {
  return normalizeDigits(str).replace(/[^\d]/g, "");
}

// ── 1. Roster Caching ────────────────────────────────────────────────────────

/**
 * Cache list of students locally in IndexedDB / localStorage.
 * Called automatically every time the daily sheet is loaded while online.
 */
export async function cacheStudentRoster(records: any[]): Promise<void> {
  if (!records || !Array.isArray(records) || records.length === 0) return;

  const studentsToCache: CachedStudentInfo[] = records.map((r) => ({
    studentId: r.studentId || r.id,
    name: r.name || "",
    phone: cleanDigits(r.phone || ""),
    accessCode: (r.accessCode || "").trim().toUpperCase(),
    grade: r.grade || "",
    center: r.center || null,
    appointmentSlot: r.appointmentSlot || null,
    enrolledCenter: r.enrolledCenter || r.center || null,
    enrolledSlot: r.enrolledSlot || r.appointmentSlot || null,
    parentPhone: cleanDigits(r.parentPhone || ""),
    parentName: r.parentName || null,
    avatarUrl: r.avatarUrl || null,
    cachedAt: Date.now(),
  }));

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ROSTER, "readwrite");
    const store = tx.objectStore(STORE_ROSTER);

    for (const st of studentsToCache) {
      if (st.studentId) {
        store.put(st);
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const existingRaw = window.localStorage.getItem(LS_ROSTER_KEY);
        const existing: Record<number, CachedStudentInfo> = existingRaw ? JSON.parse(existingRaw) : {};
        for (const st of studentsToCache) {
          if (st.studentId) existing[st.studentId] = st;
        }
        window.localStorage.setItem(LS_ROSTER_KEY, JSON.stringify(existing));
      }
    } catch (lsErr) {
      console.warn("Offline roster caching localStorage fallback failed:", lsErr);
    }
  }
}

/**
 * Fast offline lookup for a student by QR code string, access code, phone, or ID.
 */
export async function findStudentOffline(rawInput: string): Promise<CachedStudentInfo | null> {
  if (!rawInput) return null;
  const inputTrimmed = rawInput.trim();

  let targetId: number | null = null;
  let targetPhone = "";
  let targetAccessCode = "";

  const stdMatch = inputTrimmed.match(/^STD-(\d+)-?(\d+)?$/i);
  if (stdMatch) {
    targetId = Number(stdMatch[1]);
    if (stdMatch[2]) targetPhone = cleanDigits(stdMatch[2]);
  } else if (/^ID:\s*(\d+)$/i.test(inputTrimmed)) {
    targetId = Number(inputTrimmed.replace(/^ID:\s*/i, ""));
  } else {
    const cleanDigitsInput = cleanDigits(inputTrimmed);
    if (cleanDigitsInput.length >= 8 && cleanDigitsInput.startsWith("01")) {
      targetPhone = cleanDigitsInput;
    } else if (/^\d+$/.test(inputTrimmed) && Number(inputTrimmed) > 0 && Number(inputTrimmed) < 100000) {
      targetId = Number(inputTrimmed);
    }
    targetAccessCode = normalizeDigits(inputTrimmed).toUpperCase();
  }

  // 1. Try reading from IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ROSTER, "readonly");
    const store = tx.objectStore(STORE_ROSTER);

    if (targetId) {
      const student = await new Promise<CachedStudentInfo | undefined>((resolve, reject) => {
        const req = store.get(targetId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (student) return student;
    }

    // Scan all items in store to match accessCode, phone, or name
    const allStudents = await new Promise<CachedStudentInfo[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const found = allStudents.find((s) => {
      if (targetId && s.studentId === targetId) return true;
      if (targetAccessCode && s.accessCode && s.accessCode.toUpperCase() === targetAccessCode) return true;
      if (targetPhone && s.phone && s.phone.endsWith(targetPhone.slice(-8))) return true;
      if (s.name && s.name.trim() === inputTrimmed) return true;
      return false;
    });

    if (found) return found;
  } catch (err) {
    // Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const existingRaw = window.localStorage.getItem(LS_ROSTER_KEY);
        if (existingRaw) {
          const dict: Record<number, CachedStudentInfo> = JSON.parse(existingRaw);
          const list = Object.values(dict);
          const found = list.find((s) => {
            if (targetId && s.studentId === targetId) return true;
            if (targetAccessCode && s.accessCode && s.accessCode.toUpperCase() === targetAccessCode) return true;
            if (targetPhone && s.phone && s.phone.endsWith(targetPhone.slice(-8))) return true;
            if (s.name && s.name.trim() === inputTrimmed) return true;
            return false;
          });
          if (found) return found;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

// ── 2. Offline Queue Management ──────────────────────────────────────────────

/**
 * Queue an attendance scan locally when offline.
 */
export async function queueOfflineScan(scan: Omit<QueuedAttendanceScan, "id" | "synced">): Promise<QueuedAttendanceScan> {
  const newScan: QueuedAttendanceScan = {
    ...scan,
    id: `offline_scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    synced: false,
    retryCount: 0,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).put(newScan);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(LS_QUEUE_KEY);
        const list: QueuedAttendanceScan[] = raw ? JSON.parse(raw) : [];
        list.push(newScan);
        window.localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(list));
      }
    } catch (lsErr) {
      console.warn("Failed to queue offline scan in localStorage:", lsErr);
    }
  }

  dispatchQueueChanged();
  return newScan;
}

/**
 * Retrieve all pending (unsynced) offline scans.
 */
export async function getOfflineQueue(): Promise<QueuedAttendanceScan[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const store = tx.objectStore(STORE_QUEUE);
    const items = await new Promise<QueuedAttendanceScan[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return items.filter((item) => !item.synced);
  } catch (err) {
    // Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(LS_QUEUE_KEY);
        const list: QueuedAttendanceScan[] = raw ? JSON.parse(raw) : [];
        return list.filter((item) => !item.synced);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

/**
 * Get count of pending offline scans.
 */
export async function getPendingOfflineCount(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}

/**
 * Remove successfully synced scans from local queue.
 */
export async function removeQueuedScans(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    for (const id of ids) {
      store.delete(id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(LS_QUEUE_KEY);
        if (raw) {
          const list: QueuedAttendanceScan[] = JSON.parse(raw);
          const filtered = list.filter((item) => !idSet.has(item.id));
          window.localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(filtered));
        }
      }
    } catch {
      // Ignore
    }
  }

  dispatchQueueChanged();
}

/**
 * Clear all offline queue records.
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(LS_QUEUE_KEY);
      }
    } catch {
      // Ignore
    }
  }
  dispatchQueueChanged();
}

// ── 3. Synchronization Engine ────────────────────────────────────────────────

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  totalPending: number;
  results: Array<{
    id: string;
    qrCode: string;
    studentName?: string;
    success: boolean;
    alreadyRecorded?: boolean;
    isCrossGroup?: boolean;
    error?: string;
  }>;
}

/**
 * Synchronize all queued offline scans with the server.
 * Uses batch endpoint POST /api/admin/attendance/bulk-sync if available,
 * falling back to individual calls if needed.
 */
export async function syncOfflineAttendance(): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, totalPending: 0, results: [] };
  }

  // Attempt batch sync first
  try {
    const payload = {
      scans: queue.map((q) => ({
        localId: q.id,
        qrCode: q.qrCode,
        date: q.date,
        centerName: q.centerName,
        appointmentSlot: q.appointmentSlot,
        status: q.status || "present",
        notes: q.notes,
        notifyParent: q.notifyParent,
        scannedAt: q.scannedAt,
      })),
    };

    const res = await fetch("/api/admin/attendance/bulk-sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const serverResults = data.results || [];
      const successfulIds: string[] = [];

      serverResults.forEach((r: any) => {
        if (r.success || r.alreadyRecorded) {
          successfulIds.push(r.localId);
        }
      });

      // Remove successful scans
      if (successfulIds.length > 0) {
        await removeQueuedScans(successfulIds);
      }

      return {
        syncedCount: successfulIds.length,
        failedCount: queue.length - successfulIds.length,
        totalPending: queue.length,
        results: serverResults,
      };
    }
  } catch (err) {
    console.warn("Batch sync failed, attempting individual scan fallback...", err);
  }

  // Fallback: Individual sync for each queued scan
  const successfulIds: string[] = [];
  const results: SyncResult["results"] = [];

  for (const item of queue) {
    try {
      const res = await fetch("/api/admin/attendance/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: item.qrCode,
          date: item.date,
          status: item.status,
          centerName: item.centerName,
          appointmentSlot: item.appointmentSlot,
          notifyParent: item.notifyParent,
          notes: item.notes,
        }),
      });

      const data = await res.json();
      if (res.ok || data.alreadyRecorded) {
        successfulIds.push(item.id);
        results.push({
          id: item.id,
          qrCode: item.qrCode,
          studentName: data.student?.name || item.studentInfo?.name,
          success: true,
          alreadyRecorded: Boolean(data.alreadyRecorded),
          isCrossGroup: Boolean(data.isCrossGroup),
        });
      } else {
        results.push({
          id: item.id,
          qrCode: item.qrCode,
          studentName: item.studentInfo?.name,
          success: false,
          error: data.error || "خطأ غير معروف في المزامنة",
        });
      }
    } catch (err: any) {
      results.push({
        id: item.id,
        qrCode: item.qrCode,
        studentName: item.studentInfo?.name,
        success: false,
        error: err.message || "فشل الاتصال بالخادم",
      });
    }
  }

  if (successfulIds.length > 0) {
    await removeQueuedScans(successfulIds);
  }

  return {
    syncedCount: successfulIds.length,
    failedCount: queue.length - successfulIds.length,
    totalPending: queue.length,
    results,
  };
}
