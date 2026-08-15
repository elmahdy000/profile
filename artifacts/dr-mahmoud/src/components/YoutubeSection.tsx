import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Play, ExternalLink, Tv, ChevronLeft, Loader2, Lock, Unlock,
  Search, SlidersHorizontal, Bookmark, Share2, Clock, BookOpen, Award, ArrowUpDown,
  FileText, ClipboardCheck, Download, X, MonitorPlay, Layers3, Signal,
  Info, Paperclip, ShieldCheck, Eye, Laptop, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListVideos } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  type VideoItem,
  getYouTubeVideoId,
  getYouTubePlaylistId,
  getYoutubeThumbnail,
  getVideoThumbnail,
} from "@/lib/video";
import {
  CourseOverviewCard,
  CourseSwitcher,
  ContinueLearningCard,
  LessonToolbar,
  RedesignedLessonCard,
} from "@/components/platform/CourseComponents";

const PremiumLessonPlayer = lazy(() =>
  import("@/components/learning/PremiumLessonPlayer")
    .then((module) => {
      window.sessionStorage.removeItem("chunk_load_error_reloaded");
      return { default: module.PremiumLessonPlayer };
    })
    .catch((err) => {
      const key = "chunk_load_error_reloaded";
      if (typeof window !== "undefined" && !window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, "true");
        window.location.reload();
      }
      throw err;
    }),
);

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function syncVideoProgress(
  videoId: number,
  progress: number,
  currentTimeSeconds = 0,
  durationSeconds = 0,
) {
  void fetch(`/api/learning/progress/${videoId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress, currentTimeSeconds, durationSeconds }),
  }).catch(() => undefined);
}

// Real metadata read from the video record (entered by the admin).
// Returns only the values that actually exist — no fabricated numbers.
function getVideoMeta(item: VideoItem) {
  return {
    duration: item.durationText || null,
    lessonsCount: item.lessonsCount ?? null,
    difficulty: item.level || null,
    instructor: {
      name: "د. محمود المهدي",
      avatar: "/dr-mahmoud-photo.png",
    },
  };
}

function getAttachedFiles(item: VideoItem, files: any[]) {
  if (item.attachments?.length) return item.attachments;
  const legacy = item.pdfFileId ? files.find((file) => file.id === item.pdfFileId) : null;
  return legacy ? [legacy] : [];
}

// ─── Modal Player Component ───
function VideoPlayerModal({
  item,
  files = [],
  quizzes = [],
  onStartQuiz,
  onClose,
}: {
  item: VideoItem;
  files?: any[];
  quizzes?: any[];
  onStartQuiz?: (quiz: any) => void;
  onClose: () => void;
}) {
  const [isFocused, setIsFocused] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasResumedRef = useRef(false);
  const [resumeTime, setResumeTime] = useState(0);

  useEffect(() => {
    hasResumedRef.current = false;
    const cached = readStoredJson<Record<number, number>>(
      "dr_mahmoud_watch_positions",
      {},
    );
    setResumeTime(item.id ? cached[item.id] || 0 : 0);
    if (!item.id) return;
    void fetch("/api/learning/progress", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Array<{ videoId: number; currentTimeSeconds?: number }>) => {
        const row = rows.find((entry) => entry.videoId === item.id);
        if (row?.currentTimeSeconds) {
          setResumeTime((current) => Math.max(current, row.currentTimeSeconds || 0));
        }
      })
      .catch(() => undefined);
  }, [item.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      hasResumedRef.current ||
      !resumeTime ||
      !Number.isFinite(video.duration) ||
      resumeTime >= video.duration - 5
    ) return;
    video.currentTime = resumeTime;
    hasResumedRef.current = true;
  }, [resumeTime]);

  useEffect(() => {
    // Track focus for anti-piracy
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "c")) ||
        (e.metaKey && (e.key === "s" || e.key === "p" || e.key === "c" || e.shiftKey))
      ) {
        e.preventDefault();
        // Use a custom event to trigger toast from modal context
        window.dispatchEvent(new CustomEvent("dr-toast", { detail: { variant: "destructive", title: "⛔ غير مسموح", description: "غير مسموح بالتقاط أو تسجيل الشاشة لحماية حقوق الملكية." } }));
      }
    };

    const handleOrientation = () => {
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const isMobileSize = window.innerHeight < 550 || window.innerWidth < 900;
      if (isLandscape && isMobileSize) {
        const video = videoRef.current;
        if (video) {
          try {
            if ((video as any).webkitEnterFullscreen) {
              (video as any).webkitEnterFullscreen();
            } else if (video.requestFullscreen && !document.fullscreenElement) {
              void video.requestFullscreen();
            }
          } catch {}
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("orientationchange", handleOrientation);
    const mql = window.matchMedia("(orientation: landscape)");
    mql.addEventListener?.("change", handleOrientation);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("orientationchange", handleOrientation);
      mql.removeEventListener?.("change", handleOrientation);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  const vidId = getYouTubeVideoId(item.youtubeUrl);
  const playlistId = getYouTubePlaylistId(item.youtubeUrl);

  const isDirectFileUrl =
    item.youtubeUrl?.startsWith("/uploads/") ||
    item.youtubeUrl?.endsWith(".mp4") ||
    item.youtubeUrl?.endsWith(".webm") ||
    item.youtubeUrl?.endsWith(".mov");

  const isStreamUrl =
    isDirectFileUrl ||
    (item.youtubeUrl?.startsWith("/api/videos/") && !vidId && !playlistId);

  const studentKeys =
    typeof window !== "undefined"
      ? localStorage.getItem("dr_mahmoud_unlock_keys") || ""
      : "";

  let streamUrl = "";
  if (isStreamUrl) {
    streamUrl = item.youtubeUrl;
  } else if (item.id && !vidId && !playlistId) {
    streamUrl = `/api/videos/${item.id}/stream`;
  }

  let embedUrl = "";
  if (!isStreamUrl && !streamUrl) {
    if (item.type === "playlist" && playlistId) {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0&mute=0&rel=0`;
    } else if (vidId) {
      embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=0&mute=0&rel=0`;
    }
  }

  // Track REAL watch progress from the local video element
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (typeof window === "undefined" || !item.id) return;
    const el = e.currentTarget;
    if (!el.duration || Number.isNaN(el.duration)) return;
    const percent = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    const positionObj = readStoredJson<Record<number, number>>("dr_mahmoud_watch_positions", {});
    positionObj[item.id] = Math.floor(el.currentTime);
    localStorage.setItem("dr_mahmoud_watch_positions", JSON.stringify(positionObj));
    // Save at most in whole-percent steps to avoid excessive writes
    const progressObj = readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {});
    // Only move progress forward, never backward
    if ((progressObj[item.id] || 0) < percent) {
      progressObj[item.id] = percent;
      localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(progressObj));
      window.dispatchEvent(new Event("watch_progress_updated"));
      if (percent === 100 || percent % 5 === 0) {
        syncVideoProgress(item.id, percent, el.currentTime, el.duration);
      }
    }
  };

  // Handle setting 100% completed
  const handleVideoEnded = () => {
    if (typeof window !== "undefined" && item.id) {
      const progressObj = readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {});
      progressObj[item.id] = 100;
      localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(progressObj));
      window.dispatchEvent(new Event("watch_progress_updated"));
      const video = videoRef.current;
      syncVideoProgress(item.id, 100, video?.duration || 0, video?.duration || 0);
    }
  };

  const attachedFiles = getAttachedFiles(item, files);
  const linkedQuiz = item.quizId ? quizzes.find((quiz) => quiz.id === item.quizId) : null;
  const stages = item.stages?.length ? item.stages : item.stage ? [item.stage] : [];
  const learningModeLabel = item.learningMode === "online"
    ? "أونلاين"
    : item.learningMode === "offline"
      ? "أوفلاين"
      : item.learningMode === "both"
        ? "أونلاين وأوفلاين"
        : null;
  const sourceLabel = isStreamUrl
    ? "فيديو مرفوع على المنصة"
    : embedUrl
      ? item.type === "playlist" ? "قائمة تشغيل يوتيوب" : "فيديو يوتيوب"
      : "رابط فيديو خارجي";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 24 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-player-title"
          dir="rtl"
          className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border-0 sm:border sm:border-border bg-background shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:rounded-[28px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="z-10 flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-5 sm:py-4 landscape:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
              <MonitorPlay className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold sm:text-[11px]">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{item.category}</span>
                <span className="text-muted-foreground">الدرس {item.order || 1}</span>
              </div>
              <h2 id="video-player-title" className="line-clamp-1 text-sm font-extrabold text-foreground sm:text-base">
                {item.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق مشغل الفيديو"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
              {/* Player Container */}
              <div className="bg-black shrink-0 flex flex-col justify-center relative p-0 lg:order-2 landscape:flex-1 landscape:min-h-0">
                <div
                  className="relative w-full aspect-video sm:aspect-auto sm:flex-1 sm:min-h-0 bg-black overflow-hidden flex items-center justify-center landscape:flex-1 landscape:min-h-0 landscape:aspect-none sm:rounded-2xl sm:ring-2 sm:ring-primary/30"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="absolute top-3 right-3 z-[999] hidden h-11 w-11 place-items-center rounded-full bg-slate-900/80 border border-white/20 text-white backdrop-blur-md transition hover:bg-slate-800 active:scale-95 shadow-2xl landscape:grid"
                  >
                    <X className="h-6 w-6" />
                  </button>

                  {!isFocused && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-5 text-center text-white backdrop-blur-md transition-all duration-300">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-400/30">
                        <Lock className="h-7 w-7 animate-pulse text-red-400" />
                      </div>
                      <h3 className="mb-1 text-lg font-extrabold sm:text-xl">العرض واقف مؤقتًا</h3>
                      <p className="max-w-md text-xs leading-6 text-slate-300 sm:text-sm">ارجع لنافذة المنصة علشان تكمل مشاهدة الدرس.</p>
                      <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-300">حماية المحتوى مفعّلة</p>
                    </div>
                  )}

                  {(isStreamUrl || streamUrl) ? (
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full bg-black object-contain select-none"
                      src={streamUrl || `/api/videos/${item.id}/stream`}
                      controls
                      playsInline
                      preload="metadata"
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={() => {
                        const video = videoRef.current;
                        if (video) {
                          video.muted = false;
                          video.defaultMuted = false;
                          video.volume = 1;
                        }
                        if (
                          video &&
                          !hasResumedRef.current &&
                          resumeTime > 0 &&
                          resumeTime < video.duration - 5
                        ) {
                          video.currentTime = resumeTime;
                          hasResumedRef.current = true;
                        }
                      }}
                      onEnded={handleVideoEnded}
                    />
                  ) : embedUrl ? (
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={embedUrl}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white bg-slate-900/90">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <ExternalLink className="h-6 w-6 text-sky-300" />
                      </div>
                      <p className="text-sm font-bold">الفيديو متاح عبر الرابط المباشر</p>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">انقر أدناه لمشاهدة الفيديو في نافذة جديدة مباشرة.</p>
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 text-xs font-bold text-white transition-all shadow-lg shadow-primary/20"
                      >
                        فتح الفيديو الآن <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson information */}
              <aside className="flex-1 min-h-0 overflow-y-auto space-y-4 border-t border-border bg-card p-4 text-right sm:p-5 lg:order-1 lg:border-l lg:border-t-0 landscape:hidden">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    عن الدرس
                  </div>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {item.description || "كل تفاصيل الدرس والمصادر الخاصة بيه هتلاقيها هنا أثناء المشاهدة."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                    <Layers3 className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">الكورس</p>
                      <p className="truncate text-xs font-bold text-foreground">{item.category}</p>
                    </div>
                  </div>
                  {stages.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">المرحلة</p>
                        <p className="text-xs font-bold leading-5 text-foreground">{stages.join("، ")}</p>
                      </div>
                    </div>
                  )}
                  {learningModeLabel && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                      <Signal className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">نظام الدراسة</p>
                        <p className="text-xs font-bold text-foreground">{learningModeLabel}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-[10px] opacity-75">مصدر العرض</p>
                      <p className="text-xs font-bold">{sourceLabel}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* Linked materials */}
            {(attachedFiles.length > 0 || linkedQuiz) && (
              <div className="border-t border-border bg-background px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-foreground">
                  <Paperclip className="h-4 w-4 text-primary" />
                  مصادر الدرس والاختبار
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {attachedFiles.map((file) => (
                    <a
                      key={file.id}
                      href={`/api/learning/files/${file.id}/preview`}
                      className="group flex min-h-14 items-center gap-3 rounded-xl border border-border bg-muted/25 p-3 text-right transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-foreground">{file.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          معاينة الملف
                        </span>
                      </span>
                      <Eye className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </a>
                  ))}
                  {linkedQuiz && (
                    <button
                      disabled={linkedQuiz.locked}
                      onClick={() => {
                        if (linkedQuiz.locked) return;
                        onClose();
                        onStartQuiz?.(linkedQuiz);
                      }}
                      className="flex min-h-14 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold">اختبار الدرس</span>
                        <span className="text-[10px]">{linkedQuiz.locked ? linkedQuiz.lockedReason || "أكمل الدرس أولًا" : "اختبر فهمك بعد المشاهدة"}</span>
                      </span>
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Unlock Content Modal ───
function UnlockModal({
  item,
  refetch,
  onClose,
  onSuccess,
}: {
  item: VideoItem;
  refetch: () => Promise<any>;
  onClose: () => void;
  onSuccess: (unlockedItem: VideoItem) => void;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setIsVerifying(true);
    setErrorMsg("");

    try {
      const existing = localStorage.getItem("dr_mahmoud_unlock_keys") || "";
      const keysArray = existing
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const newKeyClean = keyInput.trim();
      const updatedKeys = [...keysArray];
      if (!updatedKeys.includes(newKeyClean)) {
        updatedKeys.push(newKeyClean);
      }

      localStorage.setItem("dr_mahmoud_unlock_keys", updatedKeys.join(","));

      const refetchResult = await refetch();
      const updatedVideos = refetchResult.data;

      const updatedItem = updatedVideos?.find((v: any) => v.id === item.id);

      if (updatedItem && updatedItem.youtubeUrl !== "locked") {
        toast({
          variant: "success",
          title: "تم تفعيل المحاضرة بنجاح 🎉",
          description: `المحاضرة "${item.title}" متاحة للمشاهدة الآن.`,
        });
        onSuccess(updatedItem as VideoItem);
      } else {
        localStorage.setItem("dr_mahmoud_unlock_keys", keysArray.join(","));
        setErrorMsg("كود التفعيل غير صحيح أو غير متوافق مع هذا الفيديو. يرجى التحقق منه والمحاولة مرة أخرى.");
        toast({
          variant: "destructive",
          title: "فشل تفعيل المحاضرة ❌",
          description: "كود التفعيل المدخل غير صحيح لهذا الفيديو.",
        });
      }
    } catch (err) {
      setErrorMsg("حدث خطأ أثناء الاتصال بالسيرفر. يرجى المحاولة لاحقاً.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-card border border-border rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-right"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col items-center text-center gap-3 mt-2">
            <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary shadow-lg shadow-secondary/5">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">محتوى مدفوع ومحمي 🔒</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              هذه المحاضرة جزء من المحتوى الخاص بمشتركي الكورس المدفوع. يرجى إدخال كود التفعيل المخصص لك لتتمكن من مشاهدتها.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="activationCode" className="text-xs font-bold text-foreground/80 block">
                كود التفعيل (Access Key)
              </label>
              <input
                type="text"
                id="activationCode"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="أدخل الكود هنا (مثال: c++-course-key-xyz)"
                className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-center font-mono placeholder:text-muted-foreground/40 text-foreground"
              />
              {errorMsg && (
                <p className="text-[11px] text-red-500 font-bold leading-relaxed">{errorMsg}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التحقق من الكود...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  تفعيل ومشاهدة الآن
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function VideoLessonsSection({
  student,
  videos,
  files = [],
  quizzes = [],
  onStartQuiz,
}: {
  student?: any;
  videos?: VideoItem[];
  files?: any[];
  quizzes?: any[];
  onStartQuiz?: (quiz: any) => void;
}) {
  const { data: dbVideos, isLoading, isError, refetch } = useListVideos();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "completed">("all");
  const [activePlayer, setActivePlayer] = useState<VideoItem | null>(null);
  const [unlockModalItem, setUnlockModalItem] = useState<VideoItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "recent" | "least_completed" | "completed_first">("order");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [watchProgress, setWatchProgress] = useState<Record<number, number>>({});
  const [expandedAttachments, setExpandedAttachments] = useState<Record<number, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const studentGrade = student?.grade === "أخرى" ? student?.otherGradeDetail : student?.grade;
  // The authenticated student workspace already loads videos with the bound
  // device header. Reuse that response instead of hiding lessons when this
  // generic query (which is also used by non-student pages) is rejected.
  const rawItems: VideoItem[] = videos ?? (dbVideos ? (dbVideos as VideoItem[]) : []);
  const videosLoading = videos === undefined && isLoading;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const courseParam = urlParams.get("course");
    if (courseParam) {
      setActiveCategory(courseParam);
    }
  }, []);

  const handleSelectCourse = (courseName: string) => {
    setActiveCategory(courseName);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (courseName === "all") {
        url.searchParams.delete("course");
      } else {
        url.searchParams.set("course", courseName);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) toast(detail);
    };
    window.addEventListener("dr-toast", handler);
    return () => window.removeEventListener("dr-toast", handler);
  }, [toast]);

  const handlePlayClick = (item: VideoItem) => {
    if (item.paymentLocked) {
      toast({
        variant: "destructive",
        title: "🔒 يلزم سداد اشتراك الكورس أولاً",
        description: `عذراً، هذا الدرس من محتوى "${item.category}" المخصص للمشتركين المدفوعين. لفتح باقي الكورس، يرجى تحويل قيمة الاشتراك ورفع صورة الإيصال ليتم التفعيل فوريًا.`,
      });
      return;
    }
    if (item.youtubeUrl === "locked") {
      setUnlockModalItem(item);
    } else {
      setActivePlayer(item);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBookmarks(readStoredJson<number[]>("dr_mahmoud_bookmarks", []));
    const loadProgress = () => {
      setWatchProgress(readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {}));
    };
    loadProgress();
    void fetch("/api/learning/progress", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: any) => {
        if (!data) return;
        const rows: Array<{ videoId: number; progress: number }> = Array.isArray(data) ? data : (data.rows || []);
        const serverMap: Record<number, number> = {};
        rows.forEach((row) => {
          serverMap[row.videoId] = row.progress;
        });
        localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(serverMap));
        setWatchProgress(serverMap);
      })
      .catch(() => undefined);
    window.addEventListener("watch_progress_updated", loadProgress);
    return () => {
      window.removeEventListener("watch_progress_updated", loadProgress);
    };
  }, [student?.id]);

  const toggleBookmark = (id?: number) => {
    if (!id) return;
    let updated;
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter((b) => b !== id);
      toast({ description: "تمت الإزالة من المفضلة" });
    } else {
      updated = [...bookmarks, id];
      toast({ description: "تمت الإضافة للمفضلة 💖" });
    }
    setBookmarks(updated);
    localStorage.setItem("dr_mahmoud_bookmarks", JSON.stringify(updated));
  };

  const shareCourse = async (item: VideoItem) => {
    const shareUrl = `${window.location.origin}/platform`;
    const sharedNatively = typeof navigator.share === "function";
    try {
      if (sharedNatively) {
        await navigator.share({ title: item.title, text: item.description || item.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      toast({
        title: sharedNatively ? "تمت مشاركة الكورس" : "تم نسخ رابط المنصة! 🔗",
        description: `شارك "${item.title}" مع زملائك.`,
      });
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast({ variant: "destructive", description: "تعذرت المشاركة. حاول مرة أخرى." });
      }
    }
  };

  const items = rawItems.map((item) => ({
    ...item,
    meta: getVideoMeta(item),
    progress: watchProgress[item.id || 0] || 0,
  }));

  function studentCanSeeVideo(item: VideoItem): boolean {
    if (!student) return true;

    // Explicitly enrolled courses or categories by admin MUST be visible immediately
    const enrolledIds = (student as any).enrolledCourseIds ?? [];
    const enrolledCats = (student as any).enrolledCategories ?? [];
    const norm = (s: string) => String(s ?? "").trim().toLowerCase();

    if (item.courseId && enrolledIds.includes(Number(item.courseId))) {
      return true;
    }
    if (item.category && enrolledCats.some((cat: string) => norm(cat) === norm(item.category))) {
      return true;
    }

    // ── KEY FIX ──
    // If the admin has explicitly assigned courses to this student, ONLY those
    // courses should be visible. Do NOT fall back to stage/grade matching —
    // that would silently re-show courses the admin intentionally removed.
    const hasExplicitEnrollment = enrolledIds.length > 0 || enrolledCats.length > 0;
    if (hasExplicitEnrollment) return false;

    // No explicit enrollment → show content based on student's grade/stage
    const grade = studentGrade || "";
    const stageArr: string[] = Array.isArray((item as any).stages) && (item as any).stages.length
      ? (item as any).stages
      : item.stage ? [item.stage] : [];
    if (stageArr.length === 0) return true;
    const sn = norm(grade);

    const getSystem = (val: string) => {
      if (val.includes("بكالوريا") || val.includes("baccalaureate")) return "baccalaureate";
      if (val.includes("جامع") || val.includes("كلية") || val.includes("حاسبات") || val.includes("هندسة") || val.includes("university")) return "university";
      if (val.includes("ثانوي") || val.includes("secondary")) return "secondary";
      return null;
    };
    const studentSys = getSystem(sn);

    return stageArr.some((s) => {
      const cn = norm(s);
      if (cn === "عام" || cn === "") return true;

      const contentSys = getSystem(cn);
      // Enforce strict education system isolation: if student belongs to a known system
      // and content has a different system OR no system marker at all, deny access!
      if (studentSys && (!contentSys || studentSys !== contentSys)) {
        return false;
      }

      if (sn === cn || sn.includes(cn) || cn.includes(sn)) return true;
      const g1s = sn.includes("أولى") || sn.includes("الأول") || sn.includes("first") || sn.includes("year_1");
      const g1c = cn.includes("أولى") || cn.includes("الأول") || cn.includes("first") || cn.includes("year_1");
      if (g1s && g1c) return true;
      const g2s = sn.includes("تانية") || sn.includes("الثاني") || sn.includes("second") || sn.includes("year_2");
      const g2c = cn.includes("تانية") || cn.includes("الثاني") || cn.includes("second") || cn.includes("year_2");
      if (g2s && g2c) return true;
      const g3s = sn.includes("ثالثة") || sn.includes("الثالث") || sn.includes("third") || sn.includes("year_3");
      const g3c = cn.includes("ثالثة") || cn.includes("الثالث") || cn.includes("third") || cn.includes("year_3");
      if (g3s && g3c) return true;
      const g4s = sn.includes("رابعة") || sn.includes("الرابع") || sn.includes("fourth") || sn.includes("year_4");
      const g4c = cn.includes("رابعة") || cn.includes("الرابع") || cn.includes("fourth") || cn.includes("year_4");
      if (g4s && g4c) return true;
      return false;
    });
  }

  const visibleItems = student ? items.filter(studentCanSeeVideo) : items;
  const categories = Array.from(new Set(visibleItems.map((item) => item.category))).filter(Boolean);

  const totalCoursesCount = categories.length;
  const completedLessonsCount = visibleItems.filter((i) => i.progress >= 95).length;
  const totalHoursCount = Math.round(visibleItems.reduce((acc, curr) => acc + (parseInt(curr.durationText || "0") || 25), 0) / 60);
  const overallProgressPercentage = visibleItems.length
    ? Math.round(visibleItems.reduce((acc, curr) => acc + curr.progress, 0) / visibleItems.length)
    : 0;

  const activeCourseItems = activeCategory === "all"
    ? visibleItems
    : visibleItems.filter((i) => i.category === activeCategory);
  
  const activeCourseCompletedCount = activeCourseItems.filter((i) => i.progress >= 95).length;
  const activeCourseProgressPct = activeCourseItems.length
    ? Math.round(activeCourseItems.reduce((acc, curr) => acc + curr.progress, 0) / activeCourseItems.length)
    : 0;

  const continueLearningItems = activeCourseItems
    .filter((item) => item.progress > 0 && item.progress < 100)
    .slice(0, 2);

  const scrollCourses = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const amount = direction === "left" ? -260 : 260;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const filterAndSortItems = (list: typeof visibleItems) => {
    return list
      .filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          item.category.toLowerCase().includes(query);

        let matchesStatus = true;
        if (statusFilter === "not_started") matchesStatus = item.progress === 0;
        if (statusFilter === "in_progress") matchesStatus = item.progress > 0 && item.progress < 95;
        if (statusFilter === "completed") matchesStatus = item.progress >= 95;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "recent") return (b.id || 0) - (a.id || 0);
        if (sortBy === "least_completed") return a.progress - b.progress;
        if (sortBy === "completed_first") return b.progress - a.progress;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  };

  const isStudentMode = Boolean(student);

  return (
    <section id="youtube-lectures" className="py-2 md:py-4 bg-[#F6F8FC] dark:bg-[#0B1220] text-[#111827] dark:text-[#F8FAFC] min-h-screen" dir="rtl">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 space-y-6">

        {/* 1. HERO OVERVIEW CARD */}
        <CourseOverviewCard
          courseName={activeCategory === "all" ? "جميع الكورسات والمسارات" : `كورس ${activeCategory}`}
          academicLevel={studentGrade || "حساب طالب متفعّل"}
          totalLessons={activeCategory === "all" ? visibleItems.length : activeCourseItems.length}
          completedLessons={activeCategory === "all" ? completedLessonsCount : activeCourseCompletedCount}
          totalWatchTimeHours={totalHoursCount}
          overallProgress={activeCategory === "all" ? overallProgressPercentage : activeCourseProgressPct}
          onPrimaryAction={() => {
            const nextLesson = activeCourseItems.find((i) => i.progress < 100) || activeCourseItems[0];
            if (nextLesson) handlePlayClick(nextLesson);
          }}
        />

        {/* 2. COURSE SWITCHER */}
        <CourseSwitcher
          courses={categories.map((cName) => {
            const cItems = visibleItems.filter((i) => i.category === cName);
            const cPct = cItems.length
              ? Math.round(cItems.reduce((acc, curr) => acc + curr.progress, 0) / cItems.length)
              : 0;
            return { name: cName, lessonsCount: cItems.length, progressPct: cPct };
          })}
          activeCategory={activeCategory}
          onSelectCourse={handleSelectCourse}
          overallProgressPercentage={overallProgressPercentage}
          totalVisibleLessons={visibleItems.length}
        />

        {/* 3. CONTINUE LEARNING SECTION */}
        {continueLearningItems.length > 0 && !videosLoading && (
          <ContinueLearningCard
            item={continueLearningItems[0]}
            secondaryItem={continueLearningItems[1] || null}
            onPlayClick={handlePlayClick}
          />
        )}

        {/* 4. SEARCH, FILTERS, AND SORTING TOOLBAR */}
        <LessonToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {/* 5. COURSE SECTIONS & LESSON CARDS */}
        {videosLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-72 animate-pulse rounded-2xl bg-[#E4EAF2]/60 dark:bg-[#172337]/60" />
            ))}
          </div>
        ) : activeCategory === "all" ? (
          <div className="space-y-6">
            {categories.map((courseName) => {
              const courseRawItems = visibleItems.filter((i) => i.category === courseName);
              const courseFilteredItems = filterAndSortItems(courseRawItems);
              if (courseFilteredItems.length === 0) return null;

              const completedInCourse = courseRawItems.filter((i) => i.progress >= 95).length;
              const coursePct = courseRawItems.length
                ? Math.round(courseRawItems.reduce((acc, curr) => acc + curr.progress, 0) / courseRawItems.length)
                : 0;

              return (
                <section key={courseName} className="space-y-4 rounded-2xl border border-[#E4EAF2] bg-white p-4 md:p-5 shadow-xs dark:border-[#26364D] dark:bg-[#111C2E]">
                  {/* Course Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4EAF2] pb-3 dark:border-[#26364D]">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-[#111827] dark:text-[#F8FAFC] dir-ltr text-right flex items-center gap-2" style={{ unicodeBidi: "isolate" }}>
                        <BookOpen className="h-4.5 w-4.5 text-[#1769FF]" />
                        {courseName}
                      </h3>
                      <p className="text-xs font-medium text-[#667085] dark:text-[#A9B5C7]">
                        {completedInCourse} من {courseRawItems.length} دروس مكتملة ({coursePct}%)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSelectCourse(courseName)}
                      className="h-8 px-3 text-xs font-bold text-[#1769FF] border-[#E4EAF2] hover:bg-[#E8EEFA] self-start sm:self-auto dark:border-[#26364D] dark:text-[#3B82F6]"
                    >
                      عرض هذا الكورس فقط ←
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courseFilteredItems.map((item) => (
                      <RedesignedLessonCard
                        key={item.id}
                        item={item}
                        files={files}
                        quizzes={quizzes}
                        bookmarks={bookmarks}
                        expandedAttachments={expandedAttachments}
                        onToggleExpandAttachment={(id) => setExpandedAttachments(prev => ({ ...prev, [id]: !prev[id] }))}
                        onPlayClick={handlePlayClick}
                        onToggleBookmark={toggleBookmark}
                        onStartQuiz={onStartQuiz}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {categories.every((c) => filterAndSortItems(visibleItems.filter((i) => i.category === c)).length === 0) && (
              <EmptyStateMessage searchQuery={searchQuery} statusFilter={statusFilter} />
            )}
          </div>
        ) : (
          /* SINGLE SELECTED COURSE GRID */
          <div>
            {filterAndSortItems(activeCourseItems).length === 0 ? (
              <EmptyStateMessage searchQuery={searchQuery} statusFilter={statusFilter} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterAndSortItems(activeCourseItems).map((item) => (
                  <RedesignedLessonCard
                    key={item.id}
                    item={item}
                    files={files}
                    quizzes={quizzes}
                    bookmarks={bookmarks}
                    expandedAttachments={expandedAttachments}
                    onToggleExpandAttachment={(id) => setExpandedAttachments(prev => ({ ...prev, [id]: !prev[id] }))}
                    onPlayClick={handlePlayClick}
                    onToggleBookmark={toggleBookmark}
                    onStartQuiz={onStartQuiz}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Channel Link */}
        {!isStudentMode && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Button
              asChild
              variant="ghost"
              className="bg-card border border-border hover:border-red-500/30 hover:bg-red-500/10 text-foreground hover:text-red-500 font-bold px-8 py-6 rounded-full shadow-md hover:scale-[1.02] transition-all duration-300"
            >
              <a href="https://www.youtube.com/@learntocode9453" target="_blank" rel="noopener noreferrer me">
                <Youtube className="w-5 h-5 me-2 text-red-500" />
                زيارة القناة على YouTube (Learn to Code)
              </a>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Video Overlay Player Modal */}
      {activePlayer && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/90">
              <div className="flex items-center gap-3 text-sm font-bold text-white">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                جاري تجهيز الدرس...
              </div>
            </div>
          }
        >
          <PremiumLessonPlayer
            item={activePlayer}
            lessons={visibleItems}
            files={files}
            quizzes={quizzes}
            onStartQuiz={onStartQuiz}
            onSelectLesson={setActivePlayer}
            onClose={() => setActivePlayer(null)}
          />
        </Suspense>
      )}

      {/* Unlock Content Modal */}
      {unlockModalItem && (
        <UnlockModal
          item={unlockModalItem}
          refetch={refetch}
          onClose={() => setUnlockModalItem(null)}
          onSuccess={(unlockedItem) => {
            setUnlockModalItem(null);
            setActivePlayer(unlockedItem);
          }}
        />
      )}
    </section>
  );
}

// ─── 6. LESSON CARD REDESIGN COMPONENT ───
function LessonCard({
  item,
  files,
  quizzes,
  bookmarks,
  expandedAttachments,
  onToggleExpandAttachment,
  onPlayClick,
  onToggleBookmark,
  onShare,
  onStartQuiz,
}: {
  item: any;
  files: any[];
  quizzes: any[];
  bookmarks: number[];
  expandedAttachments: Record<number, boolean>;
  onToggleExpandAttachment: (id: number) => void;
  onPlayClick: (item: VideoItem) => void;
  onToggleBookmark: (id?: number) => void;
  onShare: (item: VideoItem) => void;
  onStartQuiz?: (quiz: any) => void;
}) {
  const attachedFiles = getAttachedFiles(item, files);
  const quiz = item.quizId ? quizzes.find((q) => q.id === item.quizId) : null;
  const isAttachmentsExpanded = expandedAttachments[item.id || 0];

  const statusLabel =
    item.progress >= 95
      ? "مكتمل"
      : item.progress > 0
      ? "قيد التقدم"
      : "لم يبدأ";

  const statusBadgeStyle =
    item.progress >= 95
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : item.progress > 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-[#E4EAF2] dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-4 shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all">
      <div className="space-y-3">
        {/* Fixed Aspect Ratio Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#162942]">
          <img
            src={getVideoThumbnail(item)}
            alt={item.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onPlayClick(item)}
            className="absolute inset-0 flex items-center justify-center bg-slate-950/30 hover:bg-slate-950/40 transition-colors"
            aria-label={`شغّل ${item.title}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg">
              {item.youtubeUrl === "locked" ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </span>
          </button>

          {/* Badges on Top */}
          <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              الدرس {item.order}
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs ${statusBadgeStyle}`}>
              {statusLabel}
            </span>
          </div>

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleBookmark(item.id)}
              className="grid h-7 w-7 place-items-center rounded-md bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarks.includes(item.id || 0) ? "fill-blue-400 text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Course Category & Meta */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span className="rounded-md bg-blue-50 dark:bg-blue-600/30 px-2.5 py-0.5 text-blue-700 dark:text-white dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
            {item.category}
          </span>
          {item.meta.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {item.meta.duration}
            </span>
          )}
        </div>

        {/* Title with LTR Isolation for English terms */}
        <h3
          className="line-clamp-2 text-sm font-black text-slate-900 dark:text-slate-100 leading-snug text-right dir-ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {item.title}
        </h3>

        {/* Video Progress Bar & Watched Duration */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>نسبة الإنجاز:</span>
            </span>
            <span className={`font-black ${item.progress >= 95 ? "text-emerald-600 dark:text-emerald-400" : item.progress > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
              {item.progress}% {item.progress >= 95 ? "(مكتمل)" : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#12233B] border border-slate-200/60 dark:border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                item.progress >= 95
                  ? "bg-emerald-500"
                  : item.progress > 0
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-transparent"
              }`}
              style={{ width: `${Math.max(item.progress > 0 ? 3 : 0, item.progress)}%` }}
            />
          </div>
        </div>

        {/* Attached PDFs / Quizzes Quick Dropdown Accordion */}
        {(attachedFiles.length > 0 || quiz) && (
          <div className="rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50/70 dark:bg-[#12233B] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> ملحقات الدرس ({attachedFiles.length + (quiz ? 1 : 0)})
              </span>
              {attachedFiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => onToggleExpandAttachment(item.id || 0)}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  {isAttachmentsExpanded ? "طي" : "عرض الكل"}
                </button>
              )}
            </div>

            {/* Always show the first attachment / PDF */}
            {attachedFiles.length > 0 && (
              <div className="space-y-1.5">
                {(isAttachmentsExpanded ? attachedFiles : attachedFiles.slice(0, 1)).map((file: any) => (
                  <a
                    key={file.id}
                    href={`/api/learning/files/${file.id}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0A1628] p-2 text-xs hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{file.title || file.originalName}</span>
                    </div>
                    <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            )}
            {/* Quiz Attachment Button */}
            {quiz && (
              <button
                type="button"
                onClick={() => onStartQuiz && onStartQuiz(quiz)}
                className="flex w-full items-center justify-between rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/80 dark:bg-purple-950/40 p-2 text-xs font-bold text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span className="truncate">اختبار: {quiz.title}</span>
                </div>
                <Award className="h-3.5 w-3.5 shrink-0" />
              </button>
            )}
          </div>
        )}

        {/* Single Main Action Button */}
        <Button
          type="button"
          onClick={() => onPlayClick(item)}
          className={`w-full font-bold h-10 ${
            item.progress >= 95
              ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
              : item.progress > 0
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          }`}
        >
          {item.progress >= 95 ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" /> مشاهدة مرة أخرى
            </span>
          ) : item.progress > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-current" /> استكمال الدرس
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-current" /> ابدأ الدرس
            </span>
          )}
        </Button>
      </div>
    </article>
  );
}

// ─── 8. EMPTY STATES COMPONENT ───
function EmptyStateMessage({ searchQuery, statusFilter }: { searchQuery: string; statusFilter: string }) {
  let title = "مفيش دروس مجهزة في الكورس ده دلوقتي.";
  if (searchQuery) title = "مفيش درس مطابق لبحثك.";
  else if (statusFilter !== "all") title = "مفيش دروس بالحالة دي داخل الكورس.";

  return (
    <div className="rounded-2xl border border-dashed border-[#223552] dark:border-[#223552] light:border-slate-300 bg-[#0D1B2E] dark:bg-[#0D1B2E] light:bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-500">
        <BookOpen className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-extrabold text-white dark:text-white light:text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">جرب تغير فلاتر البحث أو اختار كورس تاني من فوق.</p>
    </div>
  );
}

export const YoutubeSection = VideoLessonsSection;
