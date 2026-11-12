import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { KholasaMaterial } from "./types";

interface KholasaAdminTabProps {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  videoOptions: Array<{ id: number; title: string; stage?: string | null; courseId?: number | null }>;
}

export function KholasaAdminTab({ adminApi, videoOptions }: KholasaAdminTabProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<KholasaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [editing, setEditing] = useState<KholasaMaterial | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Editable JSON/text states inside modal
  const [summaryJsonText, setSummaryJsonText] = useState("{}");
  const [flashcardsJsonText, setFlashcardsJsonText] = useState("[]");

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminApi<{ materials: KholasaMaterial[] }>("/api/admin/learning/kholasa/materials");
      setMaterials(Array.isArray(res.materials) ? res.materials : []);
    } catch (err: any) {
      toast({ title: "تعذر تحميل مواد الخلاصة", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openEditor = (item: KholasaMaterial | null) => {
    if (item) {
      setIsNew(false);
      setEditing({ ...item });
      setSummaryJsonText(JSON.stringify(item.summaryData || {}, null, 2));
      setFlashcardsJsonText(JSON.stringify(item.flashcards || [], null, 2));
    } else {
      setIsNew(true);
      const blank: KholasaMaterial = {
        id: 0,
        videoId: null,
        courseId: null,
        stage: "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
        stages: ["البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي"],
        unit: "",
        lesson: "",
        lessonOrder: 1,
        durationMinutes: 15,
        objectives: [],
        summaryData: {
          keyConcepts: [],
          definitions: [],
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
      setSummaryJsonText(JSON.stringify(blank.summaryData, null, 2));
      setFlashcardsJsonText("[]");
    }
  };

  const handleUploadMindmap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    try {
      setUploadingImg(true);
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminApi<{ url: string }>("/api/admin/learning/kholasa/upload-mindmap", {
        method: "POST",
        body: fd,
      });
      setEditing({
        ...editing,
        mindmapImages: [...(editing.mindmapImages || []), res.url],
      });
      toast({ title: "تم رفع صورة الخريطة الذهنية بنجاح ✓" });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    let parsedSummary: any;
    let parsedCards: any;
    try {
      parsedSummary = JSON.parse(summaryJsonText || "{}");
    } catch {
      toast({ title: "خطأ في صيغة JSON للزتونة", variant: "destructive" });
      return;
    }
    try {
      parsedCards = JSON.parse(flashcardsJsonText || "[]");
    } catch {
      toast({ title: "خطأ في صيغة JSON للبطاقات", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        videoId: editing.videoId,
        courseId: editing.courseId,
        stage: editing.stage,
        stages: [editing.stage],
        unit: editing.unit,
        lesson: editing.lesson,
        lessonOrder: editing.lessonOrder,
        mindmapTitle: editing.mindmapTitle || editing.lesson,
        mindmapImages: editing.mindmapImages,
        summaryData: parsedSummary,
        flashcards: parsedCards,
        isPublished: editing.isPublished,
      };

      if (isNew) {
        await adminApi("/api/admin/learning/kholasa/materials", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "تمت إضافة مادة الخلاصة بنجاح ✓" });
      } else {
        await adminApi(`/api/admin/learning/kholasa/materials/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "تم تحديث مادة الخلاصة بنجاح ✓" });
      }
      setEditing(null);
      await load();
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
      toast({ title: item.isPublished ? "تم إخفاء الزتونة عن الطلاب" : "تم نشر الزتونة للطلاب ✓" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف مادة الخلاصة هذه؟")) return;
    try {
      await adminApi(`/api/admin/learning/kholasa/materials/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف بنجاح" });
      await load();
    } catch (err: any) {
      toast({ title: "تعذر الحذف", description: err.message, variant: "destructive" });
    }
  };

  const stages = Array.from(new Set(materials.map((m) => m.stage).filter(Boolean)));
  const visible = stageFilter === "all" ? materials : materials.filter((m) => m.stage === stageFilter);

  return (
    <div className="space-y-5 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            إدارة الزتونات والخرائط الذهنية ({materials.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            تعديل المفاهيم، التعريفات، تكات الامتحان، رفع صور الخرائط الذهنية، وربط كل مادة بالفيديو الخاص بها.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openEditor(null)}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> إضافة درس خلاصة
          </Button>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="flex flex-wrap gap-2">
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

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    m.isPublished
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {m.isPublished ? "منشور للطلاب" : "مخفي"}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {m.videoId ? `فيديو #${m.videoId}` : "غير مربوط بفيديو"}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{m.unit}</p>
                <h4 className="text-sm font-black text-slate-900 leading-snug mt-0.5">{m.lesson}</h4>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                  <MapIcon className="h-3 w-3" /> {m.mindmapImages?.length || 0} خرائط
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                  <Layers className="h-3 w-3" /> {m.flashcards?.length || 0} بطاقة
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleTogglePublish(m)}
                  className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                  title={m.isPublished ? "إخفاء" : "نشر"}
                >
                  {m.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditor(m)}
                  className="h-8 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" /> تعديل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(m.id)}
                  className="h-8 px-2.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-3 sm:p-5" dir="rtl">
          <form
            onSubmit={handleSave}
            className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h4 className="text-base font-black">
                {isNew ? "إضافة مادة خلاصة جديدة" : `تعديل: ${editing.lesson}`}
              </h4>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">المرحلة الدراسية</label>
                  <input
                    type="text"
                    required
                    value={editing.stage}
                    onChange={(e) => setEditing({ ...editing, stage: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">ربط بفيديو الدرس (اختياري)</label>
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
                    value={editing.lesson}
                    onChange={(e) => setEditing({ ...editing, lesson: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3"
                  />
                </div>
              </div>

              {/* Mindmap Images Manager */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800">صور الخرائط الذهنية ({editing.mindmapImages.length})</span>
                  <label className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white cursor-pointer hover:opacity-90">
                    {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                    <span>رفع صورة خريطة</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMindmap} />
                  </label>
                </div>
                {editing.mindmapImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editing.mindmapImages.map((img, i) => (
                      <div key={img + i} className="relative group h-20 w-28 rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              mindmapImages: editing.mindmapImages.filter((_, idx) => idx !== i),
                            })
                          }
                          className="absolute top-1 left-1 rounded-full bg-rose-600 p-1 text-white shadow cursor-pointer"
                          title="حذف الصورة"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold block mb-1">بيانات الزتونة (JSON)</label>
                <textarea
                  dir="ltr"
                  rows={8}
                  value={summaryJsonText}
                  onChange={(e) => setSummaryJsonText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">البطاقات التعليمية Flashcards (JSON)</label>
                <textarea
                  dir="ltr"
                  rows={5}
                  value={flashcardsJsonText}
                  onChange={(e) => setFlashcardsJsonText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving} className="px-6 font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
