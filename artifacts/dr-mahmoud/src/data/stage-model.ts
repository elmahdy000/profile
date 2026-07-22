/**
 * Normalized Educational Stage System Data Model
 */

export type EducationSystem = "baccalaureate" | "general_secondary" | "university";

export type Grade =
  | "first_secondary"
  | "second_secondary"
  | "third_secondary"
  | "university_year_1"
  | "university_year_2"
  | "university_year_3"
  | "university_year_4";

export type SchoolType = "arabic" | "languages";

export type Track = "general" | "engineering" | "business" | "computer_science";

export interface NormalizedStage {
  id: string; // e.g. "baccalaureate:first_secondary:arabic:general"
  system: EducationSystem;
  grade: Grade;
  schoolType?: SchoolType;
  track?: Track;
  label: string;
}

export const EDUCATION_SYSTEMS: { id: EducationSystem; label: string; eyebrow: string }[] = [
  { id: "baccalaureate", label: "البكالوريا", eyebrow: "منهج البرمجة والبكالوريا" },
  { id: "general_secondary", label: "الثانوية العامة", eyebrow: "المناهج العامة واللغات" },
  { id: "university", label: "المرحلة الجامعية", eyebrow: "الكليات والتخصصات الجامعية" },
];

export const SYSTEM_GRADES: Record<EducationSystem, { id: Grade; label: string }[]> = {
  baccalaureate: [
    { id: "first_secondary", label: "الصف الأول (أولى بكالوريا)" },
    { id: "second_secondary", label: "الصف الثاني (تانية بكالوريا)" },
    { id: "third_secondary", label: "الصف الثالث (ثالثة بكالوريا)" },
  ],
  general_secondary: [
    { id: "first_secondary", label: "الصف الأول الثانوي" },
    { id: "second_secondary", label: "الصف الثاني الثانوي" },
    { id: "third_secondary", label: "الصف الثالث الثانوي" },
  ],
  university: [
    { id: "university_year_1", label: "الفرقة الأولى / إعدادي" },
    { id: "university_year_2", label: "الفرقة الثانية" },
    { id: "university_year_3", label: "الفرقة الثالثة" },
    { id: "university_year_4", label: "الفرقة الرابعة" },
  ],
};

export const SCHOOL_TYPES: { id: SchoolType; label: string }[] = [
  { id: "arabic", label: "مدارس عربي" },
  { id: "languages", label: "مدارس لغات (Languages)" },
];

export const TRACKS: { id: Track; label: string; systemScope?: EducationSystem }[] = [
  { id: "general", label: "عام" },
  { id: "computer_science", label: "كلية حاسبات ومعلومات", systemScope: "university" },
  { id: "engineering", label: "كليات الهندسة", systemScope: "university" },
  { id: "business", label: "تجارة وإدارة أعمال", systemScope: "university" },
];

const SECONDARY_GRADES: Grade[] = [
  "first_secondary",
  "second_secondary",
  "third_secondary",
];

const UNIVERSITY_GRADES: Grade[] = [
  "university_year_1",
  "university_year_2",
  "university_year_3",
  "university_year_4",
];

/**
 * Creates canonical stage ID from components
 */
export function createStageId(params: {
  system: EducationSystem;
  grade: Grade;
  schoolType?: SchoolType;
  track?: Track;
}): string {
  const schoolTypePart = params.schoolType || "none";
  const trackPart = params.track || "general";
  return `${params.system}:${params.grade}:${schoolTypePart}:${trackPart}`;
}

/**
 * Generates formatted Arabic label for review & UI rendering
 */
export function formatStageLabel(params: {
  system: EducationSystem;
  grade: Grade;
  schoolType?: SchoolType;
  track?: Track;
}): string {
  const systemObj = EDUCATION_SYSTEMS.find((s) => s.id === params.system);
  const gradeObj = SYSTEM_GRADES[params.system]?.find((g) => g.id === params.grade);
  const schoolTypeObj = params.schoolType ? SCHOOL_TYPES.find((st) => st.id === params.schoolType) : null;
  const trackObj = params.track ? TRACKS.find((t) => t.id === params.track) : null;

  const parts = [
    systemObj?.label || "عام",
    gradeObj?.label || "",
    schoolTypeObj && params.system !== "university" ? schoolTypeObj.label : "",
    trackObj && trackObj.id !== "general" ? trackObj.label : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

/** Canonical labels stored in students.grade and content stage columns. */
export const CANONICAL_STAGE_GROUPS = {
  secondary: (["baccalaureate", "general_secondary"] as EducationSystem[])
    .flatMap((system) =>
      SECONDARY_GRADES.flatMap((grade) =>
        (["arabic", "languages"] as SchoolType[]).map((schoolType) =>
          formatStageLabel({ system, grade, schoolType, track: "general" }),
        ),
      ),
    ),
  computerScience: UNIVERSITY_GRADES.map((grade) =>
    formatStageLabel({ system: "university", grade, track: "computer_science" }),
  ),
  engineering: UNIVERSITY_GRADES.map((grade) =>
    formatStageLabel({ system: "university", grade, track: "engineering" }),
  ),
} as const;

export const CANONICAL_STAGE_LABELS = [
  ...CANONICAL_STAGE_GROUPS.secondary,
  ...CANONICAL_STAGE_GROUPS.computerScience,
  ...CANONICAL_STAGE_GROUPS.engineering,
];

/**
 * Parses and normalizes legacy stage display strings into normalized stage objects
 */
export function normalizeLegacyStage(legacyText?: string | null): NormalizedStage {
  if (!legacyText || legacyText.trim() === "" || legacyText.trim() === "عام") {
    return {
      id: "general_secondary:first_secondary:arabic:general",
      system: "general_secondary",
      grade: "first_secondary",
      schoolType: "arabic",
      track: "general",
      label: "عام لجميع الطلاب",
    };
  }

  const raw = legacyText.trim().toLowerCase();

  // University CS & Engineering checks
  if (raw.includes("حاسبات") || raw.includes("cs")) {
    let grade: Grade = "university_year_1";
    if (raw.includes("ثانية") || raw.includes("2")) grade = "university_year_2";
    if (raw.includes("ثالثة") || raw.includes("3")) grade = "university_year_3";
    if (raw.includes("رابعة") || raw.includes("4")) grade = "university_year_4";
    return {
      id: createStageId({ system: "university", grade, track: "computer_science" }),
      system: "university",
      grade,
      track: "computer_science",
      label: formatStageLabel({ system: "university", grade, track: "computer_science" }),
    };
  }

  if (raw.includes("هندسة") || raw.includes("engineering")) {
    let grade: Grade = "university_year_1";
    if (raw.includes("أولى") || raw.includes("1")) grade = "university_year_1";
    if (raw.includes("ثانية") || raw.includes("2")) grade = "university_year_2";
    if (raw.includes("ثالثة") || raw.includes("3")) grade = "university_year_3";
    if (raw.includes("رابعة") || raw.includes("4")) grade = "university_year_4";
    return {
      id: createStageId({ system: "university", grade, track: "engineering" }),
      system: "university",
      grade,
      track: "engineering",
      label: formatStageLabel({ system: "university", grade, track: "engineering" }),
    };
  }

  // Baccalaureate checks
  if (raw.includes("بكالوريا") || raw.includes("baccalaureate")) {
    let grade: Grade = "first_secondary";
    if (raw.includes("تانية") || raw.includes("ثانية") || raw.includes("2")) grade = "second_secondary";
    if (raw.includes("ثالثة") || raw.includes("3")) grade = "third_secondary";

    const schoolType: SchoolType = raw.includes("لغات") || raw.includes("language") ? "languages" : "arabic";
    return {
      id: createStageId({ system: "baccalaureate", grade, schoolType, track: "general" }),
      system: "baccalaureate",
      grade,
      schoolType,
      track: "general",
      label: formatStageLabel({ system: "baccalaureate", grade, schoolType, track: "general" }),
    };
  }

  // General secondary fallback
  let grade: Grade = "first_secondary";
  if (raw.includes("تانية") || raw.includes("ثانية") || raw.includes("2")) grade = "second_secondary";
  if (raw.includes("ثالثة") || raw.includes("3")) grade = "third_secondary";

  const schoolType: SchoolType = raw.includes("لغات") || raw.includes("language") ? "languages" : "arabic";
  return {
    id: createStageId({ system: "general_secondary", grade, schoolType, track: "general" }),
    system: "general_secondary",
    grade,
    schoolType,
    track: "general",
    label: formatStageLabel({ system: "general_secondary", grade, schoolType, track: "general" }),
  };
}
