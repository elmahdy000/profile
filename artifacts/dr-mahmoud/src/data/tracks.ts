export interface Track {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: "Baby" | "GraduationCap" | "BookMarked" | "Rocket";
  categories: string[];
  level: string;
  accent: "primary" | "secondary";
}

export const tracks: Track[] = [
  {
    slug: "beginners",
    title: "التأسيس والبداية الصحيحة",
    subtitle: "مسار المبتدئين",
    description:
      "ابدأ من الصفر تماماً: أساسيات البرمجة، التفكير المنطقي وحل المشكلات قبل ما تكتب أول سطر كود.",
    icon: "Rocket",
    categories: ["برمجة للمبتدئين"],
    level: "مبتدئ",
    accent: "primary",
  },
  {
    slug: "university",
    title: "برمجة الجامعات ومطوري النظم",
    subtitle: "مسار الجامعة",
    description:
      "المسار الأقوى لطلاب حاسبات ومعلومات وهندسة: C++، هياكل البيانات والخوارزميات بالكامل.",
    icon: "GraduationCap",
    categories: [
      "سي بلس بلس C++",
      "هياكل البيانات Data Structures",
      "الخوارزميات Algorithms",
    ],
    level: "متوسط",
    accent: "primary",
  },
  {
    slug: "secondary",
    title: "بكالوريا وثانوية عامة",
    subtitle: "مسار المدارس",
    description:
      "تأسيس دراسي متين لطلاب الثانوية العامة وبكالوريا STEM في البرمجة وعلوم الحاسب.",
    icon: "BookMarked",
    categories: ["برمجة ثانوية عامة"],
    level: "متقدم",
    accent: "secondary",
  },
  {
    slug: "kids",
    title: "برمجة الأطفال والناشئين",
    subtitle: "مسار الأطفال",
    description:
      "Scratch للأطفال الصغار و Python مبسط للأكبر — أسلوب تفاعلي ممتع بمشاريع حقيقية.",
    icon: "Baby",
    categories: ["kids", "أطفال"],
    level: "مبتدئ",
    accent: "secondary",
  },
];

export function getTrackBySlug(slug: string): Track | undefined {
  return tracks.find((t) => t.slug === slug);
}
