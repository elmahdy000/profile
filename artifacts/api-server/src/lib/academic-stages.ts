const SECONDARY_GRADES = [
  ["الصف الأول (أولى بكالوريا)", "الصف الأول الثانوي"],
  ["الصف الثاني (تانية بكالوريا)", "الصف الثاني الثانوي"],
  ["الصف الثالث (ثالثة بكالوريا)", "الصف الثالث الثانوي"],
] as const;

const SCHOOL_TYPES = ["مدارس عربي", "مدارس لغات (Languages)"] as const;
const UNIVERSITY_GRADES = [
  "الفرقة الأولى / إعدادي",
  "الفرقة الثانية",
  "الفرقة الثالثة",
  "الفرقة الرابعة",
] as const;

export const CANONICAL_ACADEMIC_STAGES = [
  ...SECONDARY_GRADES.flatMap(([baccalaureate, generalSecondary]) =>
    SCHOOL_TYPES.flatMap((schoolType) => [
      `البكالوريا · ${baccalaureate} · ${schoolType}`,
      `الثانوية العامة · ${generalSecondary} · ${schoolType}`,
    ]),
  ),
  ...UNIVERSITY_GRADES.map(
    (grade) => `المرحلة الجامعية · ${grade} · كلية حاسبات ومعلومات`,
  ),
  ...UNIVERSITY_GRADES.map(
    (grade) => `المرحلة الجامعية · ${grade} · كليات الهندسة`,
  ),
] as const;

const LEGACY_ACADEMIC_STAGES = [
  "أولى بكالوريا",
  "تانية بكالوريا",
  "جامعة",
  "عام",
  "بكالوريا - أولى ثانوي - عام",
  "بكالوريا - أولى ثانوي - لغات",
  "بكالوريا - ثانية ثانوي - عام",
  "بكالوريا - ثانية ثانوي - لغات",
  "ثانوية عامة - أولى ثانوي - عام",
  "ثانوية عامة - أولى ثانوي - لغات",
  "ثانوية عامة - ثانية ثانوي - عام",
  "ثانوية عامة - ثانية ثانوي - لغات",
  "حاسبات - الفرقة الأولى",
  "حاسبات - الفرقة الثانية",
  "حاسبات - الفرقة الثالثة",
  "حاسبات - الفرقة الرابعة",
  "هندسة - إعدادي",
  "هندسة - الفرقة الأولى",
  "هندسة - الفرقة الثانية",
  "هندسة - الفرقة الثالثة",
  "هندسة - الفرقة الرابعة",
] as const;

const acceptedStages = new Set<string>([
  ...CANONICAL_ACADEMIC_STAGES,
  ...LEGACY_ACADEMIC_STAGES,
]);

export function isAcceptedAcademicStage(value: string): boolean {
  return acceptedStages.has(value.trim());
}
