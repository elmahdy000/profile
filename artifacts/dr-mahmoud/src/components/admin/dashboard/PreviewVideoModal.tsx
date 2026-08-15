import React from "react";
import { X, Video as VideoIcon } from "lucide-react";

export interface PreviewVideoState {
  title: string;
  youtubeUrl: string;
  type?: string;
}

export interface PreviewVideoModalProps {
  previewVideo: PreviewVideoState | null;
  onClose: () => void;
  getYouTubeVideoId: (url: string) => string | null;
  getYouTubePlaylistId: (url: string) => string | null;
}

export const PreviewVideoModal: React.FC<PreviewVideoModalProps> = ({
  previewVideo,
  onClose,
  getYouTubeVideoId,
  getYouTubePlaylistId,
}) => {
  if (!previewVideo) return null;

  const vidId = getYouTubeVideoId(previewVideo.youtubeUrl);
  const playlistId = getYouTubePlaylistId(previewVideo.youtubeUrl);

  const isStreamUrl =
    previewVideo.youtubeUrl.startsWith("/uploads/") ||
    previewVideo.youtubeUrl.includes("/stream");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="bg-[#090D16] border border-border w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="space-y-0.5 max-w-[85%]">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              معاينة:{" "}
              {previewVideo.type === "playlist"
                ? "قائمة تشغيل"
                : "فيديو منفرد"}
            </span>
            <h3 className="text-base font-bold text-foreground line-clamp-1">
              {previewVideo.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-foreground/70 hover:text-foreground transition-all border border-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative w-full aspect-video bg-black">
          {(() => {
            if (isStreamUrl) {
              return (
                <video
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  src={previewVideo.youtubeUrl}
                  controls
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                />
              );
            }

            let embedUrl = "";
            if (previewVideo.type === "playlist" && playlistId) {
              embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`;
            } else if (vidId) {
              embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0`;
            }
            return embedUrl ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <VideoIcon className="w-16 h-16 text-red-500 mb-2" />
                <p className="text-muted-foreground text-sm">
                  تعذر تحميل رابط معاينة الفيديو.
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
