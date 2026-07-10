import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Play, ExternalLink, Library, Tv, ChevronLeft, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListVideos } from "@workspace/api-client-react";

interface VideoItem {
  id?: number;
  category: string;
  title: string;
  description?: string | null;
  youtubeUrl: string;
  type: "video" | "playlist";
  order: number;
}

// Helper to extract YouTube video ID
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper to extract YouTube playlist ID
function getYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([^#\&\?]+)/);
  return match ? match[1] : null;
}

// Helper to get thumbnail URL
function getYoutubeThumbnail(url: string): string {
  const vidId = getYouTubeVideoId(url);
  if (vidId) {
    return `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
  }
  return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80";
}

const fallbackVideos: VideoItem[] = [
  {
    category: "سي بلس بلس C++",
    title: "كورس تعلم البرمجة للمبتدئين بلغة C++ من الصفر",
    description: "شرح شامل وأساسي لأسس البرمجة وتصميم الخوارزميات وتطبيقها بلغة سي بلس بلس لطلاب الجامعات والمدارس.",
    youtubeUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgS6cQW6a-8Hj4_N292f7XwX",
    type: "playlist",
    order: 1,
  },
  {
    category: "هياكل البيانات Data Structures",
    title: "شرح هياكل البيانات بالتفصيل Data Structures & Algorithms",
    description: "المفاهيم المتقدمة لهياكل البيانات مثل الأشجار والقوائم المرتبطة والرسوم البيانية وتطبيقاتها البرمجية.",
    youtubeUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgTq0Kwt-jP_Gndn1154cQk2",
    type: "playlist",
    order: 2,
  },
  {
    category: "برمجة ثانوية عامة",
    title: "تأسيس البرمجة وعلوم الحاسب لطلاب المدارس والثانوية العامة",
    description: "بوابتك للدخول إلى عالم التكنولوجيا وصناعة التطبيقات والمواقع في سن مبكرة.",
    youtubeUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgSxY6b5O_Hmsj-0YhT_a4R3",
    type: "playlist",
    order: 3,
  },
  {
    category: "برمجة للمبتدئين",
    title: "كيف تبدأ البرمجة بالطريقة الصحيحة وتتجنب الأخطاء الشائعة؟",
    description: "نصائح وتوجيهات هامة لكل طالب يرغب في بدء رحلته في عالم التطوير وتصميم البرمجيات.",
    youtubeUrl: "https://www.youtube.com/watch?v=M-5T8T2p5gQ",
    type: "video",
    order: 4,
  },
];

// ─── Modal Player Component ───
function VideoPlayerModal({
  item,
  onClose,
}: {
  item: VideoItem;
  onClose: () => void;
}) {
  const vidId = getYouTubeVideoId(item.youtubeUrl);
  const playlistId = getYouTubePlaylistId(item.youtubeUrl);

  let embedUrl = "";
  if (item.type === "playlist" && playlistId) {
    embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`;
  } else if (vidId) {
    embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0`;
  }

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
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          className="relative w-full max-w-4xl bg-[#090D16] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/30">
            <div className="space-y-0.5 max-w-[85%]">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {item.type === "playlist" ? "قائمة تشغيل" : "فيديو شروحات"}
              </span>
              <h3 className="text-base font-bold text-white line-clamp-1">{item.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-foreground/70 hover:text-foreground transition-all border border-white/5"
            >
              ✕
            </button>
          </div>

          {/* Player Container */}
          <div className="relative w-full aspect-video bg-black">
            {embedUrl ? (
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function YoutubeSection() {
  const { data: dbVideos, isLoading } = useListVideos();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activePlayer, setActivePlayer] = useState<VideoItem | null>(null);

  // Combine DB & Fallback (if DB empty)
  const items: VideoItem[] = dbVideos && dbVideos.length > 0 ? (dbVideos as any) : fallbackVideos;

  // Filter categories
  const categories = ["all", ...Array.from(new Set(items.map((item) => item.category)))];
  const filteredItems = items
    .filter((item) => activeCategory === "all" || item.category === activeCategory)
    .sort((a, b) => a.order - b.order);

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
            `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${vidId}/sddefault.jpg`
          ],
          "uploadDate": "2024-01-01T08:00:00+02:00",
          "embedUrl": `https://www.youtube.com/embed/${vidId}`,
          "contentUrl": item.youtubeUrl,
          "publisher": {
            "@type": "Organization",
            "name": "Learn to Code",
            "logo": {
              "@type": "ImageObject",
              "url": "https://drelmahdy.com/dr-mahmoud-photo.png"
            }
          }
        };
      } else if (item.type === "playlist") {
        return {
          "@type": "ItemList",
          "name": item.title,
          "description": item.description || item.title,
          "url": item.youtubeUrl,
          "numberOfItems": 10,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "url": item.youtubeUrl,
              "name": item.title
            }
          ]
        };
      }
      return null;
    }).filter(Boolean)
  };

  return (
    <section id="youtube-lectures" className="py-24 bg-background relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      {/* Decorative Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
            <Youtube className="w-5 h-5 text-red-500 animate-pulse" /> شروحات ومحاضرات يوتيوب
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">قناتنا التعليمية Learn to Code</h2>
          <p className="text-foreground/50 max-w-xl mx-auto text-sm leading-relaxed">
            دروس تطبيقية ومناهج دراسية متكاملة وقوائم تشغيل متسلسلة لمساعدتك على التفوق.
          </p>
          <div className="w-24 h-0.5 bg-gradient-to-r from-primary/80 to-secondary/80 mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Tab Filters */}
        <div className="flex justify-center mb-12">
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-card/25 border border-border/60 rounded-2xl max-w-3xl">
            {categories.map((cat) => {
              const label = cat === "all" ? "الكل" : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground text-sm">جاري تحميل الفيديوهات التعليمية...</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
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
                  className="bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden flex flex-col group transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  {/* Thumbnail / Cover */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img
                      src={getYoutubeThumbnail(item.youtubeUrl)}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                    />
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                      <button
                        onClick={() => setActivePlayer(item)}
                        className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-primary/95"
                      >
                        <Play className="w-6 h-6 fill-current ms-1" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md ${
                        item.type === "playlist"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>
                        {item.type === "playlist" ? "قائمة تشغيل" : "شرح منفرد"}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <span className="inline-block bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                      <button
                        onClick={() => setActivePlayer(item)}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1 group/btn"
                      >
                        {item.type === "playlist" ? "مشاهدة القائمة" : "ابدأ المشاهدة"}
                        <ChevronLeft className="w-4 h-4 group-hover/btn:translate-x-[-2px] transition-transform" />
                      </button>

                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-white transition-colors"
                        title="مشاهدة على يوتيوب مباشرة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

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
            className="bg-card border border-border hover:border-red-500/30 hover:bg-red-500/10 text-foreground hover:text-red-500 font-bold px-8 py-6 rounded-full shadow-lg hover:scale-[1.02] transition-all duration-300"
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
        <VideoPlayerModal item={activePlayer} onClose={() => setActivePlayer(null)} />
      )}
    </section>
  );
}
