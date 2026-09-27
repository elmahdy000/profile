import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";

// ── Field wrapper ──
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ── Status badge ──
export function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "معتمد",
    suspended: "موقوف",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "approved" ? "bg-emerald-500/10 text-emerald-600" : status === "suspended" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}
    >
      {map[status] || status}
    </span>
  );
}

// ── Empty state ──
export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed p-20 text-center text-muted-foreground">
      {text}
    </div>
  );
}

// ── Course access checkboxes ──
interface CourseAccessProps {
  student: {
    enrolledCourseIds?: number[];
    enrolledCategories?: string[];
  };
  courses: Array<{ id: number; title: string }>;
  onChange: (courseIds: number[]) => void;
}

export function CourseAccess({ student, courses, onChange }: CourseAccessProps) {
  const selected = student.enrolledCourseIds?.length
    ? student.enrolledCourseIds
    : courses
        .filter((course) => (student.enrolledCategories || []).includes(course.title))
        .map((course) => course.id);
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3">
        <strong className="text-sm">الكورسات المسموح بيها</strong>
        <p className="text-xs text-muted-foreground">
          اختيار أي كورس هنا يحوّل الطالب للتحكم اليدوي الكامل، ويمكنك إضافة أو حذف أي كورس مهما كانت مرحلته.
        </p>
      </div>
      {courses.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          ضيف كورس من تبويب الكورسات علشان يظهر هنا.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {courses.map((course) => (
            <label
              key={course.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${selected.includes(course.id) ? "border-primary bg-primary/10 text-primary" : "bg-background"}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(course.id)}
                onChange={() =>
                  onChange(
                    selected.includes(course.id)
                      ? selected.filter((item) => item !== course.id)
                      : [...selected, course.id],
                  )
                }
              />
              {course.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Local file preview (before upload) ──
export function LocalFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return null;
  if (file.type.startsWith("image/"))
    return (
      <img
        src={url}
        alt={`معاينة ${file.name}`}
        className="max-h-64 w-full rounded-xl border bg-white object-contain"
      />
    );
  if (file.type === "application/pdf" || file.type.startsWith("text/"))
    return (
      <iframe
        src={url}
        title={`معاينة ${file.name}`}
        className="h-72 w-full rounded-xl border bg-white"
      />
    );
  return (
    <div className="rounded-xl border border-dashed bg-background p-4 text-center">
      <FileText className="mx-auto mb-2 text-primary" />
      <p className="text-xs font-bold">
        المتصفح مش بيدعم معاينة النوع ده، لكن الملف جاهز للرفع.
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {file.type || "نوع غير معروف"}
      </p>
    </div>
  );
}

// ── Reusable Stage Select Options ──
import { CANONICAL_STAGE_GROUPS, CANONICAL_STAGE_LABELS } from "@/data/stage-model";
import { GraduationCap, Loader2, Save, X, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function StageSelectOptions({ currentGrade }: { currentGrade?: string | null }) {
  const baccalaureateStages = CANONICAL_STAGE_GROUPS.secondary.filter((s) => s.includes("البكالوريا"));
  const generalSecStages = CANONICAL_STAGE_GROUPS.secondary.filter((s) => s.includes("الثانوية العامة"));

  return (
    <>
      <option value="">-- اختر المرحلة التعليمية --</option>
      <optgroup label="🎓 نظام البكالوريا">
        {baccalaureateStages.map((stg) => (
          <option key={stg} value={stg}>
            {stg}
          </option>
        ))}
      </optgroup>
      <optgroup label="🏫 الثانوية العامة">
        {generalSecStages.map((stg) => (
          <option key={stg} value={stg}>
            {stg}
          </option>
        ))}
      </optgroup>
      <optgroup label="💻 المرحلة الجامعية - كلية حاسبات ومعلومات">
        {CANONICAL_STAGE_GROUPS.computerScience.map((stg) => (
          <option key={stg} value={stg}>
            {stg}
          </option>
        ))}
      </optgroup>
      <optgroup label="⚙️ المرحلة الجامعية - كليات الهندسة">
        {CANONICAL_STAGE_GROUPS.engineering.map((stg) => (
          <option key={stg} value={stg}>
            {stg}
          </option>
        ))}
      </optgroup>
      {currentGrade && !CANONICAL_STAGE_LABELS.includes(currentGrade) && (
        <optgroup label="المرحلة الحالية المخصصة">
          <option value={currentGrade}>{currentGrade} (المرحلة الحالية)</option>
        </optgroup>
      )}
    </>
  );
}

export function ChangeStudentStageModal({
  isOpen,
  onClose,
  student,
  onStageUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  student: { id: number; name: string; grade?: string | null } | null;
  onStageUpdated?: (updatedStudent: any) => void;
}) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setSelectedGrade(student.grade || "");
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade || selectedGrade.trim() === "") {
      toast({
        variant: "destructive",
        title: "برجاء اختيار المرحلة",
        description: "يجب اختيار مرحلة دراسية صالحة للطالب.",
      });
      return;
    }

    if (selectedGrade === student.grade) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade: selectedGrade.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل تعديل مرحلة الطالب");
      }

      const updated = await res.json();
      onStageUpdated?.(updated);
      toast({
        title: "تم تعديل المرحلة بنجاح 🎓",
        description: `تم تحويل الطالب (${student.name}) إلى [${selectedGrade}] وتحديث أبعاده والكورسات تلقائياً.`,
      });
      onClose();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: err.message || "حدث خطأ أثناء تعديل المرحلة الدراسية",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">تعديل المرحلة الدراسية للطالب</h3>
              <p className="text-[11px] text-slate-500">تحديث مسار ونظام دراسة الطالب والكورسات التلقائية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-1">
            <span className="text-[11px] text-slate-500 block">الطالب:</span>
            <div className="flex items-center justify-between">
              <strong className="text-sm font-bold text-slate-900">{student.name}</strong>
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                المرحلة الحالية: {student.grade || "غير محدد"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">المرحلة الدراسية الجديدة</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <StageSelectOptions currentGrade={student.grade} />
            </select>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] font-medium text-amber-900 space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>ملاحظة مهمة:</span>
            </div>
            <p>
              عند تغيير المرحلة، سيتم تحديث أبعاد الحساب تلقائيًا (نظام التعليم، الصف، نوع المدرسة)، كما ستتم مزامنة الكورسات والفيديوهات والامتحانات المخصصة للمرحلة الجديدة فورًا.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !selectedGrade || selectedGrade === student.grade}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px] font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-1.5" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-1.5" />
                  حفظ وتطبيق المرحلة
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
