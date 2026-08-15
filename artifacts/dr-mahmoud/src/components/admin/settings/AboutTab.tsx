import React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export interface AboutTabProps {
  formData: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => void;
  isUploading: boolean;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  formData,
  handleChange,
  handleFileUpload,
  isUploading,
}) => {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-foreground">
        إعدادات قسم "عن الدكتور" (About)
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            العنوان الرئيسي
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.ABOUT_TITLE] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.ABOUT_TITLE, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="من هو د. محمود المهدي؟"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">
            سنوات الخبرة
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.ABOUT_YEARS] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.ABOUT_YEARS, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">
            عدد الطلاب
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.ABOUT_STUDENTS] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.ABOUT_STUDENTS, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          الوصف التعريفي
        </label>
        <textarea
          value={formData[SETTINGS_KEYS.ABOUT_DESC] || ""}
          onChange={(e) =>
            handleChange(SETTINGS_KEYS.ABOUT_DESC, e.target.value)
          }
          rows={5}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="حاصل على ماجستير ودكتوراه في هندسة البرمجيات..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          صورة قسم عن الدكتور
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData[SETTINGS_KEYS.ABOUT_IMAGE_URL] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.ABOUT_IMAGE_URL, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            dir="ltr"
          />
          <div className="relative flex-shrink-0">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload(e, SETTINGS_KEYS.ABOUT_IMAGE_URL)
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
