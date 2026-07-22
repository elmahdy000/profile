export type AcademicTrackId =
  | "baccalaureate"
  | "computer-science"
  | "engineering";

export type AcademicTrack = {
  id: AcademicTrackId;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  stages: string[];
  subjects: string[];
  image: string;
  imageAlt: string;
};

export const ACADEMIC_TRACKS: AcademicTrack[] = [
  {
    id: "baccalaureate",
    title: "البكالوريا والثانوية العامة",
    shortTitle: "الثانوي والبكالوريا",
    eyebrow: "أولى وثانية ثانوي — عام ولغات",
    description:
      "شرح من الصفر، حل تدريبات المنهج، ومراجعات واختبارات منظمة لكل سنة دراسية.",
    stages: [
      "أولى بكالوريا",
      "تانية بكالوريا",
      "ثالثة بكالوريا",
      "البكالوريا - الصف الأول",
      "البكالوريا - الصف الثاني",
      "البكالوريا - الصف الثالث",
      "بكالوريا - أولى ثانوي - عام",
      "بكالوريا - أولى ثانوي - لغات",
      "بكالوريا - ثانية ثانوي - عام",
      "بكالوريا - ثانية ثانوي - لغات",
      "ثانوية عامة - أولى ثانوي",
      "ثانوية عامة - ثانية ثانوي",
      "ثانوية عامة - ثالثة ثانوي",
      "أولى ثانوي",
      "تانية ثانوي",
      "ثالثة ثانوي",
    ],
    subjects: ["Python", "Logic", "ToFAS", "Problem Solving"],
    image: "/baccalaureate-hero.png",
    imageAlt: "طالب يدرس منهج البرمجة والبكالوريا",
  },
  {
    id: "computer-science",
    title: "كلية حاسبات ومعلومات",
    shortTitle: "حاسبات ومعلومات",
    eyebrow: "من أولى لرابعة جامعة",
    description:
      "مواد الكلية مرتبة حسب الفرقة: برمجة، OOP، هياكل بيانات، خوارزميات، قواعد بيانات وأنظمة تشغيل.",
    stages: [
      "حاسبات - الفرقة الأولى",
      "حاسبات - الفرقة الثانية",
      "حاسبات - الفرقة الثالثة",
      "حاسبات - الفرقة الرابعة",
    ],
    subjects: ["C++", "OOP", "Data Structures", "Algorithms", "Database"],
    image: "/university-cs-path.png",
    imageAlt: "طالب في كلية حاسبات ومعلومات يدرس البرمجة",
  },
  {
    id: "engineering",
    title: "كليات الهندسة",
    shortTitle: "هندسة",
    eyebrow: "إعدادي وتخصصات الحاسب",
    description:
      "برمجة ومواد حاسب لطلاب هندسة، من الإعدادي حتى الفرق المتقدمة، بشرح عملي ومسائل امتحانات.",
    stages: [
      "هندسة - إعدادي",
      "هندسة - الفرقة الأولى",
      "هندسة - الفرقة الثانية",
      "هندسة - الفرقة الثالثة",
      "هندسة - الفرقة الرابعة",
    ],
    subjects: ["C Programming", "C++", "Digital Logic", "Algorithms", "Embedded"],
    image: "/web-development-path.png",
    imageAlt: "طالب هندسة يدرس البرمجة ومواد الحاسب",
  },
];

const LEGACY_TRACK_ALIASES: Record<string, AcademicTrackId> = {
  university: "computer-science",
  db: "computer-science",
  python: "baccalaureate",
};

export const GENERAL_STAGE = "عام";

export function resolveTrackId(value?: string | null): AcademicTrackId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const direct = ACADEMIC_TRACKS.find((track) => track.id === normalized);
  if (direct) return direct.id;
  return LEGACY_TRACK_ALIASES[normalized] ?? null;
}

export function getTrack(value?: string | null) {
  const id = resolveTrackId(value);
  return ACADEMIC_TRACKS.find((track) => track.id === id) ?? null;
}

export function getStagesForTrack(value?: string | null): string[] {
  return [...(getTrack(value)?.stages ?? ACADEMIC_TRACKS.flatMap((track) => track.stages)), GENERAL_STAGE];
}

export function getTrackForStage(stage?: string | null) {
  if (!stage) return ACADEMIC_TRACKS[0];
  const normalized = stage.trim().toLowerCase();

  const exactMatch = ACADEMIC_TRACKS.find((track) =>
    track.stages.some((s) => s.trim().toLowerCase() === normalized)
  );
  if (exactMatch) return exactMatch;

  if (
    normalized.includes("بكالوريا") ||
    normalized.includes("ثانوي") ||
    normalized.includes("ثانوية") ||
    normalized.includes("baccalaureate") ||
    normalized.includes("python")
  ) {
    return ACADEMIC_TRACKS.find((track) => track.id === "baccalaureate") ?? ACADEMIC_TRACKS[0];
  }

  if (
    normalized.includes("حاسبات") ||
    normalized.includes("جامعة") ||
    normalized.includes("جامعي") ||
    normalized.includes("cs") ||
    normalized.includes("computer")
  ) {
    return ACADEMIC_TRACKS.find((track) => track.id === "computer-science") ?? ACADEMIC_TRACKS[0];
  }

  if (normalized.includes("هندسة") || normalized.includes("engineering")) {
    return ACADEMIC_TRACKS.find((track) => track.id === "engineering") ?? ACADEMIC_TRACKS[0];
  }

  return ACADEMIC_TRACKS[0];
}
