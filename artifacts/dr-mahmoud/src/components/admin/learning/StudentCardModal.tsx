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
              const resolvedCenter = st.centerName || st.center_name || "سنتر معتمد";
              const resolvedParentPhone = st.parentPhone || st.parent_phone || "—";
              const isLanguages = 
                (st.languageTrack && st.languageTrack.toLowerCase().includes("lang")) ||
                (st.academicTrack && st.academicTrack.toLowerCase().includes("lang")) ||
                (st.schoolType && st.schoolType.toLowerCase().includes("lang")) ||
                (Boolean((st as any).school_type) && String((st as any).school_type).toLowerCase().includes("lang"));
              const resolvedTrack = isLanguages ? "لغات (Languages)" : "عام (عربي)";

              return (
                <div
                  key={studentId}
                  className="print-card-item relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-sm text-right"
                  style={{ minHeight: "240px" }}
                >
                  {/* Top Gradient Accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-blue-600 to-cyan-500" />

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/doctor_avatar.png"
                        alt="د. محمود المهدي"
                        className="h-9 w-9 rounded-full border border-blue-600 object-cover shadow-xs flex-shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">د. محمود المهدي</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <span>فيزياء الثانوية العامة</span>
                          <span>•</span>
                          <span className="text-blue-600 font-bold dir-ltr">Dr. Mahmoud Elmahdy</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      بطاقة طالب رسمية
                    </span>
                  </div>

                  {/* Hero Student Name */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 border-r-4 border-r-blue-600 px-3 py-1.5 mb-2.5">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mb-0.5">
                      <span className="text-blue-700 font-extrabold">اسم الطالب</span>
                      <span className="text-slate-400 font-mono tracking-wider dir-ltr">STUDENT FULL NAME</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 truncate leading-snug">{studentName}</h3>
                  </div>

                  {/* Card Content Grid */}
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-stretch">
                    {/* Details Column */}
                    <div className="flex flex-col justify-between gap-1.5">
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5">
                          <span className="text-[8px] text-slate-500 block font-bold">السنتر التعليمي</span>
                          <span className="font-extrabold text-slate-800 block truncate">{resolvedCenter}</span>
                        </div>
                        <div className={`rounded-lg border p-1.5 ${isLanguages ? "bg-emerald-50/80 border-emerald-200 text-emerald-800" : "bg-blue-50/80 border-blue-200 text-blue-800"}`}>
                          <span className="text-[8px] opacity-75 block font-bold">المسار الدراسي</span>
                          <span className="font-extrabold block truncate">{resolvedTrack}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2 py-1.5 flex items-center justify-between text-[10px] dir-rtl">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-bold text-[9px]">هاتف الطالب:</span>
                          <span className="font-mono font-bold text-slate-900 dir-ltr">{studentPhone}</span>
                        </div>
                        <div className="w-[1px] h-3 bg-slate-200" />
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-bold text-[9px]">ولي الأمر:</span>
                          <span className="font-mono font-bold text-slate-900 dir-ltr">{resolvedParentPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Column */}
                    <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                      <div className="rounded-lg border border-slate-900 p-1 bg-white shadow-xs">
                        <QRCodeSVG value={`STD-${studentId}-${studentPhone}`} size={85} />
                      </div>
                      <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        رمز الحضور الذكي
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <Check className="h-3 w-3" /> معتمد رسمياً بالسنتر
                    </span>
                    <span className="font-semibold text-slate-400">العام الدراسي 2024 - 2025</span>
                    <span className="font-medium text-slate-500">منصة د. محمود المهدي التعليمية</span>
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
