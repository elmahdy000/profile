import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UploadCloud,
  Loader2,
  X,
  Map as MapIcon,
  Layers,
  RefreshCw,
  BookOpen,
  HelpCircle,
  ClipboardCheck,
  Video,
  Search,
  Save,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KholasaContentEditor } from "./admin/KholasaContentEditor";
import {
  KholasaQuestionsManager,
  type AdminQbRow,
  type AdminEssayRow,
} from "./admin/KholasaQuestionsManager";
import {
  KholasaExamBuilder,
  type AdminLessonQuizRow,
} from "./admin/KholasaExamBuilder";
import type { KholasaMaterial } from "./types";

interface KholasaAdminTabProps {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  videoOptions: Array<{ id: number; title: string; stage?: string | null; courseId?: number | null }>;
}

type StudioTab = "basic" | "content" | "mindmaps" | "questions" | "exams";

interface LessonBundle {
  mcqQuestions: AdminQbRow[];
  trueFalseQuestions: AdminQbRow[];
  essayQuestions: AdminEssayRow[];
  quizzes: AdminLessonQuizRow[];
}

const DEFAULT_STAGE = "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي";

export function KholasaAdminTab({ adminApi, videoOptions }: KholasaAdminTabProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<KholasaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Studio Modal State
  const [editing, setEditing] = useState<KholasaMaterial | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>("basic");
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Per-lesson Bundle (Questions + Quizzes)
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundle, setBundle] = useState<LessonBundle>({
    mcqQuestions: [],
    trueFalseQuestions: [],
    essayQuestions: [],
    quizzes: [],
  });

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const res = await adminApi<{ materials: KholasaMaterial[] }>("/api/admin/learning/kholasa/materials");
      setMaterials(Array.isArray(res.materials) ? res.materials : []);
    } catch (err: any) {
      toast({ title: "تعذر تحميل المحتوى", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const loadBundle = async (materialId: number) => {
    if (!materialId) return;
    try {
      setBundleLoading(true);
      const res = await adminApi<{
        mcqQuestions: AdminQbRow[];
        trueFalseQuestions: AdminQbRow[];
        essayQuestions: AdminEssayRow[];
        quizzes: AdminLessonQuizRow[];
      }>(`/api/admin/learning/kholasa/materials/${materialId}/bundle`);
      setBundle({
        mcqQuestions: res.mcqQuestions || [],
        trueFalseQuestions: res.trueFalseQuestions || [],
        essayQuestions: res.essayQuestions || [],
        quizzes: res.quizzes || [],
      });
    } catch (err: any) {
      toast({ title: "تعذر تحميل أسئلة واختبارات الدرس", description: err.message, variant: "destructive" });
    } finally {
      setBundleLoading(false);
    }
  };

  const openEditor = (item: KholasaMaterial | null, initialTab: StudioTab = "basic") => {
    setStudioTab(initialTab);
    if (item) {
      setIsNew(false);
      setEditing({ ...item });
      void loadBundle(item.id);
    } else {
      setIsNew(true);
      const blank: KholasaMaterial = {
        id: 0,
        videoId: null,
        courseId: null,
        stage: stageFilter !== "all" ? stageFilter : DEFAULT_STAGE,
        stages: [stageFilter !== "all" ? stageFilter : DEFAULT_STAGE],
        unit: "",
        lesson: "",
        lessonOrder: 1,
        durationMinutes: 15,
        objectives: [],
        summaryData: {
          keyConcepts: [],
          definitions: [],
          formulas: [],
          comparisons: [],
          examTips: [],
          commonMistakes: [],
          checklist: [],
        },
        mindmapTitle: "",
        mindmapImages: [],
        structuredSections: [],
        flashcards: [],
        audioUrl: null,
        pdfUrl: null,
        isPublished: true,
      };
      setEditing(blank);
      setBundle({ mcqQuestions: [], trueFalseQuestions: [], essayQuestions: [], quizzes: [] });
    }
  };

  const handleUploadMindmap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editing) return;
    e.target.value = "";
    try {
      setUploadingImg(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await adminApi<{ url: string }>("/api/admin/learning/kholasa/upload-mindmap", {
          method: "POST",
          body: fd,
        });
        if (res.url) uploadedUrls.push(res.url);
      }
      setEditing({
        ...editing,
        mindmapImages: [...(editing.mindmapImages || []), ...uploadedUrls],
      });
      toast({ title: `تم رفع ${uploadedUrls.length} صورة بنجاح ✓` });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  };

  const moveMindmap = (idx: number, delta: -1 | 1) => {
    if (!editing) return;
    const target = idx + delta;
    if (target < 0 || target >= editing.mindmapImages.length) return;
    const next = [...editing.mindmapImages];
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditing({ ...editing, mindmapImages: next });
  };

  const handleSaveContent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editing) return;
    if (!editing.stage.trim() || !editing.unit.trim() || !editing.lesson.trim()) {
      toast({ title: "المرحلة واسم الوحدة واسم الدرس حقول مطلوبة", variant: "destructive" });
      setStudioTab("basic");
      return;
    }

    try {
      setSaving(true);
      const linkedVideo = editing.videoId ? videoOptions.find((v) => v.id === editing.videoId) : undefined;
      const payload = {
        videoId: editing.videoId,
        courseId: editing.courseId ?? linkedVideo?.courseId ?? null,
        stage: editing.stage.trim(),
        stages: [editing.stage.trim()],
        unit: editing.unit.trim(),
        lesson: editing.lesson.trim(),
        lessonOrder: Number(editing.lessonOrder) || 0,
        mindmapTitle: editing.mindmapTitle || editing.lesson.trim(),
        mindmapImages: editing.mindmapImages || [],
        summaryData: editing.summaryData || {},
        flashcards: editing.flashcards || [],
        structuredSections: editing.structuredSections || [],
        isPublished: editing.isPublished,
      };

      if (isNew) {
        const res = await adminApi<{ material: KholasaMaterial }>("/api/admin/learning/kholasa/materials", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "تم إنشاء الدرس وحفظه! يمكنك الآن إضافة أسئلته واختباراته ✓" });
        setIsNew(false);
        setEditing(res.material);
        await loadMaterials();
        await loadBundle(res.material.id);
      } else {
        const res = await adminApi<{ material: KholasaMaterial }>(
          `/api/admin/learning/kholasa/materials/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        toast({ title: "تم حفظ محتوى الدرس والزتونة بنجاح ✓" });
        setEditing(res.material);
        await loadMaterials();
      }
    } catch (err: any) {
      toast({ title: "تعذر الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: KholasaMaterial) => {
    try {
      await adminApi(`/api/admin/learning/kholasa/materials/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      toast({ title: item.isPublished ? "تم إخفاء الدرس عن الطلاب" : "تم نشر الدرس للطلاب ✓" });
      await loadMaterials();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الدرس من الخلاصة؟ (لن تُحذف أسئلة البنك أو الفيديو)")) return;
    try {
      await adminApi(`/api/admin/learning/kholasa/materials/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف بنجاح" });
      if (editing?.id === id) setEditing(null);
      await loadMaterials();
    } catch (err: any) {
      toast({ title: "تعذر الحذف", description: err.message, variant: "destructive" });
    }
  };

  const stages = Array.from(new Set(materials.map((m) => m.stage).filter(Boolean)));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        m.lesson.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q) ||
        (m.video?.title || "").toLowerCase().includes(q)
      );
    });
  }, [materials, stageFilter, search]);

  const groupedByUnit = useMemo(() => {
    const map = new Map<string, KholasaMaterial[]>();
    for (const m of filtered) {
      const key = `${m.stage} — ${m.unit}`;
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalQuestionsAcrossView = filtered.reduce(
    (sum, m) =>
      sum +
      (m.questionCounts?.mcq || 0) +
      (m.questionCounts?.trueFalse || 0) +
      (m.questionCounts?.essay || 0),
    0,
  );

  const stageSuggestions = Array.from(
    new Set([
      ...stages,
      "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
      "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
      "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
      "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)",
    ]),
  );

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            مركز إدارة المحتوى والأسئلة والاختبارات ({materials.length} درس • {totalQuestionsAcrossView} سؤال)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            أضف وعدّل كل ما يخص الدرس من مكان واحد منظم: الفيديو، التعريفات، الزتونة، الخرائط الذهنية، البطاقات، الأسئلة (اختياري/صح وخطأ/مقالي)، ورفع أو توليد الاختبارات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadMaterials()}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openEditor(null, "basic")}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> إضافة درس جديد بالمنهج
          </Button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStageFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              stageFilter === "all" ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            الكل ({materials.length})
          </button>
          {stages.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                stageFilter === st ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الدرس أو الوحدة..."
            className="w-full h-9 rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs"
          />
        </div>
      </div>

      {/* Lessons Grouped by Unit */}
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : groupedByUnit.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-slate-700">لا توجد دروس مطابقة للبحث.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByUnit.map(([unitHeader, items]) => (
            <section key={unitHeader} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <h4 className="text-sm font-black text-slate-900">{unitHeader}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {items.length} دروس
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const defsCount =
                    (m.summaryData?.definitions?.length || 0) +
                    (m.summaryData?.keyConcepts?.length || 0);
                  const totalQ =
                    (m.questionCounts?.mcq || 0) +
                    (m.questionCounts?.trueFalse || 0) +
                    (m.questionCounts?.essay || 0);

                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-primary/40 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              m.isPublished
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {m.isPublished ? "منشور" : "مخفي"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-1">
                            <Video className="h-3 w-3 text-sky-500" />
                            {m.video ? `فيديو #${m.video.id}` : "بدون فيديو"}
                          </span>
                        </div>

                        <h5 className="text-sm font-black text-slate-900 leading-snug">{m.lesson}</h5>

                        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          <span className="rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5">
                            {defsCount} تعريف/مفهوم
                          </span>
                          <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5">
                            {m.mindmapImages?.length || 0} خرائط
                          </span>
                          <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5">
                            {m.flashcards?.length || 0} بطاقة
                          </span>
                          <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5">
                            {totalQ} سؤال ({m.questionCounts?.mcq || 0} اختياري / {m.questionCounts?.trueFalse || 0} ص&خ / {m.questionCounts?.essay || 0} مقالي)
                          </span>
                          <span className="rounded-md bg-amber-50 text-amber-700 px-2 py-0.5">
                            {m.quizzesCount || 0} اختبار
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Row */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openEditor(m, "content")}
                          className="flex-1 h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> إدارة المحتوى والأسئلة
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditor(m, "exams")}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                          title="رفع أو توليد اختبار للدرس"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> اختبار
                        </Button>
                        <button
                          type="button"
                          onClick={() => void handleTogglePublish(m)}
                          className="h-8 w-8 grid place-items-center rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                          title={m.isPublished ? "إخفاء" : "نشر"}
                        >
                          {m.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(m.id)}
                          className="h-8 w-8 grid place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 5-Tab All-in-One Lesson Studio Modal */}
      {editing && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/55 p-2 sm:p-4" dir="rtl">
          <div className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-primary block">
                  {isNew ? "إنشاء درس جديد" : editing.unit || "استوديو الدرس"}
                </span>
                <h4 className="text-sm sm:text-base font-black truncate">
                  {isNew ? "إضافة محتوى وأسئلة واختبارات الدرس" : editing.lesson}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 rounded-xl hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 5 Studio Navigation Tabs */}
            <div className="flex overflow-x-auto gap-1.5 border-b border-slate-100 px-4 py-2.5 bg-white">
              {(
                [
                  { id: "basic", label: "1. البيانات والفيديو", icon: Video, disabled: false },
                  { id: "content", label: "2. الزتونة والتعريفات والبطاقات", icon: BookOpen, disabled: false },
                  { id: "mindmaps", label: `3. الخرائط الذهنية (${editing.mindmapImages?.length || 0})`, icon: MapIcon, disabled: false },
                  {
                    id: "questions",
                    label: `4. الأسئلة (${bundle.mcqQuestions.length + bundle.trueFalseQuestions.length + bundle.essayQuestions.length})`,
                    icon: HelpCircle,
                    disabled: isNew,
                  },
                  {
                    id: "exams",
                    label: `5. رفع/توليد الاختبارات (${bundle.quizzes.length})`,
                    icon: ClipboardCheck,
                    disabled: isNew,
                  },
                ] as const
              ).map(({ id, label, icon: Icon, disabled }) => (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setStudioTab(id)}
                  title={disabled ? "احفظ الدرس أولاً لتفعيل الأسئلة والاختبارات" : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    studioTab === id
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Studio Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs space-y-4">
              {studioTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">المرحلة الدراسية</label>
                      <input
                        type="text"
                        list="kholasa-stage-presets"
                        required
                        value={editing.stage}
                        onChange={(e) => setEditing({ ...editing, stage: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 px-3"
                      />
                      <datalist id="kholasa-stage-presets">
                        {stageSuggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">ربط بفيديو الشرح</label>
                      <select
                        value={editing.videoId || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, videoId: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white"
                      >
                        <option value="">— غير مربوط بفيديو —</option>
                        {videoOptions.map((v) => (
                          <option key={v.id} value={v.id}>
                            #{v.id} — {v.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">اسم الوحدة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: الوحدة الثالثة: تطبيقات الويب"
                        value={editing.unit}
                        onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 px-3"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">اسم الدرس</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: الدرس الأول: ..."
                        value={editing.lesson}
                        onChange={(e) => setEditing({ ...editing, lesson: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 px-3"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">ترتيب الدرس</label>
                      <input
                        type="number"
                        value={editing.lessonOrder || 1}
                        onChange={(e) => setEditing({ ...editing, lessonOrder: Number(e.target.value) || 0 })}
                        className="w-full h-9 rounded-xl border border-slate-200 px-3"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">عنوان الخريطة الذهنية (اختياري)</label>
                      <input
                        type="text"
                        value={editing.mindmapTitle || ""}
                        onChange={(e) => setEditing({ ...editing, mindmapTitle: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 px-3"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.isPublished}
                      onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    نشر الدرس للطلاب المفعلين والمسددين
                  </label>
                </div>
              )}

              {studioTab === "content" && (
                <KholasaContentEditor
                  summaryData={editing.summaryData || {}}
                  flashcards={editing.flashcards || []}
                  onChangeSummary={(nextSummary) => setEditing({ ...editing, summaryData: nextSummary })}
                  onChangeFlashcards={(nextCards) => setEditing({ ...editing, flashcards: nextCards })}
                />
              )}

              {studioTab === "mindmaps" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h5 className="font-black text-slate-900">صور الخرائط الذهنية للدرس ({editing.mindmapImages.length})</h5>
                      <p className="text-[11px] text-slate-500">يمكنك تحديد أكثر من صورة دفعة واحدة وإعادة ترتيبها.</p>
                    </div>
                    <label className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white cursor-pointer hover:opacity-90">
                      {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      <span>رفع صور خرائط ذهنية</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadMindmap} />
                    </label>
                  </div>

                  {editing.mindmapImages.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                      لا توجد صور مرفوعة بعد.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {editing.mindmapImages.map((img, i) => (
                        <div key={img + i} className="rounded-2xl border border-slate-200 bg-white p-2 space-y-2">
                          <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100">
                            <img src={img} alt={`خريطة ${i + 1}`} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500">لوحة #{i + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => moveMindmap(i, -1)}
                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                title="تحريك لليمين"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={i === editing.mindmapImages.length - 1}
                                onClick={() => moveMindmap(i, 1)}
                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                title="تحريك لليسار"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    mindmapImages: editing.mindmapImages.filter((_, idx) => idx !== i),
                                  })
                                }
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="حذف الصورة"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {studioTab === "questions" && !isNew && (
                bundleLoading ? (
                  <div className="grid place-items-center py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : (
                  <KholasaQuestionsManager
                    material={editing}
                    mcqQuestions={bundle.mcqQuestions}
                    trueFalseQuestions={bundle.trueFalseQuestions}
                    essayQuestions={bundle.essayQuestions}
                    adminApi={adminApi}
                    onRefreshBundle={async () => {
                      await loadBundle(editing.id);
                      await loadMaterials();
                    }}
                  />
                )
              )}

              {studioTab === "exams" && !isNew && (
                bundleLoading ? (
                  <div className="grid place-items-center py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : (
                  <KholasaExamBuilder
                    material={editing}
                    quizzes={bundle.quizzes}
                    totalBankQuestions={bundle.mcqQuestions.length + bundle.trueFalseQuestions.length}
                    adminApi={adminApi}
                    onRefreshBundle={async () => {
                      await loadBundle(editing.id);
                      await loadMaterials();
                    }}
                  />
                )
              )}
            </div>

            {/* Footer Save Bar (especially for tabs 1-3, plus Quick Close) */}
            <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                {studioTab === "questions" || studioTab === "exams"
                  ? "يتم حفظ الأسئلة والاختبارات مباشرةً في قاعدة البيانات فور إضافتها."
                  : "تأكد من الضغط على «حفظ المحتوى» لحفظ تعديلات البيانات والتعريفات والزتونة والخرائط."}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)} className="h-9 rounded-xl text-xs font-bold">
                  إغلاق
                </Button>
                {(studioTab === "basic" || studioTab === "content" || studioTab === "mindmaps" || isNew) && (
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveContent()}
                    className="h-9 px-5 rounded-xl text-xs font-black gap-1.5 cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isNew ? "إنشاء الدرس وحفظه" : "حفظ المحتوى والتعديلات ✓"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
