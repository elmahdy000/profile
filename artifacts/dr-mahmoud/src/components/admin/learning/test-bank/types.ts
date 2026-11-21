export type AdminApiFn = <T>(url: string, options?: RequestInit) => Promise<T>;

export type Question = {
  id?: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string;
  points?: number;
  difficulty?: "easy" | "medium" | "hard";
  questionType?: "mcq" | "true_false" | "essay";
  isDuplicate?: boolean;
  isBankDuplicate?: boolean;
  isBatchDuplicate?: boolean;
  existingBankLocation?: string;
  stage?: string;
  unit?: string;
  lesson?: string;
};

export type LessonNode = {
  lesson: string;
  lessonId?: number | null;
  courseId?: number | null;
  totalQuestions: number;
  mcqCount?: number;
  tfCount?: number;
  totalEssays?: number;
  difficulty: { easy: number; medium: number; hard: number };
};

export type UnitNode = {
  unit: string;
  totalQuestions: number;
  mcqCount?: number;
  tfCount?: number;
  totalEssays?: number;
  difficulty: { easy: number; medium: number; hard: number };
  lessons: LessonNode[];
};

export type StageNode = {
  stage: string;
  totalQuestions: number;
  mcqCount?: number;
  tfCount?: number;
  totalEssays?: number;
  units: UnitNode[];
};

export type CourseSummary = {
  id: number;
  title: string;
  stages: string[];
};

export type VideoSummary = {
  id: number;
  title: string;
  courseId: number;
  stage?: string;
  quizId?: number | null;
};

export type TreeResponse = {
  tree: StageNode[];
  totalQuestions: number;
  courses: CourseSummary[];
  videos: VideoSummary[];
  stages?: string[];
};

export type UploadPreset = {
  stage: string;
  unit?: string;
  lesson?: string;
  scope?: "unit" | "lesson";
  courseId?: string;
  lessonId?: string;
  nonce: number;
};

export const isEnglishQuestion = (prompt?: string, options?: string[]): boolean => {
  const allText = ((prompt || "") + " " + (options || []).join(" ")).trim();
  const arabicMatches = allText.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = allText.match(/[a-zA-Z]/g) || [];
  return latinMatches.length > arabicMatches.length;
};

export const getOptionLabel = (index: number, isEnglish: boolean): string => {
  if (isEnglish) {
    return ["A", "B", "C", "D", "E", "F"][index] || String.fromCharCode(65 + index);
  }
  return ["أ", "ب", "ج", "د", "هـ", "و"][index] || String(index + 1);
};

export function parseUnitSortOrder(unitName: string): number {
  if (!unitName) return 999;
  const s = unitName.toLowerCase();
  if (/(\b1\b|الأولى|الاولى|unit\s*1|first)/i.test(s)) return 1;
  if (/(\b2\b|الثانية|التانية|unit\s*2|second)/i.test(s)) return 2;
  if (/(\b3\b|الثالثة|التالتة|unit\s*3|third)/i.test(s)) return 3;
  if (/(\b4\b|الرابعة|الرابعه|unit\s*4|fourth)/i.test(s)) return 4;
  if (/(\b5\b|الخامسة|الخامسه|unit\s*5|fifth)/i.test(s)) return 5;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10);
  return 99;
}

export function parseLessonSortOrder(lessonName: string): number {
  if (!lessonName) return 999;
  const s = lessonName.toLowerCase();
  const matchDash = s.match(/(\d+)\s*[-_.]\s*(\d+)/);
  if (matchDash) {
    return parseInt(matchDash[1], 10) * 100 + parseInt(matchDash[2], 10);
  }
  if (s.includes("شامل")) return 9999;
  if (/(\b1\b|الأول|الاول\b|first)/i.test(s)) return 10;
  if (/(\b2\b|الثاني|الثانى\b|second)/i.test(s)) return 20;
  if (/(\b3\b|الثالث\b|third)/i.test(s)) return 30;
  if (/(\b4\b|الرابع\b|fourth)/i.test(s)) return 40;
  if (/(\b5\b|الخامس\b|fifth)/i.test(s)) return 50;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10) * 10;
  return 100;
}
