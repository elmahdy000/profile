import React, { useState, useEffect } from "react";
import { useSiteSettings, useUpdateSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { Loader2, Save, CheckCircle2, UploadCloud } from "lucide-react";

export function AdminSettings() {
  const { settings, isLoading, get } = useSiteSettings();
  const updateSettingsMutation = useUpdateSiteSettings();
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      const initialData: Record<string, string> = {};
      Object.values(SETTINGS_KEYS).forEach((key) => {
        initialData[key] = settings[key]?.value || "";
      });
      setFormData(initialData);
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    setIsUploading(true);
    try {
      const token = localStorage.getItem("dr_mahmoud_admin_pwd") || "";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        handleChange(key, data.url);
      } else {
        alert("حدث خطأ أثناء رفع الصورة: " + (data.error || ""));
      }
    } catch (err) {
      alert("فشل الرفع. تأكد من اتصالك بالإنترنت.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = Object.entries(formData).map(([key, value]) => ({
      key,
      value,
    }));

    try {
      await updateSettingsMutation.mutateAsync(payload);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      alert("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">إعدادات الموقع</h2>
          <p className="text-xs text-muted-foreground mt-1">تحديث محتوى الموقع والروابط</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={updateSettingsMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-2"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaved ? "تم الحفظ" : "حفظ التغييرات"}
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* قسم البطل (Hero) */}
        <div className="bg-card/40 border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-border/50 pb-2">القسم الرئيسي (Hero)</h3>
          
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الرئيسي</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.HERO_TITLE] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.HERO_TITLE, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              placeholder="تعلم البرمجة والذكاء الاصطناعي"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الفرعي</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.HERO_SUBTITLE] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.HERO_SUBTITLE, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              placeholder="مع د. محمود المهدي"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف</label>
            <textarea
              value={formData[SETTINGS_KEYS.HERO_DESC] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.HERO_DESC, e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة البطل (URL أو رفع)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData[SETTINGS_KEYS.HERO_PHOTO_URL] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.HERO_PHOTO_URL, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                dir="ltr"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.HERO_PHOTO_URL)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* قسم من نحن */}
        <div className="bg-card/40 border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-border/50 pb-2">عن الدكتور</h3>
          
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف التفصيلي</label>
            <textarea
              value={formData[SETTINGS_KEYS.ABOUT_DESC] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_DESC, e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة القسم (URL أو رفع)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData[SETTINGS_KEYS.ABOUT_IMAGE_URL] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_IMAGE_URL, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                dir="ltr"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.ABOUT_IMAGE_URL)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">سنوات الخبرة</label>
              <input
                type="number"
                value={formData[SETTINGS_KEYS.ABOUT_YEARS] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_YEARS, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">عدد الطلاب</label>
              <input
                type="number"
                value={formData[SETTINGS_KEYS.ABOUT_STUDENTS] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_STUDENTS, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>

        {/* معلومات التواصل */}
        <div className="bg-card/40 border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-border/50 pb-2">بيانات التواصل</h3>
          
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الواتساب</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.CONTACT_WHATSAPP] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_WHATSAPP, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">هاتف 1</label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_PHONE1] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_PHONE1, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">هاتف 2</label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_PHONE2] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_PHONE2, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.CONTACT_ADDRESS] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_ADDRESS, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* روابط السوشيال ميديا */}
        <div className="bg-card/40 border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-border/50 pb-2">مواقع التواصل الاجتماعي</h3>
          
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">فيسبوك</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.SOCIAL_FACEBOOK] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_FACEBOOK, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">انستجرام</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.SOCIAL_INSTAGRAM] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_INSTAGRAM, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">يوتيوب</label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.SOCIAL_YOUTUBE] || ""}
              onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_YOUTUBE, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 text-left"
              dir="ltr"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
