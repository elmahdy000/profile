import React from "react";
import type { Video } from "@workspace/api-client-react";
import {
  Video as VideoIcon,
  Plus,
  Play,
  Lock,
  ExternalLink,
  Edit2,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/admin-ui";

interface VideosTabProps {
  videosQuery: {
    data?: Video[];
    isLoading: boolean;
  };
  selectedVideoCategoryFilter: string;
  setSelectedVideoCategoryFilter: (category: string) => void;
  openVideoModal: (mode: "add" | "edit", video?: Video) => void;
  handleVideoDelete: (id: number) => void;
  setPreviewVideo: (video: Video) => void;
  getYoutubeThumbnail: (url: string) => string;
}

export const VideosTab: React.FC<VideosTabProps> = ({
  videosQuery,
  selectedVideoCategoryFilter,
  setSelectedVideoCategoryFilter,
  openVideoModal,
  handleVideoDelete,
  setPreviewVideo,
  getYoutubeThumbnail,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            إدارة فيديوهات وقوائم اليوتيوب
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            عرض وتنظيم شروحات المناهج وكورسات البرمجة مباشرة من قناتك
          </p>
        </div>
        <button
          onClick={() => openVideoModal("add")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> إضافة فيديو / قائمة
        </button>
      </div>

      {/* Category Filters */}
      {videosQuery.data && videosQuery.data.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <button
            onClick={() => setSelectedVideoCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
              selectedVideoCategoryFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30 font-bold"
                : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
            }`}
          >
            الكل ({videosQuery.data.length})
          </button>
          {Array.from(new Set(videosQuery.data.map((v) => v.category))).map(
            (cat) => {
              const count = videosQuery.data!.filter(
                (v) => v.category === cat,
              ).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedVideoCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                    selectedVideoCategoryFilter === cat
                      ? "bg-primary/15 text-primary border-primary/30 font-bold"
                      : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            },
          )}
        </div>
      )}

      {videosQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-24" />
                <div className="h-5 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : videosQuery.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <VideoIcon className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-foreground font-bold text-lg">
            لا توجد فيديوهات أو قوائم تشغيل مضافة
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            يمكنك إضافة شروحاتك وقوائم تشغيل اليوتيوب وسيتم عرضها للطلاب بشكل
            رائع
          </p>
          <button
            onClick={() => openVideoModal("add")}
            className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
          >
            إضافة أول فيديو الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videosQuery.data
            ?.filter(
              (v) =>
                selectedVideoCategoryFilter === "all" ||
                v.category === selectedVideoCategoryFilter,
            )
            ?.map((video) => (
              <div
                key={video.id}
                className="bg-card border border-border shadow-lg shadow-sm hover:border-border rounded-2xl overflow-hidden transition-all flex flex-col group"
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video bg-muted overflow-hidden border-b border-border/40">
                  <img
                    src={
                      (video as any).thumbnailUrl ||
                      getYoutubeThumbnail(video.youtubeUrl)
                    }
                    alt={video.title}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                  />
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-primary/95"
                      title="معاينة وتشغيل الفيديو"
                    >
                      <Play className="w-5 h-5 fill-current ms-0.5" />
                    </button>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                        video.isPublished
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-muted0/30 text-slate-200 border-slate-400/30"
                      }`}
                    >
                      {video.isPublished ? "منشور" : "مسودة"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                        video.type === "playlist"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-secondary/10 text-secondary border-secondary/20"
                      }`}
                    >
                      {video.type === "playlist"
                        ? "قائمة تشغيل"
                        : "فيديو منفرد"}
                    </span>
                    {video.isProtected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md bg-secondary/10 text-secondary border-secondary/20 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-secondary" /> محمي
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/75 text-[10px] font-mono px-2 py-0.5 rounded text-slate-300">
                    ترتيب: {video.order}
                  </div>
                </div>

                {/* Video Metadata */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {video.stages?.length
                          ? video.stages
                              .map((stage) =>
                                stage === "عام" ? "كل المراحل" : stage,
                              )
                              .join("، ")
                          : video.stage || "مرحلة غير محددة"}
                      </span>
                      <StatusBadge variant="online">
                        {video.learningMode === "offline"
                          ? "أوفلاين"
                          : video.learningMode === "both"
                            ? "أونلاين وأوفلاين"
                            : "أونلاين"}
                      </StatusBadge>
                      <StatusBadge variant="undefined">
                        {video.category}
                      </StatusBadge>
                      {video.subject && (
                        <StatusBadge variant="undefined">
                          {video.subject}
                        </StatusBadge>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base line-clamp-2 mt-1">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    {video.tags && video.tags.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {video.tags.join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 border-t border-border/40 pt-4 mt-auto">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setPreviewVideo(video)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> تشغيل
                        المعاينة
                      </button>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> يوتيوب
                      </a>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 border-t border-border/20 pt-2">
                      <button
                        onClick={() => openVideoModal("edit", video)}
                        className="p-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl transition-colors border border-border flex-1 flex justify-center items-center gap-1 text-xs"
                        title="تعديل"
                      >
                        <Edit2 className="w-3 h-3" /> تعديل
                      </button>
                      <button
                        onClick={() => handleVideoDelete(video.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 flex-1 flex justify-center items-center gap-1 text-xs"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
