export interface KholasaKeyConcept {
  title: string;
  description: string;
  translation?: string;
  tag?: string;
}

export interface KholasaDefinition {
  term: string;
  meaning?: string;
  definition?: string;
  translation?: string;
  example?: string;
}

export interface KholasaFormula {
  title: string;
  formula: string;
  note?: string;
}

export interface KholasaComparison {
  title: string;
  headers?: string[];
  rows?: string[][];
  points?: Array<{ label: string; a: string; b: string }>;
}

export interface KholasaExamTip {
  title?: string;
  tip: string;
}

export interface KholasaCommonMistake {
  mistake: string;
  correction: string;
  why?: string;
}

export interface KholasaSummaryData {
  keyConcepts?: KholasaKeyConcept[];
  definitions?: KholasaDefinition[];
  formulas?: KholasaFormula[];
  comparisons?: KholasaComparison[];
  examTips?: KholasaExamTip[];
  commonMistakes?: KholasaCommonMistake[];
  checklist?: Array<{ id?: string; text: string } | string>;
}

export interface KholasaStructuredSection {
  id: string;
  title: string;
  order: number;
  body: string;
  codeExample?: string;
  keyTakeaway?: string;
}

export interface KholasaFlashcard {
  id: string;
  front: string;
  back: string;
  translation?: string;
  tag?: string;
}

export interface KholasaMaterial {
  id: number;
  videoId: number | null;
  courseId: number | null;
  stage: string;
  stages: string[];
  unit: string;
  lesson: string;
  lessonOrder: number;
  durationMinutes: number;
  objectives: string[];
  summaryData: KholasaSummaryData;
  mindmapTitle: string | null;
  mindmapImages: string[];
  structuredSections: KholasaStructuredSection[];
  flashcards: KholasaFlashcard[];
  audioUrl: string | null;
  pdfUrl: string | null;
  isPublished: boolean;
  isBookmarked?: boolean;
  video?: {
    id: number;
    title: string;
    durationText?: string | null;
    thumbnailUrl?: string | null;
  } | null;
  questionCounts?: {
    mcq: number;
    trueFalse: number;
    essay: number;
  };
  quizzesCount?: number;
}

export interface MistakeQuestionSnapshot {
  prompt: string;
  options: string[];
  correctIndex: number;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string;
  questionType?: string;
  translation?: string;
  concept?: string;
}

export interface StudentMistakeRow {
  id: number;
  unit: string | null;
  lesson: string | null;
  concept: string | null;
  sourceType: string;
  wrongCount: number;
  lastWrongAt: string;
  lastWrongOption: number | null;
  question: MistakeQuestionSnapshot;
}

export interface MistakeDiagnosisBucket {
  key: string;
  unit: string;
  lesson: string | null;
  count: number;
  totalWrongs: number;
}

