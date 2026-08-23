import { useState, useRef } from "react";
import { Camera, Trash2, MapPin, Clock, School, Phone, Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import { PageHeader, StudentAvatar, ProfileInfoRow, StatusBadge } from "../StudentDashboardUI";
import { StudentCardModal } from "../../admin/learning/StudentCardModal";

async function cropAvatar(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  canvas.getContext("2d")?.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 640, 640);
  image.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر تجهيز الصورة")), "image/webp", .88));
}

export function ProfileTab({
  student,
  onStudentChange,
}: {
  student: Student;
  onStudentChange: (student: Student) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "صورة غير صالحة", description: "استخدم PNG أو JPG أو WebP بحجم لا يزيد عن 3 MB." });
      return;
    }
    setAvatarLoading(true);
    try {
      const cropped = await cropAvatar(file);
      const body = new FormData();
      body.append("avatar", cropped, "avatar.webp");
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const response = await fetch("/api/student/avatar", { method: "POST", credentials: "include", headers: deviceId ? { "X-Device-Id": deviceId } : {}, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onStudentChange({ ...student, avatarUrl: data.avatarUrl });
      toast({ title: "تم تحديث الصورة" });
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر رفع الصورة", description: (error as Error).message });
    } finally {
      setAvatarLoading(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarLoading(true);
    try {
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const res = await fetch("/api/student/avatar", { method: "DELETE", credentials: "include", headers: deviceId ? { "X-Device-Id": deviceId } : {} });
      if (!res.ok) throw new Error("تعذر حذف الصورة");
      onStudentChange({ ...student, avatarUrl: null });
      toast({ title: "تم حذف الصورة" });
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر حذف الصورة", description: (error as Error).message });
    } finally {
      setAvatarLoading(false);
    }
  };

  const isCenterStudent = student.learningMode === "offline" || Boolean(student.centerName) || Boolean(student.appointmentSlot);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  return (
    <div className="space-y-5 pb-6 text-right" dir="rtl">
      <PageHeader title="حسابي" description="بياناتك الشخصية والتعليمية وإعدادات الحساب وحجز السنتر." />

      {/* Avatar Card */}
      <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-right sm:items-center sm:gap-5">
          <div className="shrink-0">
            <StudentAvatar name={student.name} src={student.avatarUrl} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <StatusBadge>حساب متفعّل</StatusBadge>
            <h2 className="mt-2 text-xl font-extrabold text-foreground truncate">{student.name}</h2>
            <p className="text-[13px] text-muted-foreground">{student.grade || "طالب بمنصة د. محمود المهدي"}</p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={avatarLoading} onClick={() => inputRef.current?.click()}>
                <Camera className="h-4 w-4" /> {avatarLoading ? "جاري الحفظ..." : "تغيير الصورة"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCardModalOpen(true)} className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-bold">
                🎫 بطاقتي بالـ QR Code
              </Button>
              {student.avatarUrl && (
                <Button type="button" variant="ghost" size="sm" disabled={avatarLoading} onClick={() => void removeAvatar()} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Center Booking Banner (for offline/center students) */}
      {isCenterStudent && (
        <article className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-emerald-900/10 to-transparent p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
              <MapPin className="h-5 w-5 shrink-0" />
              <span>📍 بيانات حجز السنتر والمواعيد الحضورية بالزقازيق</span>
            </div>
            <Button type="button" size="sm" onClick={() => setIsCardModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 px-3">
              🎫 استخراج كارت السنتر (QR)
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-emerald-500/20 bg-background/60 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px] block">السنتر المختار:</span>
              <p className="font-extrabold text-emerald-300 text-sm">
                {student.centerName || "حضور بالسنتر (الزقازيق)"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-background/60 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px] block">الموعد المحدد للحضور:</span>
              <p className="font-extrabold text-amber-300 text-sm">
                {student.appointmentSlot || "حسب جدول المجموعات بالسنتر"}
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات الشخصية</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="الاسم" value={student.name} />
            <ProfileInfoRow label="رقم الموبايل" value={student.phone} />
            {student.parentPhone && <ProfileInfoRow label="رقم ولي الأمر" value={student.parentPhone} />}
            <ProfileInfoRow label="البريد الإلكتروني" value={student.email || "غير مضاف"} />
            <ProfileInfoRow label="المحافظة" value={student.governorate || "الشرقية"} />
            <ProfileInfoRow label="المدينة" value={student.city || "الزقازيق"} />
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات التعليمية والحجز</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="المرحلة الدراسية" value={student.grade || "—"} />
            {student.schoolName && <ProfileInfoRow label="اسم المدرسة" value={student.schoolName} />}
            {student.languageTrack && <ProfileInfoRow label="الشعبة والمسار" value={student.languageTrack} />}
            <ProfileInfoRow label="نظام الدراسة" value={student.learningMode === "offline" ? "حضوري بالسنتر" : "أونلاين"} />
            {student.centerName && <ProfileInfoRow label="السنتر المختار" value={student.centerName} />}
            {student.appointmentSlot && <ProfileInfoRow label="الموعد المحدد" value={student.appointmentSlot} />}
            <ProfileInfoRow label="حالة الحساب" value="متفعّل ✅" />
            <ProfileInfoRow label="حالة الاشتراك" value={student.paymentStatus === "paid" ? "مدفوع 💳" : student.paymentStatus === "pending_review" ? "قيد المراجعة ⏳" : "مجاني 🆓"} />
          </dl>
        </article>
      </div>

      <StudentCardModal
        students={[student as any]}
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
      />
    </div>
  );
}
