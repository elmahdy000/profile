import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, UploadCloud, Trash2, CheckCircle2, FileText, Search, Filter, AlertCircle, RefreshCw, Eye, X, Copy, Check, FolderOpen, GraduationCap, Video, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AdminApiFn,
  CourseSummary,
  Question,
  StageNode,
  UploadPreset,
  VideoSummary,
  getOptionLabel,
  isEnglishQuestion,
  parseLessonSortOrder,
  parseUnitSortOrder,
} from "./types";

interface UploadQuestionsTabProps {
  adminApi: AdminApiFn;
  treeData: StageNode[];
  availableStages: string[];
  courses: CourseSummary[];
  videos: VideoSummary[];
  selectedStage: string;
  uploadPreset?: UploadPreset | null;
  loadTree: () => void;
  onQuizCreated?: (quiz: any) => void;
  onOpenGeneratorForLesson: (target: {
    stage: string;
    unit: string;
    lesson: string;
    lessonId?: string;
  }) => void;
}

export function UploadQuestionsTab({
  adminApi,
  treeData,
  availableStages,
  courses,
  videos,
  selectedStage,
  uploadPreset,
  loadTree,
  onQuizCreated,
  onOpenGeneratorForLesson,
}: UploadQuestionsTabProps) {
  const { toast } = useToast();
  // Upload Tab State (Unified Step-by-Step Wizard)
  const [uploadScope, setUploadScope] = useState<"unit" | "lesson">("unit");
  const [uploadStage, setUploadStage] = useState<string>("");
  const [uploadCourseId, setUploadCourseId] = useState<string>("");
  const [uploadLessonId, setUploadLessonId] = useState<string>("");
  const [uploadUnit, setUploadUnit] = useState<string>("");
  const [uploadLesson, setUploadLesson] = useState<string>("");
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);
  const [isCustomLesson, setIsCustomLesson] = useState<boolean>(false);
  const [customUnitInput, setCustomUnitInput] = useState<string>("");
  const [customLessonInput, setCustomLessonInput] = useState<string>("");
  const [uploadDifficulty, setUploadDifficulty] = useState<string>("medium");
  const [uploadPoints, setUploadPoints] = useState<number>(1);
  const [uploadQuestionType, setUploadQuestionType] = useState<"auto" | "mcq" | "true_false" | "essay">("auto");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [uploadBreakdown, setUploadBreakdown] = useState<{
    total: number;
    newQuestions: number;
    totalDuplicates: number;
    bankDuplicates: number;
    batchDuplicates: number;
    mcq: number;
    trueFalse: number;
    essay: number;
  } | null>(null);
  const [skipDuplicatesOnImport, setSkipDuplicatesOnImport] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [previewFilter, setPreviewFilter] = useState<"ALL" | "NEW" | "DUPLICATES" | "ESSAY">("ALL");
  const [previewSearchQuery, setPreviewSearchQuery] = useState<string>("");

  const displayedPreviewQuestions = useMemo(() => {
    return previewQuestions
      .map((q, originalIndex) => ({ q, originalIndex }))
      .filter(({ q }) => {
        if (previewFilter === "NEW" && q.isDuplicate) return false;
        if (previewFilter === "DUPLICATES" && !q.isDuplicate) return false;
        if (previewFilter === "ESSAY" && q.questionType !== "essay") return false;
        if (previewSearchQuery.trim()) {
          const s = previewSearchQuery.toLowerCase();
          const matchPrompt = (q.prompt || "").toLowerCase().includes(s);
          const matchOpt = (q.options || []).some((opt) => (opt || "").toLowerCase().includes(s));
          const matchExp = (q.explanation || "").toLowerCase().includes(s);
          if (!matchPrompt && !matchOpt && !matchExp) return false;
        }
        return true;
      });
  }, [previewQuestions, previewFilter, previewSearchQuery]);

  const handleRemoveAllDuplicatesFromPreview = () => {
    const kept = previewQuestions.filter((q) => !q.isDuplicate);
    setPreviewQuestions(kept);
    if (uploadBreakdown) {
      setUploadBreakdown({
        ...uploadBreakdown,
        total: kept.length,
        newQuestions: kept.length,
        totalDuplicates: 0,
        bankDuplicates: 0,
        batchDuplicates: 0,
      });
    }
  };

  // Direct Quiz Settings on Upload
  const [createQuizDirectly, setCreateQuizDirectly] = useState<boolean>(true);
  const [quizTitleInput, setQuizTitleInput] = useState<string>("");
  const [isQuizTitleCustom, setIsQuizTitleCustom] = useState<boolean>(false);
  const [quizDurationInput, setQuizDurationInput] = useState<number>(30);
  const [quizPassingScoreInput, setQuizPassingScoreInput] = useState<number>(60);
  const [quizMaxAttemptsInput, setQuizMaxAttemptsInput] = useState<number>(3);
  const [quizIsPublished, setQuizIsPublished] = useState<boolean>(true);

  const [recentSavedLesson, setRecentSavedLesson] = useState<{
    stage: string;
    unit: string;
    lesson: string;
    lessonId?: string;
    count: number;
    quiz?: any;
  } | null>(null);

  // Apply external upload preset (e.g. triggered from Explorer lesson/stage button)
  useEffect(() => {
    if (!uploadPreset) return;
    if (uploadPreset.stage) setUploadStage(uploadPreset.stage);
    if (uploadPreset.unit !== undefined) setUploadUnit(uploadPreset.unit);
    if (uploadPreset.scope) setUploadScope(uploadPreset.scope);
    if (uploadPreset.lesson !== undefined) setUploadLesson(uploadPreset.lesson);
    if (uploadPreset.courseId !== undefined) setUploadCourseId(uploadPreset.courseId);
    if (uploadPreset.lessonId !== undefined) setUploadLessonId(uploadPreset.lessonId);
  }, [uploadPreset]);

  // Keep uploadStage valid when availableStages changes
  useEffect(() => {
    if (availableStages.length > 0 && (!uploadStage || !availableStages.includes(uploadStage))) {
      setUploadStage(selectedStage || availableStages[0]);
    }
  }, [availableStages, uploadStage, selectedStage]);

  // Analyze Uploaded File or Text (Preview)
  const handleAnalyzeUpload = async () => {
    if (!uploadFile && !rawText.trim()) {
      toast({ variant: "destructive", description: "يرجى اختيار ملف أو إدخال نص الأسئلة أولاً" });
      return;
    }

    if (!uploadStage.trim() || !uploadUnit.trim()) {
      toast({ variant: "destructive", description: "يرجى تحديد المرحلة والوحدة أولاً" });
      return;
    }

    const targetLesson = uploadScope === "unit"
      ? (uploadLesson.trim() || "شامل الوحدة")
      : uploadLesson.trim();

    if (uploadScope === "lesson" && !targetLesson) {
      toast({ variant: "destructive", description: "يرجى اختيار أو كتابة اسم الدرس" });
      return;
    }

    setIsAnalyzing(true);
    setPreviewQuestions([]);
    setPreviewWarnings([]);
    setUploadBreakdown(null);

    try {
      let res: any;
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("previewOnly", "true");
        formData.append("stage", uploadStage);
        formData.append("unit", uploadUnit);
        formData.append("lesson", targetLesson);
        formData.append("difficulty", uploadDifficulty);
        formData.append("points", String(uploadPoints));
        formData.append("questionType", uploadQuestionType);
        if (uploadCourseId) formData.append("courseId", uploadCourseId);
        if (uploadScope === "lesson" && uploadLessonId) formData.append("lessonId", uploadLessonId);

        res = await adminApi<any>("/api/admin/learning/test-bank/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await adminApi<any>("/api/admin/learning/test-bank/batch-import", {
          method: "POST",
          body: JSON.stringify({
            text: rawText,
            previewOnly: true,
            stage: uploadStage,
            unit: uploadUnit,
            lesson: targetLesson,
            difficulty: uploadDifficulty,
            points: uploadPoints,
            questionType: uploadQuestionType,
            courseId: uploadCourseId ? Number(uploadCourseId) : undefined,
            lessonId: uploadScope === "lesson" && uploadLessonId ? Number(uploadLessonId) : undefined,
          }),
        });
      }

      setPreviewQuestions(res.questions || []);
      setPreviewWarnings(res.warnings || []);
      if (res.breakdown) {
        setUploadBreakdown(res.breakdown);
      } else {
        setUploadBreakdown(null);
      }
      if ((res.questions || []).length === 0) {
        if (res.extractedText && res.extractedText.trim()) {
          setRawText(res.extractedText);
          setUploadFile(null);
          toast({
            title: "تم استخراج النص من الملف بنجاح",
            description: "لم نتمكن من تحديد بنية الأسئلة آلياً. تم وضع النص المستخرج في محرر 'نص مباشر' لتعديل تنسيقه وفحصه بسهولة.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "لم يتم التعرف على أسئلة",
            description: res.warnings?.[0] || "تأكد من تنسيق الملف أو كتابة كل سؤال بخياراته وإجابته الصريحة.",
          });
        }
      } else {
        if (res.extractedText && !rawText) {
          setRawText(res.extractedText);
        }
        toast({
          title: `تم التعرف على ${res.questions.length} سؤالاً بنجاح!`,
          description: "راجع الأسئلة أدناه ثم اختر 'حفظ في البنك' أو 'إنشاء ونشر الاختبار فوراً'.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر فحص وتحليل الملف" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Commit of Uploaded Questions to Bank (with optional direct quiz creation)
  const handleConfirmImport = async (shouldCreateQuiz: boolean = false) => {
    if (previewQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة جاهزة للحفظ" });
      return;
    }

    if (!uploadStage.trim() || !uploadUnit.trim()) {
      toast({ variant: "destructive", description: "يرجى التأكد من تحديد المرحلة والوحدة" });
      return;
    }

    const targetLesson = uploadScope === "unit"
      ? (uploadLesson.trim() || "شامل الوحدة")
      : uploadLesson.trim();

    if (uploadScope === "lesson" && !targetLesson) {
      toast({ variant: "destructive", description: "يرجى التأكد من تحديد اسم الدرس" });
      return;
    }

    setIsImporting(true);
    try {
      const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
      const defaultQuizTitle = uploadScope === "unit"
        ? (isLang ? `Exam: Comprehensive on ${uploadUnit}` : `اختبار شامل على ${uploadUnit}`)
        : (isLang ? `Exam: ${targetLesson}` : `اختبار على ${targetLesson}`);

      const res = await adminApi<any>("/api/admin/learning/test-bank/batch-import", {
        method: "POST",
        body: JSON.stringify({
          rawQuestions: previewQuestions,
          stage: uploadStage,
          unit: uploadUnit,
          lesson: targetLesson,
          difficulty: uploadDifficulty,
          points: uploadPoints,
          questionType: uploadQuestionType,
          courseId: uploadCourseId ? Number(uploadCourseId) : undefined,
          lessonId: uploadScope === "lesson" && uploadLessonId ? Number(uploadLessonId) : undefined,
          skipDuplicates: skipDuplicatesOnImport,
          createQuiz: shouldCreateQuiz,
          quizTitle: quizTitleInput.trim() || defaultQuizTitle,
          durationMinutes: quizDurationInput || 30,
          passingScore: quizPassingScoreInput || 60,
          maxAttempts: quizMaxAttemptsInput || 3,
          isPublished: quizIsPublished,
        }),
      });

      const enrichMsg = res.enrichedExistingCount > 0 ? ` و إثراء ${res.enrichedExistingCount} سؤال بالبنك بالتفسير` : "";
      if (res.quiz) {
        toast({
          title: `تم إنشاء ونشر الاختبار "${res.quiz.title}" وحفظ الأسئلة في البنك بنجاح! 🚀`,
          description: `تم حفظ ${res.count} سؤالاً جديداً ${res.skippedDuplicates > 0 ? `(تم تخطي ${res.skippedDuplicates} مكرر)` : ""}${enrichMsg}`,
        });
        onQuizCreated?.(res.quiz);
      } else {
        toast({
          title: uploadScope === "unit"
            ? `تم حفظ ${res.count} سؤالاً في بنك الوحدة (${uploadUnit}) بنجاح! 🎉`
            : `تم حفظ ${res.count} سؤالاً في بنك درس (${targetLesson}) بنجاح! 🎉`,
          description: `${res.skippedDuplicates > 0 ? `تم تخطي ${res.skippedDuplicates} سؤالاً مكرراً لحفظ نظافة البنك.` : ""}${enrichMsg}`,
        });
      }

      setRecentSavedLesson({
        stage: uploadStage,
        unit: uploadUnit,
        lesson: targetLesson,
        lessonId: uploadScope === "lesson" ? uploadLessonId : undefined,
        count: res.count,
        quiz: res.quiz,
      });

      setPreviewQuestions([]);
      setPreviewWarnings([]);
      setUploadFile(null);
      setRawText("");
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ الأسئلة" });
    } finally {
      setIsImporting(false);
    }
  };

  // Suggested units & lessons for upload tab based on uploadStage
  const suggestedUnits = useMemo(() => {
    if (!uploadStage) return [];
    const unitSet = new Set<string>();

    // 1. From treeData
    const st = treeData.find((s) => s.stage === uploadStage);
    if (st) {
      for (const u of st.units) {
        if (u.unit && u.unit.trim()) unitSet.add(u.unit.trim());
      }
    }

    // 2. Pre-defined curriculum standards by stage
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    if (isLang) {
      unitSet.add("الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)");
      unitSet.add("الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)");
      unitSet.add("الوحدة الثالثة: تطبيقات الويب (Unit 3: Web Applications)");
      unitSet.add("الوحدة الرابعة: تصميم الويب والوسائط (Unit 4: Web Design and Media)");
    } else if (uploadStage.includes("عربي")) {
      unitSet.add("الوحدة الأولى: الذكاء الاصطناعي والمجتمع");
      unitSet.add("الوحدة الثانية: الأمن السيبراني والتشفير");
      unitSet.add("الوحدة الثالثة: تطبيقات الويب");
      unitSet.add("الوحدة الرابعة: تصميم الويب والوسائط");
    }

    // 3. From courses/videos matching this stage
    const matchingCourses = courses.filter((c) => Array.isArray(c.stages) && c.stages.includes(uploadStage));
    for (const c of matchingCourses) {
      const crsVideos = videos.filter((v) => v.courseId === c.id);
      for (const v of crsVideos) {
        if (v.title.includes("الوحدة الاولى") || v.title.includes("Unit 1") || v.title.includes("1-")) {
          unitSet.add(isLang ? "الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)" : "الوحدة الأولى: الذكاء الاصطناعي والمجتمع");
        } else if (v.title.includes("الوحدة الثانية") || v.title.includes("الوحدة التانية") || v.title.includes("Unit 2") || v.title.includes("2-")) {
          unitSet.add(isLang ? "الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)" : "الوحدة الثانية: الأمن السيبراني والتشفير");
        }
      }
    }

    return Array.from(unitSet).sort((a, b) => parseUnitSortOrder(a) - parseUnitSortOrder(b));
  }, [treeData, uploadStage, courses, videos]);

  const suggestedLessons = useMemo(() => {
    if (!uploadStage || !uploadUnit) return [];
    const lessonSet = new Set<string>();

    // 1. From treeData
    const st = treeData.find((s) => s.stage === uploadStage);
    if (st) {
      const u = st.units.find((unit) => unit.unit === uploadUnit);
      if (u) {
        for (const l of u.lessons) {
          if (l.lesson && l.lesson.trim() && l.lesson.trim() !== "شامل الوحدة") {
            lessonSet.add(l.lesson.trim());
          }
        }
      }
    }

    // 2. Curriculum standards by stage & unit
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    const isUnit1 = uploadUnit.includes("الأولى") || uploadUnit.includes("Unit 1") || uploadUnit.toLowerCase().includes("artificial");
    const isUnit2 = uploadUnit.includes("الثانية") || uploadUnit.includes("Unit 2") || uploadUnit.toLowerCase().includes("cybersecurity") || uploadUnit.includes("الأمن");
    const isUnit3 = uploadUnit.includes("الثالثة") || uploadUnit.includes("Unit 3") || uploadUnit.toLowerCase().includes("web applications") || uploadUnit.includes("تطبيقات الويب");
    const isUnit4 = uploadUnit.includes("الرابعة") || uploadUnit.includes("Unit 4") || uploadUnit.toLowerCase().includes("web design") || uploadUnit.includes("الوسائط");

    if (isLang) {
      if (isUnit1) {
        lessonSet.add("Lesson 1-1: Development of Information Technology and Social Transformation");
        lessonSet.add("Lesson 1-2: How AI Works");
        lessonSet.add("Lesson 1-3: AI in Daily Life and Industry");
        lessonSet.add("Lesson 1-4: Ethical Issues with AI");
      } else if (isUnit2) {
        lessonSet.add("Lesson 2-1: Cryptographic Technologies and Authentication");
        lessonSet.add("Lesson 2-2: Network Security Design");
        lessonSet.add("Lesson 2-3: Incident Response and Risk Management");
      } else if (isUnit3) {
        lessonSet.add("Lesson 3-1: The Overall Structure of Web Applications");
        lessonSet.add("Lesson 3-2: Web Application Communication Methods");
        lessonSet.add("Lesson 3-3: Fundamentals of Frontend Technology");
      } else if (isUnit4) {
        lessonSet.add("Lesson 4-1: Types and Characteristics of Media");
        lessonSet.add("Lesson 4-2: Information Design and User Experience for Websites");
        lessonSet.add("Lesson 4-3: Methods for Evaluating Websites");
        lessonSet.add("Lesson 4-4: The Iterative Improvement Process for Websites");
      }
    } else {
      if (isUnit1) {
        lessonSet.add("الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي");
        lessonSet.add("الدرس الثاني: كيف يعمل الذكاء الاصطناعي");
        lessonSet.add("الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية");
        lessonSet.add("الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي");
      } else if (isUnit2) {
        lessonSet.add("الدرس الأول: التشفير والمصادقة");
        lessonSet.add("الدرس الثاني: تصميم أمن الشبكات");
        lessonSet.add("الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر");
      } else if (isUnit3) {
        lessonSet.add("الدرس الأول: البنية العامة لتطبيقات الويب");
        lessonSet.add("الدرس الثاني: طرق الاتصال في تطبيقات الويب");
        lessonSet.add("الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية");
      } else if (isUnit4) {
        lessonSet.add("الدرس الأول: أنواع الوسائط وخصائصها");
        lessonSet.add("الدرس الثاني: تصميم المعلومات وتجربة المستخدم للمواقع");
        lessonSet.add("الدرس الثالث: أساليب تقييم المواقع الإلكترونية");
        lessonSet.add("الدرس الرابع: عملية التحسين التكراري للمواقع");
      }
    }

    // 3. From videos matching stage and unit
    const matchingCourses = courses.filter((c) => Array.isArray(c.stages) && c.stages.includes(uploadStage));
    for (const c of matchingCourses) {
      const crsVideos = videos.filter((v) => v.courseId === c.id);
      for (const v of crsVideos) {
        const vTitle = v.title.trim();
        if (isUnit1 && (vTitle.includes("الوحدة الاولى") || vTitle.includes("Unit 1") || vTitle.includes("1-"))) {
          lessonSet.add(vTitle);
        } else if (isUnit2 && (vTitle.includes("الوحدة الثانية") || vTitle.includes("الوحدة التانية") || vTitle.includes("Unit 2") || vTitle.includes("2-"))) {
          lessonSet.add(vTitle);
        }
      }
    }

    return Array.from(lessonSet).sort((a, b) => parseLessonSortOrder(a) - parseLessonSortOrder(b));
  }, [treeData, uploadStage, uploadUnit, courses, videos]);

  // Auto-fill defaults and auto-link videos
  useEffect(() => {
    if (!uploadStage && availableStages.length > 0) {
      setUploadStage(selectedStage || availableStages[0]);
    }
  }, [availableStages, uploadStage, selectedStage]);

  useEffect(() => {
    if (uploadStage && !uploadUnit && suggestedUnits.length > 0) {
      setUploadUnit(suggestedUnits[0]);
    }
  }, [uploadStage, suggestedUnits, uploadUnit]);

  useEffect(() => {
    if (uploadScope === "unit") {
      setUploadLesson("شامل الوحدة");
      setUploadLessonId("");
    } else if (uploadScope === "lesson") {
      if (uploadLesson === "شامل الوحدة" || !uploadLesson) {
        if (suggestedLessons.length > 0) setUploadLesson(suggestedLessons[0]);
      }
    }
  }, [uploadScope, suggestedLessons, uploadLesson]);

  // Match video when uploadLesson or uploadStage changes
  useEffect(() => {
    if (!uploadLesson || uploadScope === "unit") {
      setUploadLessonId("");
      return;
    }
    const lLower = uploadLesson.toLowerCase();
    const matchedVideo = videos.find((v) => {
      const vLower = v.title.toLowerCase();
      if (vLower === lLower) return true;
      const m1 = lLower.match(/\b(\d+)\s*[-_.]\s*(\d+)\b/);
      const m2 = vLower.match(/\b(\d+)\s*[-_.]\s*(\d+)\b/);
      if (m1 && m2 && m1[1] === m2[1] && m1[2] === m2[2]) {
        if (uploadStage && v.stage && v.stage !== uploadStage) return false;
        return true;
      }
      return false;
    });
    if (matchedVideo) {
      setUploadLessonId(String(matchedVideo.id));
      if (matchedVideo.courseId) setUploadCourseId(String(matchedVideo.courseId));
    }
  }, [uploadLesson, uploadScope, uploadStage, videos]);

  // Auto-fill Quiz Title Input
  useEffect(() => {
    if (isQuizTitleCustom) return;
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    if (uploadScope === "unit") {
      setQuizTitleInput(isLang ? `Exam: Unit Review (${uploadUnit || "Unit"})` : `اختبار شامل على ${uploadUnit || "الوحدة"}`);
    } else {
      if (uploadLesson && uploadLesson !== "شامل الوحدة") {
        setQuizTitleInput(isLang ? `Exam: ${uploadLesson}` : `اختبار على ${uploadLesson}`);
      } else {
        setQuizTitleInput("");
      }
    }
  }, [uploadScope, uploadUnit, uploadLesson, uploadStage, isQuizTitleCustom]);

  // Lessons list for currently selected course in Upload Tab
  const uploadCourseLessons = useMemo(() => {
    if (!uploadCourseId) return [];
    return videos.filter((v) => String(v.courseId) === String(uploadCourseId));
  }, [videos, uploadCourseId]);

  return (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Post-save Celebration Action Card */}
          {recentSavedLesson && (
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تم حفظ {recentSavedLesson.count} سؤال بنجاح في بنك ({recentSavedLesson.lesson})!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  الأسئلة جاهزة الآن. هل ترغب في توليد امتحان للطلاب من بنك هذا الدرس الآن؟
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  onClick={() => {
                    onOpenGeneratorForLesson({
                      stage: recentSavedLesson.stage,
                      unit: recentSavedLesson.unit,
                      lesson: recentSavedLesson.lesson,
                      lessonId: recentSavedLesson.lessonId,
                    });
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black h-10 px-5 shadow-md cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 ml-1.5" />
                  توليد امتحان لهذا الدرس فوراً 🚀
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecentSavedLesson(null)}
                  className="h-10 text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-emerald-600" />
                  <span>رفع وتعيين اختبار (وحدة كاملة أو درس محدد)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  اختر المرحلة ثم الوحدة ثم حدد إن كان الاختبار لدرس معين أو شاملاً للوحدة كاملة، ثم ارفع الملف لحفظه في البنك أو نشره فوراً للطلاب.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {uploadScope === "unit" ? "نطاق: وحدة كاملة 📚" : "نطاق: درس محدد 🎥"}
                </span>
              </div>
            </div>

            {/* الخطوة ١: اختيار المرحلة الدراسية */}
            <div className="space-y-2">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">١</span>
                <span>اختر المرحلة الدراسية / المسار:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableStages.map((st) => {
                  const isSelected = uploadStage === st;
                  const count = treeData.find((s) => s.stage === st)?.totalQuestions || 0;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setUploadStage(st);
                        setIsCustomUnit(false);
                        setIsCustomLesson(false);
                      }}
                      className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer text-right ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        <span className="truncate">{st}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                        {count} س
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* الخطوة ٢: اختيار الوحدة الدراسية */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٢</span>
                  <span>اختر الوحدة الدراسية (Unit):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomUnit(!isCustomUnit)}
                  className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {isCustomUnit ? "← العودة لاختيار من الوحدات المتاحة" : "➕ كتابة اسم وحدة جديدة"}
                </button>
              </div>

              {isCustomUnit ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="اكتب اسم الوحدة الجديدة (مثال: الوحدة الثالثة: البرمجة المتقدمة)"
                    value={customUnitInput}
                    onChange={(e) => {
                      setCustomUnitInput(e.target.value);
                      setUploadUnit(e.target.value);
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-emerald-500 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-muted-foreground">سيتم إنشاء هذه الوحدة تلقائياً وإضافتها لبنك المرحلة.</p>
                </div>
              ) : (
                <select
                  value={uploadUnit}
                  onChange={(e) => {
                    setUploadUnit(e.target.value);
                    setIsCustomLesson(false);
                  }}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- اختر الوحدة الدراسية --</option>
                  {suggestedUnits.map((u, i) => (
                    <option key={i} value={u}>
                      📚 {u}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* الخطوة ٣: تحديد النطاق (وحدة كاملة أم درس محدد) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٣</span>
                <span>تحديد نطاق الاختبار:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUploadScope("unit");
                    setUploadLesson("شامل الوحدة");
                    setUploadLessonId("");
                  }}
                  className={`p-4 rounded-2xl border text-xs font-black flex items-start gap-3 transition-all cursor-pointer text-right ${
                    uploadScope === "unit"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <FolderOpen className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm">اختبار شامل للوحدة كاملة 📚</div>
                    <div className={`text-[11px] font-medium mt-0.5 ${uploadScope === "unit" ? "text-emerald-100" : "text-muted-foreground"}`}>
                      يشمل كافة موضوعات ودروس ({uploadUnit || "الوحدة"})
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadScope("lesson");
                    if (uploadLesson === "شامل الوحدة" || !uploadLesson) {
                      if (suggestedLessons.length > 0) setUploadLesson(suggestedLessons[0]);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-xs font-black flex items-start gap-3 transition-all cursor-pointer text-right ${
                    uploadScope === "lesson"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Video className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm">اختبار لدرس محدد داخل الوحدة 🎥</div>
                    <div className={`text-[11px] font-medium mt-0.5 ${uploadScope === "lesson" ? "text-emerald-100" : "text-muted-foreground"}`}>
                      مرتبط بدرس معين داخل الوحدة وفيديو الشرح
                    </div>
                  </div>
                </button>
              </div>

              {/* في حالة اختيار درس محدد: إظهار قائمة الدروس مع الربط بالفيديو */}
              {uploadScope === "lesson" && (
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/80 space-y-3 mt-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-emerald-600" />
                      <span>اختر الدرس من قائمة دروس الوحدة:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomLesson(!isCustomLesson)}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isCustomLesson ? "← اختيار من الدروس المتاحة" : "➕ كتابة اسم درس جديد يدوياً"}
                    </button>
                  </div>

                  {isCustomLesson ? (
                    <input
                      type="text"
                      placeholder="اكتب اسم الدرس الجديد (مثال: Lesson 2-1: Cryptographic and Authentications)"
                      value={customLessonInput}
                      onChange={(e) => {
                        setCustomLessonInput(e.target.value);
                        setUploadLesson(e.target.value);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-emerald-500 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <select
                      value={uploadLesson}
                      onChange={(e) => setUploadLesson(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- اختر درس الوحدة --</option>
                      {suggestedLessons.map((l, i) => (
                        <option key={i} value={l}>
                          🎥 {l}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* معلومات ربط الدرس بالفيديو في المنصة */}
                  {uploadLessonId ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>مرتبط تلقائياً بدرس الفيديو: «{videos.find((v) => String(v.id) === uploadLessonId)?.title || uploadLesson}» (معرف فيديو: {uploadLessonId})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-muted-foreground text-[11px] font-medium">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>الدرس غير مرتبط بفيديو معين حتى الآن (سيتم حفظه كدرس مستقل في بنك أسئلة الوحدة).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* الخطوة ٤: تحديد نوع الأسئلة في هذا الملف لتشغيل الـ Parser المناسب */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٤</span>
                <span>تحديد نوع الأسئلة في هذا الملف (لتشغيل الـ Parser البرمجي المخصص له بدقة):</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadQuestionType("auto")}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    uploadQuestionType === "auto"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">🤖 ذكي وتلقائي</span>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    ملفات مجمعة أو JSON يحتوي على كل الأنواع (MCQ ومقالي وصح/خطأ)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadQuestionType("mcq")}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    uploadQuestionType === "mcq"
                      ? "border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">📝 اختيار من متعدد</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">MCQ</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    أسئلة ذات 4 خيارات (أ، ب، ج، د) وتحديد الإجابة الصحيحة والتفسير
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadQuestionType("true_false")}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    uploadQuestionType === "true_false"
                      ? "border-teal-600 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">⚖️ صواب أو خطأ</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300">T / F</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    عبارات صح وخطأ مع إنشاء الخيارات الثنائية ومطابقة الحل تلقائياً
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadQuestionType("essay")}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    uploadQuestionType === "essay"
                      ? "border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">✍️ أسئلة مقالية</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">Essay</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    رأس السؤال + الإجابة النموذجية وعناصر التصحيح لورقة الامتحان A4
                  </p>
                </button>
              </div>

              {/* بطاقة التنسيق الموصى به ونموذج سريع */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {uploadQuestionType === "mcq" && "الـ Parser المخصص للـ MCQ يبحث عن أ، ب، ج، د مع علامة الإجابة مثل (الإجابة: ب)."}
                    {uploadQuestionType === "true_false" && "الـ Parser المخصص للصواب والخطأ يتعرف على (صح / خطأ / صواب) في نهاية كل جملة أو كسطر إجابة مستقل."}
                    {uploadQuestionType === "essay" && "الـ Parser المخصص للمقالي يستخرج نص السؤال والإجابة النموذجية المكتوبة تحته مع التنسيق التلقائي للأسطر."}
                    {uploadQuestionType === "auto" && "الـ Parser الذكي والتلقائي يقرأ ملفات الـ JSON المتشعبة والملفات المختلطة تلقائياً."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (uploadQuestionType === "mcq") {
                      setRawText(`1- ما هي وحدة قياس كمية المادة في النظام الدولي للوحدات (SI)؟\nأ) الكيلوجرام\nب) المول\nج) المتر\nد) الثانية\nالإجابة الصحيحة: ب\nالتفسير: المول هو الوحدة الأساسية لكمية المادة.\n\n2- أي مما يلي يُعد من لغات البرمجة كائنية التوجه؟\nأ) HTML\nب) C++\nج) CSS\nد) SQL\nالإجابة الصحيحة: ب`);
                    } else if (uploadQuestionType === "true_false") {
                      setRawText(`1- استُخدمت الحواسيب الإلكترونية الأولى في الأغراض العسكرية والحسابات العلمية. (صح)\nالتفسير: صممت لحساب مسارات القذائف.\n\n2- انتشرت الهواتف الذكية في السبعينيات قبل الحواسيب الشخصية. (خطأ)\nالتفسير: الهواتف الذكية ظهرت في أواخر التسعينيات والألفية.\n\n3- شهدت التسعينيات إتاحة الإنترنت للاستخدام التجاري. (صواب)`);
                    } else if (uploadQuestionType === "essay") {
                      setRawText(`س1: اذكر ثلاثة من أهم أهداف الذكاء الاصطناعي في قطاع التعليم؟\nالإجابة النموذجية:\n1. تخصيص تجربة التعلم لكل طالب حسب مستواه.\n2. التصحيح التلقائي الفوري والتقييم الذكي.\n3. توفير المساعدين التعليميين الذكيين على مدار الساعة.\nدرجة السؤال: 3\n\nس2: ما هو الفرق الجوهري بين التعلم الإشرافي والتعلم غير الإشرافي؟\nالإجابة النموذجية:\nالتعلم الإشرافي يعتمد على بيانات مصنفة مسبقاً (Labeled Data)، بينما التعلم غير الإشرافي يكتشف الأنماط في البيانات غير المصنفة.`);
                    } else {
                      setRawText(`1- ما هي لغة برمجة تطبيقات الويب الأساسية في المتصفح؟\nأ) Python\nب) JavaScript\nج) C++\nد) Java\nالإجابة: ب\n\n2- يعتبر الذكاء الاصطناعي فرعاً من علوم الحاسوب. (صح)\n\nس3: ما هي مميزات التعليم الإلكتروني التفاعلي؟\nالإجابة النموذجية:\n- المرونة في الوقت والمكان.\n- سهولة تتبع أداء الطالب.`);
                    }
                    setUploadFile(null);
                    toast({ title: "تم إدراج نموذج تجريبي جاهز في المحرر 📋" });
                  }}
                  className="text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>إدراج نص تجريبي جاهز في المحرر 📋</span>
                </button>
              </div>
            </div>

            {/* الخطوة ٥: ملف الأسئلة أو نص الأسئلة */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٥</span>
                <span>ملف الأسئلة أو نص الأسئلة (يدعم Word و PDF و TXT و JSON):</span>
              </label>

              <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.txt,.json,.csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadFile(e.target.files[0]);
                      setRawText("");
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 pointer-events-none">
                  <FileText className="mx-auto h-10 w-10 text-emerald-600" />
                  {uploadFile ? (
                    <div className="text-xs font-black text-emerald-600">
                      📄 الملف المحدد: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-black text-foreground">
                        اسحب ملف الأسئلة هنا أو اضغط للاختيار من جهازك
                      </p>
                      <p className="text-xs text-muted-foreground">
                        يدعم ملفات Word (.docx) • ملفات PDF • ملفات JSON • نصوص عادية (.txt)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* أو لصق النص يدوياً */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-muted-foreground">
                  أو الصق نص الأسئلة مباشرة هنا:
                </label>
                <textarea
                  rows={4}
                  placeholder={`مثال:\n1- ما هي وحدة قياس كمية المادة في النظام الدولي؟\nأ) الكيلوجرام\nب) المول\nج) المتر\nد) الثانية\nالإجابة الصحيحة: ب\nالتوضيح: المول هو الوحدة الأساسية في SI.`}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value) setUploadFile(null);
                  }}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* إعدادات الصعوبة والدرجات الافتراضية */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  الصعوبة الافتراضية (للأسئلة غير المحددة):
                </label>
                <select
                  value={uploadDifficulty}
                  onChange={(e) => setUploadDifficulty(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
                >
                  <option value="easy">سهل 🟢</option>
                  <option value="medium">متوسط 🟡</option>
                  <option value="hard">صعب 🔴</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  درجة السؤال الافتراضية:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={uploadPoints}
                  onChange={(e) => setUploadPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                />
              </div>
            </div>

            {/* زر فحص وتحليل الأسئلة */}
            <Button
              type="button"
              disabled={isAnalyzing || (!uploadFile && !rawText.trim())}
              onClick={handleAnalyzeUpload}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ فك التشفير واستخراج الأسئلة من الملف...</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>استخراج وفحص الأسئلة للمعاينة قبل الحفظ 🔍</span>
                </>
              )}
            </Button>
          </div>

          {/* الخطوة ٦: معاينة الأسئلة وخيارات الحفظ ونشر الاختبار الفوري */}
          {previewQuestions.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h4 className="text-base font-black text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>تم استخراج ({previewQuestions.length}) سؤالاً بنجاح!</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    راجع الأسئلة أدناه، واضغط على أي خيار لتغيير الإجابة الصحيحة إن لزم.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={isImporting}
                    variant="outline"
                    onClick={() => handleConfirmImport(false)}
                    className="font-bold text-xs h-11 px-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <Check className="h-4 w-4 ml-1.5" />
                    <span>حفظ في البنك فقط 💾</span>
                  </Button>

                  <Button
                    type="button"
                    disabled={isImporting}
                    onClick={() => handleConfirmImport(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs h-11 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>جارٍ الحفظ والإنشاء...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>حفظ في البنك + إنشاء الاختبار للطلاب فوراً 🚀</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* شريط تفاصيل التحليل وتوزيع الأسئلة ومقارنة البنك */}
              {uploadBreakdown && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 p-3.5 bg-muted/40 rounded-2xl border border-border">
                    <span className="text-xs font-black text-foreground ml-2">📊 تقرير التحليل وتوزيع الأسئلة:</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      📝 اختيار من متعدد: {uploadBreakdown.mcq}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                      ⚖️ صواب وخطأ: {uploadBreakdown.trueFalse}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      ✍️ مقالي: {uploadBreakdown.essay}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      ✨ أسئلة جديدة للحفظ: {uploadBreakdown.newQuestions}
                    </span>
                    {uploadBreakdown.totalDuplicates > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                        ⚠️ مكرر في البنك: {uploadBreakdown.bankDuplicates} {uploadBreakdown.batchDuplicates > 0 ? `(+${uploadBreakdown.batchDuplicates} في الملف)` : ""}
                      </span>
                    )}
                  </div>

                  {uploadBreakdown.totalDuplicates > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                            تم رصد ({uploadBreakdown.totalDuplicates}) أسئلة مكررة ({uploadBreakdown.bankDuplicates} موجودة مسبقاً في البنك{uploadBreakdown.batchDuplicates > 0 ? ` + ${uploadBreakdown.batchDuplicates} مكررة داخل الملف` : ""})
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            لحماية بنك الأسئلة من الحشو والازدواجية، يتم تخطي الأسئلة المكررة تلقائياً عند الحفظ ليبقى البنك نقياً.
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-xl border border-amber-500/40 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={skipDuplicatesOnImport}
                          onChange={(e) => setSkipDuplicatesOnImport(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-foreground">تخطي المكرر تلقائياً ✅</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* بطاقة إعدادات الاختبار المباشر للطلاب */}
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-black text-foreground">
                      إعدادات الاختبار المباشر للطلاب (عند الضغط على "إنشاء الاختبار للطلاب فوراً")
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-violet-600 bg-violet-500/15 px-2.5 py-0.5 rounded-full">
                    سيتم نشره مباشرةً في المنصة
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-violet-500/20">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-foreground">عنوان الاختبار المعروض للطلاب:</label>
                    <input
                      type="text"
                      value={quizTitleInput}
                      onChange={(e) => {
                        setQuizTitleInput(e.target.value);
                        setIsQuizTitleCustom(true);
                      }}
                      placeholder="عنوان الاختبار..."
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">مدة الاختبار (بالدقائق):</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={quizDurationInput}
                      onChange={(e) => setQuizDurationInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">درجة النجاح (%):</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={quizPassingScoreInput}
                      onChange={(e) => setQuizPassingScoreInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">أقصى عدد محاولات للطالب:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={quizMaxAttemptsInput}
                      onChange={(e) => setQuizMaxAttemptsInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                </div>
              </div>

              {previewWarnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> ملاحظات أثناء التحليل:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {previewWarnings.slice(0, 5).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl border border-border">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={previewSearchQuery}
                    onChange={(e) => setPreviewSearchQuery(e.target.value)}
                    placeholder="بحث سريع في الأسئلة المستخرجة أو الخيارات أو التفسير..."
                    className="w-full h-9 pr-9 pl-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {previewSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPreviewSearchQuery("")}
                      className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("ALL")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      previewFilter === "ALL"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    الكل ({previewQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("NEW")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      previewFilter === "NEW"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-background border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    جديدة ({previewQuestions.filter((q) => !q.isDuplicate).length})
                  </button>
                  {previewQuestions.some((q) => q.isDuplicate) && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("DUPLICATES")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        previewFilter === "DUPLICATES"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-background border border-border text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                      }`}
                    >
                      مكررات ({previewQuestions.filter((q) => q.isDuplicate).length})
                    </button>
                  )}
                  {previewQuestions.some((q) => q.questionType === "essay") && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("ESSAY")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        previewFilter === "ESSAY"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-background border border-border text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      }`}
                    >
                      مقالي ({previewQuestions.filter((q) => q.questionType === "essay").length})
                    </button>
                  )}

                  {/* 1-Click Duplicate Cleaner Button */}
                  {previewQuestions.some((q) => q.isDuplicate) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAllDuplicatesFromPreview}
                      className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-300 dark:border-rose-800"
                      title="استبعاد جميع الأسئلة المكررة دفعة واحدة من قائمة الاستيراد"
                    >
                      <Trash2 className="h-3.5 w-3.5 ml-1" />
                      استبعاد المكرر ({previewQuestions.filter((q) => q.isDuplicate).length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Preview Cards */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {displayedPreviewQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                    لا توجد أسئلة تطابق الفلترة أو البحث الحالي.
                  </div>
                ) : (
                  displayedPreviewQuestions.map(({ q, originalIndex }) => {
                    const isEnglish = isEnglishQuestion(q.prompt, q.options);
                    return (
                      <div
                        key={originalIndex}
                        className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
                            {originalIndex + 1}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                q.questionType === "essay"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                  : q.questionType === "true_false"
                                  ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                              }`}
                            >
                              {q.questionType === "essay"
                                ? "✍️ مقالي"
                                : q.questionType === "true_false"
                                ? "⚖️ صواب وخطأ"
                                : "📝 اختيار من متعدد"}
                            </span>

                            {q.isBankDuplicate && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                ⚠️ مكرر في البنك {q.existingBankLocation ? `(${q.existingBankLocation})` : ""}
                              </span>
                            )}

                            {q.isBatchDuplicate && !q.isBankDuplicate && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                ⚠️ مكرر داخل هذا الملف
                              </span>
                            )}

                            {((q as any).unit || (q as any).lesson) && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 max-w-[220px] truncate" title={`${(q as any).unit || ""} - ${(q as any).lesson || ""}`}>
                                📂 {[(q as any).unit, (q as any).lesson].filter(Boolean).join(" / ")}
                              </span>
                            )}

                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                isEnglish
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                            </span>
                            <select
                              value={q.difficulty || "medium"}
                              onChange={(e) => {
                                const val = e.target.value as "easy" | "medium" | "hard";
                                setPreviewQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[originalIndex] = { ...updated[originalIndex], difficulty: val };
                                  return updated;
                                });
                              }}
                              className="h-7 px-2 rounded-lg border border-border bg-card text-[11px] font-bold cursor-pointer"
                            >
                              <option value="easy">سهل 🟢</option>
                              <option value="medium">متوسط 🟡</option>
                              <option value="hard">صعب 🔴</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewQuestions((prev) => prev.filter((_, i) => i !== originalIndex));
                              }}
                              title="استبعاد هذا السؤال من الاستيراد"
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p
                          dir={isEnglish ? "ltr" : "rtl"}
                          className={`text-xs font-bold text-foreground whitespace-pre-line leading-relaxed ${
                            isEnglish ? "text-left font-sans" : "text-right font-sans"
                          }`}
                        >
                          {q.prompt}
                        </p>

                        {q.questionType === "essay" ? (
                          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                              <span>💡 الإجابة النموذجية / عناصر التصحيح المقالي:</span>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                درجة السؤال: {q.points || uploadPoints}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              value={q.correctAnswer || q.explanation || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPreviewQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[originalIndex] = {
                                    ...updated[originalIndex],
                                    correctAnswer: val,
                                    explanation: val,
                                  };
                                  return updated;
                                });
                              }}
                              placeholder="اكتب الإجابة النموذجية أو عناصر الدرجة هنا..."
                              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" dir={isEnglish ? "ltr" : "rtl"}>
                            {(q.options || []).map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctIndex;
                              const letter = getOptionLabel(oIdx, isEnglish);
                              return (
                                <div
                                  key={oIdx}
                                  dir={isEnglish ? "ltr" : "rtl"}
                                  onClick={() => {
                                    setPreviewQuestions((prev) => {
                                      const updated = [...prev];
                                      updated[originalIndex] = { ...updated[originalIndex], correctIndex: oIdx };
                                      return updated;
                                    });
                                  }}
                                  className={`p-2 rounded-xl flex items-start gap-2 border cursor-pointer transition-all ${
                                    isCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20 shadow-xs"
                                      : "bg-background border-border text-foreground hover:border-emerald-500/40 hover:bg-muted/40"
                                  }`}
                                  title="اضغط لتحديد هذا الخيار كإجابة صحيحة لهذا السؤال"
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black bg-muted mt-0.5">
                                    {letter}
                                  </span>
                                  <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEnglish ? "text-left font-sans font-medium" : "text-right font-medium"}`}>
                                    {opt}
                                  </span>
                                  {isCorrect && (
                                    <Check className={`h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 ${isEnglish ? "ml-auto" : "mr-auto"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <p
                            dir={isEnglish ? "ltr" : "rtl"}
                            className={`text-[11px] text-muted-foreground pt-1 ${isEnglish ? "text-left font-sans" : "text-right"}`}
                          >
                            <strong className="text-primary font-bold">
                              {isEnglish ? "Explanation:" : "التفسير:"}
                            </strong>{" "}
                            <span>{q.explanation}</span>
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

  );
}

export default UploadQuestionsTab;
