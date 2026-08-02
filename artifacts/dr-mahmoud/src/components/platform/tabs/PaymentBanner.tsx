import { useState, useRef } from "react";
import { Clock, ShieldCheck, Camera, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function PaymentBanner({ paymentStatus, onUploaded }: { paymentStatus: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة إيصال دمج من نوع PNG أو JPG أو WEBP", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", selectedFile);
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const res = await fetch("/api/student/payment-receipt", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر رفع الإيصال");
      toast({ title: "🎉 تم رفع الإيصال بنجاح!", description: "جارٍ مراجعة الإيصال وتأكيد الحجز فوراً من الأدمن." });
      onUploaded();
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (paymentStatus === "pending_review") {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 p-6 shadow-lg backdrop-blur-xl dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/30 text-right dir-rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                قيد المراجعة الفورية
              </div>
              <h3 className="mt-2 text-lg font-black text-amber-950 dark:text-amber-100">
                تم استلام إيصال الدفع بنجاح 📜
              </h3>
              <p className="mt-1 text-xs leading-6 font-medium text-amber-900/80 dark:text-amber-200/70 max-w-xl">
                الإيصال الآن تحت المراجعة من الإدارة. بمجرد تأكيد الحجز، سيتم فتح بقية الفيديوهات والاختبارات التفاعلية تلقائياً بدون حاجة لإعادة التسجيل!
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-300/40 bg-white/70 dark:bg-amber-900/30 p-3.5 text-center shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">حالة الحساب</span>
            <strong className="mt-1 text-sm font-extrabold text-amber-900 dark:text-amber-100 block">في انتظار التأكيد</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-blue-500/5 to-indigo-500/10 p-6 shadow-xl backdrop-blur-2xl dark:border-primary/20 dark:from-primary/20 dark:to-indigo-950/30 text-right dir-rtl">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white shadow-lg shadow-primary/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                ✨ أول فيديوهين مفتوحين مجاناً
              </span>
              <h3 className="mt-1 text-lg font-black text-foreground">
                تأكيد الحجز وفتح باقي المحتوى
              </h3>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground max-w-sm leading-relaxed">
            ارفع صورة تحويل فودافون كاش أو إنستا باي لفتح جميع الفيديوهات، الملفات والملازم المخصصة لمرحلتك.
          </p>
        </div>

        {/* Vodafone Cash & InstaPay Payment Account Box */}
        <div className="rounded-2xl border border-primary/20 bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-black text-foreground flex items-center gap-2">
              💳 وسائل التحويل المتاحة (فودافون كاش أو إنستا باي):
            </span>
            <span className="text-[11px] font-bold text-primary">تحويل مباشر</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="block font-bold text-slate-700 dark:text-slate-300">فودافون كاش / إنستا باي:</span>
                <strong className="font-mono text-sm font-black text-[#0B63CE] dir-ltr inline-block tracking-wider">01025131212</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("01025131212");
                  toast({ title: "تم نسخ الرقم 01025131212" });
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition-all"
              >
                نسخ الرقم
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="block font-bold text-slate-700 dark:text-slate-300">فودافون كاش فقط:</span>
                <strong className="font-mono text-sm font-black text-rose-600 dark:text-rose-400 dir-ltr inline-block tracking-wider">01066711545</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("01066711545");
                  toast({ title: "تم نسخ رقم فودافون كاش 01066711545" });
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-100 transition-all"
              >
                نسخ الرقم
              </button>
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => !selectedFile && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/10 scale-[1.01]"
              : previewUrl
              ? "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-primary/30 bg-card/60 hover:border-primary hover:bg-card/90"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />

          {previewUrl ? (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-right">
                <img
                  src={previewUrl}
                  alt="معاينة الإيصال"
                  className="h-20 w-20 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    تم اختيار صورة الإيصال
                  </div>
                  <p className="mt-1 text-xs font-mono text-muted-foreground truncate max-w-xs">
                    {selectedFile?.name}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    الحجم: {Math.round((selectedFile?.size || 0) / 1024)} كيلوبايت
                  </span>
                </div>
              </div>

              <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="h-10 flex-1 sm:flex-none text-xs font-bold"
                >
                  تغيير الصورة
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  disabled={uploading}
                  className="h-10 flex-1 sm:flex-none gap-2 font-black text-xs shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploading ? "جاري الرفع..." : "تأكيد ورفع الإيصال 📤"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-6 w-6" />
              </div>
              <strong className="block text-sm font-black text-foreground">
                اختر صورة الإيصال من المعرض (Gallery) أو التقاط بالكاميرا 📷
              </strong>
              <p className="text-xs text-muted-foreground">
                اضغط لاختيار الصورة أو التقاط صورة واضحة للإيصال فوراً من الموبايل
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                  className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  اختر من المعرض / الكاميرا
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
