import React, { useState } from "react";
import { UserCheck, AlertCircle, Loader2, Save, School, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { EGYPT_GOVERNORATES, SearchableCombobox } from "@/components/ui/SearchableCombobox";
import type { Student } from "@/types/platform";

export interface IncompleteProfileModalProps {
  student: Student;
  onStudentUpdated: (updatedStudent: Student) => void;
}

export function IncompleteProfileModal({
  student,
  onStudentUpdated,
}: IncompleteProfileModalProps) {
  const needsSchool = !student.schoolName || student.schoolName === "null" || student.schoolName.trim() === "";
  const needsParentPhone = !student.parentPhone || student.parentPhone === "null" || student.parentPhone.trim() === "";
  const needsGovernorate = !student.governorate || student.governorate === "null" || student.governorate.trim() === "";
  const needsCity = !student.city || student.city === "null" || student.city.trim() === "";

  const [schoolName, setSchoolName] = useState(needsSchool ? "" : student.schoolName || "");
  const [parentPhone, setParentPhone] = useState(needsParentPhone ? "" : student.parentPhone || "");
  const [governorate, setGovernorate] = useState(needsGovernorate ? "الشرقية" : student.governorate || "الشرقية");
  const [city, setCity] = useState(needsCity ? "الزقازيق" : student.city || "الزقازيق");
  const [saving, setSaving] = useState(false);

  const isMissingData = needsSchool || needsParentPhone || needsGovernorate || needsCity;

  if (!isMissingData) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const normalizePhone = (num: string) =>
        num
          .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
          .replace(/[^\d]/g, "");

      const bodyData: Record<string, string> = {};
      if (schoolName.trim()) bodyData.schoolName = schoolName.trim();
      if (parentPhone.trim()) {
        const cleanParent = normalizePhone(parentPhone);
        if (cleanParent.length < 10) {
          toast({
            variant: "destructive",
            title: "رقم ولي الأمر غير صحيح",
            description: "يرجى كتابة رقم موبايل صحيح لولي الأمر (11 رقم).",
          });
          setSaving(false);
          return;
        }
        bodyData.parentPhone = cleanParent;
      }
      if (governorate.trim()) bodyData.governorate = governorate.trim();
      if (city.trim()) bodyData.city = city.trim();

      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحديث البيانات");

      toast({
        title: "تم استكمال بيانات الحساب بنجاح 🎉",
        description: "شكراً لك! تم تحديث بياناتك الشخصية والتعليمية.",
      });

      if (data.student) {
        onStudentUpdated(data.student);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ البيانات",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-md p-4 dir-rtl text-right">
      <div className="w-full max-w-lg rounded-3xl bg-card border-2 border-amber-400/40 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">
              ⚠️ استكمال البيانات الشخصية الناقصة
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              مرحباً بك يا {student.name}! يرجى كتابة البيانات التالية لتفعيل حسابك ومتابعة الحضور والاشتراكات.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {needsSchool && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <School className="w-4 h-4 text-primary" />
                <span>اسم المدرسة أو الكلية *</span>
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="مثال: مدرسة الناصرية الثانوي بنين / كلية الحاسبات"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {needsParentPhone && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-primary" />
                <span>رقم هاتف ولي الأمر *</span>
              </label>
              <input
                type="tel"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="010XXXXXXXX / 012XXXXXXXX"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary dir-ltr text-right"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                يُستخدم لإرسال تقارير الحضور والتقييمات وأكواد الاشتراك.
              </p>
            </div>
          )}

          {(needsGovernorate || needsCity) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>المحافظة *</span>
                </label>
                <SearchableCombobox
                  id="student-gov-select"
                  label=""
                  options={Object.keys(EGYPT_GOVERNORATES)}
                  value={governorate}
                  onChange={(val) => setGovernorate(val)}
                  placeholder="اختر المحافظة"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>المدينة / المركز *</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: الزقازيق"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-md gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "جاري الحفظ..." : "حفظ البيانات واستكمال الحساب 🚀"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
