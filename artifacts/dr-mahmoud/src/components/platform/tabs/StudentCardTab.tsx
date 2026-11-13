import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Building2,
  Clock,
  Phone,
  GraduationCap,
  ShieldCheck,
  User,
  Sparkles,
  Info,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import { StudentAvatar } from "../StudentDashboardUI";

export function StudentCardTab({
  student,
  onBackToDashboard,
}: {
  student: Student;
  onBackToDashboard?: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isFullscreenQr, setIsFullscreenQr] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // QR Code Value: Standardized STD-{id}-{phone} format recognized by secretary scanner
  const qrValue = `STD-${student.id}-${student.phone || ""}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 480,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code Generation Error:", err);
      });

    return () => {
      active = false;
    };
  }, [qrValue]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-Student-${student.name || student.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "تم تحميل رمز الـ QR بنجاح",
      description: "يمكنك حفظ الصورة في معرض الصور بهاتفك لإبرازها في أي وقت.",
    });
  };

  const isApproved = student.status === "approved";
  const isPaid = student.paymentStatus === "paid";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12" dir="rtl">
      {/* Top Bar with Navigation & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <div className="flex items-center gap-3.5">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="العودة للرئيسية"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              بطاقة الطالب ورمز الحضور الذكي (QR Code)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أظهر هذا الكود للسكرتارية عند بوابة السنتر لتسجيل حضورك فورياً في شيت الحصة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            className="flex-1 sm:flex-initial text-xs font-bold border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            تحميل الرمز
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial text-xs font-bold bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            طباعة البطاقة
          </Button>
        </div>
      </div>

      {/* Main Student Card & Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: The Digital ID Card (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div
            ref={cardRef}
            className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-2xl p-6 sm:p-7 space-y-6 print:m-0 print:border-none print:shadow-none"
          >
            {/* Background Decorative Rings */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-56 h-56 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            {/* Card Header: Brand & Academy */}
            <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xs tracking-wider">
                  DR
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">أكاديمية د. محمود المهدي</h3>
                  <p className="text-[10.5px] text-slate-300">بطاقة الطالب الذكية وكود الحضور المعتمد</p>
                </div>
              </div>

              <div className="text-left">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-blue-200 tracking-wider">
                  #STD-{student.id}
                </span>
              </div>
            </div>

            {/* Card Body: Student Info & Large QR Code */}
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* QR Code Frame with interactive expand button */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  onClick={() => setIsFullscreenQr(true)}
                  className="group relative p-2.5 rounded-2xl bg-white shadow-xl border-2 border-white/80 cursor-pointer transition-transform hover:scale-105"
                  title="انقر لتكبير رمز الـ QR بكامل الشاشة"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Student Attendance QR"
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 bg-slate-100 rounded-xl animate-pulse" />
                  )}

                  {/* Hover expansion overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-7 w-7 text-white mb-1" />
                    <span className="text-[11px] font-bold">تكبير الرمز</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullscreenQr(true)}
                  className="text-[11px] font-bold text-blue-300 hover:text-white flex items-center gap-1 transition print:hidden"
                >
                  <Maximize2 className="h-3 w-3" />
                  تكبير الرمز بكامل الشاشة
                </button>
              </div>

              {/* Student Details */}
              <div className="space-y-3 min-w-0 flex-1 w-full text-right">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">اسم الطالب</span>
                  <h2 className="text-lg sm:text-xl font-black text-white truncate">
                    {student.name}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-200 pt-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="truncate">
                      <strong>الصف:</strong> {student.grade || "المرحلة الثانوية"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      <strong>السنتر:</strong> {student.centerName || "غير محدد سنتر"}
                    </span>
                  </div>

                  {student.appointmentSlot && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <strong>الموعد:</strong> {student.appointmentSlot}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-400 shrink-0" />
                    <span className="font-mono text-slate-300" dir="ltr">
                      {student.phone}
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    حساب معتمد
                  </span>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      اشتراك نشط
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      بانتظار تأكيد الاشتراك
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer: Security & Barcode Tag */}
            <div className="relative pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                هذا الرمز رسمي ومحمي للاستخدام الحصري داخل منظومة الحضور.
              </span>
              <span className="font-mono text-slate-400 text-[10px]" dir="ltr">
                {qrValue}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Usage Steps & Quick Guidance (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4 print:hidden">
          {/* Instructions Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              كيف يعمل تسجيل الحضور بالسنتر؟
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="h-7 w-7 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ١
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <strong className="block text-slate-900 dark:text-white mb-0.5 font-bold">
                    افتح الكارت على هاتفك
                  </strong>
                  عند وصولك للسنتر، افتح هذه الصفحة من حسابك أو اعرض صورة الـ QR المحفوظة في المعرض.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="h-7 w-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ٢
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <strong className="block text-slate-900 dark:text-white mb-0.5 font-bold">
                    مسح الكود عند البوابة (Scan)
                  </strong>
                  يوجّه مساعد السنتر أو السكرتارية كاميرا المسح نحو الكود فيُسجّل حضورك في جزء من الثانية.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ٣
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <strong className="block text-slate-900 dark:text-white mb-0.5 font-bold">
                    إشعار فوري لولي الأمر
                  </strong>
                  تصل رسالة / إشعار مباشر لولي الأمر يؤكد وصولك للحصة وساعة الحضور الدقيقة.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tip for screen brightness */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black mb-0.5">نصيحة لمسح أسرع:</strong>
              إذا كنت تستخدم هاتفك في مكان ساطع، انقر على خيار <strong>"تكبير الرمز بكامل الشاشة"</strong> وارفع سطوع الشاشة لتتمكن السكرتارية من مسح الكود من مسافة متر ونصف فوراً.
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen High-Contrast QR Code Modal */}
      {isFullscreenQr && (
        <div
          onClick={() => setIsFullscreenQr(false)}
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white cursor-pointer animate-in fade-in duration-200"
        >
          <div className="text-center mb-4 space-y-1">
            <h3 className="text-lg font-black">{student.name}</h3>
            <p className="text-xs text-slate-300">
              كود الطالب: <span className="font-mono text-amber-400 font-bold">#STD-{student.id}</span>
            </p>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 bg-white rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-3 border-4 border-primary"
          >
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Student Fullscreen QR"
                className="w-full max-w-[280px] h-auto object-contain rounded-xl"
              />
            )}
            <span className="font-mono text-xs font-black text-slate-900" dir="ltr">
              {qrValue}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-5 flex items-center gap-1.5">
            <Minimize2 className="h-4 w-4" />
            انقر في أي مكان للإغلاق والعودة
          </p>
        </div>
      )}
    </div>
  );
}
