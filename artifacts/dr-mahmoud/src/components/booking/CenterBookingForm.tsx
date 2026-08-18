import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  School,
  Phone,
  BookOpen,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  CalendarDays,
  CreditCard,
  Building2,
  Award,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OfflineCenterItem } from "@/components/admin/settings/CentersTab";
import { defaultOfflineCenters } from "@/components/admin/settings/CentersTab";

export interface UnifiedCenterCard {
  id: string;
  centerName: string;
  location: string;
  days: string;
  time: string;
  gradeBadge: string;
  forGrade: "1st_bac" | "2nd_bac" | "both";
  slotText: string;
}

function offlineCenterToCards(items: OfflineCenterItem[]): UnifiedCenterCard[] {
  return items.map((c) => ({
    id: c.id,
    centerName: c.name,
    location: c.area ? `${c.area} - الزقازيق` : "الزقازيق",
    days: c.daysStr,
    time: c.timeStr,
    gradeBadge: c.grade || "تانية بكالوريا",
    forGrade: (() => {
      const grade = String(c.grade ?? "").trim().toLocaleLowerCase("ar");
      if (grade.includes("أولى") || grade.includes("اولى") || grade.includes("first")) return "1st_bac" as const;
      if (grade.includes("تانية") || grade.includes("ثانية") || grade.includes("second")) return "2nd_bac" as const;
      return "both" as const;
    })(),
    slotText: `${c.daysStr} (الساعة ${c.timeStr})`,
  }));
}

async function fetchCentersFromSettings(): Promise<UnifiedCenterCard[]> {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return offlineCenterToCards(defaultOfflineCenters);
    const data = await res.json();
    const raw = data?.["offline_centers_list"]?.value;
    if (!raw) return offlineCenterToCards(defaultOfflineCenters);
    const parsed: OfflineCenterItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return offlineCenterToCards(defaultOfflineCenters);
    return offlineCenterToCards(parsed);
  } catch {
    return offlineCenterToCards(defaultOfflineCenters);
  }
}

// Kept for backward compatibility with any code that imports UNIFIED_CENTER_CARDS directly.
export const UNIFIED_CENTER_CARDS: UnifiedCenterCard[] = offlineCenterToCards(defaultOfflineCenters);

interface CenterBookingFormProps {
  onSuccess?: (studentData: any) => void;
  className?: string;
}

export function CenterBookingForm({ onSuccess, className = "" }: CenterBookingFormProps) {
  const [formStep, setFormStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState<"أولى بكالوريا" | "تانية بكالوريا">("تانية بكالوريا");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [languageTrack, setLanguageTrack] = useState<"عربي" | "لغات">("عربي");
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Live centers fetched from settings (admin-editable via CentersTab)
  const [allCards, setAllCards] = useState<UnifiedCenterCard[]>(UNIFIED_CENTER_CARDS);
  useEffect(() => {
    fetchCentersFromSettings().then(setAllCards);
  }, []);

  // Success Confirmation Modal state
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    studentName: string;
    schoolName: string;
    grade: string;
    languageTrack: string;
    studentPhone: string;
    parentPhone: string;
    centerName: string;
    appointmentSlot: string;
    isNewStudent: boolean;
    accessCode?: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  const normalizePhone = (num: string) =>
    num
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
      .replace(/[^\d]/g, "");

  // Filter cards by selected grade; reset selection when grade changes
  const gradeKey: "1st_bac" | "2nd_bac" = grade === "أولى بكالوريا" ? "1st_bac" : "2nd_bac";
  const filteredCards = React.useMemo(() => {
    return allCards.filter(
      (c) => c.forGrade === gradeKey || c.forGrade === "both"
    );
  }, [allCards, gradeKey]);

  // Reset card selection whenever the grade changes
  React.useEffect(() => {
    setSelectedCenter("");
    setSelectedSlot("");
  }, [gradeKey]);

  const validateStep1 = () => {
    if (!studentName.trim() || studentName.trim().length < 3) {
      setError("يرجى كتابة اسم الطالب رباعي بشكل صحيح");
      return false;
    }
    if (!schoolName.trim()) {
      setError("يرجى كتابة اسم المدرسة الحالية للطالب");
      return false;
    }
    const cleanStudentPhone = normalizePhone(studentPhone);
    if (!/^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(cleanStudentPhone)) {
      setError("يرجى إدخال رقم تليفون الطالب بشكل صحيح (11 رقم)");
      return false;
    }
    const cleanParentPhone = normalizePhone(parentPhone);
    if (!/^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(cleanParentPhone)) {
      setError("يرجى إدخال رقم تليفون ولي الأمر بشكل صحيح (11 رقم)");
      return false;
    }
    setError("");
    return true;
  };

  const handleNextStep = () => {
    if (formStep === 1) {
      if (validateStep1()) setFormStep(2);
    } else if (formStep === 2) {
      setFormStep(3);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setFormStep(1);
      return;
    }
    if (!selectedCenter || !selectedSlot) {
      setError("يرجى اختيار السنتر والموعد المناسب");
      setFormStep(3);
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      name: studentName.trim(),
      schoolName: schoolName.trim(),
      grade: grade,
      phone: normalizePhone(studentPhone),
      parentPhone: normalizePhone(parentPhone),
      languageTrack: languageTrack,
      centerName: selectedCenter,
      appointmentSlot: selectedSlot,
      governorate: "الشرقية",
      city: "الزقازيق",
      learningMode: "offline",
    };

    try {
      const response = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "حدث خطأ أثناء حفظ التنسيق والتأكيد.");
      }

      const isNewStudent = result.isNewStudent !== false;
      const successData = {
        studentName: studentName.trim(),
        schoolName: schoolName.trim(),
        grade,
        languageTrack,
        studentPhone: studentPhone.trim(),
        parentPhone: parentPhone.trim(),
        centerName: selectedCenter,
        appointmentSlot: selectedSlot,
        isNewStudent,
        accessCode: result.accessCode ? result.accessCode : undefined,
      };

      setBookingSuccessData(successData);
      onSuccess?.(successData);
    } catch (err: any) {
      setError(err.message || "تعذر إكمال الحجز، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAccessCode = () => {
    if (bookingSuccessData?.accessCode) {
      navigator.clipboard.writeText(bookingSuccessData.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className={`relative w-full text-right dir-rtl font-sans ${className}`}>
      {/* Main Booking Card Container */}
      <div className="relative overflow-hidden rounded-3xl border border-[#1677FF]/35 bg-[#0B1424]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10 text-[#F8FAFC]">
        {/* Glow decorative accent circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1677FF]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

        {/* Form Header Badge & Title */}
        <div className="relative z-10 mb-6 text-center sm:mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1677FF]/40 bg-[#1677FF]/15 px-4 py-1.5 text-xs font-black text-[#69A5FF] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#4096FF]" />
            حجز سنتر البكالوريا (الزقازيق 2026)
          </span>
          <h2 className="mt-3 text-xl font-black text-[#F8FAFC] sm:text-3xl">
            استمارة حجز الحضور بالسنتر ودفع الرسوم
          </h2>
          <p className="mt-2 text-xs font-bold text-[#A8B5C7] sm:text-sm">
            سجل بياناتك ومدرستك واختر السنتر والموعد المناسب للحضور المباشر
          </p>

          {/* Price Header Highlight */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-2.5 shadow-md">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-black text-emerald-300 sm:text-sm">
              رسوم الحجز والدفع أول يوم في السنتر بإذن الله: <strong className="text-white text-base">500 جنيه</strong>
            </span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="relative z-10 mb-8 flex items-center justify-between gap-2 max-w-xl mx-auto border-b border-[#26364D] pb-5">
          {[
            { step: 1, label: "بيانات الطالب" },
            { step: 2, label: "المرحلة والشعبة" },
            { step: 3, label: "السنتر والموعد" },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                if (item.step < formStep || validateStep1()) setFormStep(item.step);
              }}
              className={`flex-1 flex flex-col items-center gap-1.5 text-xs font-black transition-all ${
                formStep === item.step
                  ? "text-[#69A5FF]"
                  : formStep > item.step
                  ? "text-emerald-400"
                  : "text-[#64748B]"
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black border transition-all ${
                  formStep === item.step
                    ? "border-[#1677FF] bg-[#1677FF] text-white shadow-lg shadow-[#1677FF]/30"
                    : formStep > item.step
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-[#26364D] bg-[#131E31] text-[#64748B]"
                }`}
              >
                {formStep > item.step ? <Check className="h-4 w-4" /> : item.step}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Error Alert Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-center text-xs font-black text-rose-300"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Booking Form Body */}
        <form onSubmit={handleSubmitBooking} className="relative z-10 space-y-6">
          {/* STEP 1: Student Information */}
          {formStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1677FF]" />
                  اسم الطالب رباعي بالكامل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي السيد"
                  className="h-12 w-full rounded-2xl border border-[#26364D] bg-[#131E31] px-4 text-sm font-bold text-[#F8FAFC] placeholder-[#64748B] focus:border-[#1677FF] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-2 flex items-center gap-2">
                  <School className="h-4 w-4 text-[#1677FF]" />
                  اسم المدرسة الحالية <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="مثال: مدرسة الزقازيق الثانوية للبنين / الأورمان لغات"
                  className="h-12 w-full rounded-2xl border border-[#26364D] bg-[#131E31] px-4 text-sm font-bold text-[#F8FAFC] placeholder-[#64748B] focus:border-[#1677FF] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-[#D8E2EF] mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#1677FF]" />
                    رقم تليفون الطالب (واتساب) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="01012345678"
                    className="h-12 w-full rounded-2xl border border-[#26364D] bg-[#131E31] px-4 text-sm font-bold text-[#F8FAFC] placeholder-[#64748B] text-right focus:border-[#1677FF] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#D8E2EF] mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    تليفون ولي الأمر <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="01112345678"
                    className="h-12 w-full rounded-2xl border border-[#26364D] bg-[#131E31] px-4 text-sm font-bold text-[#F8FAFC] placeholder-[#64748B] text-right focus:border-[#1677FF] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 rounded-2xl bg-[#1677FF] hover:bg-[#1267DB] text-white font-black text-sm shadow-lg shadow-[#1677FF]/25 flex items-center justify-center gap-2"
                >
                  التالي: اختيار المرحلة والشعبة <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Grade & Language Track Selection */}
          {formStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#1677FF]" />
                  اختر المرحلة الدراسية <span className="text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setGrade("تانية بكالوريا")}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      grade === "تانية بكالوريا"
                        ? "border-[#1677FF] bg-[#1677FF]/15 ring-2 ring-[#1677FF]/30"
                        : "border-[#26364D] bg-[#131E31] hover:border-[#3a5275]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#F8FAFC]">تانية بكالوريا</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#1677FF]/20 text-[#69A5FF]">2nd Bac</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#A8B5C7]">الصف الثالث الثانوي (المشاريع والامتحانات النهائي)</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#1677FF]" />
                  اختر الشعبة والمسار التعليمي <span className="text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLanguageTrack("عربي")}
                    className={`p-4 rounded-2xl border text-center font-black text-sm transition-all ${
                      languageTrack === "عربي"
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-500/30"
                        : "border-[#26364D] bg-[#131E31] text-[#A8B5C7] hover:border-[#3a5275]"
                    }`}
                  >
                    شعبة عربي 🇪🇬
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguageTrack("لغات")}
                    className={`p-4 rounded-2xl border text-center font-black text-sm transition-all ${
                      languageTrack === "لغات"
                        ? "border-purple-500 bg-purple-500/15 text-purple-300 ring-2 ring-purple-500/30"
                        : "border-[#26364D] bg-[#131E31] text-[#A8B5C7] hover:border-[#3a5275]"
                    }`}
                  >
                    شعبة لغات (English / Fr) 🇬🇧
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormStep(1)}
                  className="h-12 border-[#26364D] bg-[#131E31] text-xs font-bold text-[#F8FAFC] px-5 rounded-2xl"
                >
                  سابق
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 rounded-2xl bg-[#1677FF] hover:bg-[#1267DB] text-white font-black text-sm shadow-lg shadow-[#1677FF]/25 flex items-center justify-center gap-2"
                >
                  التالي: اختيار السنتر والموعد <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Unified Center + Schedule Cards */}
          {formStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <label className="block text-xs sm:text-sm font-black text-[#D8E2EF] flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-[#1677FF]" />
                    اختر كارت الموعد والسنتر المناسب لك <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 self-start sm:self-auto">
                    المرحلة: {grade} ({languageTrack})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCards.length === 0 ? (
                    <div className="col-span-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                      <p className="text-sm font-black text-amber-300">
                        حجز السناتر لأولى بكالوريا سيُفتح قريباً بإذن الله
                      </p>
                      <p className="text-xs font-bold text-amber-200/70">
                        تابعنا على صفحة د. محمود للإعلان عن المواعيد
                      </p>
                    </div>
                  ) : filteredCards.map((card) => {
                    const isSelected = selectedCenter === card.centerName && selectedSlot === card.slotText;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setSelectedCenter(card.centerName);
                          setSelectedSlot(card.slotText);
                        }}
                        className={`relative p-5 rounded-2xl border text-right transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer group ${
                          isSelected
                            ? "border-emerald-500 bg-[#102924] ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10"
                            : "border-[#26364D] bg-[#131E31] hover:border-[#3a5275] hover:bg-[#18263e]"
                        }`}
                      >
                        {/* Card Header Badges */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#26364D] pb-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                            isSelected ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-[#1677FF]/15 border-[#1677FF]/30 text-[#69A5FF]"
                          }`}>
                            {card.gradeBadge}
                          </span>
                          <span className="text-[11px] font-bold text-[#8492A6] flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            {card.location}
                          </span>
                        </div>

                        {/* Center Name & Time Details */}
                        <div className="space-y-3">
                          <h4 className="text-base font-black text-[#F8FAFC] group-hover:text-emerald-300 transition-colors">
                            {card.centerName}
                          </h4>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-[#26364D] bg-[#0B1424] p-2.5 space-y-1">
                              <span className="text-[10px] font-bold text-[#8492A6] flex items-center gap-1">
                                <CalendarDays className="h-3 w-3 text-amber-400" /> الأيام:
                              </span>
                              <strong className="block text-xs font-black text-white">{card.days}</strong>
                            </div>

                            <div className="rounded-xl border border-[#26364D] bg-[#0B1424] p-2.5 space-y-1">
                              <span className="text-[10px] font-bold text-[#8492A6] flex items-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-400" /> الميعاد:
                              </span>
                              <strong className="block text-xs font-black text-emerald-400">{card.time}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        <div className="pt-1 flex items-center justify-between text-xs font-black">
                          <span className={isSelected ? "text-emerald-400 flex items-center gap-1" : "text-[#8492A6]"}>
                            {isSelected ? "تم اختيار هذا الموعد والسنتر ✓" : "اضغط لاختيار هذا الموعد"}
                          </span>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking Summary Box */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <h4 className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> ملخص تأكيد الحجز والرسوم
                </h4>
                <div className="text-xs font-bold text-[#D8E2EF] space-y-1">
                  <p>• الطالب: <strong>{studentName}</strong> ({schoolName}) - {grade} ({languageTrack})</p>
                  <p>• السنتر والموعد: <strong className="text-emerald-300">{selectedCenter}</strong> ({selectedSlot})</p>
                  <p className="text-emerald-400 pt-1">
                    • مبلغ الرسوم: <strong className="text-white font-black text-sm">500 جنيه</strong> (يتم السداد بالسنتر في أول يوم حضور)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormStep(2)}
                  className="h-12 border-[#26364D] bg-[#131E31] text-xs font-bold text-[#F8FAFC] px-5 rounded-2xl"
                >
                  سابق
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !selectedCenter || !selectedSlot}
                  className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      تأكيد الحجز وتثبيت الموعد بالسنتر <Check className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </div>

      {/* POPUP CONFIRMATION MODAL ON SUCCESS */}
      <AnimatePresence>
        {bookingSuccessData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setBookingSuccessData(null)}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-3xl border border-emerald-500/50 bg-[#0B1424] p-6 sm:p-8 text-center text-[#F8FAFC] shadow-2xl space-y-5 overflow-hidden"
            >
              {/* Confetti Glow Header */}
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/20">
                <Sparkles className="h-10 w-10 animate-bounce" />
              </div>

              {/* Success Message Header */}
              <div className="space-y-2">
                {bookingSuccessData.isNewStudent ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> تم الحجز واشترك في المنصة لمتابعة الدروس
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">تم الحجز واشترك في المنصة لمتابعة الدروس</h3>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-400" /> رقم الهاتف مسجل مسبقاً بالسنتر
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">لقد قمت بالحجز مسبقاً في السنتر</h3>
                  </>
                )}
                <p className="text-sm sm:text-base font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 p-3 rounded-2xl">
                  والدفع أول يوم في السنتر بإذن الله ... 500 جنيه
                </p>
              </div>

              {/* Booking Summary Breakdown */}
              <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-4 text-right text-xs font-bold text-[#D8E2EF] space-y-2">
                <div className="flex justify-between border-b border-[#26364D] pb-2">
                  <span className="text-[#8492A6]">اسم الطالب:</span>
                  <span className="text-white font-black">{bookingSuccessData.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-[#26364D] pb-2">
                  <span className="text-[#8492A6]">المدرسة والشعبة:</span>
                  <span className="text-white">{bookingSuccessData.schoolName} ({bookingSuccessData.languageTrack})</span>
                </div>
                <div className="flex justify-between border-b border-[#26364D] pb-2">
                  <span className="text-[#8492A6]">المرحلة:</span>
                  <span className="text-[#69A5FF] font-black">{bookingSuccessData.grade}</span>
                </div>
                <div className="flex justify-between border-b border-[#26364D] pb-2">
                  <span className="text-[#8492A6]">السنتر المختار:</span>
                  <span className="text-emerald-300 font-black">{bookingSuccessData.centerName}</span>
                </div>
                <div className="flex justify-between border-b border-[#26364D] pb-2">
                  <span className="text-[#8492A6]">الموعد المحدد:</span>
                  <span className="text-emerald-300 font-black">{bookingSuccessData.appointmentSlot}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#8492A6]">تليفون ولي الأمر:</span>
                  <span className="text-amber-300 dir-ltr">{bookingSuccessData.parentPhone}</span>
                </div>
              </div>

              {/* Student Access Code Card (For NEW & Existing Students) */}
              {bookingSuccessData.accessCode ? (
                <div className="rounded-2xl border border-[#1677FF]/40 bg-[#1677FF]/15 p-4 space-y-2">
                  <span className="text-[11px] font-extrabold text-[#69A5FF]">
                    {bookingSuccessData.isNewStudent
                      ? "كود الدخول الخاص بالطالب لمتابعة الدروس على المنصة:"
                      : "كود الدخول الخاص بحسابك المسجل مسبقاً لمتابعة الدروس:"}
                  </span>
                  <div className="flex items-center justify-between gap-3 bg-[#0B1424] p-3 rounded-xl border border-[#1677FF]/30">
                    <span className="font-mono text-lg font-black text-[#4096FF] dir-ltr">
                      {bookingSuccessData.accessCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAccessCode}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677FF] px-3 py-1.5 text-xs font-black text-white hover:bg-[#1267DB]"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? "تم النسخ" : "نسخ الكود"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 p-4 text-xs font-bold text-amber-200 leading-relaxed text-right space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-sm text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    تنبيه: لقد قمت بالحجز مسبقاً بالسنتر بهذا الرقم!
                  </div>
                  <p className="text-amber-100">
                    تم تحديث الموعد والسنتر المختار بنجاح. يمكنك استخدام كود الدخول الخاص بك السابق للمتابعة على المنصة.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setBookingSuccessData(null);
                    window.location.href = "/";
                  }}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  تم الحجز واشترك في المنصة - العودة للصفحة الرئيسية
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
