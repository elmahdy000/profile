/**
 * Offline Storage Engine for Lessons & Questions (Dr. Mahmoud Elmahdy Educational Platform)
 * Implements high-performance client-side IndexedDB caching with local storage fallback
 * and real-time reactive event dispatching.
 */

import { getYoutubeThumbnail } from "./video";

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

export async function saveLessonOffline(lesson: any): Promise<boolean> {
  try {
    const mat = lesson.material;
    const lessonItem: OfflineSavedLesson = {
      id: Number(lesson.id),
      title: lesson.title || mat?.lesson || "درس تعليمي",
      courseTitle: lesson.courseTitle || lesson.category || mat?.unit || "المادة التعليمية",
      grade: lesson.grade || lesson.stage || mat?.stage || "",
      unit: lesson.unit || mat?.unit || lesson.stage || "",
      description: lesson.description || mat?.topic || mat?.summary || "",
      duration: lesson.duration,
      thumbnailUrl: lesson.thumbnailUrl || (lesson.videoUrl ? getYoutubeThumbnail(lesson.videoUrl) : undefined),
      notes: lesson.notes,
      summaryContent:
        lesson.summaryContent ||
        mat?.zatonaContent ||
        mat?.summary ||
        lesson.description ||
        "ملخص وشرح الدرس متاح للمذاكرة ومراجعة المفاهيم أوفلاين.",
      keyPoints: lesson.keyPoints || (Array.isArray(mat?.keyPoints) ? mat.keyPoints : []),
      definitions: lesson.definitions || (Array.isArray(mat?.definitions) ? mat.definitions : []),
      mindmapNodes: lesson.mindmapNodes || (Array.isArray(mat?.mindmapImages) ? mat.mindmapImages : []),
      flashcards: lesson.flashcards || (Array.isArray(mat?.flashcards) ? mat.flashcards : []),
      questions: lesson.questions || (Array.isArray(mat?.questions) ? mat.questions : []),
      files: lesson.files,
      savedAt: typeof lesson.savedAt === "string" ? lesson.savedAt : new Date().toISOString(),
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

/**
 * High-level helper to save a lesson and its complete bundle (kholasa, definitions,
 * flashcards, and questions) with one click from any screen.
 */
export async function saveLessonPackage(
  item: {
    id?: number;
    title: string;
    category?: string;
    stage?: string;
    description?: string;
    videoUrl?: string;
    youtubeUrl?: string;
    meta?: { duration?: string };
    pdfFileId?: number | null;
  },
  kholasaMaterial?: any | null
): Promise<boolean> {
  if (!item || !item.id) return false;
  try {
    let material = kholasaMaterial;

    // If online and material is missing or incomplete, attempt fetching the kholasa bundle
    if (!material && typeof window !== "undefined" && navigator.onLine && item.id) {
      try {
        const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
        const res = await fetch(`/api/learning/kholasa/video/${item.id}`, {
          credentials: "include",
          headers: deviceId ? { "X-Device-Id": deviceId } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.material) {
            material = data.material;
          }
        }
      } catch (e) {
        console.warn("Could not fetch online kholasa material for offline pack:", e);
      }
    }

    // Extract questions if material exists and has an ID
    let questionsList: any[] = [];
    if (material?.questions && Array.isArray(material.questions)) {
      questionsList = material.questions;
    } else if (material?.id && typeof window !== "undefined" && navigator.onLine) {
      try {
        const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
        const resQ = await fetch(`/api/learning/kholasa/materials/${material.id}/questions?type=mcq&page=1&limit=20`, {
          credentials: "include",
          headers: deviceId ? { "X-Device-Id": deviceId } : {},
        });
        if (resQ.ok) {
          const qData = await resQ.json();
          if (Array.isArray(qData.items)) {
            questionsList = qData.items.map((it: any) => ({
              id: it.id,
              prompt: it.question?.prompt || it.prompt,
              options: it.question?.options || it.options || [],
              correctAnswer: it.question?.correctAnswer ?? it.correctOption ?? 0,
              explanation: it.question?.explanation || it.explanation,
              translation: it.translation,
              type: "mcq",
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch online questions for lesson pack:", e);
      }
    }

    const payload: OfflineSavedLesson = {
      id: Number(item.id),
      title: item.title,
      courseTitle: item.category || material?.unit || "المادة التعليمية",
      grade: item.stage || material?.stage || "",
      unit: material?.unit || item.stage || "",
      description: item.description || material?.topic || "",
      thumbnailUrl: item.videoUrl ? getYoutubeThumbnail(item.videoUrl) : undefined,
      summaryContent:
        material?.zatonaContent ||
        material?.summary ||
        item.description ||
        "ملخص وشرح الدرس متاح للمذاكرة ومراجعة المفاهيم أوفلاين.",
      keyPoints: Array.isArray(material?.keyPoints) ? material.keyPoints : [],
      definitions: Array.isArray(material?.definitions) ? material.definitions : [],
      mindmapNodes: Array.isArray(material?.mindmapImages) ? material.mindmapImages : [],
      flashcards: Array.isArray(material?.flashcards) ? material.flashcards : [],
      questions: questionsList,
      savedAt: new Date().toISOString(),
    };

    const saved = await saveLessonOffline(payload);

    // Also save individual questions to the questions bank store for cross-lesson practice
    if (questionsList.length > 0) {
      for (const q of questionsList) {
        await saveQuestionOffline({
          id: `q_${item.id}_${q.id}`,
          lessonId: Number(item.id),
          lessonTitle: item.title,
          unit: material?.unit || item.stage,
          type: q.type || "mcq",
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          translation: q.translation,
          savedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    return saved;
  } catch (err) {
    console.error("Failed to save complete lesson package:", err);
    return false;
  }
}

/**
 * 1-Click Starter Pack: Downloads all available lesson summaries, definitions,
 * flashcards, and questions for the student in one click.
 */
export async function downloadStarterPack(): Promise<{ savedLessons: number; savedQuestions: number }> {
  try {
    const deviceId = typeof localStorage !== "undefined" ? localStorage.getItem("dr_mahmoud_device_id") || "" : "";
    const headers = deviceId ? { "X-Device-Id": deviceId } : {};

    let savedLessons = 0;
    let savedQuestions = 0;

    // 1. Try fetching kholasa materials
    let materials: any[] = [];
    try {
      const res = await fetch("/api/learning/kholasa/materials", {
        credentials: "include",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        materials = Array.isArray(data.materials) ? data.materials : Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn("Could not fetch kholasa materials:", e);
    }

    for (const mat of materials) {
      if (!mat.id) continue;

      const lessonPayload: OfflineSavedLesson = {
        id: Number(mat.id),
        title: mat.lesson || mat.title || "درس تعليمي",
        courseTitle: mat.unit || "المادة التعليمية",
        unit: mat.unit || "",
        description: mat.topic || mat.summary || "",
        summaryContent: mat.zatonaContent || mat.summary || "ملخص وشرح الدرس للمذاكرة بدون إنترنت.",
        definitions: Array.isArray(mat.definitions) ? mat.definitions : [],
        flashcards: Array.isArray(mat.flashcards) ? mat.flashcards : [],
        mindmapNodes: Array.isArray(mat.mindmapImages) ? mat.mindmapImages : [],
        questions: Array.isArray(mat.questions) ? mat.questions : [],
        savedAt: new Date().toISOString(),
      };

      await saveLessonOffline(lessonPayload);
      savedLessons++;

      // Also save individual questions
      if (Array.isArray(mat.questions)) {
        for (const q of mat.questions) {
          if (!q.prompt) continue;
          await saveQuestionOffline({
            id: `mat_${mat.id}_${q.id || Math.random()}`,
            lessonId: Number(mat.id),
            lessonTitle: mat.lesson || mat.title,
            unit: mat.unit,
            type: q.type || "mcq",
            prompt: q.prompt,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            translation: q.translation,
            savedAt: new Date().toISOString(),
          }).catch(() => {});
          savedQuestions++;
        }
      }
    }

    // 2. Also fetch course videos to ensure any top-level videos are covered
    try {
      const resV = await fetch("/api/videos", {
        credentials: "include",
        headers,
      });
      if (resV.ok) {
        const videos = await resV.json();
        if (Array.isArray(videos)) {
          for (const v of videos.slice(0, 5)) {
            if (v.id) {
              const already = await isLessonSavedOffline(v.id);
              if (!already) {
                await saveLessonPackage(v);
                savedLessons++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch video list for pack:", e);
    }

    dispatchVaultChanged();
    return { savedLessons, savedQuestions };
  } catch (e: any) {
    console.error("Download starter pack error:", e);
    throw e;
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
