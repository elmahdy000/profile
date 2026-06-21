import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Play, Pause, Youtube, ExternalLink, Volume2, VolumeX, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListPodcasts } from "@workspace/api-client-react";

interface Episode {
  id?: number;
  title: string;
  desc: string;
  duration: string;
  youtubeUrl?: string | null;
  audioUrl?: string | null;
}

// ─── Utility: extract YouTube video ID from any YouTube URL ───
function getYouTubeId(url: string): string | null {
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

const staticEpisodes: Episode[] = [
  {
    title: "دخلوا المجال عشان الترند؟",
    desc: "هل اختيار البرمجة بسبب الترند قرار صح؟ وإيه الفرق بين اللي بيتعلم وعنده هدف واللي بيجري وراء الموضة؟",
    duration: "45 دقيقة",
    youtubeUrl: null,
    audioUrl: null,
  },
  {
    title: "ولا فاهمين البكالوريا والبرمجة صح؟",
    desc: "كيف يجمع الطالب بين دراسة البكالوريا وتعلم البرمجة؟ وإيه الخطوات العملية للبداية الصح؟",
    duration: "38 دقيقة",
    youtubeUrl: null,
    audioUrl: null,
  },
  {
    title: "الذكاء الاصطناعي هيأكل الشغل ولا هيخلق فرص؟",
    desc: "نقاش صريح عن مستقبل سوق العمل في عصر الـ AI وإزاي تتأهل للمرحلة الجاية.",
    duration: "52 دقيقة",
    youtubeUrl: null,
    audioUrl: null,
  },
];

// ─── YouTube Embed Modal ───
function YouTubeModal({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-3xl bg-[#070B12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/8">
            <h3 className="text-sm font-bold text-foreground/90 line-clamp-1">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-foreground/60 hover:text-foreground transition-all"
            >
              ✕
            </button>
          </div>
          {/* YouTube Embed */}
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Audio Player (embedded, for direct audio files) ───
function AudioPlayer({
  episode,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}: {
  episode: Episode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}) {
  const fmt = (t: number) => {
    if (isNaN(t)) return "00:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="w-full bg-[#0E1520] border border-[#D6A84F]/20 rounded-2xl p-5 shadow-xl"
    >
      <div className="text-center mb-3">
        <p className="text-xs text-[#D6A84F] font-bold mb-0.5 flex items-center justify-center gap-1">
          <Radio className="w-3 h-3" />
          شغال حالياً
        </p>
        <h4 className="text-sm font-bold text-foreground line-clamp-1">{episode.title}</h4>
      </div>

      {/* Wave animation */}
      <div className="flex justify-center items-end gap-1 h-7 mb-4">
        {[...Array(11)].map((_, idx) => (
          <motion.div
            key={idx}
            className="w-1 bg-[#D6A84F] rounded-full"
            animate={isPlaying ? { height: [6, 22, 6] } : { height: 6 }}
            transition={{ duration: 0.9 + idx * 0.08, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-4">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-[#D6A84F] bg-white/10"
        />
        <div className="flex justify-between text-xs text-foreground/35 font-mono">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onMuteToggle} className="p-1.5 text-foreground/50 hover:text-foreground transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-[#D6A84F] bg-white/10"
          />
        </div>

        <button
          onClick={onPlayPause}
          className="w-11 h-11 rounded-full bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] text-[#070B12] flex items-center justify-center shadow-lg shadow-[#D6A84F]/20 hover:scale-105 transition-all"
        >
          {isPlaying
            ? <Pause className="w-5 h-5 fill-current" />
            : <Play className="w-5 h-5 fill-current ms-0.5" />}
        </button>

        <div className="w-20" />
      </div>
    </motion.div>
  );
}

// ─── Main Component ───
export function Podcast() {
  const { data: dbEpisodes } = useListPodcasts();
  const episodesList: Episode[] =
    dbEpisodes && dbEpisodes.length > 0 ? dbEpisodes : staticEpisodes;

  // YouTube modal
  const [youtubeModal, setYoutubeModal] = useState<{ id: string; title: string } | null>(null);

  // Audio state
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = (episode: Episode) => {
    if (!episode.audioUrl) return;
    if (currentEpisode?.title === episode.title) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setCurrentEpisode(episode);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = episode.audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Determine episode action type
  const getEpisodeAction = (ep: Episode) => {
    const ytId = ep.youtubeUrl ? getYouTubeId(ep.youtubeUrl) : null;
    if (ytId) return { type: "youtube" as const, ytId };
    if (ep.audioUrl) return { type: "audio" as const };
    return { type: "none" as const };
  };

  return (
    <section id="podcast" className="py-20 lg:py-24 bg-background relative overflow-hidden">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />

      {/* YouTube Modal */}
      {youtubeModal && (
        <YouTubeModal
          videoId={youtubeModal.id}
          title={youtubeModal.title}
          onClose={() => setYoutubeModal(null)}
        />
      )}

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[450px] h-[450px] bg-[#D6A84F]/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" /> بودكاست
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">البودكاست التعليمي</h2>
          <p className="text-foreground/50 max-w-xl mx-auto">
            حلقات صريحة عن البرمجة والتعليم وسوق العمل — مع د. محمود المهدي
          </p>
          <div className="w-24 h-0.5 bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Cover + Player */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center lg:order-2 space-y-6"
          >
            <div className="relative max-w-xs w-full">
              <div className="absolute -inset-3 bg-[#D6A84F]/8 rounded-3xl blur-2xl" />
              <img
                src="/podcast-cover.png"
                alt="بودكاست د. محمود المهدي"
                className="relative rounded-2xl shadow-2xl shadow-[#D6A84F]/15 w-full object-cover border border-[#D6A84F]/15"
              />
            </div>

            <AnimatePresence>
              {currentEpisode && currentEpisode.audioUrl && (
                <AudioPlayer
                  episode={currentEpisode}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  volume={volume}
                  isMuted={isMuted}
                  onPlayPause={() => handlePlayPause(currentEpisode)}
                  onSeek={(t) => {
                    setCurrentTime(t);
                    if (audioRef.current) audioRef.current.currentTime = t;
                  }}
                  onVolumeChange={(v) => {
                    setVolume(v);
                    setIsMuted(false);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  onMuteToggle={() => {
                    const next = !isMuted;
                    setIsMuted(next);
                    if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Episodes list */}
          <div className="lg:order-1 space-y-4">
            {episodesList.map((ep, i) => {
              const action = getEpisodeAction(ep);
              const isAudioSelected = currentEpisode?.title === ep.title;
              const isEpPlaying = isAudioSelected && isPlaying;
              const hasAction = action.type !== "none";

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`group p-5 border rounded-2xl transition-all duration-300 ${
                    isAudioSelected
                      ? "bg-[#D6A84F]/8 border-[#D6A84F]/35"
                      : "bg-white/4 border-white/8 hover:border-[#D6A84F]/30 hover:bg-white/6"
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Play/YouTube button */}
                    <button
                      onClick={() => {
                        if (action.type === "youtube") {
                          setYoutubeModal({ id: action.ytId, title: ep.title });
                        } else if (action.type === "audio") {
                          handlePlayPause(ep);
                        }
                      }}
                      disabled={!hasAction}
                      className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                        !hasAction
                          ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                          : action.type === "youtube"
                          ? "bg-red-600/15 border-red-500/30 hover:bg-red-600/25 text-red-400"
                          : isAudioSelected
                          ? "bg-[#D6A84F]/20 border-[#D6A84F]/40 text-[#D6A84F]"
                          : "bg-[#D6A84F]/10 border-[#D6A84F]/25 hover:bg-[#D6A84F]/20 text-[#D6A84F]"
                      }`}
                    >
                      {action.type === "youtube" ? (
                        <Youtube className="w-5 h-5" />
                      ) : isEpPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ms-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={`font-bold text-sm leading-snug transition-colors ${
                            isAudioSelected ? "text-[#D6A84F]" : "text-foreground"
                          }`}
                        >
                          {ep.title}
                        </h3>
                        <span className="text-xs text-foreground/35 shrink-0">{ep.duration}</span>
                      </div>
                      <p className="text-xs text-foreground/45 leading-relaxed line-clamp-2 mb-2">
                        {ep.desc}
                      </p>

                      {/* Type badge */}
                      <div className="flex gap-2">
                        {action.type === "youtube" && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-600/12 border border-red-500/20 text-red-400 rounded-full">
                            <Youtube className="w-3 h-3" /> يوتيوب
                          </span>
                        )}
                        {ep.audioUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#D6A84F]/10 border border-[#D6A84F]/20 text-[#D6A84F] rounded-full">
                            <Mic className="w-3 h-3" /> صوتي
                          </span>
                        )}
                        {!hasAction && (
                          <span className="text-[10px] text-foreground/25">قريباً</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <Button
                asChild
                className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] font-bold shadow-lg shadow-[#D6A84F]/20 transition-all duration-300 hover:scale-[1.01]"
              >
                <a href="https://youtube.com/@dr-mahmoud" target="_blank" rel="noreferrer">
                  <Youtube className="w-4 h-4 me-2" />
                  تابع البودكاست على YouTube
                </a>
              </Button>
              <Button
                asChild
                className="bg-transparent border border-[#D6A84F]/28 hover:border-[#D6A84F]/60 text-foreground/75 hover:text-foreground transition-all font-medium"
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 me-2" />
                  اقترح موضوع
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
