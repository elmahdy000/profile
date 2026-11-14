/**
 * Offline Storage Engine for Lessons & Questions (Dr. Mahmoud Elmahdy Educational Platform)
 * Implements high-performance client-side IndexedDB caching with local storage fallback
 * and real-time reactive event dispatching.
 */

export interface OfflineSavedLesson {
  id: number;
  title: string;
  courseTitle?: string;
  grade?: string;
  unit?: string;
  description?: string;
  duration?: number;
  thumbnailUrl?: string;
  notes?: string;
  summaryContent?: string;
  keyPoints?: string[];
  definitions?: Array<{ term: string; definition: string; category?: string }>;
  mindmapNodes?: any[];
  flashcards?: Array<{ front: string; back: string; topic?: string }>;
  questions?: any[];
  files?: Array<{ id: number; title: string; sizeBytes?: number | null; url?: string }>;
  savedAt: string;
}

export interface OfflineSavedQuestion {
  id: string | number;
  lessonId?: number;
  lessonTitle?: string;
  unit?: string;
  difficulty?: string;
  type: "mcq" | "true_false" | "essay";
  prompt: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  hint?: string;
  imageUrl?: string;
  translation?: string;
  savedAt: string;
}

export interface OfflineStorageMetrics {
  lessonsCount: number;
  questionsCount: number;
  estimatedBytes: number;
  estimatedMbFormatted: string;
}

const DB_NAME = "DrElmahdyOfflineVault_v1";
const DB_VERSION = 1;
const STORE_LESSONS = "saved_lessons";
const STORE_QUESTIONS = "saved_questions";
const EVENT_VAULT_CHANGED = "dr_offline_vault_changed";

// Fallback keys for localStorage
const LS_LESSONS_KEY = "dr_offline_lessons_fallback";
const LS_QUESTIONS_KEY = "dr_offline_questions_fallback";

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
      if (!db.objectStoreNames.contains(STORE_LESSONS)) {
        db.createObjectStore(STORE_LESSONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        db.createObjectStore(STORE_QUESTIONS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dispatchVaultChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_VAULT_CHANGED));
  }
}

// ── 1. Lessons Offline API ───────────────────────────────────────────────────

export async function saveLessonOffline(lesson: OfflineSavedLesson): Promise<boolean> {
  try {
    const lessonItem: OfflineSavedLesson = {
      ...lesson,
      savedAt: lesson.savedAt || new Date().toISOString(),
    };

    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_LESSONS, "readwrite");
        const store = tx.objectStore(STORE_LESSONS);
        const req = store.put(lessonItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const current = getFallbackLessons();
      const updated = current.filter((l) => l.id !== lesson.id);
      updated.unshift(lessonItem);
      localStorage.setItem(LS_LESSONS_KEY, JSON.stringify(updated));
    }

    // Attempt cloud sync in background if online
    void syncCloudSave("lesson", `lesson-${lesson.id}`, lesson.title, lesson.id, lessonItem);

    dispatchVaultChanged();
    return true;
  } catch (err) {
    console.error("Failed to save lesson offline:", err);
    return false;
  }
}

export async function removeLessonOffline(lessonId: number): Promise<boolean> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_LESSONS, "readwrite");
        const store = tx.objectStore(STORE_LESSONS);
        const req = store.delete(lessonId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const current = getFallbackLessons();
      const updated = current.filter((l) => l.id !== lessonId);
      localStorage.setItem(LS_LESSONS_KEY, JSON.stringify(updated));
    }

    // Attempt cloud remove in background if online
    void syncCloudRemove("lesson", `lesson-${lessonId}`);

    dispatchVaultChanged();
    return true;
  } catch (err) {
    console.error("Failed to remove lesson offline:", err);
    return false;
  }
}

export async function getSavedLessonsOffline(): Promise<OfflineSavedLesson[]> {
  try {
    if (!isIndexedDBAvailable()) {
      return getFallbackLessons();
    }
    const db = await openDB();
    return await new Promise<OfflineSavedLesson[]>((resolve, reject) => {
      const tx = db.transaction(STORE_LESSONS, "readonly");
      const store = tx.objectStore(STORE_LESSONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineSavedLesson[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to get saved lessons offline:", err);
    return getFallbackLessons();
  }
}

export async function isLessonSavedOffline(lessonId: number): Promise<boolean> {
  try {
    if (!isIndexedDBAvailable()) {
      return getFallbackLessons().some((l) => l.id === lessonId);
    }
    const db = await openDB();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_LESSONS, "readonly");
      const store = tx.objectStore(STORE_LESSONS);
      const req = store.getKey(lessonId);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ── 2. Questions Offline API ─────────────────────────────────────────────────

export async function saveQuestionOffline(question: OfflineSavedQuestion): Promise<boolean> {
  try {
    const qItem: OfflineSavedQuestion = {
      ...question,
      savedAt: question.savedAt || new Date().toISOString(),
    };

    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUESTIONS, "readwrite");
        const store = tx.objectStore(STORE_QUESTIONS);
        const req = store.put(qItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const current = getFallbackQuestions();
      const updated = current.filter((q) => String(q.id) !== String(question.id));
      updated.unshift(qItem);
      localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(updated));
    }

    // Attempt cloud sync in background if online
    void syncCloudSave("question", `question-${question.id}`, question.prompt?.slice(0, 80), undefined, qItem);

    dispatchVaultChanged();
    return true;
  } catch (err) {
    console.error("Failed to save question offline:", err);
    return false;
  }
}

export async function removeQuestionOffline(questionId: string | number): Promise<boolean> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUESTIONS, "readwrite");
        const store = tx.objectStore(STORE_QUESTIONS);
        const req = store.delete(questionId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const current = getFallbackQuestions();
      const updated = current.filter((q) => String(q.id) !== String(questionId));
      localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(updated));
    }

    // Attempt cloud remove in background if online
    void syncCloudRemove("question", `question-${questionId}`);

    dispatchVaultChanged();
    return true;
  } catch (err) {
    console.error("Failed to remove question offline:", err);
    return false;
  }
}

export async function getSavedQuestionsOffline(): Promise<OfflineSavedQuestion[]> {
  try {
    if (!isIndexedDBAvailable()) {
      return getFallbackQuestions();
    }
    const db = await openDB();
    return await new Promise<OfflineSavedQuestion[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUESTIONS, "readonly");
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineSavedQuestion[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to get saved questions offline:", err);
    return getFallbackQuestions();
  }
}

export async function isQuestionSavedOffline(questionId: string | number): Promise<boolean> {
  try {
    if (!isIndexedDBAvailable()) {
      return getFallbackQuestions().some((q) => String(q.id) === String(questionId));
    }
    const db = await openDB();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_QUESTIONS, "readonly");
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.getKey(questionId);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ── 3. Metrics & Bulk Management ─────────────────────────────────────────────

export async function getOfflineStorageMetrics(): Promise<OfflineStorageMetrics> {
  try {
    const [lessons, questions] = await Promise.all([
      getSavedLessonsOffline(),
      getSavedQuestionsOffline(),
    ]);

    const lessonsJson = JSON.stringify(lessons);
    const questionsJson = JSON.stringify(questions);
    const estimatedBytes = new Blob([lessonsJson, questionsJson]).size;
    const mb = estimatedBytes / (1024 * 1024);
    const estimatedMbFormatted = mb < 0.1 ? `${(estimatedBytes / 1024).toFixed(1)} كيلوبايت` : `${mb.toFixed(2)} ميجابايت`;

    return {
      lessonsCount: lessons.length,
      questionsCount: questions.length,
      estimatedBytes,
      estimatedMbFormatted,
    };
  } catch {
    return {
      lessonsCount: 0,
      questionsCount: 0,
      estimatedBytes: 0,
      estimatedMbFormatted: "0 كيلوبايت",
    };
  }
}

export async function clearOfflineVault(): Promise<boolean> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_LESSONS, STORE_QUESTIONS], "readwrite");
        tx.objectStore(STORE_LESSONS).clear();
        tx.objectStore(STORE_QUESTIONS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    localStorage.removeItem(LS_LESSONS_KEY);
    localStorage.removeItem(LS_QUESTIONS_KEY);

    dispatchVaultChanged();
    return true;
  } catch (err) {
    console.error("Failed to clear offline vault:", err);
    return false;
  }
}

// ── 4. Account Cloud Sync Helper ─────────────────────────────────────────────

async function syncCloudSave(itemType: string, itemKey: string, title?: string | null, videoId?: number, payload?: any) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
    const token = localStorage.getItem("dr_mahmoud_student_token") || "";
    const studentCode = localStorage.getItem("dr_mahmoud_student_code") || "";

    await fetch("/api/learning/offline-vault/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        ...(token ? { Authorization: `Bearer ${token}`, "X-Student-Token": token } : {}),
        ...(studentCode ? { "X-Student-Code": studentCode } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        itemType,
        itemKey,
        title,
        videoId,
        payload,
      }),
    });
  } catch (e) {
    // Silent fail offline background sync
  }
}

async function syncCloudRemove(itemType: string, itemKey: string) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
    const token = localStorage.getItem("dr_mahmoud_student_token") || "";
    const studentCode = localStorage.getItem("dr_mahmoud_student_code") || "";

    await fetch("/api/learning/offline-vault/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        ...(token ? { Authorization: `Bearer ${token}`, "X-Student-Token": token } : {}),
        ...(studentCode ? { "X-Student-Code": studentCode } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        itemType,
        itemKey,
      }),
    });
  } catch (e) {
    // Silent fail offline background sync
  }
}

/**
 * Sync from cloud account to local IndexedDB (downloads items student saved in their account)
 */
export async function syncVaultWithAccount(): Promise<{ syncedLessons: number; syncedQuestions: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedLessons: 0, syncedQuestions: 0 };
  }

  try {
    const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
    const token = localStorage.getItem("dr_mahmoud_student_token") || "";
    const studentCode = localStorage.getItem("dr_mahmoud_student_code") || "";

    const res = await fetch("/api/learning/offline-vault", {
      credentials: "include",
      headers: {
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        ...(token ? { Authorization: `Bearer ${token}`, "X-Student-Token": token } : {}),
        ...(studentCode ? { "X-Student-Code": studentCode } : {}),
      },
    });

    if (!res.ok) return { syncedLessons: 0, syncedQuestions: 0 };
    const data = await res.json();
    let syncedLessons = 0;
    let syncedQuestions = 0;

    if (Array.isArray(data.lessons)) {
      for (const l of data.lessons) {
        if (l.payload && typeof l.payload === "object" && l.payload.id) {
          await saveLessonOffline(l.payload);
          syncedLessons++;
        }
      }
    }

    if (Array.isArray(data.questions)) {
      for (const q of data.questions) {
        if (q.payload && typeof q.payload === "object" && q.payload.prompt) {
          await saveQuestionOffline(q.payload);
          syncedQuestions++;
        }
      }
    }

    return { syncedLessons, syncedQuestions };
  } catch (err) {
    console.error("Sync vault with account error:", err);
    return { syncedLessons: 0, syncedQuestions: 0 };
  }
}

// ── Fallback Helpers ─────────────────────────────────────────────────────────

function getFallbackLessons(): OfflineSavedLesson[] {
  try {
    const raw = localStorage.getItem(LS_LESSONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getFallbackQuestions(): OfflineSavedQuestion[] {
  try {
    const raw = localStorage.getItem(LS_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
