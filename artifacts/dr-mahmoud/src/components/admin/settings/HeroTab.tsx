import React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export interface HeroTabProps {
  formData: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => void;
  isUploading: boolean;
}

export const HeroTab: React.FC<HeroTabProps> = ({
  formData,
  handleChange,
  handleFileUpload,
  isUploading,
}) => {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-foreground">
        إعدادات القسم الرئيسي (Hero)
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            العنوان الرئيسي (Hero Title)
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.HERO_TITLE] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.HERO_TITLE, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="تعلم البرمجة والذكاء الاصطناعي"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            العنوان الفرعي (Hero Subtitle)
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.HERO_SUBTITLE] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.HERO_SUBTITLE, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="مع د. محمود المهدي"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          الشارة / الـ Badge (مثال: متواجدون في الزقازيق)
        </label>
        <input
          type="text"
          value={formData[SETTINGS_KEYS.HERO_BADGE] || ""}
          onChange={(e) =>
            handleChange(SETTINGS_KEYS.HERO_BADGE, e.target.value)
          }
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="حجز تقييم مجاني بالكامل"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          الوصف (Hero Description)
        </label>
        <textarea
          value={formData[SETTINGS_KEYS.HERO_DESC] || ""}
          onChange={(e) =>
            handleChange(SETTINGS_KEYS.HERO_DESC, e.target.value)
          }
          rows={4}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="أول سيشن مجاناً لتحديد المستوى والمشاريع العملية..."
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          صورة البطل الشخصية (Hero Image)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData[SETTINGS_KEYS.HERO_PHOTO_URL] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.HERO_PHOTO_URL, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            dir="ltr"
          />
          <div className="relative flex-shrink-0">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload(e, SETTINGS_KEYS.HERO_PHOTO_URL)
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
