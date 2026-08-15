import React from "react";
import { X, Loader2 } from "lucide-react";

export interface CurriculumFormState {
  subject: string;
  title: string;
  description: string;
  order: number;
  images: string[];
}

export interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "create" | "edit";
  form: CurriculumFormState;
  setForm: React.Dispatch<React.SetStateAction<CurriculumFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  uploadingSlotIndex: number | null;
  handleSlotImageUpload: (e: React.ChangeEvent<HTMLInputElement>, idx: number) => void;
  createMutation: { isPending: boolean };
  updateMutation: { isPending: boolean };
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  isOpen,
  onClose,
  mode,
  form,
  setForm,
  onSubmit,
  uploadingSlotIndex,
  handleSlotImageUpload,
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
            {mode === "edit" ? "تعديل الدرس" : "إضافة درس جديد للمنهج"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المادة / لغة البرمجة
              </label>
              <input
                type="text"
                required
                list="subjects-list"
                value={form.subject}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subject: e.target.value,
                  })
                }
                placeholder="مثال: C++، Python، Java"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
              <datalist id="subjects-list">
                <option value="C++" />
                <option value="Python" />
                <option value="Java" />
                <option value="HTML & CSS" />
                <option value="JavaScript" />
                <option value="Scratch" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                ترتيب العرض
              </label>
              <input
                type="number"
                required
                value={form.order}
                onChange={(e) =>
                  setForm({
                    ...form,
                    order: Number(e.target.value),
                  })
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عنوان الدرس
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="مثال: الدرس الأول: المتغيرات وأنواع البيانات"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الوصف (اختياري)
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="اكتب وصفاً أو ملاحظات إضافية حول هذا الدرس..."
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-semibold text-muted-foreground">
                صور/صفحات الدرس (10 خانات صور مرقمة)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2 border border-border/40 rounded-2xl bg-background/20">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const currentUrl = form.images[idx] || "";
                  return (
                    <div
                      key={idx}
                      className="bg-muted/60 border border-border/60 rounded-xl p-3 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">
                          شريحة {idx + 1}
                        </span>
                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...form.images];
                              newImages[idx] = "";
                              setForm({
                                ...form,
                                images: newImages,
                              });
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                          >
                            حذف الصورة
                          </button>
                        )}
                      </div>

                      <div className="aspect-[4/3] w-full bg-muted rounded-lg overflow-hidden border border-border/40 flex items-center justify-center relative">
                        {currentUrl ? (
                          <img
                            src={currentUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            فارغة
                          </span>
                        )}
                        {uploadingSlotIndex === idx && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-[10px] text-white">
                              جاري الرفع...
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSlotImageUpload(e, idx)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingSlotIndex !== null}
                          />
                          <button
                            type="button"
                            className="w-full bg-[#121A27] hover:bg-muted text-foreground border border-border rounded-lg py-1.5 text-[10px] font-medium transition-all"
                          >
                            تحميل صورة
                          </button>
                        </div>

                        <input
                          type="text"
                          value={currentUrl}
                          onChange={(e) => {
                            const newImages = [...form.images];
                            newImages[idx] = e.target.value;
                            setForm({
                              ...form,
                              images: newImages,
                            });
                          }}
                          placeholder="أو اكتب رابط الصورة هنا..."
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-foreground text-[10px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
