import type {
  LearningFile,
  ProgressRow,
  Quiz,
  Student,
  VideoSummary,
} from "@/types/platform";
import { isQuizHomework } from "@/lib/motivationMessages";

export type StudentDashboardState =
  | "new"
  | "active"
  | "needs_revision"
  | "completed_all";

export type PrimaryCtaAction = {
  label: string;
  kind: "play_video" | "start_quiz" | "open_lessons";
  videoId?: number;
  quiz?: Quiz;
};

export type LearningPlanTask = {
  id: string;
  title: string;
  typeLabel: string;
  statusLabel: string;
  priority: "urgent" | "high" | "normal";
  completed: boolean;
  durationLabel?: string;
  actionLabel: string;
  kind: "video" | "quiz" | "homework" | "mistakes";
  videoId?: number;
  quiz?: Quiz;
};

export type ContinueLearningModel = {
  video: VideoSummary | null;
  progressPct: number;
  currentTimeSeconds: number;
  durationSeconds: number;
  remainingLabel: string | null;
  lastPositionLabel: string | null;
  isCompleted: boolean;
  unitLabel: string | null;
  cta: PrimaryCtaAction;
};

export type UnifiedProgressModel = {
  totalLessons: number;
  startedLessons: number;
  completedLessons: number;
  totalExams: number;
  availableExams: number;
  attemptedExams: number;
  passedExams: number;
  totalHomeworks: number;
  overallCompletionPct: number;
  averageExamScore: number | null;
  unresolvedMistakesCount: number;
  recentAttemptedExams: Quiz[];
};

export type DashboardEngineOutput = {
  state: StudentDashboardState;
  continueLearning: ContinueLearningModel;
  progress: UnifiedProgressModel;
  todayPlan: LearningPlanTask[];
  latestResources: Array<{
    file: LearningFile;
    displayTitle: string;
    subtitle: string;
    fileType: string;
    sizeLabel: string;
    dateLabel: string | null;
  }>;
};

export function formatPlaybackTime(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
  return `${mins}:${pad(secs)}`;
}

export function isVideoCompleted(row?: ProgressRow | null): boolean {
  if (!row) return false;
  return Boolean(row.completed || (row.progress ?? 0) >= 90);
}

/**
 * Determines whether a video belongs to the student's core school curriculum
 * rather than an auxiliary/elective track (e.g., C++ or JavaScript bonus).
 */
function isPrimaryCurriculumVideo(video: VideoSummary, student: Student): boolean {
  const cat = `${video.category || ""} ${video.subject || ""}`.toLowerCase();
  const isCoreCurriculum =
    cat.includes("منهج") ||
    cat.includes("بكالوريا") ||
    cat.includes("ثانوي") ||
    cat.includes("curriculum");
  if (isCoreCurriculum) return true;

  const studentGrade = (student.grade || "").trim();
  if (studentGrade && video.stage && video.stage.trim() === studentGrade) {
    return true;
  }
  return false;
}

function sortVideosByCurriculumOrder(videos: VideoSummary[]): VideoSummary[] {
  return [...videos].sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : a.id;
    const orderB = typeof b.order === "number" ? b.order : b.id;
    if (orderA !== orderB) return orderA - orderB;
    return a.id - b.id;
  });
}

function isRawNumericOrCodeTitle(title: string): boolean {
  const cleaned = title.replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  return /^[\d\s\-_.]+$/.test(cleaned) || cleaned.length <= 4;
}

export function formatResourceMetadata(file: LearningFile): {
  displayTitle: string;
  subtitle: string;
  fileType: string;
  sizeLabel: string;
  dateLabel: string | null;
} {
  const ext = (file.originalName || "").split(".").pop()?.toLowerCase() || "";
  const fileType =
    file.mimeType === "application/pdf" || ext === "pdf"
      ? "PDF"
      : ["doc", "docx"].includes(ext)
        ? "WORD"
        : ["ppt", "pptx"].includes(ext)
          ? "SLIDES"
          : ["zip", "rar", "7z"].includes(ext)
            ? "ARCHIVE"
            : ["cpp", "c", "js", "ts", "py", "html", "css"].includes(ext)
              ? ext.toUpperCase()
              : ext
                ? ext.toUpperCase()
                : "ملف";

  const rawTitle = (file.title || "").replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  let displayTitle = rawTitle;

  if (!displayTitle || isRawNumericOrCodeTitle(displayTitle)) {
    const parts: string[] = [];
    if (rawTitle) {
      parts.push(`ملزمة درس ${rawTitle}`);
    } else {
      parts.push("ملزمة تعليمية");
    }
    if (file.subject && file.subject.trim()) {
      parts.push(file.subject.trim());
    } else if (file.category && file.category.trim() && file.category !== "عام") {
      parts.push(file.category.trim());
    }
    displayTitle = parts.join(" — ");
  }

  const subtitleParts: string[] = [];
  if (file.category && file.category.trim() && file.category !== "عام") {
    subtitleParts.push(file.category.trim());
  }
  if (file.description && file.description.trim()) {
    subtitleParts.push(file.description.trim());
  }
  const subtitle = subtitleParts[0] || "ملف تعليمي من منهجك";

  const bytes = Number(file.sizeBytes || 0);
  const sizeLabel =
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : bytes >= 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : "ملف";

  let dateLabel: string | null = null;
  if (file.createdAt) {
    const dt = new Date(file.createdAt);
    if (!Number.isNaN(dt.getTime())) {
      dateLabel = new Intl.DateTimeFormat("ar-EG", {
        timeZone: "Africa/Cairo",
        day: "numeric",
        month: "short",
      }).format(dt);
    }
  }

  return { displayTitle, subtitle, fileType, sizeLabel, dateLabel };
}

export function buildStudentDashboardModel({
  student,
  videos,
  quizzes,
  files,
  progressRows,
  unresolvedMistakesCount,
}: {
  student: Student;
  videos: VideoSummary[];
  quizzes: Quiz[];
  files: LearningFile[];
  progressRows: ProgressRow[];
  unresolvedMistakesCount: number;
}): DashboardEngineOutput {
  const safeVideos = Array.isArray(videos) ? videos : [];
  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const safeFiles = Array.isArray(files) ? files : [];
  const safeProgress = Array.isArray(progressRows) ? progressRows : [];

  const progressByVideo = new Map<number, ProgressRow>();
  for (const row of safeProgress) {
    progressByVideo.set(row.videoId, row);
  }

  // Separate exams from homeworks accurately
  const homeworkQuizzes = safeQuizzes.filter((q) => isQuizHomework(q));
  const examQuizzes = safeQuizzes.filter((q) => !isQuizHomework(q));

  // Lesson counts
  const totalLessons = safeVideos.length;
  const completedLessons = safeVideos.filter((v) =>
    isVideoCompleted(progressByVideo.get(v.id)),
  ).length;
  const startedLessons = safeVideos.filter((v) => {
    const row = progressByVideo.get(v.id);
    return Boolean(row && (row.progress || 0) > 0 && !isVideoCompleted(row));
  }).length;

  // Exam counts
  const totalExams = examQuizzes.length;
  const availableExams = examQuizzes.filter((q) => !q.locked).length;
  const attemptedExamList = examQuizzes.filter((q) => (q.attemptsUsed || 0) > 0);
  const attemptedExams = attemptedExamList.length;
  const passedExams = attemptedExamList.filter(
    (q) => typeof q.bestScore === "number" && q.bestScore >= (q.passingScore || 60),
  ).length;

  const scoredExams = examQuizzes.filter(
    (q) => (q.attemptsUsed || 0) > 0 && typeof q.bestScore === "number",
  );
  const averageExamScore =
    scoredExams.length > 0
      ? Math.round(
          scoredExams.reduce((acc, q) => acc + Math.max(0, Math.min(100, q.bestScore || 0)), 0) /
            scoredExams.length,
        )
      : null;

  // True curriculum completion (smoothly reflects both completed + in-progress lessons + attempted exams)
  const totalTrackableItems = totalLessons + totalExams;
  const lessonsWeightedCompletion = safeVideos.reduce((acc, v) => {
    const row = progressByVideo.get(v.id);
    if (!row) return acc;
    if (isVideoCompleted(row)) return acc + 1;
    const pct = Math.max(0, Math.min(100, Number(row.progress) || 0));
    return acc + pct / 100;
  }, 0);
  const completedTrackableItems = lessonsWeightedCompletion + attemptedExams;
  const overallCompletionPct =
    totalTrackableItems > 0
      ? Math.max(0, Math.min(100, Math.round((completedTrackableItems / totalTrackableItems) * 100)))
      : 0;

  // Identify student's active curriculum track so recommendations NEVER jump to another course
  const inProgressRows = safeProgress
    .filter(
      (row) =>
        (row.progress || 0) > 0 &&
        !isVideoCompleted(row) &&
        safeVideos.some((v) => v.id === row.videoId),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
    );

  const recentCompletedRows = safeProgress
    .filter(
      (row) =>
        isVideoCompleted(row) && safeVideos.some((v) => v.id === row.videoId),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
    );

  const coreVideos = sortVideosByCurriculumOrder(
    safeVideos.filter((v) => isPrimaryCurriculumVideo(v, student)),
  );
  const orderedAllVideos = sortVideosByCurriculumOrder(safeVideos);
  const primaryPool = coreVideos.length > 0 ? coreVideos : orderedAllVideos;

  let activeVideo: VideoSummary | null = null;
  let activeCourseVideos: VideoSummary[] = primaryPool;

  if (inProgressRows.length > 0) {
    activeVideo = safeVideos.find((v) => v.id === inProgressRows[0].videoId) || null;
  }

  if (activeVideo) {
    const sameCourse = sortVideosByCurriculumOrder(
      safeVideos.filter((v) =>
        activeVideo?.courseId
          ? v.courseId === activeVideo.courseId
          : v.category === activeVideo?.category,
      ),
    );
    if (sameCourse.length > 0) activeCourseVideos = sameCourse;
  } else if (recentCompletedRows.length > 0) {
    const lastCompleted =
      safeVideos.find((v) => v.id === recentCompletedRows[0].videoId) || null;
    if (lastCompleted) {
      const sameCourse = sortVideosByCurriculumOrder(
        safeVideos.filter((v) =>
          lastCompleted.courseId
            ? v.courseId === lastCompleted.courseId
            : v.category === lastCompleted.category,
        ),
      );
      if (sameCourse.length > 0) activeCourseVideos = sameCourse;
      const lastIdx = activeCourseVideos.findIndex((v) => v.id === lastCompleted.id);
      const nextUncompletedInCourse =
        activeCourseVideos.slice(lastIdx + 1).find((v) => !isVideoCompleted(progressByVideo.get(v.id))) ||
        activeCourseVideos.find((v) => !isVideoCompleted(progressByVideo.get(v.id)));
      activeVideo = nextUncompletedInCourse || lastCompleted;
    }
  } else {
    activeVideo = primaryPool[0] || orderedAllVideos[0] || null;
  }

  const activeRow = activeVideo ? progressByVideo.get(activeVideo.id) : undefined;
  const activeProgressPct = Math.max(0, Math.min(100, Math.round(activeRow?.progress || 0)));
  const activeCompleted = isVideoCompleted(activeRow);
  const currentTimeSeconds = activeRow?.currentTimeSeconds || 0;
  const durationSeconds = activeRow?.durationSeconds || 0;
  const remainingSeconds =
    durationSeconds > 0 && currentTimeSeconds < durationSeconds
      ? durationSeconds - currentTimeSeconds
      : 0;

  // Check if the active video has a linked unattempted quiz
  const linkedQuiz = activeVideo
    ? examQuizzes.find(
        (q) =>
          !q.locked &&
          (q.attemptsUsed || 0) === 0 &&
          (q.videoId === activeVideo?.id || (activeVideo?.quizId && q.id === activeVideo.quizId)),
      )
    : undefined;

  // Next uncompleted lesson strictly within the SAME course/curriculum
  const nextLessonInSameCourse = activeVideo
    ? activeCourseVideos.find(
        (v) => v.id !== activeVideo?.id && !isVideoCompleted(progressByVideo.get(v.id)),
      ) || null
    : null;

  // Dynamic primary CTA
  let cta: PrimaryCtaAction;
  if (!activeVideo) {
    cta = { label: "تصفّح الدروس", kind: "open_lessons" };
  } else if (activeProgressPct === 0 && completedLessons === 0) {
    cta = { label: "ابدأ أول درس", kind: "play_video", videoId: activeVideo.id };
  } else if (!activeCompleted && activeProgressPct > 0) {
    cta = { label: "كمّل الدرس", kind: "play_video", videoId: activeVideo.id };
  } else if (activeCompleted && linkedQuiz) {
    cta = { label: "اختبر نفسك", kind: "start_quiz", quiz: linkedQuiz };
  } else if (activeCompleted && nextLessonInSameCourse) {
    cta = {
      label: "ابدأ الدرس التالي",
      kind: "play_video",
      videoId: nextLessonInSameCourse.id,
    };
  } else if (activeCompleted) {
    cta = { label: "راجع الدرس", kind: "play_video", videoId: activeVideo.id };
  } else {
    cta = { label: "ابدأ الدرس", kind: "play_video", videoId: activeVideo.id };
  }

  // Determine overall student state
  let state: StudentDashboardState = "active";
  if (totalLessons > 0 && completedLessons === totalLessons && (totalExams === 0 || attemptedExams === totalExams)) {
    state = "completed_all";
  } else if (unresolvedMistakesCount > 0) {
    state = "needs_revision";
  } else if (completedLessons === 0 && startedLessons === 0 && attemptedExams === 0) {
    state = "new";
  }

  // Build "خطة مذاكرتك النهارده" — prioritized, curriculum-consistent tasks
  const todayPlan: LearningPlanTask[] = [];

  // 1. Unresolved mistakes (high priority revision)
  if (unresolvedMistakesCount > 0) {
    todayPlan.push({
      id: "task-mistakes",
      title: `راجع ${unresolvedMistakesCount} ${unresolvedMistakesCount === 1 ? "سؤال" : "أسئلة"} غلطت فيهم قبل كده`,
      typeLabel: "ركن غلطاتي",
      statusLabel: "مطلوب مراجعة",
      priority: "urgent",
      completed: false,
      actionLabel: "راجع غلطاتك",
      kind: "mistakes",
    });
  }

  // 2. Active unfinished lesson
  if (activeVideo && !activeCompleted) {
    todayPlan.push({
      id: `task-video-${activeVideo.id}`,
      title: activeVideo.title,
      typeLabel: activeProgressPct > 0 ? "درس غير مكتمل" : "الدرس القادم في منهجك",
      statusLabel: activeProgressPct > 0 ? `وصلت لـ ${activeProgressPct}%` : "لسه مبدأتش",
      priority: activeProgressPct > 0 ? "high" : "normal",
      completed: false,
      durationLabel:
        formatPlaybackTime(remainingSeconds) || activeVideo.durationText || undefined,
      actionLabel: activeProgressPct > 0 ? "كمّل الدرس" : "ابدأ الدرس",
      kind: "video",
      videoId: activeVideo.id,
    });
  }

  // 3. Pending homework (paper/assigned)
  const pendingHomework = homeworkQuizzes.find((hw) => !hw.locked && (hw.attemptsUsed || 0) === 0);
  if (pendingHomework) {
    todayPlan.push({
      id: `task-hw-${pendingHomework.id}`,
      title: pendingHomework.title,
      typeLabel: "واجب منزلي",
      statusLabel: "تسليم ورقي بالحصة",
      priority: "high",
      completed: false,
      actionLabel: "افتح الواجب",
      kind: "homework",
      quiz: pendingHomework,
    });
  }

  // 4. Next available unattempted exam (prefer linked quiz, then latest available exam)
  const nextAvailableExam =
    linkedQuiz ||
    examQuizzes.find((q) => !q.locked && (q.attemptsUsed || 0) === 0);
  if (nextAvailableExam) {
    todayPlan.push({
      id: `task-exam-${nextAvailableExam.id}`,
      title: nextAvailableExam.title,
      typeLabel: "اختبار متاح",
      statusLabel: `${nextAvailableExam.questionsToShow || nextAvailableExam.questions.length} سؤال`,
      priority: "high",
      completed: false,
      durationLabel:
        nextAvailableExam.durationMinutes && nextAvailableExam.durationMinutes > 0
          ? `${nextAvailableExam.durationMinutes} دقيقة`
          : undefined,
      actionLabel: "ابدأ الاختبار",
      kind: "quiz",
      quiz: nextAvailableExam,
    });
  }

  // 5. Next uncompleted lesson in the SAME curriculum (only if different from task #2)
  if (nextLessonInSameCourse && (!activeVideo || nextLessonInSameCourse.id !== activeVideo.id)) {
    todayPlan.push({
      id: `task-next-video-${nextLessonInSameCourse.id}`,
      title: nextLessonInSameCourse.title,
      typeLabel: "الدرس التالي بالترتيب",
      statusLabel: nextLessonInSameCourse.category,
      priority: "normal",
      completed: false,
      durationLabel: nextLessonInSameCourse.durationText || undefined,
      actionLabel: "افتح الدرس",
      kind: "video",
      videoId: nextLessonInSameCourse.id,
    });
  }

  const latestResources = safeFiles.slice(0, 4).map((file) => ({
    file,
    ...formatResourceMetadata(file),
  }));

  return {
    state,
    continueLearning: {
      video: activeVideo,
      progressPct: activeProgressPct,
      currentTimeSeconds,
      durationSeconds,
      remainingLabel: formatPlaybackTime(remainingSeconds),
      lastPositionLabel: formatPlaybackTime(currentTimeSeconds),
      isCompleted: activeCompleted,
      unitLabel: activeVideo?.subject || activeVideo?.category || null,
      cta,
    },
    progress: {
      totalLessons,
      startedLessons,
      completedLessons,
      totalExams,
      availableExams,
      attemptedExams,
      passedExams,
      totalHomeworks: homeworkQuizzes.length,
      overallCompletionPct,
      averageExamScore,
      unresolvedMistakesCount,
      recentAttemptedExams: scoredExams.slice(0, 4),
    },
    todayPlan: todayPlan.slice(0, 5),
    latestResources,
  };
}
