import React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Loader2, UploadCloud } from "lucide-react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export interface TestimonialsTabProps {
  testimonials: any[];
  setTestimonials: React.Dispatch<React.SetStateAction<any[]>>;
  selTestimonialIdx: number | null;
  setSelTestimonialIdx: React.Dispatch<React.SetStateAction<number | null>>;
  moveItem: (
    list: any[],
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    idx: number,
    dir: "up" | "down",
    setIdx?: React.Dispatch<React.SetStateAction<number | null>>,
  ) => void;
  deleteItem: (
    list: any[],
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    idx: number,
    setIdx?: React.Dispatch<React.SetStateAction<number | null>>,
  ) => void;
  formData: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => void;
  isUploading: boolean;
  setIsSaved: (val: boolean) => void;
}

export const TestimonialsTab: React.FC<TestimonialsTabProps> = ({
  testimonials,
  setTestimonials,
  selTestimonialIdx,
  setSelTestimonialIdx,
  moveItem,
  deleteItem,
  formData,
  handleChange,
  handleFileUpload,
  isUploading,
  setIsSaved,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border/30 pb-3">
        <h3 className="text-lg font-bold text-foreground">
          إعدادات آراء الطلاب (Testimonials)
        </h3>
        <button
          onClick={() => {
            const newTestimonial = {
              quote: "الشرح ممتاز وجدير بالتقدير...",
              author: "اسم الطالب الجديد",
              role: "المرحلة الدراسية",
              stars: 5,
              initials: "أ",
            };
            setTestimonials([...testimonials, newTestimonial]);
            setSelTestimonialIdx(testimonials.length);
            setIsSaved(false);
          }}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة رأي جديد
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
          {testimonials.map((test, index) => (
            <div
              key={index}
              onClick={() => setSelTestimonialIdx(index)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selTestimonialIdx === index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <div className="truncate">
                <span className="text-sm font-bold block truncate">
                  {test.author || "بدون اسم"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {test.role}
                </span>
              </div>

              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    moveItem(
                      testimonials,
                      setTestimonials,
                      index,
                      "up",
                      setSelTestimonialIdx,
                    )
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    moveItem(
                      testimonials,
                      setTestimonials,
                      index,
                      "down",
                      setSelTestimonialIdx,
                    )
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === testimonials.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    deleteItem(
                      testimonials,
                      setTestimonials,
                      index,
                      setSelTestimonialIdx,
                    )
                  }
                  className="p-1 text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Detail */}
        <div className="md:col-span-2">
          {selTestimonialIdx !== null && testimonials[selTestimonialIdx] ? (
            <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-foreground border-b border-border/20 pb-2">
                تعديل تفاصيل الرأي
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    اسم الكاتب (طالب / ولي أمر)
                  </label>
                  <input
                    type="text"
                    value={testimonials[selTestimonialIdx].author || ""}
                    onChange={(e) => {
                      const copy = [...testimonials];
                      copy[selTestimonialIdx].author = e.target.value;
                      if (e.target.value) {
                        copy[selTestimonialIdx].initials = e.target.value
                          .trim()
                          .charAt(0);
                      }
                      setTestimonials(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    الحرف الأول (للدائرة)
                  </label>
                  <input
                    type="text"
                    value={testimonials[selTestimonialIdx].initials || ""}
                    onChange={(e) => {
                      const copy = [...testimonials];
                      copy[selTestimonialIdx].initials = e.target.value;
                      setTestimonials(copy);
                      setIsSaved(false);
                    }}
                    maxLength={2}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    الوصف / الدور
                  </label>
                  <input
                    type="text"
                    value={testimonials[selTestimonialIdx].role || ""}
                    onChange={(e) => {
                      const copy = [...testimonials];
                      copy[selTestimonialIdx].role = e.target.value;
                      setTestimonials(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="طالب ثانوي، ولي أمر..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    عدد النجوم (Stars)
                  </label>
                  <select
                    value={testimonials[selTestimonialIdx].stars || 5}
                    onChange={(e) => {
                      const copy = [...testimonials];
                      copy[selTestimonialIdx].stars = Number(e.target.value);
                      setTestimonials(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 نجوم)</option>
                    <option value="4">⭐⭐⭐⭐ (4 نجوم)</option>
                    <option value="3">⭐⭐⭐ (3 نجوم)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  الرأي / النص
                </label>
                <textarea
                  value={testimonials[selTestimonialIdx].quote || ""}
                  onChange={(e) => {
                    const copy = [...testimonials];
                    copy[selTestimonialIdx].quote = e.target.value;
                    setTestimonials(copy);
                    setIsSaved(false);
                  }}
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
              <p className="text-muted-foreground text-sm">
                اختر رأياً من القائمة لتعديله أو أضف رأياً جديداً.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Testimonials Background Image Upload */}
      <div className="mt-6 pt-6 border-t border-border/30">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans font-bold">
          صورة الخلفية لقسم الآراء (Testimonials Background Image)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData[SETTINGS_KEYS.TESTIMONIALS_BG_URL] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.TESTIMONIALS_BG_URL, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            dir="ltr"
          />
          <div className="relative flex-shrink-0">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload(e, SETTINGS_KEYS.TESTIMONIALS_BG_URL)
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <button
              type="button"
              className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>رفع صورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
