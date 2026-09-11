import { useState, useRef } from "react";
import { Camera, Trash2, MapPin, Clock, School, Phone, Building2, CalendarDays, ShieldCheck, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import { PageHeader, StudentAvatar, ProfileInfoRow, StatusBadge } from "../StudentDashboardUI";
import { StudentCardModal } from "../../admin/learning/StudentCardModal";
import { defaultOfflineCenters } from "@/components/admin/settings/CentersTab";

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
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Center confirmation states
  const [selectedCenter, setSelectedCenter] = useState<string>(student.centerName || "");
  const [selectedSlot, setSelectedSlot] = useState<string>(student.appointmentSlot || "");
  const [confirmingCenter, setConfirmingCenter] = useState(false);
  const [showAllCenters, setShowAllCenters] = useState(false);

  const isCenterStudent = student.learningMode === "offline" || Boolean(student.centerName) || Boolean(student.appointmentSlot);
  const isConfirmed = Boolean(student.centerConfirmed);

  const isLanguages = student.languageTrack === "languages" || student.academicTrack === "languages" || Boolean(student.grade?.includes("لغات"));

  const filteredCenters = defaultOfflineCenters.filter((center) => {
    if (showAllCenters) return true;
    if (isLanguages) {
      return center.grade?.includes("لغات") || center.name.includes("لغات");
    }
    return !center.grade?.includes("لغات") && !center.name.includes("لغات");
  });

  const handleConfirmCenter = async () => {
    if (!selectedCenter || !selectedSlot) {
      toast({ variant: "destructive", title: "برجاء اختيار السنتر والميعاد أولاً" });
      return;
    }
    setConfirmingCenter(true);
    try {
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          centerName: selectedCenter,
          appointmentSlot: selectedSlot,
          confirmCenter: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تأكيد السنتر");
      }
      onStudentChange({
        ...student,
        centerName: selectedCenter,
        appointmentSlot: selectedSlot,
        centerConfirmed: true,
        centerConfirmedAt: new Date().toISOString(),
      });
      toast({
        title: "تم تأكيد السنتر والميعاد بنجاح! 🔒",
        description: "تم تثبيت مقعدك ويمكنك الآن استخراج وطباعة كارت السنتر (ID).",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "تعذر تأكيد السنتر",
        description: err.message,
      });
    } finally {
      setConfirmingCenter(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "صورة غير صالحة", description: "استخدم PNG أو JPG أو WebP بحجم لا يزيد عن 3 MB." });
      return;
    }
    setAvatarLoading(true);
    try {
      const cropped = await cropAvatar(file);
      const formData = new FormData();
      formData.append("avatar", cropped, "avatar.webp");
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const res = await fetch("/api/student/avatar", { method: "POST", body: formData, credentials: "include", headers: deviceId ? { "X-Device-Id": deviceId } : {} });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "تعذر حفظ الصورة");
      }
      const data = await res.json();
      onStudentChange({ ...student, avatarUrl: data.avatarUrl });
      toast({ title: "تم تحديث الصورة بنجاح" });
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

  const handleOpenCardModal = () => {
    if (student.learningMode === "offline" && !isConfirmed) {
      toast({
        variant: "destructive",
        title: "⚠️ مطلوب تأكيد السنتر أولاً",
        description: "يجب اختيار وتأكيد السنتر والميعاد الحضوري أدناه لمرة واحدة قبل استخراج كارت الـ ID.",
      });
      return;
    }
    setIsCardModalOpen(true);
  };

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCardModal}
                className={`font-bold ${
                  student.learningMode === "offline" && !isConfirmed
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                }`}
              >
                {student.learningMode === "offline" && !isConfirmed ? "🔒 كارت الـ ID (يتطلب تأكيد السنتر)" : "🎫 بطاقتي بالـ QR Code (ID)"}
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

      {/* Center Booking Section (for offline students) */}
      {isCenterStudent && (
        isConfirmed ? (
          /* Confirmed State */
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/30 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                <MapPin className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>📍 بيانات حجز السنتر والمواعيد الحضورية بالزقازيق</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> مؤكد نهائياً 🔒
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCardModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 px-4 shadow-sm"
              >
                🎫 استخراج كارت السنتر (QR) / الـ ID
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-background/60 p-3.5 space-y-1">
                <span className="text-muted-foreground text-[11px] block">السنتر المختار:</span>
                <p className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">
                  {student.centerName || "حضور بالسنتر (الزقازيق)"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-background/60 p-3.5 space-y-1">
                <span className="text-muted-foreground text-[11px] block">الموعد المحدد للحضور:</span>
                <p className="font-extrabold text-amber-800 dark:text-amber-300 text-sm">
                  {student.appointmentSlot || "حسب جدول المجموعات بالسنتر"}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground bg-emerald-100/50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 leading-relaxed">
              🔒 <strong>تنبيه الإدارة:</strong> تم تأكيد السنتر والموعد الخاص بك بنجاح ولا يمكن تعديل الاختيار مباشرة. إذا احتجت لتغيير السنتر أو الموعد لأسباب طارئة، يرجى التواصل مع <strong>د. محمود المهدي</strong> أو <strong>مساعد الأدمن</strong> لاعتماد التعديل.
            </p>
          </article>
        ) : (
          /* Unconfirmed State - Interactive Selection */
          <article className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/30 p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>⚠️ تأكيد السنتر والميعاد الحضوري النهائي (إلزامي)</span>
              </div>
              <div className="text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-700">
                الاختيار متاح لمرة واحدة فقط 🔒
              </div>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-background/80 p-3.5 border border-amber-200 dark:border-amber-800/40 space-y-1.5 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                📌 تنبيه إلزامي لتثبيت مقعدك واستخراج كارت الـ ID:
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                نظراً لقرب بدء الحصص الحضورية، يرجى اختيار السنتر والميعاد المناسب لك من المجموعات الرسمية أدناه، ثم الضغط على <strong>"تأكيد السنتر والميعاد النهائي"</strong>.
                <br />
                <span className="text-red-600 dark:text-red-400 font-bold">ملاحظة:</span> بمجرد الضغط على التأكيد يتم تثبيت مقعدك فوراً وقفل الاختيار ولا يمكنك تعديله إلا بالرجوع للإدارة أو مساعد الأدمن.
              </p>
            </div>

            {/* Official Center Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  المجموعات المتاحة لمسارك ({isLanguages ? "مدارس لغات" : "مدارس عربي"}):
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllCenters(!showAllCenters)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showAllCenters ? "عرض المناسب لمساري فقط" : "عرض جميع السناتر والمواعيد"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredCenters.map((center) => {
                  const slotStr = `${center.daysStr} (${center.timeStr})`;
                  const isSelected = selectedCenter === center.name && selectedSlot === slotStr;
                  return (
                    <div
                      key={center.id}
                      onClick={() => {
                        setSelectedCenter(center.name);
                        setSelectedSlot(slotStr);
                      }}
                      className={`relative cursor-pointer rounded-xl border-2 p-3.5 transition-all text-right ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/90 dark:bg-blue-950/70 shadow-sm ring-2 ring-blue-500/20"
                          : "border-border bg-white dark:bg-card hover:border-blue-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {center.grade || "ثانوية عامة"}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-600" /> {center.area}
                        </span>
                      </div>
                      <strong className="block text-xs font-extrabold text-foreground">{center.name}</strong>
                      <span className="mt-1 block text-xs font-bold text-blue-600 dark:text-blue-400">{slotStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200 dark:border-amber-800/40">
              <div className="text-[11px]">
                {selectedCenter && selectedSlot ? (
                  <span className="text-foreground font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    المختار: {selectedCenter} — {selectedSlot}
                  </span>
                ) : (
                  <span className="text-amber-800 dark:text-amber-300 font-medium">👈 برجاء الضغط على أحد السناتر بالأعلى لاختياره</span>
                )}
              </div>
              <Button
                type="button"
                disabled={!selectedCenter || !selectedSlot || confirmingCenter}
                onClick={handleConfirmCenter}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer"
              >
                {confirmingCenter ? "جاري التأكيد..." : "🔒 تأكيد السنتر والميعاد النهائي (مرة واحدة)"}
              </Button>
            </div>
          </article>
        )
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
