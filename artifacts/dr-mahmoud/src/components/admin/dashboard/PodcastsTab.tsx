import React from "react";
import type { Podcast } from "@workspace/api-client-react";
import { Mic, Plus, Edit2, Trash2 } from "lucide-react";
import { SecondaryButton, DangerButton } from "@/components/ui/admin-ui";

interface PodcastsTabProps {
  podcastsQuery: {
    data?: Podcast[];
    isLoading: boolean;
  };
  openPodcastModal: (mode: "add" | "edit", podcast?: Podcast) => void;
  handlePodcastDelete: (id: number) => void;
}

export const PodcastsTab: React.FC<PodcastsTabProps> = ({
  podcastsQuery,
  openPodcastModal,
  handlePodcastDelete,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة البودكاست</h2>
          <p className="text-xs text-muted-foreground mt-1">
            رفع وتحديث الحلقات النقاشية والبودكاست
          </p>
        </div>
        <button
          onClick={() => openPodcastModal("add")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> إضافة حلقة
        </button>
      </div>

      {podcastsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 animate-pulse"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 space-y-3 w-full">
                  <div className="h-6 bg-muted rounded w-48" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-muted rounded w-20" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="h-9 bg-muted rounded-xl w-20" />
                  <div className="h-9 bg-muted rounded-xl w-9" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : podcastsQuery.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <Mic className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-foreground font-bold text-lg">
            لا توجد حلقات مضافة
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            أضف أول حلقة بودكاست ليتم عرضها للطلاب
          </p>
          <button
            onClick={() => openPodcastModal("add")}
            className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
          >
            إضافة أول حلقة الآن
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {podcastsQuery.data?.map((ep) => (
            <div
              key={ep.id}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-1.5 flex-1">
                <h3 className="font-bold text-foreground text-lg">
                  {ep.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {ep.desc}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  <span>المدة: {ep.duration}</span>
                  {ep.youtubeUrl && (
                    <span className="text-primary/80">رابط يوتيوب متاح</span>
                  )}
                  {ep.audioUrl && (
                    <span className="text-secondary/80">رابط الصوت متاح</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/60 pt-4 md:pt-0">
                <SecondaryButton onClick={() => openPodcastModal("edit", ep)}>
                  <Edit2 className="w-[18px] h-[18px]" strokeWidth={1.75} /> تعديل
                </SecondaryButton>
                <DangerButton onClick={() => handlePodcastDelete(ep.id)}>
                  <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </DangerButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
