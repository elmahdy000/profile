import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Captions, Check, ChevronLeft, ChevronRight, Clock3, Download,
  FileText, Gauge, ListVideo, Loader2, Maximize, MessageCircle,
  Minimize, Pause, PictureInPicture, Play, RefreshCw, StickyNote,
  Volume2, VolumeX, X,
} from "lucide-react";
import { getYouTubePlaylistId, getYouTubeVideoId, getYoutubeThumbnail, type VideoItem } from "@/lib/video";

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
  await fetch(`/api/learning/progress/${item.id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress, currentTimeSeconds: currentTime, durationSeconds: duration }),
  }).catch(() => undefined);
}

function PlayerButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} {...props} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-100 transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${props.className || ""}`}>{children}</button>;
}

export function PremiumLessonPlayer({ item, lessons, files = [], quizzes = [], onSelectLesson, onStartQuiz, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
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

  const isProtected = item.youtubeUrl?.startsWith("/api/videos/") || item.youtubeUrl?.startsWith("/uploads/");
  const videoId = getYouTubeVideoId(item.youtubeUrl);
  const playlistId = getYouTubePlaylistId(item.youtubeUrl);
  const currentIndex = Math.max(0, lessons.findIndex((lesson) => lesson.id === item.id));
  const previous = lessons[currentIndex - 1];
  const next = lessons[currentIndex + 1];
  const resources = useMemo(() => attachedFiles(item, files), [item, files]);
  const quiz = item.quizId ? quizzes.find((entry) => entry.id === item.quizId) : null;
  const noteKey = `dr_mahmoud_lesson_notes_${item.id || item.title}`;
  const poster = item.thumbnailUrl || getYoutubeThumbnail(item.youtubeUrl);

  useEffect(() => {
    setPlayerReady(false); setPlayerError(false); setYoutubeStarted(false); setCurrentTime(0); setDuration(0); setPlaying(false);
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
      if (event.code === "Space") { event.preventDefault(); void togglePlay(); }
      if (event.key === "ArrowRight" && videoRef.current) videoRef.current.currentTime += 10;
      if (event.key === "ArrowLeft" && videoRef.current) videoRef.current.currentTime -= 10;
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKey); };
  });

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

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play(); else video.pause();
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

  return <AnimatePresence>
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/85 p-0 backdrop-blur-sm sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div ref={shellRef} role="dialog" aria-modal="true" aria-labelledby="lesson-player-title" dir="rtl" initial={{ opacity: 0, scale: .98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 12 }} className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[1280px] flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[20px] sm:border sm:border-white/10">
        <header className="relative shrink-0 border-b border-white/10 bg-slate-950 px-4 py-3 sm:px-5">
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

        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
          <main className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
            <section className="bg-black">
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {isProtected ? <>
                  {!playerReady && !playerError && <div className="absolute inset-0 z-10 animate-pulse bg-slate-900"><div className="absolute inset-0 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-400"/></div></div>}
                  {playerError ? <div className="absolute inset-0 z-20 grid place-items-center p-6 text-center"><div><p className="font-bold text-white">تعذر تحميل الفيديو</p><p className="mt-1 text-sm text-slate-400">تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.</p><button onClick={() => { setPlayerError(false); videoRef.current?.load(); }} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 font-bold text-slate-950 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><RefreshCw className="h-4 w-4"/>إعادة المحاولة</button></div></div> : null}
                  <video ref={videoRef} className="h-full w-full object-contain" src={item.youtubeUrl} poster={poster || undefined} preload="metadata" playsInline onLoadedMetadata={(event) => { const video = event.currentTarget; setDuration(video.duration); setPlayerReady(true); const position = item.id ? readJson<Record<number, number>>("dr_mahmoud_watch_positions", {})[item.id] || 0 : 0; if (position < video.duration - 5) video.currentTime = position; }} onError={() => setPlayerError(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => { const video = event.currentTarget; setCurrentTime(video.currentTime); const percent = video.duration ? Math.round(video.currentTime / video.duration * 100) : 0; setProgress((old) => Math.max(old, percent >= 90 ? 100 : percent)); }} onEnded={() => void markComplete()} />
                  {playerReady && !playing && !playerError && <button onClick={() => void togglePlay()} className="absolute inset-0 grid place-items-center bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400" aria-label="تشغيل الفيديو"><span className="grid h-16 w-16 place-items-center rounded-full bg-sky-500 text-slate-950 shadow-xl transition hover:scale-105 sm:h-20 sm:w-20"><Play className="h-7 w-7 fill-current sm:h-9 sm:w-9"/></span></button>}
                </> : youtubeUrl ? <>
                  {!youtubeStarted ? <button onClick={() => setYoutubeStarted(true)} className="absolute inset-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400" aria-label="تشغيل الفيديو"><img src={poster} alt="" className="h-full w-full object-cover"/><span className="absolute inset-0 bg-black/35"/><span className="absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-sky-500 text-slate-950 shadow-xl transition group-hover:scale-105 sm:h-20 sm:w-20"><Play className="h-8 w-8 fill-current"/></span></span></button> : <iframe className="absolute inset-0 h-full w-full" src={youtubeUrl} title={item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
                </> : <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-300">مصدر الفيديو غير مدعوم داخل المنصة.</div>}
              </div>

              {isProtected && <div className="flex h-14 items-center gap-1 border-t border-white/10 px-2 sm:px-4" dir="ltr">
                <PlayerButton label={playing ? "إيقاف مؤقت" : "تشغيل"} onClick={() => void togglePlay()}>{playing ? <Pause className="h-5 w-5 fill-current"/> : <Play className="h-5 w-5 fill-current"/>}</PlayerButton>
                <span className="min-w-[82px] text-xs tabular-nums text-slate-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <input aria-label="موضع تشغيل الفيديو" type="range" min={0} max={duration || 0} value={currentTime} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} className="h-11 min-w-0 flex-1 accent-sky-500"/>
                <PlayerButton label={volume ? "كتم الصوت" : "تشغيل الصوت"} onClick={() => { const nextVolume = volume ? 0 : 1; setVolume(nextVolume); if (videoRef.current) videoRef.current.volume = nextVolume; }}>{volume ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}</PlayerButton>
                <div className="relative hidden sm:block"><PlayerButton label="سرعة التشغيل" onClick={() => setShowSpeed(!showSpeed)}><Gauge className="h-5 w-5"/></PlayerButton>{showSpeed && <div className="absolute bottom-12 right-0 z-30 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-xl">{[.75,1,1.25,1.5,2].map(value => <button key={value} onClick={() => { setSpeed(value); if(videoRef.current) videoRef.current.playbackRate=value; setShowSpeed(false); }} className={`block h-10 w-20 rounded-lg text-sm hover:bg-white/10 ${speed===value ? "text-sky-400" : "text-white"}`}>{value}×</button>)}</div>}</div>
                <PlayerButton label="صورة داخل صورة" className="hidden sm:grid" onClick={() => void videoRef.current?.requestPictureInPicture?.()}><PictureInPicture className="h-5 w-5"/></PlayerButton>
                <PlayerButton label={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"} onClick={async () => { if (!document.fullscreenElement) await shellRef.current?.requestFullscreen(); else await document.exitFullscreen(); setIsFullscreen(Boolean(document.fullscreenElement)); }}>{isFullscreen ? <Minimize className="h-5 w-5"/> : <Maximize className="h-5 w-5"/>}</PlayerButton>
              </div>}
            </section>

            <div className="bg-white text-slate-900">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 sm:px-5">
                <button disabled={!previous} onClick={() => previous && onSelectLesson(previous)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40"><ChevronRight className="h-4 w-4"/>السابق</button>
                <button disabled={!next} onClick={() => next && onSelectLesson(next)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40">التالي<ChevronLeft className="h-4 w-4"/></button>
                <div className="mr-auto flex items-center gap-3"><span className="text-xs font-bold text-slate-500">{progress}% مكتمل</span><button disabled={progress >= 100 || saving} onClick={() => void markComplete()} className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-extrabold text-slate-950 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:bg-emerald-100 disabled:text-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}{progress >= 100 ? "تم إكمال الدرس" : "تحديد كمكتمل"}</button></div>
              </div>

              <div className="border-b border-slate-200 px-3 sm:px-5"><div className="flex overflow-x-auto">{([['overview','نظرة عامة',FileText],['files','ملفات الدرس',Download],['notes','ملاحظاتي',StickyNote],['questions','الأسئلة',MessageCircle]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 ${tab===id ? "border-sky-500 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Icon className="h-4 w-4"/>{label}</button>)}</div></div>
              <div className="min-h-44 p-4 sm:p-6">
                {tab === "overview" && <div><h3 className="font-extrabold">عن هذا الدرس</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{item.description || "شاهد الدرس بالكامل، واستخدم الملفات والملاحظات لتثبيت المعلومات. يتم حفظ تقدمك تلقائيًا."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-slate-100 px-3 py-2">{item.category}</span>{item.stage && <span className="rounded-lg bg-slate-100 px-3 py-2">{item.stage}</span>}</div></div>}
                {tab === "files" && <div className="grid gap-2 sm:grid-cols-2">{resources.length ? resources.map(file => <a key={file.id} href={`/api/learning/files/${file.id}/download`} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><FileText className="h-5 w-5 text-sky-600"/><span className="min-w-0 flex-1 truncate text-sm font-bold">{file.title}</span><Download className="h-4 w-4 text-slate-400"/></a>) : <p className="text-sm text-slate-500">لا توجد ملفات مرفقة بهذا الدرس.</p>}</div>}
                {tab === "notes" && <div><div className="flex gap-2"><textarea value={noteText} onChange={event => setNoteText(event.target.value)} placeholder="اكتب ملاحظة مرتبطة بالوقت الحالي..." className="min-h-20 flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"/><button onClick={addNote} disabled={!noteText.trim()} className="h-11 self-end rounded-xl bg-sky-500 px-4 text-sm font-bold hover:bg-sky-400 disabled:opacity-40">حفظ</button></div><div className="mt-4 space-y-2">{notes.map(note => <button key={note.id} onClick={() => { if(videoRef.current){ videoRef.current.currentTime=note.at; void videoRef.current.play(); } }} className="flex w-full gap-3 rounded-xl border border-slate-200 p-3 text-right hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><span className="font-mono text-xs font-bold text-sky-700">{formatTime(note.at)}</span><span className="text-sm">{note.text}</span></button>)}</div></div>}
                {tab === "questions" && <div>{quiz ? <button onClick={() => onStartQuiz?.(quiz)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-bold hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"><Captions className="h-4 w-4"/>ابدأ اختبار الدرس</button> : <p className="text-sm text-slate-500">لا يوجد اختبار مرتبط بهذا الدرس حاليًا.</p>}</div>}
              </div>
            </div>
          </main>

          <aside className="hidden min-h-0 border-r border-white/10 bg-slate-900 lg:flex lg:flex-col"><Playlist lessons={lessons} active={item} onSelect={onSelectLesson}/></aside>
        </div>
        <div className="sticky bottom-0 z-30 flex min-h-16 items-center justify-between border-t border-white/10 bg-slate-950 px-3 lg:hidden"><button disabled={!previous} onClick={() => previous && onSelectLesson(previous)} className="h-11 rounded-xl px-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-30">السابق</button><button onClick={() => setPlaylistOpen(true)} className="h-11 rounded-xl px-4 text-sm font-bold text-sky-400 hover:bg-white/10">قائمة الدروس</button><button disabled={!next} onClick={() => next && onSelectLesson(next)} className="h-11 rounded-xl px-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-30">التالي</button></div>
      </motion.div>
      {playlistOpen && <motion.div className="fixed inset-0 z-[110] bg-black/60 lg:hidden" initial={{opacity:0}} animate={{opacity:1}} onClick={() => setPlaylistOpen(false)}><motion.aside dir="rtl" className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-slate-900 shadow-2xl" initial={{x:'100%'}} animate={{x:0}} onClick={event => event.stopPropagation()}><div className="flex h-16 items-center justify-between border-b border-white/10 px-4"><strong className="text-white">محتوى الكورس</strong><button onClick={() => setPlaylistOpen(false)} aria-label="إغلاق قائمة الدروس" className="grid h-11 w-11 place-items-center rounded-xl text-white hover:bg-white/10"><X className="h-5 w-5"/></button></div><Playlist lessons={lessons} active={item} onSelect={(lesson) => { onSelectLesson(lesson); setPlaylistOpen(false); }}/></motion.aside></motion.div>}
    </motion.div>
  </AnimatePresence>;
}

function Playlist({ lessons, active, onSelect }: { lessons: VideoItem[]; active: VideoItem; onSelect: (lesson: VideoItem) => void }) {
  return <><div className="border-b border-white/10 p-4"><p className="text-xs font-bold text-sky-400">محتوى الكورس</p><p className="mt-1 text-sm text-slate-300">{lessons.length} درس</p></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{lessons.map((lesson, index) => { const selected = lesson.id === active.id; const completed = lesson.id ? (readJson<Record<number,number>>("dr_mahmoud_watch_progress", {})[lesson.id] || 0) >= 90 : false; return <button key={lesson.id || lesson.title} onClick={() => onSelect(lesson)} aria-current={selected ? "true" : undefined} className={`mb-1 flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? "bg-sky-500/15 text-white" : "text-slate-300 hover:bg-white/5"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${selected ? "bg-sky-500 text-slate-950" : completed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5"}`}>{completed ? <Check className="h-4 w-4"/> : index + 1}</span><span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs font-bold leading-5">{lesson.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{lesson.durationText || "فيديو"}</span></span>{selected && <Play className="h-4 w-4 fill-sky-400 text-sky-400"/>}</button>; })}</div></>;
}
