import React from "react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export interface ContactSocialTabProps {
  activeTab: "contact" | "social";
  formData: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export const ContactSocialTab: React.FC<ContactSocialTabProps> = ({
  activeTab,
  formData,
  handleChange,
}) => {
  return (
    <>
      {/* CONTACT SECTION */}
      {activeTab === "contact" && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-foreground">
            بيانات التواصل (Contact Info)
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                رقم الواتساب الرئيسي (مع كود الدولة، مثال: 201066711545)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_WHATSAPP] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.CONTACT_WHATSAPP, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="201066711545"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                العنوان / المقر (مثل: Eduverse، فلل الجامعة، الزقازيق)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_ADDRESS] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.CONTACT_ADDRESS, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Eduverse، فلل الجامعة، الزقازيق"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                رقم الهاتف الأول (Phone 1)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_PHONE1] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.CONTACT_PHONE1, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                رقم الهاتف الثاني (Phone 2)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_PHONE2] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.CONTACT_PHONE2, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                رقم الهاتف الثالث (Phone 3)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_PHONE3] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.CONTACT_PHONE3, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              رابط خرائط جوجل (Google Maps Embed or Link URL)
            </label>
            <input
              type="text"
              value={formData[SETTINGS_KEYS.CONTACT_MAPS_URL] || ""}
              onChange={(e) =>
                handleChange(SETTINGS_KEYS.CONTACT_MAPS_URL, e.target.value)
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
              dir="ltr"
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>
      )}

      {/* SOCIAL SECTION */}
      {activeTab === "social" && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-foreground">
            مواقع التواصل الاجتماعي (Social Media links)
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                فيسبوك (Facebook URL)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.SOCIAL_FACEBOOK] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.SOCIAL_FACEBOOK, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                انستجرام (Instagram URL)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.SOCIAL_INSTAGRAM] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.SOCIAL_INSTAGRAM, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                يوتيوب (YouTube URL)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.SOCIAL_YOUTUBE] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.SOCIAL_YOUTUBE, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                لينكد إن (LinkedIn URL)
              </label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.SOCIAL_LINKEDIN] || ""}
                onChange={(e) =>
                  handleChange(SETTINGS_KEYS.SOCIAL_LINKEDIN, e.target.value)
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
