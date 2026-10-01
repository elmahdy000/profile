import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  CheckCircle2,
  Lock,
  Sparkles,
  X,
  FileCheck2,
  Clock,
  Camera,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";

interface MonthlyPaymentReminderModalProps {
  student: Student;
  onReceiptUploaded: () => void;
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
}

export function MonthlyPaymentReminderModal({
  student,
  onReceiptUploaded,
  forceOpen,
  onCloseForceOpen,
}: MonthlyPaymentReminderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    // Only show if student is not paid
    if (student.paymentStatus !== "paid") {
      const dismissed = sessionStorage.getItem("dr_mahmoud_october_payment_dismissed");
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [student.paymentStatus, forceOpen]);

  if (!isOpen || student.paymentStatus === "paid") {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem("dr_mahmoud_october_payment_dismissed", "true");
    setIsOpen(false);
    onCloseForceOpen?.();
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى اختيار صورة إيصال واضحة من نوع PNG أو JPG أو WEBP",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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

      toast({
        title: "🎉 تم رفع الإيصال بنجاح!",
        description: "الإيصال الآن قيد المراجعة والاعتماد الفوري من الإدارة.",
      });
      onReceiptUploaded();
      handleDismiss();
    } catch (err) {
      toast({
        title: "خطأ في رفع الإيصال",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const isPendingReview = student.paymentStatus === "pending_review";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-amber-500/30 bg-white dark:bg-slate-900 shadow-2xl text-right dir-rtl my-auto">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="إغلاق التنبيه"
            className="absolute top-4 left-4 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-black tracking-wide">
                شهر أكتوبر 2026 📅
              </span>
              <h3 className="mt-1 text-lg font-black sm:text-xl">
                {isPendingReview ? "إيصال الدفع قيد المراجعة ⏳" : "تنبيه بدء اشتراك الشهر الجديد 💳"}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status Message */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
            <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200 leading-relaxed">
              مرحباً بك يا <strong>{student.name}</strong> 👋! بدأ شهر دراسي جديد. حسابك حالياً يعمل بـ
              <span className="mx-1 font-black text-amber-600 dark:text-amber-400">«الباقة المجانية»</span>
              لحين سداد اشتراك الشهر ورفع الإيصال لفتح كافة الدروس والمذكرات.
            </p>
          </div>

          {/* Clarity Feature Comparison: What is Open vs Locked */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              📌 حالة الوصول لمحتوى المنصة بحسابك:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3 space-y-1.5">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  المتاح لك حالياً للمعاينة:
                </span>
                <ul className="list-disc list-inside text-[11px] text-emerald-900/80 dark:text-emerald-200/80 space-y-1 pr-1 font-medium">
                  <li>أول فيديوهين فقط كمعاينة مجانية (الدرس 1 و 2)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 space-y-1.5">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  مقفول لحين تأكيد الدفع:
                </span>
                <ul className="list-disc list-inside text-[11px] text-amber-900/80 dark:text-amber-200/80 space-y-1 pr-1 font-medium">
                  <li>باقي فيديوهات ودروس الكورس (من الدرس 3+)</li>
                  <li>كافة الاختبارات والامتحانات الدورية</li>
                  <li>الاختبارات المقالية ونماذج الإجابة</li>
                  <li>تقييم القدرات الذاتي وبنك الأسئلة</li>
                  <li>المذكرات والملفات التعليمية</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment & Upload Section */}
          {!showUploadBox && !isPendingReview ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                onClick={() => setShowUploadBox(true)}
                className="w-full sm:flex-1 h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <FileCheck2 className="h-4 w-4 ml-1.5" />
                رفع إيصال الدفع الآن 📤
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                مشاهدة فيديوهات المعاينة المجانية 🎥
              </Button>
            </div>
          ) : isPendingReview ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center space-y-2">
              <Clock className="h-6 w-6 text-amber-600 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-amber-900">
                إيصالك قيد المراجعة حالياً من قبل الإدارة وسوف يتم التفعيل فور التأكيد!
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="mt-2 text-xs font-bold rounded-xl"
              >
                حسناً، متابعة التصفح
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              {/* Vodafone Cash & InstaPay Numbers Box */}
              <div className="rounded-2xl border border-primary/20 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                  💳 أرقام التحويل المعتمدة (فودافون كاش / إنستا باي):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-500">فودافون كاش / إنستا باي:</span>
                      <strong className="font-mono text-xs font-black text-blue-600 dir-ltr inline-block">01025131212</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("01025131212");
                        toast({ title: "تم نسخ الرقم 01025131212 ✅" });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100"
                    >
                      نسخ
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-500">فودافون كاش فقط:</span>
                      <strong className="font-mono text-xs font-black text-rose-600 dir-ltr inline-block">01066711545</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("01066711545");
                        toast({ title: "تم نسخ الرقم 01066711545 ✅" });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100"
                    >
                      نسخ
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Zone */}
              <div
                onClick={() => !selectedFile && fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  previewUrl
                    ? "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : "border-primary/40 bg-slate-50 dark:bg-slate-800/40 hover:border-primary"
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
                  <div className="w-full flex items-center justify-between gap-3 text-right">
                    <img
                      src={previewUrl}
                      alt="معاينة الإيصال"
                      className="h-16 w-16 rounded-xl object-cover border border-emerald-500 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        تم اختيار صورة الإيصال
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{selectedFile?.name}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUpload}
                      disabled={uploading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "إرسال الإيصال 📤"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Camera className="h-7 w-7 text-primary mx-auto" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      اضغط هنا لاختيار صورة إيصال التحويل 📸
                    </p>
                    <p className="text-[10px] text-slate-400">يدعم صور PNG, JPG, WEBP</p>
                  </div>
                )}
              </div>

              {/* Back / Dismiss Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadBox(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowRight className="h-3.5 w-3.5" /> رجوع
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  تصفح المنصة الآن 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
