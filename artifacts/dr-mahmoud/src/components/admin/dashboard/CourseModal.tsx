import React from "react";
import { X, Loader2 } from "lucide-react";
import { ACADEMIC_TRACKS, getStagesForTrack, resolveTrackId } from "@/data/academic";

export interface CourseFormState {
  title: string;
  age: string;
  duration: string;
  sessions: string;
  level: string;
  category: string;
  img: string;
  tags: string;
  isPublished: boolean;
  stages: string[];
}

export interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "create" | "edit";
  form: CourseFormState;
  setForm: React.Dispatch<React.SetStateAction<CourseFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isUploadingImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  createMutation: { isPending: boolean };
  updateMutation: { isPending: boolean };
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  mode,
  form,
  setForm,
  onSubmit,
  isUploadingImage,
  handleImageUpload,
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
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-5 md:p-7 relative z-10 max-h-[92vh] overflow-y-auto shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-black text-foreground">
              {mode === "edit" ? "تعديل الكورس" : "إضافة كورس جديد"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              اكتب الاسم، اختر البوابة، وأضف صورة. باقي البيانات جاهزة ويمكن تعديلها اختياريًا.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">
                1. اسم الكورس
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: أساسيات البرمجة بلغة Python"
                autoFocus
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <details className="md:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-foreground">
                بيانات إضافية (اختياري)
              </summary>
              <p className="mt-1 text-xs text-muted-foreground">
                القيم الافتراضية مناسبة لمعظم الكورسات.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الفئة العمرية
                  </label>
                  <input
                    type="text"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    مدة البرنامج
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    عدد الحصص
                  </label>
                  <input
                    type="text"
                    value={form.sessions}
                    onChange={(e) => setForm({ ...form, sessions: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المستوى
                  </label>
                  <input
                    type="text"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>
            </details>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">
                2. البوابة التعليمية
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value, stages: [] })
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                {!resolveTrackId(form.category) && form.category && (
                  <option value={form.category}>
                    تصنيف قديم — غيّره إلى بوابة تعليمية
                  </option>
                )}
                {ACADEMIC_TRACKS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">
                3. المراحل المتاحة للكورس
              </label>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-muted/20 p-3">
                {getStagesForTrack(form.category).map((stage) => {
                  const selected = form.stages.includes(stage);
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          stages: selected
                            ? form.stages.filter((item) => item !== stage)
                            : [...form.stages, stage],
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {stage === "عام" ? "كل المراحل" : stage}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-bold text-foreground">
                4. صورة غلاف الكورس
              </label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    ارفع صورة من جهازك
                  </span>
                  <div className="relative border-2 border-dashed border-border hover:border-primary rounded-2xl p-5 bg-muted/30 transition-colors flex flex-col items-center justify-center min-h-[120px]">
                    {isUploadingImage ? (
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
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground text-center">
                          اضغط لاختيار صورة الغلاف أو اسحبها هنا
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          PNG, JPG حتى 5MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <details>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    أو استخدم رابط صورة مباشر
                  </span>
                  <input
                    type="text"
                    value={form.img}
                    onChange={(e) => setForm({ ...form, img: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </details>
              </div>
              {form.img && (
                <div className="flex items-center gap-3 p-2 bg-background/20 border border-border rounded-xl mt-2">
                  <img
                    src={form.img}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-foreground/90 truncate">
                      {form.img}
                    </span>
                    <span className="block text-[10px] text-secondary">
                      جاهز ومعاين
                    </span>
                  </div>
                </div>
              )}
            </div>

            <details className="md:col-span-2 rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
                وسوم البحث (اختياري)
              </summary>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الوسوم (مفصولة بفواصل)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="برمجة, أطفال, بايثون"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </details>
            <label className="md:col-span-2 flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-muted/20 p-4">
              <span>
                <strong className="block text-sm text-foreground">نشر الكورس للطلاب</strong>
                <small className="text-muted-foreground">اتركه مغلقًا لحفظ الكورس كمسودة حتى يكتمل.</small>
              </span>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm({ ...form, isPublished: event.target.checked })
                }
                className="h-5 w-5 accent-primary"
              />
            </label>
          </div>

          <div className="sticky -bottom-5 md:-bottom-7 flex items-center gap-2 justify-end border-t border-border bg-card py-4 mt-6">
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
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {mode === "edit" ? "حفظ التعديلات" : "إضافة الكورس"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
