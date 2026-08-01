export type Student = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  status: string;
  governorate?: string | null;
  city?: string | null;
  grade?: string | null;
  educationSystem?: string | null;
  educationGrade?: string | null;
  schoolType?: string | null;
  academicTrack?: string | null;
  otherGradeDetail?: string | null;
  learningMode?: "online" | "offline";
  enrolledCourseIds?: number[];
  paymentStatus?: string;
  createdAt?: string;
};

export type LearningFile = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  targetType?: "stages" | "videos";
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  mimeType?: string | null;
  sizeBytes: number;
  createdAt?: string;
};

export type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  imageUrl?: string;
};

export type Quiz = {
  id: number;
  scope?: "course" | "lesson";
  videoId?: number | null;
  requiredProgress?: number;
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  durationMinutes?: number | null;
  passingScore: number;
  maxAttempts?: number | null;
  shuffleQuestions?: boolean;
  questionsToShow?: number | null;
  showExplanations?: boolean;
  attemptsUsed?: number;
  bestScore?: number | null;
  locked?: boolean;
  lockedReason?: string | null;
  questions: QuizQuestion[];
};

export type VideoSummary = {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
  subject?: string | null;
  learningMode?: "online" | "offline" | "both";
  youtubeUrl: string;
  order?: number;
  description?: string | null;
  durationText?: string | null;
  paymentLocked?: boolean;
};

export type ProgressRow = {
  videoId: number;
  progress: number;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
  updatedAt?: string;
};

export type StudentNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
};
