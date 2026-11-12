import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { BidiStatement } from "./BidiStatement";
import { KholasaSummaryView } from "./KholasaSummaryView";
import { KholasaMindMapView } from "./KholasaMindMapView";
import { KholasaFlashcardsView } from "./KholasaFlashcardsView";
import { KholasaDefinitionsView } from "./KholasaDefinitionsView";
import { KholasaLessonQuestionsView } from "./KholasaLessonQuestionsView";
import type { KholasaMaterial } from "./types";

interface KholasaLessonsTabProps {
  onPlayVideo?: (videoId: number) => void;
}

type LessonStudyTab =
  | "video"
  | "definitions"
  | "summary"
  | "mindmap"
  | "flashcards"
  | "questions"
  | "sections";

export function KholasaLessonsTab({ onPlayVideo }: KholasaLessonsTabProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<KholasaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<KholasaMaterial | null>(null);
  const [studyTab, setStudyTab] = useState<LessonStudyTab>("summary");

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
    const s = m.summaryData || {};
    const hasSummaryRich =
      Boolean(m.objectives?.length) ||
      Boolean(s.keyConcepts?.length) ||
      Boolean(s.definitions?.length) ||
      Boolean(s.formulas?.length) ||
      Boolean(s.comparisons?.length) ||
      Boolean(s.examTips?.length) ||
      Boolean(s.commonMistakes?.length) ||
      Boolean(s.checklist?.length);
    if (hasSummaryRich) return "summary";
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
    return "summary";
  };

  const openLesson = (m: KholasaMaterial, initialTab?: LessonStudyTab) => {
    setActiveMaterial(m);
    setStudyTab(initialTab || pickDefaultStudyTab(m));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unitsList = useMemo(() => {
    const s = new Set<string>();
    for (const m of materials) {
      if (m.unit) s.add(m.unit);
    }
    return Array.from(s);
  }, [materials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (selectedUnit !== "all" && m.unit !== selectedUnit) return false;
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
      const list = map.get(m.unit) || [];
      list.push(m);
      map.set(m.unit, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-bold">جارٍ تحميل الدروس والزتونة والخرائط الذهنية...</p>
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

    const subTabs: Array<{ id: LessonStudyTab; label: string; icon: typeof Sparkles }> = [
      { id: "video", label: "فيديو الشرح", icon: Video },
      { id: "definitions", label: `التعريفات (${defsCount})`, icon: BookOpen },
      { id: "summary", label: "الزتونة", icon: Sparkles },
      { id: "mindmap", label: `الخرائط الذهنية (${activeMaterial.mindmapImages?.length || 0})`, icon: MapIcon },
      { id: "flashcards", label: `البطاقات (${activeMaterial.flashcards?.length || 0})`, icon: Layers },
      { id: "questions", label: `الأسئلة (${totalQuestions})`, icon: HelpCircle },
      ...(hasSections ? [{ id: "sections" as const, label: "الشرح المفصل", icon: FileText }] : []),
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
                onClick={() => prevMaterial && openLesson(prevMaterial, studyTab === "sections" && !prevMaterial.structuredSections?.length ? "summary" : studyTab)}
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
                onClick={() => nextMaterial && openLesson(nextMaterial, studyTab === "sections" && !nextMaterial.structuredSections?.length ? "summary" : studyTab)}
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

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground">
              الزتونة والخرائط الذهنية
            </h1>
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-extrabold">
              {materials.length} درس
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            لكل درس في مكان واحد: فيديو الشرح، التعريفات بالترجمة، الزتونة، الخرائط الذهنية، البطاقات، وجميع الأسئلة بأنواعها.
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

      {/* Unit Filter Pills */}
      {unitsList.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedUnit("all")}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              selectedUnit === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            كل الوحدات ({materials.length})
          </button>
          {unitsList.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setSelectedUnit(u)}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedUnit === u
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {groupedByUnit.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-amber-500 mx-auto opacity-75" />
          <p className="text-sm font-bold text-foreground">لا توجد دروس مطابقة لبحثك حالياً.</p>
          <p className="text-xs text-muted-foreground">ستظهر كل الدروس والزتونة والخرائط الذهنية الخاصة بمرحلتك الدراسية هنا.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByUnit.map(([unitTitle, items]) => (
            <section key={unitTitle} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <h2 className="text-sm sm:text-base font-black text-foreground">{unitTitle}</h2>
                <span className="text-xs font-bold text-muted-foreground">({items.length})</span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const conceptsCount =
                    (m.summaryData?.keyConcepts?.length || 0) + (m.summaryData?.definitions?.length || 0);
                  const mapsCount = m.mindmapImages?.length || 0;
                  const cardsCount = m.flashcards?.length || 0;
                  const totalQ =
                    (m.questionCounts?.mcq || 0) +
                    (m.questionCounts?.trueFalse || 0) +
                    (m.questionCounts?.essay || 0);

                  return (
                    <div
                      key={m.id}
                      onClick={() => openLesson(m)}
                      className="group relative rounded-2xl border border-border bg-card p-4 shadow-2xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-bold">
                            <Sparkles className="h-3 w-3" /> زتونة + خريطة
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
                            {cardsCount} بطاقة
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
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
