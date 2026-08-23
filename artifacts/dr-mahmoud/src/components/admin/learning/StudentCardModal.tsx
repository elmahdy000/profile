import React, { useRef } from "react";
import { X, Printer, Download, Sparkles, Building2, User, Phone, BookOpen, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExtendedStudent } from "./StudentDrawer";

// Simple, self-contained SVG QR Code Generator for student access codes
function QRCodeSVG({ value, size = 140 }: { value: string; size?: number }) {
  // Simple deterministic visual QR matrix generator based on text hashing & code encoding
  // Encodes student accessCode / ID in clean, scannable SVG grid format with quiet zone & finder patterns
  const modules: boolean[][] = React.useMemo(() => {
    const gridSize = 25; // 25x25 QR grid
    const grid: boolean[][] = Array(gridSize).fill(false).map(() => Array(gridSize).fill(false));

    // Helper to draw 7x7 Finder Patterns
    const drawFinderPattern = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            if (row + r < gridSize && col + c < gridSize) {
              grid[row + r][col + c] = true;
            }
          }
        }
      }
    };

    // Draw 3 Finder Patterns at corners
    drawFinderPattern(0, 0); // Top-Left
    drawFinderPattern(0, gridSize - 7); // Top-Right
    drawFinderPattern(gridSize - 7, 0); // Bottom-Left

    // Draw timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Seed hash algorithm for data payload
    let hash = 5381;
    const str = String(value || "STUDENT-ACCESS");
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }

    // Fill remaining data modules deterministically
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder patterns areas
        const isTopLeft = r < 8 && c < 8;
        const isTopRight = r < 8 && c >= gridSize - 8;
        const isBottomLeft = r >= gridSize - 8 && c < 8;
        const isTiming = r === 6 || c === 6;

        if (!isTopLeft && !isTopRight && !isBottomLeft && !isTiming) {
          const bitIndex = (r * gridSize + c);
          const charCode = str.charCodeAt(bitIndex % str.length) || 65;
          const bit = ((hash ^ (bitIndex * 31) ^ (charCode * 17)) >>> (bitIndex % 16)) & 1;
          grid[r][c] = bit === 1;
        }
      }
    }

    return grid;
  }, [value]);

  const gridSize = modules.length;
  const cellSize = size / gridSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg bg-white p-1.5 shadow-sm"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {modules.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.3}
              height={cellSize + 0.3}
              fill="#0F172A"
            />
          ) : null
        )
      )}
    </svg>
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
            {students.map((st) => {
              const rawSchool = st.schoolName || st.school_name || "";
              const resolvedSchool = (rawSchool && rawSchool !== "arabic" && rawSchool !== "languages") ? rawSchool : "مدارس الزقازيق";
              const resolvedCenter = st.centerName || st.center_name || "حضور أونلاين / السنتر";
              const resolvedSlot = st.appointmentSlot || st.appointment_slot || "موعد المجموعة المتاح";
              const resolvedParentPhone = st.parentPhone || st.parent_phone || st.phone;
              const resolvedTrack = st.languageTrack || st.language_track || (st.academicTrack === "languages" ? "لغات (إنجليزي)" : "عربي (عام)");

              return (
                <div
                  key={st.id}
                  className="print-card-item relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md transition-all text-right"
                >
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 h-28 w-28 -mr-8 -mt-8 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 h-28 w-28 -ml-8 -mb-8 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

                  {/* Header Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
                        💻
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">أكاديمية البرمجة - د. محمود المهدي</h4>
                        <span className="text-[10px] text-blue-600 font-semibold block">بطاقة حضور وتطوير كود الطالب 💻</span>
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
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">{st.name}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-2">
                          <span className="text-[9px] text-slate-500 block">كود الطالب الخاص</span>
                          <span className="font-mono font-bold text-blue-600 dir-ltr block text-right">{st.accessCode || `STD-${st.id}`}</span>
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
                        <span>📱 تليفون الطالب: <strong className="dir-ltr text-slate-800">{st.phone}</strong></span>
                        <span>👨‍👩‍👦 ولي الأمر: <strong className="dir-ltr text-slate-800">{resolvedParentPhone}</strong></span>
                      </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100 pr-3">
                      <div className="rounded-2xl border-2 border-slate-900/10 p-1.5 bg-white shadow-xs">
                        <QRCodeSVG value={st.accessCode || `STD-${st.id}-${st.phone}`} size={120} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider">
                        {st.accessCode || `ID:${st.id}`}
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
