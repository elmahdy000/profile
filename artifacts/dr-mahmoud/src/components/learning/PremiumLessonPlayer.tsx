import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Captions, Check, ChevronLeft, ChevronRight, Clock3, Download, Eye,
  FileText, Gauge, ListVideo, Loader2, Lock, Maximize, MessageCircle,
  Minimize, Pause, PictureInPicture, Play, RefreshCw, RotateCcw, RotateCw, StickyNote,
  Volume2, VolumeX, X,
} from "lucide-react";
import { getYouTubePlaylistId, getYouTubeVideoId, getYoutubeThumbnail, type VideoItem } from "@/lib/video";

import Hls from "hls.js";

type LessonFile = { id: number; title: string; sizeBytes?: number | null };
type LessonNote = { id: number; at: number; text: string };

type Props = {
  item: VideoItem;
  lessons: VideoItem[];
  files?: any[];
  quizzes?: any[];
  onSelectLesson: (lesson: VideoItem) => void;
  onStartQuiz?: (quiz: any) => void;
  onClose: () => void;
};

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function attachedFiles(item: VideoItem, files: any[]): LessonFile[] {
  if (item.attachments?.length) return item.attachments as LessonFile[];
  const legacy = item.pdfFileId ? files.find((file) => file.id === item.pdfFileId) : null;
  return legacy ? [legacy] : [];
}

async function saveProgress(item: VideoItem, progress: number, currentTime: number, duration: number) {
  if (!item.id) return;
  const progressMap = readJson<Record<number, number>>("dr_mahmoud_watch_progress", {});
  progressMap[item.id] = Math.max(progressMap[item.id] || 0, progress);
  localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(progressMap));
  const positionMap = readJson<Record<number, number>>("dr_mahmoud_watch_positions", {});
  positionMap[item.id] = Math.floor(currentTime);
  localStorage.setItem("dr_mahmoud_watch_positions", JSON.stringify(positionMap));
  window.dispatchEvent(new Event("watch_progress_updated"));
  const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
  await fetch(`/api/learning/progress/${item.id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...(deviceId ? { "X-Device-Id": deviceId } : {}) },
    body: JSON.stringify({ progress, currentTimeSeconds: currentTime, durationSeconds: duration }),
  }).catch(() => undefined);
}

function PlayerButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} {...props} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-100 transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${props.className || ""}`}>{children}</button>;
}

// ── Landscape detection hook ─────────────────────────────────────────────────
function useIsLandscapeMobile() {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const mobile = window.innerHeight < 600;
      setIsLandscapeMobile(landscape && mobile);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    const mql = window.matchMedia("(orientation: landscape)");
    mql.addEventListener?.("change", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
      mql.removeEventListener?.("change", check);
    };
  }, []);
  return isLandscapeMobile;
}

export function PremiumLessonPlayer({ item, lessons, files = [], quizzes = [], onSelectLesson, onStartQuiz, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const controlsTimer = useRef<number | undefined>(undefined);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerErrorMessage, setPlayerErrorMessage] = useState("");
  const [streamSrc, setStreamSrc] = useState(item.youtubeUrl);
  const refreshAttempted = useRef(false);
  const [youtubeStarted, setYoutubeStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "files" | "notes" | "questions">("overview");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ name: string; phone: string } | null>(null);
  const [wmPosition, setWmPosition] = useState<{ top: string; left: string }>({ top: "10%", left: "15%" });

  // Non-obstructive corner watermark: alternates quietly between top corners every 12s
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const positions = [
        { top: "6%", left: "4%" },
        { top: "6%", left: "72%" },
        { top: "8%", left: "6%" },
        { top: "8%", left: "70%" },
      ];
      const nextPos = positions[Math.floor(Math.random() * positions.length)];
      setWmPosition(nextPos);
    }, 12000);
    return () => clearInterval(interval);
  }, [playing]);

  // ── Landscape YouTube-style controls visibility ──────────────────────────
  const isLandscapeMobile = useIsLandscapeMobile();
  const [controlsVisible, setControlsVisible] = useState(true);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  const handleVideoAreaTap = useCallback(() => {
    if (!isLandscapeMobile) return;
    if (controlsVisible) {
      setControlsVisible(false);
      window.clearTimeout(controlsTimer.current);
    } else {
      showControlsTemporarily();
    }
  }, [isLandscapeMobile, controlsVisible, showControlsTemporarily]);

  useEffect(() => {
    if (isLandscapeMobile) {
      showControlsTemporarily();
    } else {
      setControlsVisible(true);
      window.clearTimeout(controlsTimer.current);
    }
    return () => window.clearTimeout(controlsTimer.current);
  }, [isLandscapeMobile]);

  useEffect(() => {
    if (!isLandscapeMobile) return;
    if (!playing) {
      setControlsVisible(true);
      window.clearTimeout(controlsTimer.current);
    }
  }, [playing, isLandscapeMobile]);

  const isProtected = item.youtubeUrl?.startsWith("/api/videos/") || item.youtubeUrl?.startsWith("/uploads/") || item.youtubeUrl?.includes(".m3u8");
  const videoId = getYouTubeVideoId(item.youtubeUrl);
  const playlistId = getYouTubePlaylistId(item.youtubeUrl);
  const currentIndex = Math.max(0, lessons.findIndex((lesson) => lesson.id === item.id));
  const previous = lessons[currentIndex - 1];
  const next = lessons[currentIndex + 1];
  const resources = useMemo(() => attachedFiles(item, files), [item, files]);
  const quiz = item.quizId ? quizzes.find((entry) => entry.id === item.quizId) : null;
  const noteKey = `dr_mahmoud_lesson_notes_${item.id || item.title}`;
  const poster = item.thumbnailUrl || getYoutubeThumbnail(item.youtubeUrl);

  // Fetch current student info for dynamic anti-piracy watermark
  useEffect(() => {
    const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
    fetch("/api/student/me", { credentials: "include", headers: deviceId ? { "X-Device-Id": deviceId } : {} })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.student) {
          setStudentInfo({ name: data.student.name || "", phone: data.student.phone || "" });
        }
      })
      .catch(() => undefined);
  }, []);

  // HLS stream handler
  useEffect(() => {
    const video = videoRef.current;
    if (!isProtected || !video || !streamSrc) return;

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    const isHlsSource = streamSrc.includes(".m3u8");

    if (isHlsSource) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;
        hls.loadSource(streamSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlayerReady(true);
          setPlayerError(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            void refreshStreamUrl();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari iOS / Mac)
        video.src = streamSrc;
      }
    } else {
      video.src = streamSrc;
    }

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [streamSrc, isProtected]);

  useEffect(() => {
    setPlayerReady(false); setPlayerError(false); setPlayerErrorMessage(""); setStreamSrc(item.youtubeUrl); refreshAttempted.current = false; setYoutubeStarted(false); setCurrentTime(0); setDuration(0); setPlaying(false);
    const storedProgress = item.id ? readJson<Record<number, number>>("dr_mahmoud_watch_progress", {})[item.id] || 0 : 0;
    setProgress(storedProgress);
    setNotes(readJson<LessonNote[]>(noteKey, []));
  }, [item.id, item.title, noteKey]);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (!isProtected || ["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowRight" && videoRef.current) { event.preventDefault(); seekRelative(10); }
      if (event.key === "ArrowLeft" && videoRef.current) { event.preventDefault(); seekRelative(-10); }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isProtected, onClose]);

  useEffect(() => {
    if (!isProtected || !item.id) return;
    saveTimer.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || !video.duration) return;
      const percent = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
      void saveProgress(item, percent >= 90 ? 100 : percent, video.currentTime, video.duration);
    }, 12000);
    return () => window.clearInterval(saveTimer.current);
  }, [isProtected, item]);

  const [seekNotice, setSeekNotice] = useState<string | null>(null);

  const seekRelative = (seconds: number) => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      const target = Math.max(0, Math.min(dur, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      const label = seconds > 0 ? "+10ث" : "-10ث";
      setSeekNotice(label);
      setTimeout(() => setSeekNotice((current) => (current === label ? null : current)), 800);
    }
    if (isLandscapeMobile) showControlsTemporarily();
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play(); else video.pause();
    if (isLandscapeMobile) showControlsTemporarily();
  };

  const toggleFullscreen = async () => {
    try {
      const video = videoRef.current;
      const target = shellRef.current || video;
      if (!document.fullscreenElement) {
        await target?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {}
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const refreshStreamUrl = async () => {
    if (refreshAttempted.current) {
      setPlayerErrorMessage("الفيديو مش متاح دلوقتي. حاول تاني بعد شوية.");
      setPlayerError(true);
      return;
    }
    refreshAttempted.current = true;
    try {
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const unlockKeys = localStorage.getItem("dr_mahmoud_unlock_keys") || "";
      const response = await fetch(`/api/videos/${item.id}/stream-url`, {
        credentials: "include",
        headers: {
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
          ...(unlockKeys ? { "X-Unlock-Keys": unlockKeys } : {}),
        },
      });
      if (response.ok) {
        const data = await response.json() as { url: string };
        if (data?.url) { setStreamSrc(data.url); setPlayerError(false); return; }
      }
      setPlayerErrorMessage("رابط الفيديو غير صالح أو الملف غير موجود على السيرفر.");
    } catch {
      setPlayerErrorMessage("رابط الفيديو غير صالح أو الملف غير موجود على السيرفر.");
    }
    setPlayerError(true);
  };

  const markComplete = async () => {
    setSaving(true);
    await saveProgress(item, 100, videoRef.current?.currentTime || currentTime, videoRef.current?.duration || duration);
    setProgress(100); setSaving(false);
  };

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    const updated = [...notes, { id: Date.now(), at: Math.floor(videoRef.current?.currentTime || currentTime), text }];
    setNotes(updated); localStorage.setItem(noteKey, JSON.stringify(updated)); setNoteText("");
  };

  const youtubeUrl = playlistId && item.type === "playlist"
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`
    : videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3` : "";

  // ── Landscape fullscreen video overlay (YouTube-style) ───────────────────
  const LandscapeControlsOverlay = (
    <AnimatePresence>
      {controlsVisible && (
        <motion.div
          key="landscape-controls"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)" }}
        >
          {/* Top bar: title + close */}
          <div className="flex items-center justify-between px-4 pt-3 pointer-events-auto">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-sky-300">{item.category}</p>
              <h2 className="truncate text-sm font-bold text-white">{item.title}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="ml-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 border border-white/20 text-white backdrop-blur-sm transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Center: seek + play/pause */}
          <div className="flex items-center justify-center gap-8 pointer-events-auto">
            <button
              onClick={() => seekRelative(-10)}
              className="group grid h-14 w-14 place-items-center rounded-full bg-black/40 border border-white/20 text-white backdrop-blur-sm transition active:scale-90"
              aria-label="تأخير 10 ثواني"
            >
              <div className="flex flex-col items-center">
                <RotateCcw className="h-5 w-5 transition group-active:-rotate-45" />
                <span className="text-[9px] font-black text-sky-300 leading-none mt-0.5">10ث</span>
              </div>
            </button>

            <button
              onClick={() => void togglePlay()}
              className="grid h-16 w-16 place-items-center rounded-full bg-sky-500 text-slate-950 shadow-2xl transition active:scale-90"
              aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}
            >
              {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
            </button>

            <button
              onClick={() => seekRelative(10)}
              className="group grid h-14 w-14 place-items-center rounded-full bg-black/40 border border-white/20 text-white backdrop-blur-sm transition active:scale-90"
              aria-label="تقديم 10 ثواني"
            >
              <div className="flex flex-col items-center">
                <RotateCw className="h-5 w-5 transition group-active:rotate-45" />
                <span className="text-[9px] font-black text-sky-300 leading-none mt-0.5">10ث</span>
              </div>
            </button>
          </div>

          {/* Bottom bar: time + scrubber + volume + fullscreen */}
          <div className="flex items-center gap-2 px-3 pb-3 pointer-events-auto" dir="ltr">
            <span className="shrink-0 min-w-[82px] text-xs tabular-nums text-slate-200 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <input
              aria-label="موضع تشغيل الفيديو"
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(event) => {
                if (videoRef.current) videoRef.current.currentTime = Number(event.target.value);
                showControlsTemporarily();
              }}
              className="h-8 min-w-0 flex-1 accent-sky-400"
            />
            <button
              aria-label={volume ? "كتم الصوت" : "تشغيل الصوت"}
              onClick={() => {
                const nextVolume = volume ? 0 : 1;
                setVolume(nextVolume);
                if (videoRef.current) videoRef.current.volume = nextVolume;
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white"
            >
              {volume ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              aria-label={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
              onClick={() => void toggleFullscreen()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return <AnimatePresence>
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/85 p-0 backdrop-blur-sm sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div ref={shellRef} role="dialog" aria-modal="true" aria-labelledby="lesson-player-title" dir="rtl" initial={{ opacity: 0, scale: .98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 12 }} className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[1280px] flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[20px] sm:border sm:border-white/10">
        <header className="relative shrink-0 border-b border-white/10 bg-slate-950 px-4 py-3 sm:px-5 landscape:hidden">
          <div className="flex min-h-11 items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 truncate text-[11px] font-bold text-sky-400">{item.category}</p>
              <h2 id="lesson-player-title" className="truncate text-sm font-bold text-white sm:text-base">{item.title}</h2>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400"><span>الدرس {item.order || currentIndex + 1}</span><span aria-hidden>•</span><Clock3 className="h-3 w-3"/><span>{item.durationText || (duration ? formatTime(duration) : "فيديو تعليمي")}</span></div>
            </div>
            <button onClick={() => setPlaylistOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 lg:hidden" aria-label="فتح قائمة الدروس"><ListVideo className="h-5 w-5"/></button>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400" aria-label="إغلاق مشغل الدرس"><X className="h-5 w-5"/></button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5"><div className="h-full bg-sky-500 transition-[width]" style={{ width: `${progress}%` }}/></div>
        </header>

        <div className="min-h-0 flex-1 flex flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
            {/* ── Video section ── */}
            <section
              className={`bg-black shrink-0 flex flex-col relative justify-center ${isLandscapeMobile ? "flex-1 min-h-0" : "landscape:flex-1 landscape:min-h-0"}`}
            >
              {/* Tap area for landscape controls toggle — covers full video */}
              {isLandscapeMobile && (
                <div
                  className="absolute inset-0 z-10"
                  onClick={handleVideoAreaTap}
                  aria-hidden="true"
                />
              )}

              <div className={`relative w-full bg-black overflow-hidden flex items-center justify-center ${isLandscapeMobile ? "flex-1 min-h-0 aspect-auto" : "aspect-video sm:aspect-auto sm:flex-1 sm:min-h-0 landscape:flex-1 landscape:min-h-0 landscape:aspect-none"}`}>

                {/* Landscape YouTube-style overlay */}
                {isLandscapeMobile && isProtected && LandscapeControlsOverlay}

                {/* Seek notice toast */}
                <AnimatePresence>
                  {seekNotice && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      className="absolute inset-0 z-30 pointer-events-none grid place-items-center"
                    >
                      <div className="flex items-center gap-2 rounded-2xl bg-sky-500/90 border border-sky-300/40 px-5 py-3 text-lg font-black text-slate-950 shadow-2xl backdrop-blur-md">
                        {seekNotice.startsWith("+") ? <RotateCw className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}
                        <span>{seekNotice}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isProtected ? <>
                  {!playerReady && !playerError && <div className="absolute inset-0 z-10 animate-pulse bg-slate-900"><div className="absolute inset-0 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-400"/></div></div>}
                  {playerError ? <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 p-6 text-center"><div><p className="font-bold text-white">تعذر تشغيل الدرس</p><p className="mt-2 text-sm text-slate-400">{playerErrorMessage}</p><button onClick={() => { refreshAttempted.current = false; setPlayerError(false); void refreshStreamUrl(); }} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 font-bold text-slate-950 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><RefreshCw className="h-4 w-4"/>تحديث رابط الفيديو</button></div></div> : null}
                  <video
                    ref={videoRef}
                    className="h-full w-full object-contain max-h-full max-w-full select-none pointer-events-auto"
                    src={streamSrc}
                    poster={poster || undefined}
                    preload="auto"
                    playsInline
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      setDuration(video.duration);
                      setPlayerReady(true);
                      setPlayerError(false);
                      const position = item.id ? readJson<Record<number, number>>("dr_mahmoud_watch_positions", {})[item.id] || 0 : 0;
                      if (position < video.duration - 5) video.currentTime = position;
                    }}
                    onError={() => { void refreshStreamUrl(); }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget;
                      setCurrentTime(video.currentTime);
                      const percent = video.duration ? Math.round((video.currentTime / video.duration) * 100) : 0;
                      setProgress((old) => Math.max(old, percent >= 90 ? 100 : percent));
                    }}
                    onEnded={() => { void markComplete(); }}
                  />

                  {/* Dynamic Watermark for Anti-Screen Recording & Piracy Tracking */}
                  {studentInfo && (
                    <div
                      style={{ top: wmPosition.top, left: wmPosition.left }}
                      className="absolute z-10 pointer-events-none select-none opacity-20 text-[9px] font-mono text-white/80 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 transition-all duration-1000 ease-in-out dir-ltr"
                    >
                      {studentInfo.name} • {studentInfo.phone}
                    </div>
                  )}

                  {/* Portrait: pause/play overlay with seek buttons */}
                  {playerReady && !playing && !playerError && !isLandscapeMobile && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center gap-5 bg-black/40 backdrop-blur-[2px] transition-all">
                      <button
                        onClick={() => seekRelative(-10)}
                        className="group grid h-12 w-12 place-items-center rounded-full bg-slate-900/80 border border-white/20 text-white shadow-xl backdrop-blur-md transition hover:scale-110 active:scale-95 hover:bg-slate-800"
                        aria-label="تأخير 10 ثواني"
                        title="تأخير 10 ثوانٍ"
                      >
                        <div className="flex flex-col items-center">
                          <RotateCcw className="h-5 w-5 transition group-hover:-rotate-45" />
                          <span className="text-[9px] font-black leading-none mt-0.5 text-sky-400">10ث</span>
                        </div>
                      </button>

                      <button
                        onClick={() => void togglePlay()}
                        className="grid h-16 w-16 place-items-center rounded-full bg-sky-500 text-slate-950 shadow-2xl transition hover:scale-110 active:scale-95 sm:h-20 sm:w-20"
                        aria-label="تشغيل الفيديو"
                      >
                        <Play className="h-7 w-7 fill-current sm:h-9 sm:w-9" />
                      </button>

                      <button
                        onClick={() => seekRelative(10)}
                        className="group grid h-12 w-12 place-items-center rounded-full bg-slate-900/80 border border-white/20 text-white shadow-xl backdrop-blur-md transition hover:scale-110 active:scale-95 hover:bg-slate-800"
                        aria-label="تقديم 10 ثواني"
                        title="تقديم 10 ثوانٍ"
                      >
                        <div className="flex flex-col items-center">
                          <RotateCw className="h-5 w-5 transition group-hover:rotate-45" />
                          <span className="text-[9px] font-black leading-none mt-0.5 text-sky-400">10ث</span>
                        </div>
                      </button>
                    </div>
                  )}
                </> : youtubeUrl ? <>
                  {!youtubeStarted ? <button onClick={() => setYoutubeStarted(true)} className="absolute inset-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400" aria-label="تشغيل الفيديو"><img src={poster} alt="" className="h-full w-full object-cover"/><span className="absolute inset-0 bg-black/35"/><span className="absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-sky-500 text-slate-950 shadow-xl transition group-hover:scale-105 sm:h-20 sm:w-20"><Play className="h-8 w-8 fill-current"/></span></span></button> : <iframe className="absolute inset-0 h-full w-full border-0 object-contain" src={youtubeUrl} title={item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
                </> : <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-200 bg-slate-950/90">
                    <div className="max-w-md space-y-4">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Lock className="h-7 w-7" />
                      </div>
                      <h3 className="text-base font-bold text-white">يلزم سداد الاشتراك لمشاهدة هذا الفيديو 💳</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        هذا المحتوى غير متاح حالياً. يرجى دفع قيمة الكورس ورفع صورة إيصال التحويل من الشاشة الرئيسية ليقوم الأدمن بتفعيل حسابك وفك تشغيل الفيديوهات فوراً.
                      </p>
                      <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95 shadow-lg"
                      >
                        الذهاب لرفع الإيصال 📤
                      </button>
                    </div>
                  </div>}
              </div>

              {/* Portrait + desktop bottom control bar (hidden in landscape mobile) */}
              {isProtected && !isLandscapeMobile && (
                <div className="flex h-12 shrink-0 items-center gap-1 border-t border-white/10 bg-slate-950 px-2 sm:px-4" dir="ltr">
                  <PlayerButton label="تأخير 10 ثواني" onClick={() => seekRelative(-10)}>
                    <div className="flex flex-col items-center">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                  </PlayerButton>

                  <PlayerButton label={playing ? "إيقاف مؤقت" : "تشغيل"} onClick={() => void togglePlay()}>
                    {playing ? <Pause className="h-5 w-5 fill-current"/> : <Play className="h-5 w-5 fill-current"/>}
                  </PlayerButton>

                  <PlayerButton label="تقديم 10 ثواني" onClick={() => seekRelative(10)}>
                    <div className="flex flex-col items-center">
                      <RotateCw className="h-4 w-4" />
                    </div>
                  </PlayerButton>
                  <span className="min-w-[82px] text-xs tabular-nums text-slate-300">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <input
                    aria-label="موضع تشغيل الفيديو"
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={(event) => {
                      if (videoRef.current) videoRef.current.currentTime = Number(event.target.value);
                    }}
                    className="h-11 min-w-0 flex-1 accent-sky-500"
                  />
                  <PlayerButton
                    label={volume ? "كتم الصوت" : "تشغيل الصوت"}
                    onClick={() => {
                      const nextVolume = volume ? 0 : 1;
                      setVolume(nextVolume);
                      if (videoRef.current) videoRef.current.volume = nextVolume;
                    }}
                  >
                    {volume ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}
                  </PlayerButton>
                  <div className="relative hidden sm:block">
                    <PlayerButton label="سرعة التشغيل" onClick={() => setShowSpeed(!showSpeed)}>
                      <Gauge className="h-5 w-5"/>
                    </PlayerButton>
                    {showSpeed && (
                      <div className="absolute bottom-12 right-0 z-30 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-xl">
                        {[0.75, 1, 1.25, 1.5, 2].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setSpeed(val);
                              if (videoRef.current) videoRef.current.playbackRate = val;
                              setShowSpeed(false);
                            }}
                            className={`block h-10 w-20 rounded-lg text-sm hover:bg-white/10 ${speed === val ? "text-sky-400" : "text-white"}`}
                          >
                            {val}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <PlayerButton label="صورة داخل صورة" className="hidden sm:grid" onClick={() => void videoRef.current?.requestPictureInPicture?.()}>
                    <PictureInPicture className="h-5 w-5"/>
                  </PlayerButton>
                  <PlayerButton label={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"} onClick={() => void toggleFullscreen()}>
                    {isFullscreen ? <Minimize className="h-5 w-5"/> : <Maximize className="h-5 w-5"/>}
                  </PlayerButton>
                </div>
              )}
            </section>

            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 text-slate-100 landscape:hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3 sm:px-5">
                <button disabled={!previous} onClick={() => previous && onSelectLesson(previous)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40"><ChevronRight className="h-4 w-4"/>السابق</button>
                <button disabled={!next} onClick={() => next && onSelectLesson(next)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40">التالي<ChevronLeft className="h-4 w-4"/></button>
                <div className="mr-auto flex items-center gap-3"><span className="text-xs font-bold text-slate-400">{progress}% مكتمل</span><button disabled={progress >= 100 || saving} onClick={() => void markComplete()} className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-extrabold text-slate-950 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:bg-emerald-500/20 disabled:text-emerald-300">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}{progress >= 100 ? "تم إكمال الدرس" : "تحديد كمكتمل"}</button></div>
              </div>

              <div className="border-b border-white/10 px-3 sm:px-5"><div className="flex overflow-x-auto">{([['overview','نظرة عامة',FileText],['files','ملفات الدرس',Download],['notes','ملاحظاتي',StickyNote],['questions','الأسئلة',MessageCircle]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 ${tab===id ? "border-sky-400 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}><Icon className="h-4 w-4"/>{label}</button>)}</div></div>
              <div className="min-h-44 p-4 sm:p-6">
                {tab === "overview" && <div><h3 className="font-extrabold text-white">عن هذا الدرس</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{item.description || "شاهد الدرس بالكامل، واستخدم الملفات والملاحظات لتثبيت المعلومات. يتم حفظ تقدمك تلقائيًا."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-white/10 px-3 py-2 text-slate-200">{item.category}</span>{item.stage && <span className="rounded-lg bg-white/10 px-3 py-2 text-slate-200">{item.stage}</span>}</div></div>}
                {tab === "files" && <div className="grid gap-2 sm:grid-cols-2">{resources.length ? resources.map(file => <a key={file.id} href={`/api/learning/files/${file.id}/preview?deviceId=${encodeURIComponent(localStorage.getItem("dr_mahmoud_device_id") || "")}`} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-sky-400/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><FileText className="h-5 w-5 text-sky-400"/><span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{file.title}</span><Eye className="h-4 w-4 text-slate-400"/></a>) : <p className="text-sm text-slate-400">لا توجد ملفات مرفقة بهذا الدرس.</p>}</div>}
                {tab === "notes" && <div><div className="flex gap-2"><textarea value={noteText} onChange={event => setNoteText(event.target.value)} placeholder="اكتب ملاحظة مرتبطة بالوقت الحالي..." className="min-h-20 flex-1 resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"/><button onClick={addNote} disabled={!noteText.trim()} className="h-11 self-end rounded-xl bg-sky-500 px-4 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40">حفظ</button></div><div className="mt-4 space-y-2">{notes.map(note => <button key={note.id} onClick={() => { if(videoRef.current){ videoRef.current.currentTime=note.at; void videoRef.current.play(); } }} className="flex w-full gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-right hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><span className="font-mono text-xs font-bold text-sky-400">{formatTime(note.at)}</span><span className="text-sm text-white">{note.text}</span></button>)}</div></div>}
                {tab === "questions" && <div>{quiz ? <button disabled={quiz.locked} onClick={() => onStartQuiz?.(quiz)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"><Captions className="h-4 w-4"/>{quiz.locked ? quiz.lockedReason || "أكمل الدرس أولًا" : "ابدأ اختبار الدرس"}</button> : <p className="text-sm text-slate-400">لا يوجد اختبار مرتبط بهذا الدرس حاليًا.</p>}</div>}
              </div>
            </div>
          </main>

          <aside className="hidden min-h-0 border-r border-white/10 bg-slate-900 lg:flex lg:flex-col"><Playlist lessons={lessons} active={item} onSelect={onSelectLesson}/></aside>
        </div>
        <div className="sticky bottom-0 z-30 flex min-h-16 items-center justify-between border-t border-white/10 bg-slate-950 px-3 lg:hidden landscape:hidden"><button disabled={!previous} onClick={() => previous && onSelectLesson(previous)} className="h-11 rounded-xl px-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-30">السابق</button><button onClick={() => setPlaylistOpen(true)} className="h-11 rounded-xl px-4 text-sm font-bold text-sky-400 hover:bg-white/10">قائمة الدروس</button><button disabled={!next} onClick={() => next && onSelectLesson(next)} className="h-11 rounded-xl px-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-30">التالي</button></div>
      </motion.div>
      {playlistOpen && <motion.div className="fixed inset-0 z-[110] bg-black/60 lg:hidden" initial={{opacity:0}} animate={{opacity:1}} onClick={() => setPlaylistOpen(false)}><motion.aside dir="rtl" className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-slate-900 shadow-2xl" initial={{x:'100%'}} animate={{x:0}} onClick={event => event.stopPropagation()}><div className="flex h-16 items-center justify-between border-b border-white/10 px-4"><strong className="text-white">محتوى الكورس</strong><button onClick={() => setPlaylistOpen(false)} aria-label="إغلاق قائمة الدروس" className="grid h-11 w-11 place-items-center rounded-xl text-white hover:bg-white/10"><X className="h-5 w-5"/></button></div><Playlist lessons={lessons} active={item} onSelect={(lesson) => { onSelectLesson(lesson); setPlaylistOpen(false); }}/></motion.aside></motion.div>}
    </motion.div>
  </AnimatePresence>;
}

function Playlist({ lessons, active, onSelect }: { lessons: VideoItem[]; active: VideoItem; onSelect: (lesson: VideoItem) => void }) {
  return <><div className="border-b border-white/10 p-4"><p className="text-xs font-bold text-sky-400">محتوى الكورس</p><p className="mt-1 text-sm text-slate-300">{lessons.length} درس</p></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{lessons.map((lesson, index) => { const selected = lesson.id === active.id; const completed = lesson.id ? (readJson<Record<number,number>>("dr_mahmoud_watch_progress", {})[lesson.id] || 0) >= 90 : false; return <button key={lesson.id || lesson.title} onClick={() => onSelect(lesson)} aria-current={selected ? "true" : undefined} className={`mb-1 flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? "bg-sky-500/15 text-white" : "text-slate-300 hover:bg-white/5"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${selected ? "bg-sky-500 text-slate-950" : completed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5"}`}>{completed ? <Check className="h-4 w-4"/> : index + 1}</span><span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs font-bold leading-5">{lesson.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{lesson.durationText || "فيديو"}</span></span>{selected && <Play className="h-4 w-4 fill-sky-400 text-sky-400"/>}</button>; })}</div></>;
}
