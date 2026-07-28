import { useEffect, useState } from "react";

export const EGYPT_GOVERNORATES: Record<string, string[]> = {
  القاهرة: [
    "حلوان",
    "المعادي",
    "مصر الجديدة",
    "مدينة نصر",
    "وسط البلد",
    "شبرا",
    "التجمع الخامس",
    "الرحاب",
    "الشروق",
    "عين شمس",
    "المرج",
    "الزيتون",
    "العباسية",
  ],
  الجيزة: [
    "الدقي",
    "المهندسين",
    "الهرم",
    "فيصل",
    "6 أكتوبر",
    "الشيخ زايد",
    "العجوزة",
    "الوراق",
    "إمبابة",
    "البدرشين",
    "العياط",
    "أبو النمرس",
  ],
  الإسكندرية: [
    "سيدي بشر",
    "المنتزه",
    "سموحة",
    "الرمل",
    "العجمي",
    "السيوف",
    "محرم بك",
    "المنشية",
    "الشاطبي",
    "ميامي",
  ],
  القليوبية: [
    "بنها",
    "شبرا الخيمة",
    "قليوب",
    "الخانكة",
    "الخصوص",
    "طوخ",
    "قها",
    "شبين القناطر",
  ],
  المنوفية: [
    "شبين الكوم",
    "منوف",
    "السادات",
    "أشمون",
    "الباجور",
    "قويسنا",
    "تلا",
    "الشهداء",
  ],
  الغربية: [
    "طنطا",
    "المحلة الكبرى",
    "كفر الزيات",
    "زفتى",
    "السنطة",
    "بسيون",
    "سمنود",
    "قطور",
  ],
  الشرقية: [
    "الزقازيق",
    "العاشر من رمضان",
    "بلبيس",
    "منيا القمح",
    "أبو حماد",
    "فاقوس",
    "أبو كبير",
    "الحسينية",
    "كفر صقر",
  ],
  الدقهلية: [
    "المنصورة",
    "ميت غمر",
    "السنبلاوين",
    "دكرنس",
    "شربين",
    "المنزلة",
    "طلخا",
    "بلقاس",
    "جمصة",
  ],
  البحيرة: [
    "دمنهور",
    "كفر الدوار",
    "رشيد",
    "إدكو",
    "أبو المطامير",
    "أبو حمص",
    "الرحمانية",
    "إيتاي البارود",
    "حوش عيسى",
    "كوم حمادة",
  ],
  "كفر الشيخ": [
    "كفر الشيخ",
    "دسوق",
    "قلين",
    "سيدي سالم",
    "الرياض",
    "فوه",
    "مطوبس",
    "بيلا",
    "الحامول",
    "بلطيم",
  ],
  الفيوم: ["الفيوم", "سنورس", "طامية", "إطسا", "أبشواي", "يوسف الصديق"],
  "بني سويف": [
    "بني سويف",
    "الواسطى",
    "ناصر",
    "ببا",
    "الفشن",
    "سمسطا",
    "اهناسيا",
  ],
  المنيا: [
    "المنيا",
    "ملوي",
    "بني مزار",
    "مغاغة",
    "سمالوط",
    "أبو قرقاص",
    "دير مواس",
    "العدوة",
    "مطاي",
  ],
  أسيوط: [
    "أسيوط",
    "ديروط",
    "منفلوط",
    "القوصية",
    "أبنوب",
    "أبو تيج",
    "الغنايم",
    "ساحل سليم",
    "البداري",
    "صدفا",
  ],
  سوهاج: [
    "سوهاج",
    "طما",
    "طهطا",
    "المراغة",
    "جهينة",
    "ساقلتة",
    "أخميم",
    "المنشأة",
    "جرجا",
    "البلينا",
    "دار السلام",
  ],
  قنا: [
    "قنا",
    "نجع حمادي",
    "دشنا",
    "أبو تشت",
    "فرشوط",
    "قفط",
    "نقادة",
    "قوص",
    "الوقف",
  ],
  الأقصر: ["الأقصر", "القرنة", "أرمنت", "إسنا", "الطود", "البياضية"],
  أسوان: ["أسوان", "كوم أمبو", "إدفو", "نصر النوبة", "درو"],
  دمياط: ["دمياط", "دمياط الجديدة", "رأس البر", "فارسكور", "الزرقا", "كفر سعد"],
  بورسعيد: ["بورسعيد", "بورفؤاد"],
  السويس: ["السويس", "الأربعين", "الجناين", "عتاقة"],
  الإسماعيلية: [
    "الإسماعيلية",
    "التل الكبير",
    "فايد",
    "القنطرة شرق",
    "القنطرة غرب",
    "أبو صوير",
    "القصاصين",
  ],
  "البحر الأحمر": [
    "الغردقة",
    "سفاجا",
    "القصير",
    "مرسى علم",
    "شلاتين",
    "حلايب",
    "رأس غارب",
  ],
  "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"],
  مطروح: ["مرسى مطروح", "العلمين", "الضبعة", "سيدي براني", "السلوم", "سيوة"],
  "شمال سيناء": ["العريش", "الشيخ زويد", "رفح", "بئر العبد"],
  "جنوب سيناء": [
    "شرم الشيخ",
    "دهب",
    "نويبع",
    "طابا",
    "طور سيناء",
    "رأس سدر",
    "أبو زنيمة",
    "أبو رديس",
  ],
};

export function SearchableCombobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  isLight = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  isLight?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch(value || "");
    }
  }, [value, isOpen]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2 relative text-right w-full" dir="rtl">
      <label htmlFor={id} className={`block text-xs font-semibold ${isLight ? "text-[#334155]" : "text-[#E2E8F0]"}`}>
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </label>
      <input
        id={id}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        required={required}
        placeholder={placeholder}
        className={`h-[56px] w-full rounded-[12px] border px-4 text-right text-sm font-medium outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/12 shadow-xs ${
          isLight
            ? "border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white"
            : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#F8FAFC] placeholder-[#64748B] focus:bg-[#091426]"
        }`}
      />
      {isOpen && (filtered.length > 0 || search.trim() !== "") && (
        <ul className={`absolute z-50 w-full max-h-48 overflow-y-auto rounded-[14px] border shadow-lg mt-1 py-1 text-right ${
          isLight
            ? "border-[#CBD5E1] bg-white text-[#0F172A]"
            : "border-[rgba(148,163,184,0.25)] bg-[#101D31] text-[#F8FAFC]"
        }`}>
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-right text-sm transition-colors font-medium ${
                  isLight
                    ? "hover:bg-[#E8F1FF] text-[#0F172A]"
                    : "hover:bg-[rgba(59,130,246,0.15)] text-[#F8FAFC]"
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
          {search.trim() !== "" && !options.includes(search) && (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(search);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-right text-[#64748B] hover:bg-[#E8F1FF] dark:hover:bg-[rgba(59,130,246,0.15)] text-xs transition-colors"
              >
                استخدام: "{search}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
