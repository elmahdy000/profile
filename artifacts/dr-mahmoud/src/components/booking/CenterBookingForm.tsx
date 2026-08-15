import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CenterSlotOption {
  centerId: string;
  centerName: string;
  area: string;
  slots: {
    grade: "1st_bac" | "2nd_bac" | "both";
    days: string;
    time: string;
  }[];
}

export const CENTER_APPOINTMENT_SCHEDULES: CenterSlotOption[] = [
  {
    centerId: "zag-academy",
    centerName: "سنتر زاج أكاديمي (Zag Academy)",
    area: "منطقة الفلل - الزقازيق",
    slots: [
      { grade: "both", days: "سبت - اتنين - أربع", time: "5:00 مساءً" },
      { grade: "1st_bac", days: "سبت - اتنين - أربع", time: "3:30 عصراً" },
      { grade: "2nd_bac", days: "سبت - اتنين - أربع", time: "6:30 مساءً" },
    ],
  },
  {
    centerId: "eduverse",
    centerName: "سنتر إديوفيرس (EduVerse)",
    area: "منطقة الفلل - الزقازيق",
    slots: [
      { grade: "both", days: "سبت - اتنين - أربع", time: "3:30 عصراً" },
      { grade: "2nd_bac", days: "سبت - اتنين - أربع", time: "5:00 مساءً" },
    ],
  },
  {
    centerId: "hassan-somida",
    centerName: "سنتر حسن صميدة",
    area: "منطقة الحناوي - الزقازيق",
    slots: [
      { grade: "1st_bac", days: "حد - تلات - خميس", time: "5:00 مساءً" },
      { grade: "2nd_bac", days: "حد - تلات - خميس", time: "6:30 مساءً" },
      { grade: "both", days: "حد - تلات - خميس", time: "4:00 عصراً" },
    ],
  },
  {
    centerId: "noreen",
    centerName: "سنتر نورين",
    area: "مباشر - الزقازيق",
    slots: [
      { grade: "1st_bac", days: "حد - تلات - خميس", time: "5:00 مساءً" },
      { grade: "2nd_bac", days: "حد - تلات - خميس", time: "6:30 مساءً" },
    ],
  },
];

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
  const [grade, setGrade] = useState<"أولى بكالوريا" | "تانية بكالوريا">("أولى بكالوريا");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [languageTrack, setLanguageTrack] = useState<"عربي" | "لغات">("عربي");
  const [selectedCenter, setSelectedCenter] = useState<string>("سنتر زاج أكاديمي (Zag Academy)");
  const [selectedSlot, setSelectedSlot] = useState<string>("سبت - اتنين - أربع — 5:00 مساءً");

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
    accessCode?: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Available slots dynamically filtered based on selected Center & Grade
  const currentCenterSchedule = CENTER_APPOINTMENT_SCHEDULES.find((c) => c.centerName === selectedCenter);

  const availableSlotOptions = React.useMemo(() => {
    if (!currentCenterSchedule) return ["سبت - اتنين - أربع — 5:00 مساءً"];
    const gradeKey = grade === "أولى بكالوريا" ? "1st_bac" : "2nd_bac";
    const matching = currentCenterSchedule.slots.filter(
      (s) => s.grade === gradeKey || s.grade === "both"
    );
    if (matching.length === 0) return currentCenterSchedule.slots.map((s) => `${s.days} — ${s.time}`);
    return matching.map((s) => `${s.days} — ${s.time}`);
  }, [currentCenterSchedule, grade]);

  // Handle slot auto selection on center or grade change
  React.useEffect(() => {
    if (availableSlotOptions.length > 0 && !availableSlotOptions.includes(selectedSlot)) {
      setSelectedSlot(availableSlotOptions[0]);
    }
  }, [availableSlotOptions, selectedSlot]);

  const validateStep1 = () => {
    if (!studentName.trim() || studentName.trim().length < 3) {
      setError("يرجى كتابة اسم الطالب رباعي بشكل صحيح");
      return false;
    }
    if (!schoolName.trim()) {
      setError("يرجى كتابة اسم المدرسة الحالية للطالب");
      return false;
    }
    const cleanStudentPhone = studentPhone.replace(/\s+/g, "");
    if (!/^(?:01[0125]\d{8}|\+?\d{10,15})$/.test(cleanStudentPhone)) {
      setError("يرجى إدخال رقم تليفون الطالب بشكل صحيح (11 رقم)");
      return false;
    }
    const cleanParentPhone = parentPhone.replace(/\s+/g, "");
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

    setLoading(true);
    setError("");

    const payload = {
      name: studentName.trim(),
      schoolName: schoolName.trim(),
      grade: grade,
      educationSystem: "baccalaureate",
      educationGrade: grade === "أولى بكالوريا" ? "1st_bac" : "2nd_bac",
      schoolType: schoolName.trim(),
      academicTrack: languageTrack === "لغات" ? "languages" : "arabic",
      phone: studentPhone.replace(/\s+/g, ""),
      parentPhone: parentPhone.replace(/\s+/g, ""),
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

      const successData = {
        studentName: studentName.trim(),
        schoolName: schoolName.trim(),
        grade,
        languageTrack,
        studentPhone: studentPhone.trim(),
        parentPhone: parentPhone.trim(),
        centerName: selectedCenter,
        appointmentSlot: selectedSlot,
        accessCode: result.accessCode || "BD-" + Math.floor(100000 + Math.random() * 900000),
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGrade("أولى بكالوريا")}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      grade === "أولى بكالوريا"
                        ? "border-[#1677FF] bg-[#1677FF]/15 ring-2 ring-[#1677FF]/30"
                        : "border-[#26364D] bg-[#131E31] hover:border-[#3a5275]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#F8FAFC]">أولى بكالوريا</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#1677FF]/20 text-[#69A5FF]">1st Bac</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#A8B5C7]">الصف الثاني الثانوي (منهج التأسيس البرمجي)</p>
                  </button>

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

          {/* STEP 3: Center Choice & Available Appointment Schedule */}
          {formStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#1677FF]" />
                  اختر اسم السنتر الذي ترغب بالحجز فيه (الزقازيق) <span className="text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CENTER_APPOINTMENT_SCHEDULES.map((c) => (
                    <button
                      key={c.centerId}
                      type="button"
                      onClick={() => setSelectedCenter(c.centerName)}
                      className={`p-4 rounded-2xl border text-right transition-all space-y-1.5 ${
                        selectedCenter === c.centerName
                          ? "border-[#1677FF] bg-[#1677FF]/15 ring-2 ring-[#1677FF]/30"
                          : "border-[#26364D] bg-[#131E31] hover:border-[#3a5275]"
                      }`}
                    >
                      <h4 className="text-sm font-black text-[#F8FAFC]">{c.centerName}</h4>
                      <p className="text-xs font-bold text-[#69A5FF] flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.area}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#D8E2EF] mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  المواعيد المتاحة المُنَزَّلَة لـ ({grade}) <span className="text-rose-400">*</span>
                </label>

                <div className="space-y-2.5">
                  {availableSlotOptions.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
                        selectedSlot === slot
                          ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                          : "border-[#26364D] bg-[#131E31] hover:border-[#3a5275]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-sm font-black text-[#F8FAFC]">{slot}</span>
                      </div>
                      {selectedSlot === slot && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Summary Box */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <h4 className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> ملخص تأكيد الحجز والرسوم
                </h4>
                <div className="text-xs font-bold text-[#D8E2EF] space-y-1">
                  <p>• الطالب: <strong>{studentName}</strong> ({schoolName}) - {grade} ({languageTrack})</p>
                  <p>• السنتر والموعد: <strong>{selectedCenter}</strong> ({selectedSlot})</p>
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
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      تأكيد الحجز مجاناً وتأكيد الموعد <Check className="h-5 w-5" />
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> تم تسجيل الحجز بنجاح
                </span>
                <h3 className="text-2xl font-black text-white">تم الحجز بنجاح! 🎉</h3>
                <p className="text-base font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 p-3 rounded-2xl">
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

              {/* Student Access Code Card */}
              {bookingSuccessData.accessCode && (
                <div className="rounded-2xl border border-[#1677FF]/40 bg-[#1677FF]/15 p-4 space-y-2">
                  <span className="text-[11px] font-extrabold text-[#69A5FF]">كود الدخول الخاص بالطالب للمنصة:</span>
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
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setBookingSuccessData(null)}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30"
                >
                  موافق واغلاق النافذة
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
