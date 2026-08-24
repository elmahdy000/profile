import React from "react";
import { Loader2, UploadCloud, Globe, Eye, Image as ImageIcon, Search, CheckCircle2 } from "lucide-react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export interface GeneralTabProps {
  formData: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => void;
  isUploading: boolean;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  formData,
  handleChange,
  handleFileUpload,
  isUploading,
}) => {
  const logoUrl = formData[SETTINGS_KEYS.SITE_LOGO_URL] || "/uploads/logo.jpg";
  const faviconUrl = formData[SETTINGS_KEYS.SITE_FAVICON_URL] || "/uploads/logo.jpg";
  const seoDesc = formData[SETTINGS_KEYS.SITE_SEO_DESC] || "";

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            الإعدادات العامة والهوية البصرية
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            تعديل الاسم الرسمي، الشعار الفرعي، ووصف محركات البحث (SEO) والشعار الرئيسي للموقع.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>مربوط بالنظام المباشر</span>
        </div>
      </div>

      {/* Basic Site Info Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-foreground">
            اسم الموقع الرسمي (Site Name)
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.SITE_NAME] || ""}
            onChange={(e) => handleChange(SETTINGS_KEYS.SITE_NAME, e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            placeholder="د. محمود المهدي | بوابتك لاحتراف البرمجة وعلوم الحاسب"
          />
          <p className="text-[11px] text-muted-foreground">يظهر في عنوان الصفحة الرئيسية والشريط العلوي للموقع.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-foreground">
            شعار الموقع الفرعي (Site Tagline)
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.SITE_TAGLINE] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.SITE_TAGLINE, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            placeholder="بوابتك لاحتراف البرمجة وعلوم الحاسب — أونلاين وفي السناتر"
          />
          <p className="text-[11px] text-muted-foreground">الجملة الترويجية التي تظهر تحت الاسم الرئيسي للموقع.</p>
        </div>
      </div>

      {/* SEO Description & Keywords */}
      <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Search className="h-4 w-4 text-primary" />
          <span>تحسين محركات البحث جوجل (SEO)</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-foreground">
            <label>وصف الموقع لمحركات البحث (SEO Description)</label>

            <span className="text-[11px] text-muted-foreground dir-ltr font-mono">
              {seoDesc.length} / 160 حرف
            </span>
          </div>
          <textarea
            value={seoDesc}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.SITE_SEO_DESC, e.target.value)
            }
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            placeholder="أكاديمية د. محمود المهدي لعلوم الحاسب والبرمجة بالزقازيق وأونلاين. تأسيس عملي واحترافي من الصفر لطلاب الثانوية والجامعات..."
          />
          <p className="text-[11px] text-muted-foreground">الوصف الرئيسي الذي يظهر في نتائج نتائج بحث جوجل لمنصة د. محمود المهدي.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-foreground">
            الكلمات المفتاحية (Meta Keywords)
          </label>
          <input
            type="text"
            value={formData[SETTINGS_KEYS.SITE_SEO_KEYWORDS] || ""}
            onChange={(e) =>
              handleChange(SETTINGS_KEYS.SITE_SEO_KEYWORDS, e.target.value)
            }
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            placeholder="دكتور محمود المهدي, برمجة, علوم الحاسب, كودينج, الزقازيق, رافال أكاديمي, زاج أكاديمي, إديوفيرس, كورس بايثون"
          />
          <p className="text-[11px] text-muted-foreground">افصل بين الكلمات بفواصل (،) لمساعدة محركات البحث في أرشفة المنصة.</p>
        </div>
      </div>

      {/* Logo & Favicon Upload Cards with Live Preview */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Main Site Logo */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-primary" />
              شعار الموقع الرئيسي (Logo)
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
              معاينة الفورية
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
            <div className="h-12 w-12 rounded-lg border border-border bg-slate-900/5 dark:bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={logoUrl}
                alt="معاينة الشعار"
                className="h-full w-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/uploads/logo.jpg";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">{logoUrl}</p>
              <p className="text-[11px] text-muted-foreground">يظهر في القائمة العلوية والتذييل السفلي للموقع.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={formData[SETTINGS_KEYS.SITE_LOGO_URL] || ""}
              onChange={(e) =>
                handleChange(SETTINGS_KEYS.SITE_LOGO_URL, e.target.value)
              }
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              dir="ltr"
              placeholder="/uploads/logo.jpg"
            />
            <div className="relative flex-shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.SITE_LOGO_URL)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <button
                type="button"
                className="h-full px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-1.5 transition font-bold text-xs shadow-sm disabled:opacity-50"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>رفع صورة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Site Favicon Icon */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" />
              أيقونة المتصفح (Favicon Icon)
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              أيقونة التبويب
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
            <div className="h-12 w-12 rounded-lg border border-border bg-slate-900/5 dark:bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={faviconUrl}
                alt="معاينة الأيقونة"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/uploads/logo.jpg";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">{faviconUrl}</p>
              <p className="text-[11px] text-muted-foreground">تظهر في أعلى تبويب المتصفح وبجوار اسم الموقع.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={formData[SETTINGS_KEYS.SITE_FAVICON_URL] || ""}
              onChange={(e) =>
                handleChange(SETTINGS_KEYS.SITE_FAVICON_URL, e.target.value)
              }
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              dir="ltr"
              placeholder="/uploads/logo.jpg"
            />
            <div className="relative flex-shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.SITE_FAVICON_URL)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <button
                type="button"
                className="h-full px-3.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl flex items-center gap-1.5 transition font-bold text-xs border border-border disabled:opacity-50"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>رفع الأيقونة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
