import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Play, Pause, Youtube, ExternalLink, Volume2, VolumeX } from "lucide-react";
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

const staticEpisodes: Episode[] = [
  {
    title: "دخلوا المجال عشان الترند؟",
    desc: "هل اختيار البرمجة بسبب الترند قرار صح؟ وإيه الفرق بين اللي بيتعلم وعنده هدف واللي بيجري وراء الموضة؟",
    duration: "45 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    title: "ولا فاهمين البكالوريا والبرمجة صح؟",
    desc: "كيف يجمع الطالب بين دراسة البكالوريا وتعلم البرمجة؟ وإيه الخطوات العملية للبداية الصح؟",
    duration: "38 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    title: "الذكاء الاصطناعي هيأكل الشغل ولا هيخلق فرص؟",
    desc: "نقاش صريح عن مستقبل سوق العمل في عصر الـ AI وإزاي تتأهل للمرحلة الجاية.",
    duration: "52 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

export function Podcast() {
  const { data: dbEpisodes } = useListPodcasts();
  const episodesList = dbEpisodes && dbEpisodes.length > 0 ? dbEpisodes : staticEpisodes;

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = (episode: Episode) => {
    if (currentEpisode?.title === episode.title) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(err => console.log("Audio playback failed", err));
        setIsPlaying(true);
      }
    } else {
      setCurrentEpisode(episode);
      setIsPlaying(true);
      // Wait for audio metadata to load
      if (audioRef.current) {
        audioRef.current.src = episode.audioUrl || "";
        audioRef.current.load();
        audioRef.current.play().catch(err => console.log("Audio playback failed", err));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <section id="podcast" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" /> بودكاست
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">البودكاست التعليمي</h2>
          <p className="text-foreground/50 max-w-xl mx-auto">
            حلقات صريحة عن البرمجة والتعليم وسوق العمل — مع د. محمود المهدي
          </p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Poster & Audio Player */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center lg:order-2 space-y-6"
          >
            <div className="relative max-w-xs w-full">
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
              <img
                src="/podcast-cover.png"
                alt="بودكاست د. محمود المهدي"
                className="relative rounded-2xl shadow-2xl shadow-primary/20 w-full object-cover border border-primary/20"
              />
            </div>

            {/* Embedded Audio Player */}
            <AnimatePresence>
              {currentEpisode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md"
                >
                  <div className="text-center mb-4">
                    <p className="text-xs text-primary font-bold mb-1">شغال حالياً 🎧</p>
                    <h4 className="text-sm font-bold text-foreground line-clamp-1">{currentEpisode.title}</h4>
                  </div>

                  {/* Wave Animation */}
                  <div className="flex justify-center items-center gap-1 h-8 mb-4">
                    {[...Array(9)].map((_, idx) => (
                      <motion.div
                        key={idx}
                        className="w-1 bg-primary rounded-full"
                        animate={isPlaying ? {
                          height: [8, 24, 8],
                        } : {
                          height: 8
                        }}
                        transition={{
                          duration: 1 + idx * 0.1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-foreground/40 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    <button
                      onClick={() => handlePlayPause(currentEpisode)}
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ms-0.5" />}
                    </button>

                    <div className="w-20" /> {/* Spacer to balance layout */}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Episodes */}
          <div className="lg:order-1 space-y-4">
            {episodesList.map((ep, i) => {
              const isSelected = currentEpisode?.title === ep.title;
              const isEpPlaying = isSelected && isPlaying;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => ep.audioUrl && handlePlayPause(ep)}
                  className={`group flex gap-4 p-5 border rounded-2xl transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
                      : "bg-white/5 border-white/10 hover:border-primary/40 hover:bg-white/8"
                  }`}
                >
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary/20 border border-primary/50"
                      : "bg-primary/10 border border-primary/30 group-hover:bg-primary/20"
                  }`}>
                    {isEpPlaying ? (
                      <Pause className="w-5 h-5 text-primary fill-current" />
                    ) : (
                      <Play className="w-5 h-5 text-primary fill-current ms-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-bold text-sm leading-snug transition-colors ${
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}>
                        {ep.title}
                      </h3>
                      <span className="text-xs text-foreground/35 shrink-0">{ep.duration}</span>
                    </div>
                    <p className="text-xs text-foreground/45 leading-relaxed line-clamp-2">{ep.desc}</p>
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25"
              >
                <a href="https://youtube.com/@dr-mahmoud" target="_blank" rel="noreferrer">
                  <Youtube className="w-4 h-4 me-2" />
                  تابع البودكاست على YouTube
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 hover:border-primary/40 hover:text-primary font-bold"
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
