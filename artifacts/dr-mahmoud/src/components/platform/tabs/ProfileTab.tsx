import { useState, useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import { PageHeader, StudentAvatar, ProfileInfoRow, StatusBadge } from "../StudentDashboardUI";

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
      const response = await fetch("/api/student/avatar", { method: "POST", credentials: "include", body });
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
      const res = await fetch("/api/student/avatar", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("تعذر حذف الصورة");
      onStudentChange({ ...student, avatarUrl: null });
      toast({ title: "تم حذف الصورة" });
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر حذف الصورة", description: (error as Error).message });
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-6 text-right" dir="rtl">
      <PageHeader title="حسابي" description="بياناتك الشخصية والتعليمية وإعدادات الحساب." />

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
              {student.avatarUrl && (
                <Button type="button" variant="ghost" size="sm" disabled={avatarLoading} onClick={() => void removeAvatar()} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات الشخصية</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="الاسم" value={student.name} />
            <ProfileInfoRow label="رقم الموبايل" value={student.phone} />
            <ProfileInfoRow label="البريد الإلكتروني" value={student.email || "غير مضاف"} />
            <ProfileInfoRow label="المحافظة" value={student.governorate || "—"} />
            <ProfileInfoRow label="المدينة" value={student.city || "—"} />
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات التعليمية</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="المرحلة الدراسية" value={student.grade || "—"} />
            <ProfileInfoRow label="نظام الدراسة" value={student.learningMode === "offline" ? "حضوري" : "أونلاين"} />
            <ProfileInfoRow label="حالة الحساب" value="متفعّل ✅" />
            <ProfileInfoRow label="حالة الاشتراك" value={student.paymentStatus === "paid" ? "مدفوع 💳" : student.paymentStatus === "pending_review" ? "قيد المراجعة ⏳" : "مجاني 🆓"} />
          </dl>
        </article>
      </div>
    </div>
  );
}
