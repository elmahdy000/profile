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

const SYSTEM_LABELS = {
  baccalaureate: "البكالوريا",
  general_secondary: "الثانوية العامة",
  university: "المرحلة الجامعية",
} as const;

const SECONDARY_GRADE_LABELS = {
  baccalaureate: {
    first_secondary: "الصف الأول (أولى بكالوريا)",
    second_secondary: "الصف الثاني (تانية بكالوريا)",
    third_secondary: "الصف الثالث (ثالثة بكالوريا)",
  },
  general_secondary: {
    first_secondary: "الصف الأول الثانوي",
    second_secondary: "الصف الثاني الثانوي",
    third_secondary: "الصف الثالث الثانوي",
  },
} as const;

const SCHOOL_TYPE_LABELS = {
  arabic: "مدارس عربي",
  languages: "مدارس لغات (Languages)",
} as const;

const UNIVERSITY_GRADE_LABELS = {
  university_year_1: "الفرقة الأولى / إعدادي",
  university_year_2: "الفرقة الثانية",
  university_year_3: "الفرقة الثالثة",
  university_year_4: "الفرقة الرابعة",
} as const;

const UNIVERSITY_TRACK_LABELS = {
  computer_science: "كلية حاسبات ومعلومات",
  engineering: "كليات الهندسة",
} as const;

export function resolveAcademicStageSelection(body: Record<string, unknown>): string | null {
  const system = String(body.educationSystem ?? "");
  const grade = String(body.educationGrade ?? "");
  const schoolType = String(body.schoolType ?? "");
  const track = String(body.academicTrack ?? "");

  if (system === "university") {
    const gradeLabel = UNIVERSITY_GRADE_LABELS[grade as keyof typeof UNIVERSITY_GRADE_LABELS];
    const trackLabel = UNIVERSITY_TRACK_LABELS[track as keyof typeof UNIVERSITY_TRACK_LABELS];
    if (!gradeLabel || !trackLabel || (schoolType && schoolType !== "none")) return null;
    return `${SYSTEM_LABELS.university} · ${gradeLabel} · ${trackLabel}`;
  }

  if (system !== "baccalaureate" && system !== "general_secondary") return null;
  const gradeLabel = SECONDARY_GRADE_LABELS[system][grade as keyof typeof SECONDARY_GRADE_LABELS[typeof system]];
  const schoolTypeLabel = SCHOOL_TYPE_LABELS[schoolType as keyof typeof SCHOOL_TYPE_LABELS];
  if (!gradeLabel || !schoolTypeLabel || track !== "general") return null;
  return `${SYSTEM_LABELS[system]} · ${gradeLabel} · ${schoolTypeLabel}`;
}
