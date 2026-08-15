import React from "react";
import { X, Loader2, Mic } from "lucide-react";

export interface PodcastFormState {
  title: string;
  desc: string;
  duration: string;
  youtubeUrl: string;
  audioUrl: string;
}

export interface PodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "create" | "edit";
  form: PodcastFormState;
  setForm: React.Dispatch<React.SetStateAction<PodcastFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isUploadingAudio: boolean;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  createMutation: { isPending: boolean };
  updateMutation: { isPending: boolean };
}

export const PodcastModal: React.FC<PodcastModalProps> = ({
  isOpen,
  onClose,
  mode,
  form,
  setForm,
  onSubmit,
  isUploadingAudio,
  handleAudioUpload,
  createMutation,
  updateMutation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-lg font-bold text-foreground">
            {mode === "edit" ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              عنوان الحلقة
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              وصف الحلقة
            </label>
            <textarea
              required
              rows={4}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                مدة الحلقة (دقيقة:ثانية)
              </label>
              <input
                type="text"
                required
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: e.target.value })
                }
                placeholder="12:30"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                رابط يوتيوب (اختياري)
              </label>
              <input
                type="text"
                value={form.youtubeUrl}
                onChange={(e) =>
                  setForm({ ...form, youtubeUrl: e.target.value })
                }
                placeholder="https://youtube.com/..."
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">
                ملف الصوت للحلقة
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    خيار 1: تحميل ملف صوتي من جهازك
                  </span>
                  <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                    {isUploadingAudio ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">
                          جاري الرفع...
                        </span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground text-center">
                          انقر هنا أو اسحب الملف لرفعه
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          MP3, WAV حتى 150MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    خيار 2: رابط ملف صوتي مباشر
                  </span>
                  <input
                    type="text"
                    value={form.audioUrl}
                    onChange={(e) =>
                      setForm({ ...form, audioUrl: e.target.value })
                    }
                    placeholder="https://domain.com/audio.mp3"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm h-[90px]"
                  />
                </div>
              </div>
              {form.audioUrl && (
                <div className="flex items-center gap-3 p-2 bg-background/20 border border-border rounded-xl mt-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-foreground/90 truncate">
                      {form.audioUrl}
                    </span>
                    <span className="block text-[10px] text-secondary">
                      تم اختيار الملف الصوتي بنجاح
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              حفظ البيانات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
