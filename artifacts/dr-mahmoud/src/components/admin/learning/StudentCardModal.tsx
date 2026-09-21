import React, { useRef, useState, useEffect } from "react";
import { X, Printer, Download, Sparkles, Building2, User, Phone, BookOpen, ShieldCheck, Check } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import type { ExtendedStudent } from "./StudentDrawer";

// Real ISO/IEC 18004 Standard QR Code Generator for student access codes
function QRCodeSVG({ value, size = 140 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(String(value || "STUDENT"), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} className="rounded-lg bg-slate-100 animate-pulse" />;
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-lg bg-white p-1 shadow-sm object-contain"
    />
  );
}

export interface StudentCardModalProps {
  students: ExtendedStudent[];
  isOpen: boolean;
  onClose: () => void;
}

export function StudentCardModal({ students, isOpen, onClose }: StudentCardModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || students.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Container */}
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl text-slate-900 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold">
              🎫
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {students.length === 1 ? `بطاقة حضور الطالب (${students[0].name})` : `بطاقات حضور الطلاب (${students.length} طالب)`}
              </h3>
              <p className="text-xs text-slate-500">جاهزة للمعاينة والطباعة المباشرة بصيغة الـ QR Code</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 px-4 shadow-sm"
            >
              <Printer className="h-4 w-4" /> طباعة البطاقة (A4)
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0 print:overflow-visible" ref={printRef}>
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-cards-area, .print-cards-area * {
                visibility: visible;
              }
              .print-cards-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0;
                margin: 0;
                background: white;
              }
              .print-card-item {
                break-inside: avoid;
                page-break-inside: avoid;
                box-shadow: none !important;
                border: 1px solid #cbd5e1 !important;
                margin-bottom: 16px !important;
              }
            }
          `}</style>

          <div className="print-cards-area grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Array.isArray(students) ? students.filter(Boolean) : []).map((st, index) => {
              if (!st) return null;
              const studentId = st.id || index;
              const studentName = st.name || "طالب";
              const studentPhone = st.phone || "—";
              const rawSchool = st.schoolName || st.school_name || "";
              const resolvedSchool = (rawSchool && rawSchool !== "arabic" && rawSchool !== "languages") ? rawSchool : "مدارس الزقازيق";
              const resolvedCenter = st.centerName || st.center_name || "حضور أونلاين / السنتر";
              const resolvedSlot = st.appointmentSlot || st.appointment_slot || "موعد المجموعة المتاح";
              const resolvedParentPhone = st.parentPhone || st.parent_phone || studentPhone;
              const resolvedTrack = st.languageTrack || st.language_track || (st.academicTrack === "languages" ? "لغات (إنجليزي)" : "عربي (عام)");

              return (
                <div
                  key={studentId}
                  className="print-card-item relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md transition-all text-right"
                >
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 h-28 w-28 -mr-8 -mt-8 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 h-28 w-28 -ml-8 -mb-8 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

                  {/* Header Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src="/assets/doctor_avatar.png"
                        alt="Dr. Mahmoud Elmahdy"
                        className="h-10 w-10 rounded-full border-2 border-blue-600 object-cover shadow-sm flex-shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">د. محمود المهدي</h4>
                        <span className="text-[10px] text-blue-600 font-bold block">Dr. Mahmoud Elmahdy · بطاقة حضور السنتر</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      حساب نشط
                    </span>
                  </div>

                  {/* Card Content Grid */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                    {/* Left: Info */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block">اسم الطالب</span>
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">{studentName}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-2">
                          <span className="text-[9px] text-slate-500 block">رقم تعريف الطالب</span>
                          <span className="font-mono font-bold text-blue-600 dir-ltr block text-right">#STD-{studentId}</span>
                        </div>
                        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-2">
                          <span className="text-[9px] text-indigo-700/80 block font-medium">المرحلة والمسار</span>
                          <span className="font-bold text-indigo-900 block truncate">{resolvedTrack}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-semibold">📍 السنتر:</span>
                          <strong className="text-blue-700 font-bold">{resolvedCenter}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">⏱️ الموعد:</span>
                          <strong className="text-slate-800">{resolvedSlot}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>📱 تليفون الطالب: <strong className="dir-ltr text-slate-800">{studentPhone}</strong></span>
                        <span>👨‍👩‍👦 ولي الأمر: <strong className="dir-ltr text-slate-800">{resolvedParentPhone}</strong></span>
                      </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100 pr-3">
                      <div className="rounded-2xl border-2 border-slate-900/10 p-1.5 bg-white shadow-xs">
                        <QRCodeSVG value={`STD-${studentId}-${studentPhone}`} size={120} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                        رمز الحضور الذكي 📷
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="mt-4 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                    <span>منصة د. محمود المهدي للبرمجة وعلوم الحاسب 💻 2026</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <ShieldCheck className="h-3 w-3" /> بطاقة معتمدة للسنتر
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 bg-white p-4 flex justify-between items-center print:hidden">
          <span className="text-xs text-slate-500 font-medium">
            عدد الكروت الجاهزة للطباعة: <strong>{students.length} كارت</strong>
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl"
          >
            إغلاق المعاينة
          </Button>
        </div>
      </div>
    </div>
  );
}
