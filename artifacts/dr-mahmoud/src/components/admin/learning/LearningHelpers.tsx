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
