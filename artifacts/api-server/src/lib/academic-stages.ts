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

export type AcademicStageDimensions = {
  system: "baccalaureate" | "general_secondary" | "university";
  grade: "first_secondary" | "second_secondary" | "third_secondary" | "university_year_1" | "university_year_2" | "university_year_3" | "university_year_4";
  schoolType?: "arabic" | "languages";
  track?: "general" | "computer_science" | "engineering";
};

export function getAcademicStageDimensions(value: string): AcademicStageDimensions | null {
  const stage = value.trim();
  const system = stage.startsWith("البكالوريا")
    ? "baccalaureate"
    : stage.startsWith("الثانوية العامة")
      ? "general_secondary"
      : stage.startsWith("المرحلة الجامعية")
        ? "university"
        : null;
  if (!system) return null;

  if (system === "university") {
    const grade = stage.includes("الفرقة الأولى")
      ? "university_year_1"
      : stage.includes("الفرقة الثانية")
        ? "university_year_2"
        : stage.includes("الفرقة الثالثة")
          ? "university_year_3"
          : stage.includes("الفرقة الرابعة")
            ? "university_year_4"
            : null;
    const track = stage.includes("حاسبات ومعلومات")
      ? "computer_science"
      : stage.includes("الهندسة")
        ? "engineering"
        : null;
    return grade && track ? { system, grade, track } : null;
  }

  const grade = stage.includes("الصف الأول")
    ? "first_secondary"
    : stage.includes("الصف الثاني")
      ? "second_secondary"
      : stage.includes("الصف الثالث")
        ? "third_secondary"
        : null;
  const schoolType = stage.includes("لغات")
    ? "languages"
    : stage.includes("عربي")
      ? "arabic"
      : null;
  return grade && schoolType
    ? { system, grade, schoolType, track: "general" }
    : null;
}

export function isAcademicStageAllowedForTrack(trackId: string, stage: string): boolean {
  const dimensions = getAcademicStageDimensions(stage);
  if (!dimensions) return false;
  if (trackId === "baccalaureate") return dimensions.system !== "university";
  if (trackId === "computer-science") return dimensions.system === "university" && dimensions.track === "computer_science";
  if (trackId === "engineering") return dimensions.system === "university" && dimensions.track === "engineering";
  return false;
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
