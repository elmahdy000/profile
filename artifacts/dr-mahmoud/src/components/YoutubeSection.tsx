import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Play, ExternalLink, Tv, ChevronLeft, Loader2, Lock, Unlock,
  Search, SlidersHorizontal, Bookmark, Share2, Clock, BookOpen, Award, ArrowUpDown,
  FileText, ClipboardCheck, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListVideos } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  type VideoItem,
  getYouTubeVideoId,
  getYouTubePlaylistId,
  getYoutubeThumbnail,
} from "@/lib/video";

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
        alert("عذراً، غير مسموح بالتقاط أو تسجيل الشاشة لحماية حقوق الملكية.");
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  const vidId = getYouTubeVideoId(item.youtubeUrl);
  const playlistId = getYouTubePlaylistId(item.youtubeUrl);

  const isStreamUrl = item.youtubeUrl?.startsWith("/api/videos/") || item.youtubeUrl?.startsWith("/uploads/");
  const studentKeys = typeof window !== "undefined" ? localStorage.getItem("dr_mahmoud_unlock_keys") || "" : "";
  const streamUrl = isStreamUrl ? item.youtubeUrl : "";

  let embedUrl = "";
  if (!isStreamUrl) {
    if (item.type === "playlist" && playlistId) {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`;
    } else if (vidId) {
      embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0`;
    }
  }

  // Track REAL watch progress from the local video element
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (typeof window === "undefined" || !item.id) return;
    const el = e.currentTarget;
    if (!el.duration || Number.isNaN(el.duration)) return;
    const percent = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    // Save at most in whole-percent steps to avoid excessive writes
    const progressObj = readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {});
    // Only move progress forward, never backward
    if ((progressObj[item.id] || 0) < percent) {
      progressObj[item.id] = percent;
      localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(progressObj));
      window.dispatchEvent(new Event("watch_progress_updated"));
    }
  };

  // Handle setting 100% completed
  const handleVideoEnded = () => {
    if (typeof window !== "undefined" && item.id) {
      const progressObj = readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {});
      progressObj[item.id] = 100;
      localStorage.setItem("dr_mahmoud_watch_progress", JSON.stringify(progressObj));
      window.dispatchEvent(new Event("watch_progress_updated"));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
            <div className="space-y-0.5 max-w-[85%] text-right">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {item.type === "playlist" ? "قائمة تشغيل" : "فيديو شروحات"}
              </span>
              <h3 className="text-base font-bold text-foreground line-clamp-1">{item.title}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق مشغل الفيديو"
              className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground/70 hover:text-foreground transition-all border border-border"
            >
              ✕
            </button>
          </div>

          {/* Player Container */}
          <div className="relative w-full aspect-video bg-black select-none" onContextMenu={(e) => e.preventDefault()}>
            {!isFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md text-white text-center p-6 transition-all duration-300">
                <Lock className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h3 className="text-2xl font-bold mb-2">تم إيقاف العرض مؤقتاً</h3>
                <p className="text-muted-foreground">يرجى العودة إلى نافذة المتصفح لمتابعة مشاهدة الفيديو.</p>
                <p className="text-xs text-red-500/80 mt-4 font-mono bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20">نظام الحماية ضد التسجيل مفعل</p>
              </div>
            )}

            {isStreamUrl && (
              <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden opacity-25 flex items-center justify-center mix-blend-overlay">
                <div className="text-white font-black text-4xl rotate-[-30deg] select-none text-center leading-relaxed">
                  د. محمود المهدي <br /> 
                  <span className="text-2xl font-mono block opacity-70 mt-2 tracking-widest text-red-300">
                    {studentKeys ? studentKeys.split(",")[0] : "PROTECTED CONTENT"}
                  </span>
                </div>
              </div>
            )}

            {isStreamUrl ? (
              <video
                className="absolute inset-0 w-full h-full object-contain bg-black"
                src={streamUrl}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : embedUrl ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Youtube className="w-16 h-16 text-red-500 mb-2" />
                <p className="text-muted-foreground text-sm">عذراً، تعذر تحميل الرابط المباشر.</p>
                <a
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-primary text-sm flex items-center gap-1.5 hover:underline"
                >
                  افتح مباشرة على يوتيوب <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
          {/* Linked Materials Footer */}
          {(item.pdfFileId || item.quizId) && (
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between text-right" dir="rtl">
              <span className="text-xs font-bold text-muted-foreground">الملفات والتمارين الملحقة بالدرس:</span>
              <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                {item.pdfFileId && (
                  (() => {
                    const file = files.find(f => f.id === item.pdfFileId);
                    if (!file) return null;
                    return (
                      <a
                        href={`/api/learning/files/${file.id}/download`}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 px-4 py-2.5 text-xs font-bold transition-all shadow-md"
                      >
                        <FileText className="w-4 h-4" />
                        تحميل ملف الـ PDF المرفق
                      </a>
                    );
                  })()
                )}
                {item.quizId && (
                  (() => {
                    const quiz = quizzes.find(q => q.id === item.quizId);
                    if (!quiz) return null;
                    return (
                      <button
                        onClick={() => {
                          onClose(); // close video modal before starting quiz
                          onStartQuiz?.(quiz);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        ابدأ حل اختبار الدرس
                      </button>
                    );
                  })()
                )}
              </div>
            </div>
          )}
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
      console.error(err);
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

          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              لم تحصل على كود تفعيل بعد؟ لا تقلق، يمكنك التواصل مع د. محمود مباشرة للحجز والحصول على الكود فوراً.
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full border-secondary/20 hover:border-secondary/50 hover:bg-secondary/10 text-secondary font-bold h-11 rounded-xl transition-all"
            >
              <a
                href={`https://wa.me/201044348610?text=${encodeURIComponent(
                  `أهلاً دكتور محمود، أود الاشتراك في الكورس وتفعيل المحاضرة: "${item.title}"`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                تواصل لحجز الكورس عبر واتساب
              </a>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


export function YoutubeSection({
  student,
  files = [],
  quizzes = [],
  onStartQuiz,
}: {
  student?: any;
  files?: any[];
  quizzes?: any[];
  onStartQuiz?: (quiz: any) => void;
}) {
  const { data: dbVideos, isLoading, isError, refetch } = useListVideos();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activePlayer, setActivePlayer] = useState<VideoItem | null>(null);
  const [unlockModalItem, setUnlockModalItem] = useState<VideoItem | null>(null);

  const studentGrade = student?.grade === "أخرى" ? student?.otherGradeDetail : student?.grade;
  const rawItems: VideoItem[] = dbVideos ? dbVideos as VideoItem[] : [];
  const matchedCategory = studentGrade
    ? rawItems.find(
        (item) => String(item.category).trim().toLowerCase() === String(studentGrade).trim().toLowerCase()
      )?.category
    : undefined;

  useEffect(() => {
    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    } else if (student && student.grade && dbVideos) {
      const grade = student.grade;
      const rawItemsList = (dbVideos as any[]) || [];
      const hasMatchingCategory = rawItemsList.some(
        (item) => String(item.category).trim().toLowerCase() === String(grade).trim().toLowerCase()
      );
      if (hasMatchingCategory) {
        setActiveCategory(grade);
      }
    }
  }, [student, dbVideos, matchedCategory]);

  // States for search, advanced filters, sorting, bookmarks, and watch progress
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAccess, setSelectedAccess] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"order" | "title" | "recent">("order");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [watchProgress, setWatchProgress] = useState<Record<number, number>>({});
  const { toast } = useToast();

  const handlePlayClick = (item: VideoItem) => {
    if (item.youtubeUrl === "locked") {
      setUnlockModalItem(item);
    } else {
      setActivePlayer(item);
    }
  };

  // Load Bookmarks & Progress from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Bookmarks
    setBookmarks(readStoredJson<number[]>("dr_mahmoud_bookmarks", []));

    // Progress setup helper function — reads REAL saved progress only
    const loadProgress = () => {
      setWatchProgress(readStoredJson<Record<number, number>>("dr_mahmoud_watch_progress", {}));
    };

    loadProgress();
    // Listen to watch progress custom event
    window.addEventListener("watch_progress_updated", loadProgress);
    return () => {
      window.removeEventListener("watch_progress_updated", loadProgress);
    };
  }, []);

  const toggleBookmark = (id?: number) => {
    if (!id) return;
    let updated;
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter((b) => b !== id);
      toast({ description: "تمت الإزالة من قائمتك المفضلة" });
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

  // Do not render demo content while the real library is still loading.
  // Enhance items with real metadata (entered by admin) + real watch progress
  const items = rawItems.map((item) => ({
    ...item,
    meta: getVideoMeta(item),
    progress: watchProgress[item.id || 0] || 0
  }));

  // Categories list
  const categories = matchedCategory
    ? [matchedCategory]
    : ["all", ...Array.from(new Set(items.map((item) => item.category)))];

  // Filtering Logic
  const filteredItems = items
    .filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty = selectedDifficulty === "all" || item.meta.difficulty === selectedDifficulty;
      const matchesType = selectedType === "all" || item.type === selectedType;
      const matchesAccess = selectedAccess === "all" || 
        (selectedAccess === "free" && item.youtubeUrl !== "locked") ||
        (selectedAccess === "paid" && item.youtubeUrl === "locked");
      return matchesCategory && matchesSearch && matchesDifficulty && matchesType && matchesAccess;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "recent") return (b.id || 0) - (a.id || 0);
      return a.order - b.order;
    });

  // Extract Featured Course (Pick the highest rated or first item)
  const featuredCourse = items.find(item => item.youtubeUrl !== "locked") || items[0];

  // Continue Learning Items (Progress > 0 & < 100)
  const continueLearningItems = items.filter(item => item.progress > 0 && item.progress < 100);

  // Generate dynamic JSON-LD Schema markup for Google Rich Video results
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@graph": items.map((item) => {
      const vidId = getYouTubeVideoId(item.youtubeUrl);
      if (item.type === "video" && vidId) {
        return {
          "@type": "VideoObject",
          "name": item.title,
          "description": item.description || item.title,
          "thumbnailUrl": [
            `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
          ],
          "embedUrl": `https://www.youtube.com/embed/${vidId}`,
          "contentUrl": item.youtubeUrl,
          "publisher": {
            "@type": "Organization",
            "name": "د. محمود المهدي - Learn to Code",
            "logo": {
              "@type": "ImageObject",
              "url": "https://drelmahdy.com/dr-mahmoud-photo.png"
            }
          }
        };
      }
      return null;
    }).filter(Boolean)
  };

  return (
    <section id="youtube-lectures" className="py-24 bg-background relative overflow-hidden" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      {/* Decorative Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm"
          >
            <Tv className="w-4 h-4" />
            المنصة التعليمية الشاملة
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black text-foreground">
            مكتبة{" "}
            <span className="text-primary">
              الكورسات والبرمجيات
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            منصة مخصصة لتأسيس الطلاب وبناء المهندسين. تعلم C++، هياكل البيانات، الخوارزميات وتطبيقات المدارس بأعلى حماية.
          </p>
        </motion.div>

        {isError && (
          <div role="status" className="max-w-3xl mx-auto mb-8 rounded-2xl border border-secondary/30 bg-secondary/10 px-5 py-3 text-center text-sm text-foreground">
            تعذر الاتصال بالمكتبة الآن. حاول إعادة تحميل الصفحة بعد لحظات.
          </div>
        )}

        {/* ─── 1. Featured Course Card (Coursera / Netflix Style) ─── */}
        {featuredCourse && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-6xl mx-auto"
          >
            <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-xl p-6 lg:p-10 flex flex-col lg:flex-row gap-8 items-center group hover:border-primary/30 transition-all duration-500">
              {/* Cover Thumbnail */}
              <div className="w-full lg:w-1/2 aspect-video rounded-2xl overflow-hidden relative shadow-lg">
                <img
                  src={getYoutubeThumbnail(featuredCourse.youtubeUrl)}
                  alt={featuredCourse.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePlayClick(featuredCourse)}
                    aria-label={`تشغيل ${featuredCourse.title}`}
                    className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
                  >
                    <Play className="w-7 h-7 fill-current mr-1" />
                  </button>
                </div>
                <span className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
                  كورس متميز ⭐
                </span>
              </div>

              {/* Course Info */}
              <div className="w-full lg:w-1/2 flex flex-col justify-between h-full space-y-4 text-right">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-3 py-1 rounded-md">
                      {featuredCourse.category}
                    </span>
                    {featuredCourse.meta.difficulty && (
                      <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-secondary" />
                        {featuredCourse.meta.difficulty}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-black text-foreground group-hover:text-primary transition-colors">
                    {featuredCourse.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {featuredCourse.description || "ابدأ رحلتك التدريبية مع هذا المسار المتكامل لتأسيس قوي للجامعة وسوق العمل."}
                  </p>
                </div>

                {/* Progress bar if watched */}
                {featuredCourse.progress > 0 && (
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>مستوى التقدم</span>
                      <span>{featuredCourse.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${featuredCourse.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Meta details & Buttons */}
                <div className="border-t border-border pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {featuredCourse.meta.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {featuredCourse.meta.duration}</span>
                    )}
                    {featuredCourse.meta.lessonsCount != null && (
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {featuredCourse.meta.lessonsCount} درس</span>
                    )}
                    {featuredCourse.meta.difficulty && (
                      <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {featuredCourse.meta.difficulty}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => handlePlayClick(featuredCourse)}
                      className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-5 rounded-xl shadow-lg w-full sm:w-auto"
                    >
                      {featuredCourse.progress > 0 ? "استئناف التعلم" : "ابدأ الكورس الآن"}
                    </Button>
                    <button
                      onClick={() => toggleBookmark(featuredCourse.id)}
                      aria-label={bookmarks.includes(featuredCourse.id || 0) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                      className={`p-3 rounded-xl border border-border hover:bg-muted transition-all ${
                        bookmarks.includes(featuredCourse.id || 0) ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground"
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* ─── 2. Continue Learning Section (Netflix style) ─── */}
        {continueLearningItems.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 max-w-6xl mx-auto"
          >
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              استكمال المشاهدة والتعلم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {continueLearningItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-center relative overflow-hidden group hover:border-primary/20 transition-all shadow-sm"
                >
                  <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                    <img src={getYoutubeThumbnail(item.youtubeUrl)} alt={item.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handlePlayClick(item)}
                      aria-label={`استئناف ${item.title}`}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-6 h-6 fill-white text-white" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2 text-right">
                    <span className="text-[10px] text-primary font-bold">{item.category}</span>
                    <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{item.progress}% مكتمل</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── 3. Learning Paths Section (SaaS Roadmap style) ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 max-w-6xl mx-auto"
        >
          <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            المسارات التعليمية الموصى بها 🚀
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "تأسيس البرمجة والتفكير المنطقي",
                desc: "مسار يبدأ من الصفر تماماً لبناء منطق برمجي قوي وحل المسائل (Problem Solving) باستخدام بايثون.",
                badge: "4 كورسات • مبتدئ",
                color: "from-primary/10 to-primary/5 border-primary/20 hover:border-primary/45"
              },
              {
                title: "برمجة الجامعات ومطوري النظم",
                desc: "المسار الأقوى لطلاب حاسبات ومعلومات وهندسة لتغطية C++ وهياكل البيانات والـ Algorithms بالكامل.",
                badge: "6 كورسات • متوسط",
                color: "from-primary/10 to-primary/5 border-primary/20 hover:border-primary/45"
              },
              {
                title: "مسار بكالوريا STEM والمدارس",
                desc: "تأسيس دراسي متين لجميع مراحل بكالوريا البرمجيات وحل امتحانات ToFAS المتقدمة.",
                badge: "3 كورسات • متقدم",
                color: "from-primary/10 to-secondary/5 border-primary/20 hover:border-primary/45"
              }
            ].map((path, idx) => (
              <div
                key={idx}
                className={`bg-card border ${path.color} p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:scale-[1.01] transition-transform`}
              >
                <div className="space-y-2 text-right">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
                    {path.badge}
                  </span>
                  <h4 className="text-base font-bold text-foreground">{path.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{path.desc}</p>
                </div>
                <Button
                  onClick={() => {
                    const el = document.getElementById("youtube-lectures");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  variant="link"
                  className="text-xs text-primary font-bold p-0 self-start hover:underline flex items-center gap-1"
                >
                  استكشف المسار <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── 4. Main Course Directory ─── */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-border pb-6 mb-8">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 self-start">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              دليل جميع المسارات والكورسات ({filteredItems.length})
            </h3>


            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث عن كورس أو مهارة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pr-10 pl-4 rounded-xl border border-border bg-background text-xs focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 h-10 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-muted-foreground text-xs cursor-pointer"
                >
                  <option value="order">الترتيب الافتراضي</option>
                  <option value="recent">المضاف حديثاً</option>
                  <option value="title">أبجدياً (أ-ي)</option>
                </select>
              </div>

              {/* Advanced Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-10 rounded-xl border-border flex items-center gap-1.5 ${
                  showFilters ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                تصفية متقدمة
              </Button>
            </div>
          </div>

          {/* Collapsible Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-card border border-border rounded-2xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-right shadow-sm"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">مستوى الصعوبة</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-primary text-foreground"
                  >
                    <option value="all">الكل</option>
                    <option value="مبتدئ">مبتدئ</option>
                    <option value="متوسط">متوسط</option>
                    <option value="متقدم">متقدم</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">نوع الكورس</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-primary text-foreground"
                  >
                    <option value="all">الكل</option>
                    <option value="playlist">قائمة تشغيل كاملة (كورس)</option>
                    <option value="video">شرح منفرد / محاضرة</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">نوع الوصول</label>
                  <select
                    value={selectedAccess}
                    onChange={(e) => setSelectedAccess(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-primary text-foreground"
                  >
                    <option value="all">الكل</option>
                    <option value="free">محتوى مفتوح مجاني</option>
                    <option value="paid">محتوى محمي / مدفوع 🔒</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-start gap-2 mb-8 border-b border-border pb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat === "all" ? "جميع الكورسات" : cat}
              </button>
            ))}
          </div>

          {/* Grid List */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-card border border-border rounded-3xl p-5 space-y-4 animate-pulse">
                  <div className="aspect-video bg-muted rounded-2xl w-full" />
                  <div className="h-4 bg-muted/80 rounded-md w-1/3" />
                  <div className="h-6 bg-muted/80 rounded-md w-3/4" />
                  <div className="h-10 bg-muted/80 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm">
              <p className="text-muted-foreground text-sm">لم يتم العثور على أي كورسات تطابق معايير البحث والفلترة.</p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    layout
                    key={item.id || idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden flex flex-col group transition-all duration-300 shadow-sm hover:shadow-xl relative"
                  >
                    {/* Thumbnail / Cover */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <img
                        src={getYoutubeThumbnail(item.youtubeUrl)}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                      />
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <button
                          onClick={() => handlePlayClick(item)}
                          aria-label={item.youtubeUrl === "locked" ? `فتح نافذة تفعيل ${item.title}` : `تشغيل ${item.title}`}
                          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-primary/95"
                        >
                          {item.youtubeUrl === "locked" ? (
                            <Lock className="w-6 h-6 text-secondary" />
                          ) : (
                            <Play className="w-6 h-6 fill-current ms-1" />
                          )}
                        </button>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-4 right-4 flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md ${
                          item.type === "playlist"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary/10 text-secondary border-secondary/20"
                        }`}>
                          {item.type === "playlist" ? "قائمة تشغيل" : "شرح منفرد"}
                        </span>
                        {item.youtubeUrl === "locked" && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md bg-secondary/10 text-secondary border-secondary/20 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            محتوى مدفوع 🔒
                          </span>
                        )}
                      </div>

                      {/* Top Left Quick Actions (Bookmark & Share) */}
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item.id);
                          }}
                          aria-label={bookmarks.includes(item.id || 0) ? `إزالة ${item.title} من المفضلة` : `إضافة ${item.title} إلى المفضلة`}
                          className={`w-8 h-8 rounded-lg bg-black/60 border border-border flex items-center justify-center hover:bg-black/80 transition-colors ${
                            bookmarks.includes(item.id || 0) ? "text-primary" : "text-white"
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCourse(item);
                          }}
                          aria-label={`مشاركة ${item.title}`}
                          className="w-8 h-8 rounded-lg bg-black/60 border border-border flex items-center justify-center hover:bg-black/80 text-white transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-4 text-right">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-block bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {item.meta.difficulty && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Award className="w-3 h-3" /> {item.meta.difficulty}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Real meta badges (duration / lessons) — only if provided */}
                      {(item.meta.duration || item.meta.lessonsCount != null || item.progress > 0) && (
                        <div className="space-y-3 border-t border-border pt-4">
                          {(item.meta.duration || item.meta.lessonsCount != null) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {item.meta.duration && (
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.meta.duration}</span>
                              )}
                              {item.meta.lessonsCount != null && (
                                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {item.meta.lessonsCount} درس</span>
                              )}
                            </div>
                          )}

                          {/* Progress bar if progress > 0 */}
                          {item.progress > 0 && (
                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Supplementary Materials (PDF & Exercises) */}
                      {(item.pdfFileId || item.quizId) && (
                        <div className="border-t border-border pt-4 space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground block">الملحقات والمرفقات:</span>
                          <div className="flex flex-col gap-2">
                            {item.pdfFileId && (
                              (() => {
                                const file = files.find(f => f.id === item.pdfFileId);
                                if (!file) return null;
                                return (
                                  <a
                                    href={`/api/learning/files/${file.id}/download`}
                                    className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/30 p-2.5 text-xs text-primary font-bold transition-all text-right w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="w-4 h-4 shrink-0 text-primary" />
                                    <span className="line-clamp-1 flex-1 text-right">{file.title} (PDF)</span>
                                    <Download className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                                  </a>
                                );
                              })()
                            )}
                            {item.quizId && (
                              (() => {
                                const quiz = quizzes.find(q => q.id === item.quizId);
                                if (!quiz) return null;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStartQuiz?.(quiz);
                                    }}
                                    className="flex items-center gap-2 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 p-2.5 text-xs text-amber-700 font-bold transition-all text-right w-full"
                                  >
                                    <ClipboardCheck className="w-4 h-4 shrink-0 text-amber-600" />
                                    <span className="line-clamp-1 flex-1 text-right">{quiz.title} (تمارين)</span>
                                    <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                        <button
                          onClick={() => handlePlayClick(item)}
                          className={`text-xs font-bold hover:underline flex items-center gap-1 group/btn ${
                            item.youtubeUrl === "locked" ? "text-secondary hover:text-secondary/80" : "text-primary"
                          }`}
                        >
                          {item.youtubeUrl === "locked" ? (
                            <>فك قفل الفيديو 🔒</>
                          ) : item.progress > 0 ? (
                            "استئناف المشاهدة"
                          ) : item.type === "playlist" ? (
                            "مشاهدة المسار"
                          ) : (
                            "ابدأ المشاهدة"
                          )}
                          <ChevronLeft className="w-4 h-4 group-hover/btn:translate-x-[-2px] transition-transform" />
                        </button>

                        {item.youtubeUrl !== "locked" && getYouTubeVideoId(item.youtubeUrl) && (
                          <a
                            href={item.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="مشاهدة على يوتيوب مباشرة"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Footer Channel Link */}
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
      </div>

      {/* Video Overlay Player Modal */}
      {activePlayer && (
        <VideoPlayerModal
          item={activePlayer}
          files={files}
          quizzes={quizzes}
          onStartQuiz={onStartQuiz}
          onClose={() => setActivePlayer(null)}
        />
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
