import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Map as MapIcon,
  Layers,
  BookOpen,
  Search,
  Bookmark,
  Play,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Video,
  HelpCircle,
  Clock,
  FileText,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish } from "./kholasa-speech";
import { KholasaSummaryView, hasZatonaContent } from "./KholasaSummaryView";
import { KholasaMindMapView } from "./KholasaMindMapView";
import { KholasaFlashcardsView } from "./KholasaFlashcardsView";
import { KholasaDefinitionsView } from "./KholasaDefinitionsView";
import { KholasaExplanationView } from "./KholasaExplanationView";
import { KholasaLessonQuestionsView } from "./KholasaLessonQuestionsView";
import type { KholasaMaterial } from "./types";
import type { Student } from "@/types/platform";

interface KholasaLessonsTabProps {
  onPlayVideo?: (videoId: number) => void;
  student?: Student | null;
  isLanguages?: boolean;
}

type LessonStudyTab =
  | "explanation"
  | "video"
  | "definitions"
  | "summary"
  | "mindmap"
  | "flashcards"
  | "questions"
  | "sections";

export function KholasaLessonsTab({ onPlayVideo, student, isLanguages }: KholasaLessonsTabProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<KholasaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<KholasaMaterial | null>(null);
  const [studyTab, setStudyTab] = useState<LessonStudyTab>("definitions");

  const isStudentLanguages = Boolean(
    isLanguages ||
      (student?.languageTrack && (student.languageTrack.toLowerCase().includes("lang") || student.languageTrack.includes("لغات"))) ||
      (student?.academicTrack && (student.academicTrack.toLowerCase().includes("lang") || student.academicTrack.includes("لغات"))) ||
      (student?.schoolType && (student.schoolType.toLowerCase().includes("lang") || student.schoolType.includes("لغات"))) ||
      (student?.grade && (student.grade.toLowerCase().includes("لغات") || student.grade.toLowerCase().includes("languages")))
  );

  const isLanguagesMaterial = (m?: KholasaMaterial | null): boolean => {
    if (!m) return false;
    const stageStr = (m.stage || "").toLowerCase();
    const unitStr = (m.unit || "").toLowerCase();
    const lessonStr = (m.lesson || "").toLowerCase();
    return (
      stageStr.includes("lang") ||
      stageStr.includes("لغات") ||
      unitStr.includes("unit ") ||
      unitStr.includes("languages") ||
      lessonStr.startsWith("lesson ") ||
      isPrimarilyEnglish(m.lesson)
    );
  };

  const isLanguagesTrack = student ? isStudentLanguages : isLanguagesMaterial(activeMaterial);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await studentApi<{ materials: KholasaMaterial[] }>("/api/learning/kholasa/materials");
      setMaterials(Array.isArray(res.materials) ? res.materials : []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل محتوى الخلاصة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const toggleBookmark = async (material: KholasaMaterial, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await studentApi<{ bookmarked: boolean }>("/api/learning/kholasa/bookmarks/toggle", {
        method: "POST",
        body: JSON.stringify({
          itemType: "lesson",
          itemKey: String(material.id),
          materialId: material.id,
          videoId: material.videoId,
          title: material.lesson,
        }),
      });
      setMaterials((prev) =>
        prev.map((m) => (m.id === material.id ? { ...m, isBookmarked: res.bookmarked } : m)),
      );
      if (activeMaterial?.id === material.id) {
        setActiveMaterial({ ...activeMaterial, isBookmarked: res.bookmarked });
      }
      toast({
        title: res.bookmarked ? "تمت الإضافة للمفضلة ⭐" : "تمت الإزالة من المفضلة",
      });
    } catch (err: any) {
      toast({ title: "تعذر تحديث المفضلة", description: err.message, variant: "destructive" });
    }
  };

  const pickDefaultStudyTab = (m: KholasaMaterial): LessonStudyTab => {
    const isLangMat = student ? isStudentLanguages : isLanguagesMaterial(m);
    if (isLangMat && hasZatonaContent(m)) return "summary";
    const defsTotal = (m.summaryData?.definitions?.length || 0) + (m.summaryData?.keyConcepts?.length || 0);
    if (defsTotal > 0) return "definitions";
    if (m.mindmapImages?.length) return "mindmap";
    if (m.flashcards?.length) return "flashcards";
    if (
      (m.questionCounts?.mcq || 0) +
        (m.questionCounts?.trueFalse || 0) +
        (m.questionCounts?.essay || 0) >
      0
    ) {
      return "questions";
    }
    if (m.videoId) return "video";
    return "definitions";
  };

  useEffect(() => {
    if (!isLanguagesTrack && (studyTab === "summary" || studyTab === "sections")) {
      setStudyTab("definitions");
    }
  }, [isLanguagesTrack, studyTab]);

  const openLesson = (m: KholasaMaterial, initialTab?: LessonStudyTab) => {
    setActiveMaterial(m);
    setStudyTab(initialTab || pickDefaultStudyTab(m));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unitCards = useMemo(() => {
    const map = new Map<string, KholasaMaterial[]>();
    for (const m of materials) {
      const unitTitle = m.unit || "دروس عامة";
      const list = map.get(unitTitle) || [];
      list.push(m);
      map.set(unitTitle, list);
    }
    return Array.from(map.entries()).map(([unitTitle, lessons]) => {
      let totalDefs = 0;
      let totalMaps = 0;
      let totalCards = 0;
      let totalQuestions = 0;
      for (const l of lessons) {
        totalDefs += (l.summaryData?.definitions?.length || 0) + (l.summaryData?.keyConcepts?.length || 0);
        totalMaps += l.mindmapImages?.length || 0;
        totalCards += l.flashcards?.length || 0;
        totalQuestions +=
          (l.questionCounts?.mcq || 0) +
          (l.questionCounts?.trueFalse || 0) +
          (l.questionCounts?.essay || 0);
      }
      return { unitTitle, lessons, totalDefs, totalMaps, totalCards, totalQuestions };
    });
  }, [materials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      const unitTitle = m.unit || "دروس عامة";
      if (selectedUnit && unitTitle !== selectedUnit) return false;
      if (onlyBookmarked && !m.isBookmarked) return false;
      if (!q) return true;
      return (
        m.lesson.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q) ||
        (m.video?.title || "").toLowerCase().includes(q) ||
        JSON.stringify(m.summaryData || {}).toLowerCase().includes(q)
      );
    });
  }, [materials, search, selectedUnit, onlyBookmarked]);

  const groupedByUnit = useMemo(() => {
    const map = new Map<string, KholasaMaterial[]>();
    for (const m of filtered) {
      const unitTitle = m.unit || "دروس عامة";
      const list = map.get(unitTitle) || [];
      list.push(m);
      map.set(unitTitle, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-bold">جارٍ تحميل وحدات ودروس الخلاصة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center space-y-3" dir="rtl">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-500">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadMaterials()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (activeMaterial) {
    const activeIndex = materials.findIndex((m) => m.id === activeMaterial.id);
    const prevMaterial = activeIndex > 0 ? materials[activeIndex - 1] : null;
    const nextMaterial = activeIndex >= 0 && activeIndex < materials.length - 1 ? materials[activeIndex + 1] : null;

    const hasSections =
      Array.isArray(activeMaterial.structuredSections) && activeMaterial.structuredSections.length > 0;
    const defsCount =
      (activeMaterial.summaryData?.definitions?.length || 0) +
      (activeMaterial.summaryData?.keyConcepts?.length || 0);
    const totalQuestions =
      (activeMaterial.questionCounts?.mcq || 0) +
      (activeMaterial.questionCounts?.trueFalse || 0) +
      (activeMaterial.questionCounts?.essay || 0);

    const showZatonaTab = isLanguagesTrack && hasZatonaContent(activeMaterial);
    const showSectionsTab = isLanguagesTrack && hasSections;

    const subTabs: Array<{ id: LessonStudyTab; label: string; icon: typeof Sparkles }> = [
      { id: "explanation", label: "شرح الدرس 📖", icon: FileText },
      { id: "video", label: "فيديو الشرح", icon: Video },
      { id: "definitions", label: `التعريفات والمفاهيم (${defsCount})`, icon: BookOpen },
      ...(showZatonaTab ? [{ id: "summary" as const, label: "أهم النقاط (الزتونة) ⚡", icon: Sparkles }] : []),
      { id: "mindmap", label: `الخرائط الذهنية (${activeMaterial.mindmapImages?.length || 0})`, icon: MapIcon },
      { id: "flashcards", label: `التسميع (${activeMaterial.flashcards?.length || 0})`, icon: Layers },
      { id: "questions", label: `بنك أسئلة الدرس (${totalQuestions})`, icon: HelpCircle },
      ...(showSectionsTab ? [{ id: "sections" as const, label: "الشرح المفصل", icon: FileText }] : []),
    ];

    return (
      <div className="space-y-5 text-right" dir="rtl">
        {/* Top Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveMaterial(null)}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" /> كل الدروس
            </Button>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-muted-foreground block truncate">
                {activeMaterial.unit}
              </span>
              <h2 className="text-sm sm:text-base font-black text-foreground">
                <BidiStatement text={activeMaterial.lesson} />
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!prevMaterial}
                onClick={() => {
                  if (!prevMaterial) return;
                  const targetTab =
                    (!isLanguagesTrack && (studyTab === "sections" || studyTab === "summary")) ||
                    (studyTab === "sections" && !prevMaterial.structuredSections?.length) ||
                    (studyTab === "summary" && !hasZatonaContent(prevMaterial))
                      ? pickDefaultStudyTab(prevMaterial)
                      : studyTab;
                  openLesson(prevMaterial, targetTab);
                }}
                className="h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                title="الدرس السابق"
              >
                <ChevronRight className="h-3.5 w-3.5" /> السابق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!nextMaterial}
                onClick={() => {
                  if (!nextMaterial) return;
                  const targetTab =
                    (!isLanguagesTrack && (studyTab === "sections" || studyTab === "summary")) ||
                    (studyTab === "sections" && !nextMaterial.structuredSections?.length) ||
                    (studyTab === "summary" && !hasZatonaContent(nextMaterial))
                      ? pickDefaultStudyTab(nextMaterial)
                      : studyTab;
                  openLesson(nextMaterial, targetTab);
                }}
                className="h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                title="الدرس التالي"
              >
                التالي <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => void toggleBookmark(activeMaterial, e)}
              className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                activeMaterial.isBookmarked ? "border-amber-500/50 bg-amber-500/10 text-amber-500" : ""
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${activeMaterial.isBookmarked ? "fill-amber-500" : ""}`} />
              {activeMaterial.isBookmarked ? "محفوظ" : "حفظ"}
            </Button>

            {activeMaterial.videoId && onPlayVideo && (
              <Button
                type="button"
                size="sm"
                onClick={() => onPlayVideo(activeMaterial.videoId!)}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> تشغيل الفيديو
              </Button>
            )}
          </div>
        </div>

        {/* Organized 6-Tab Study Bar */}
        <div className="flex overflow-x-auto gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {subTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStudyTab(id)}
              className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                studyTab === id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {studyTab === "video" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            {activeMaterial.video ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {activeMaterial.video.thumbnailUrl ? (
                  <div
                    onClick={() => activeMaterial.videoId && onPlayVideo?.(activeMaterial.videoId)}
                    className="relative w-full sm:w-72 aspect-video rounded-xl overflow-hidden border border-border bg-slate-950 shrink-0 cursor-pointer group"
                  >
                    <img
                      src={activeMaterial.video.thumbnailUrl}
                      alt={activeMaterial.video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                      <span className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <Play className="h-5 w-5 fill-current mr-0.5" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-72 aspect-video rounded-xl border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <Video className="h-10 w-10 text-primary opacity-60" />
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-extrabold">
                    <Video className="h-3.5 w-3.5" /> فيديو الشرح المرتبط بالدرس
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
                    <BidiStatement text={activeMaterial.video.title} />
                  </h3>
                  {activeMaterial.video.durationText && (
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> مدة الفيديو: {activeMaterial.video.durationText}
                    </p>
                  )}
                  <p className="text-xs leading-6 text-muted-foreground">
                    شاهد شرح الدرس كاملاً داخل مشغل المنصة، وتابع بعدها التعريفات والزتونة والخرائط الذهنية وأسئلة الدرس من نفس الصفحة.
                  </p>
                  {activeMaterial.videoId && onPlayVideo && (
                    <Button
                      type="button"
                      onClick={() => onPlayVideo(activeMaterial.videoId!)}
                      className="h-10 rounded-xl px-5 text-xs font-black gap-2 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" /> ابدأ مشاهدة الفيديو الآن
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <Video className="h-9 w-9 mx-auto text-muted-foreground opacity-60" />
                <p className="text-sm font-bold text-foreground">لا يوجد فيديو شرح مرتبط بهذا الدرس حالياً.</p>
                <p className="text-xs text-muted-foreground">
                  يمكنك مذاكرة التعريفات والزتونة والخرائط الذهنية وحل جميع أسئلة الدرس من التبويبات بالأعلى.
                </p>
              </div>
            )}
          </div>
        )}

        {studyTab === "explanation" && (
          <KholasaExplanationView
            material={activeMaterial}
            onNavigateTab={(tab) => setStudyTab(tab as LessonStudyTab)}
          />
        )}

        {studyTab === "definitions" && <KholasaDefinitionsView material={activeMaterial} />}

        {studyTab === "summary" && <KholasaSummaryView material={activeMaterial} />}

        {studyTab === "mindmap" && (
          <KholasaMindMapView
            title={activeMaterial.mindmapTitle || activeMaterial.lesson}
            images={activeMaterial.mindmapImages}
          />
        )}

        {studyTab === "flashcards" && (
          <KholasaFlashcardsView materialId={activeMaterial.id} cards={activeMaterial.flashcards} />
        )}

        {studyTab === "questions" && (
          <KholasaLessonQuestionsView
            key={activeMaterial.id}
            materialId={activeMaterial.id}
            initialCounts={activeMaterial.questionCounts}
          />
        )}

        {studyTab === "sections" && hasSections && (
          <div className="space-y-4">
            {activeMaterial.structuredSections.map((sec, idx) => (
              <div key={sec.id || idx} className="rounded-2xl border border-border bg-card p-5 space-y-2.5">
                <h3 className="text-base font-black text-primary">
                  <BidiStatement text={sec.title} />
                </h3>
                <div className="text-xs sm:text-sm leading-7 text-foreground/90 whitespace-pre-line">
                  <BidiStatement text={sec.body} />
                </div>
                {sec.keyTakeaway && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 inline ml-1.5" />
                    <BidiStatement text={sec.keyTakeaway} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const showUnitsOverview = !selectedUnit && !search.trim() && !onlyBookmarked;

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground">
              الخلاصة
            </h1>
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-extrabold">
              {unitCards.length} وحدات • {materials.length} درس
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            اختر الوحدة الدراسية لفتح دروسها: فيديو الشرح، التعريفات بالترجمة، الخرائط الذهنية، التسميع، وجميع الأسئلة بأنواعها.
          </p>
        </div>

        {/* Search & Bookmarks filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الدرس أو المفهوم..."
              className="w-full h-9 rounded-xl border border-border bg-background pr-9 pl-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            type="button"
            variant={onlyBookmarked ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyBookmarked((v) => !v)}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Bookmark className={`h-3.5 w-3.5 ${onlyBookmarked ? "fill-current" : ""}`} />
            المفضلة
          </Button>
        </div>
      </header>

      {/* Level 1: Units as Vertical Cards Grid (عند الضغط عليها يفتح دروس الوحدة) */}
      {showUnitsOverview ? (
        unitCards.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-amber-500 mx-auto opacity-75" />
            <p className="text-sm font-bold text-foreground">لا توجد وحدات مضافة لمرحلتك الدراسية حالياً.</p>
            <p className="text-xs text-muted-foreground">ستظهر كل الوحدات والدروس الخاصة بمرحلتك الدراسية هنا.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unitCards.map((u, uIdx) => {
              const isUnitEng = isPrimarilyEnglish(u.unitTitle);
              return (
                <motion.div
                  key={u.unitTitle}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: uIdx * 0.05 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => {
                    setSelectedUnit(u.unitTitle);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedUnit(u.unitTitle);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="group relative rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-primary/60 hover:shadow-lg transition-colors cursor-pointer flex flex-col justify-between gap-4 overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-black">
                        <FolderOpen className="h-3.5 w-3.5" />
                        الوحدة {uIdx + 1}
                      </span>
                      <span className="rounded-lg bg-muted px-2.5 py-0.5 text-[11px] font-extrabold text-muted-foreground">
                        {u.lessons.length} دروس
                      </span>
                    </div>

                    <h2
                      dir={isUnitEng ? "ltr" : "rtl"}
                      className={`text-base sm:text-lg font-black text-foreground leading-snug group-hover:text-primary transition-colors ${
                        isUnitEng ? "text-left" : "text-right"
                      }`}
                    >
                      <BidiStatement text={u.unitTitle} />
                    </h2>

                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      {u.totalQuestions > 0 && (
                        <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
                          {u.totalQuestions} سؤال
                        </span>
                      )}
                      {u.totalDefs > 0 && (
                        <span className="rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5">
                          {u.totalDefs} تعريف
                        </span>
                      )}
                      {u.totalMaps > 0 && (
                        <span className="rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5">
                          {u.totalMaps} خريطة
                        </span>
                      )}
                      {u.totalCards > 0 && (
                        <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5">
                          {u.totalCards} تسميع
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs font-black text-primary">
                    <span>عرض دروس الوحدة</span>
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {selectedUnit && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUnit(null)}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" /> كل الوحدات
                </Button>
                <div className="min-w-0">
                  <h2
                    dir={isPrimarilyEnglish(selectedUnit) ? "ltr" : "rtl"}
                    className={`text-sm sm:text-base font-black text-foreground truncate ${
                      isPrimarilyEnglish(selectedUnit) ? "text-left" : "text-right"
                    }`}
                  >
                    <BidiStatement text={selectedUnit} />
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-extrabold">
                {filtered.length} دروس
              </span>
            </div>
          )}

          {groupedByUnit.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-amber-500 mx-auto opacity-75" />
              <p className="text-sm font-bold text-foreground">لا توجد دروس مطابقة لبحثك حالياً.</p>
              <p className="text-xs text-muted-foreground">ستظهر كل الدروس والملخصات والخرائط الذهنية الخاصة بمرحلتك الدراسية هنا.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByUnit.map(([unitTitle, items]) => (
                <section key={unitTitle} className="space-y-3">
                  {!selectedUnit && (
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <h2 className="text-sm sm:text-base font-black text-foreground">
                        <BidiStatement text={unitTitle} />
                      </h2>
                      <span className="text-xs font-bold text-muted-foreground">({items.length})</span>
                    </div>
                  )}

                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((m, mIdx) => {
                      const conceptsCount =
                        (m.summaryData?.keyConcepts?.length || 0) + (m.summaryData?.definitions?.length || 0);
                      const mapsCount = m.mindmapImages?.length || 0;
                      const cardsCount = m.flashcards?.length || 0;
                      const totalQ =
                        (m.questionCounts?.mcq || 0) +
                        (m.questionCounts?.trueFalse || 0) +
                        (m.questionCounts?.essay || 0);

                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: mIdx * 0.04 }}
                          whileHover={{ y: -2 }}
                          onClick={() => openLesson(m)}
                          className="group relative rounded-2xl border border-border bg-card p-4 shadow-2xs hover:border-primary/50 hover:shadow-md transition-colors cursor-pointer flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-bold">
                                <Sparkles className="h-3 w-3" /> الخلاصة
                              </span>
                          <button
                            type="button"
                            onClick={(e) => void toggleBookmark(m, e)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 cursor-pointer"
                            aria-label="حفظ في المفضلة"
                          >
                            <Bookmark className={`h-4 w-4 ${m.isBookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
                          </button>
                        </div>

                        <h3 className="text-sm font-black text-foreground leading-snug group-hover:text-primary transition-colors">
                          <BidiStatement text={m.lesson} />
                        </h3>

                        {/* Direct-jump interactive badges */}
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          {m.video && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLesson(m, "video");
                              }}
                              className="rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 px-2 py-0.5 cursor-pointer"
                            >
                              فيديو شرح
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLesson(m, "definitions");
                            }}
                            className="rounded-md bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground px-2 py-0.5 cursor-pointer"
                          >
                            {conceptsCount} تعريف
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLesson(m, "mindmap");
                            }}
                            className="rounded-md bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground px-2 py-0.5 cursor-pointer"
                          >
                            {mapsCount} خريطة
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLesson(m, "flashcards");
                            }}
                            className="rounded-md bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground px-2 py-0.5 cursor-pointer"
                          >
                            {cardsCount} تسميع
                          </button>
                          {totalQ > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLesson(m, "questions");
                              }}
                              className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 cursor-pointer"
                            >
                              {totalQ} سؤال
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 h-9 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          افتح الدرس كاملاً
                        </Button>
                        {m.videoId && onPlayVideo && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayVideo(m.videoId!);
                            }}
                            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                            title="مشاهدة فيديو الشرح"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
