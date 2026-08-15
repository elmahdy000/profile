import React from "react";
import type { Course } from "@workspace/api-client-react";
import { BookOpen, Plus, Edit2, Trash2 } from "lucide-react";
import { SecondaryButton, DangerButton } from "@/components/ui/admin-ui";

interface CoursesTabProps {
  coursesQuery: {
    data?: Course[];
    isLoading: boolean;
  };
  openCourseModal: (mode: "add" | "edit", course?: Course) => void;
  handleCourseDelete: (id: number) => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  coursesQuery,
  openCourseModal,
  handleCourseDelete,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة الكورسات</h2>
          <p className="text-xs text-muted-foreground mt-1">
            إضافة وتحديث باقة البرامج التدريبية
          </p>
        </div>
        <button
          onClick={() => openCourseModal("add")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> إضافة كورس
        </button>
      </div>

      {coursesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="flex gap-1.5">
                  <div className="h-4 bg-muted rounded w-14" />
                  <div className="h-4 bg-muted rounded w-14" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
                <div className="flex gap-2 pt-3 border-t border-border/80">
                  <div className="flex-1 h-8 bg-muted rounded-xl" />
                  <div className="h-8 bg-muted rounded-xl w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : coursesQuery.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <BookOpen className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-foreground font-bold text-lg">
            لا توجد كورسات مضافة
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            أضف أول كورس تدريبي ليظهر للطلاب في الموقع
          </p>
          <button
            onClick={() => openCourseModal("add")}
            className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
          >
            إضافة أول كورس الآن
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {coursesQuery.data?.map((course) => (
            <div
              key={course.id}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-48 bg-background">
                <img
                  src={course.img}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md border border-border px-3 py-1 rounded-full text-xs font-bold text-primary">
                  {course.category}
                </div>
                <div
                  className={`absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${
                    course.isPublished
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                      : "border-slate-400/30 bg-muted0/20 text-muted-foreground"
                  }`}
                >
                  {course.isPublished ? "منشور" : "مسودة"}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-foreground text-lg">
                    {course.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-muted text-foreground/90 text-[10px] px-2 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <div>السن: {course.age}</div>
                    <div>المدة: {course.duration}</div>
                    <div>الحصص: {course.sessions}</div>
                    <div>المستوى: {course.level}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border/80 pt-3">
                  <SecondaryButton
                    onClick={() => openCourseModal("edit", course)}
                    className="flex-1"
                  >
                    <Edit2 className="w-[18px] h-[18px]" strokeWidth={1.75} /> تعديل الكورس
                  </SecondaryButton>
                  <DangerButton onClick={() => handleCourseDelete(course.id)}>
                    <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </DangerButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
