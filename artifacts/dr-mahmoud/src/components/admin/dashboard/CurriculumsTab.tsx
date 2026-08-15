import React from "react";
import type { Curriculum } from "@workspace/api-client-react";
import { Library, Plus, Edit2, Trash2 } from "lucide-react";

interface CurriculumsTabProps {
  curriculumsQuery: {
    data?: Curriculum[];
    isLoading: boolean;
  };
  selectedSubjectFilter: string;
  setSelectedSubjectFilter: (subject: string) => void;
  openCurriculumModal: (mode: "add" | "edit", curriculum?: Curriculum) => void;
  handleCurriculumDelete: (id: number) => void;
}

export const CurriculumsTab: React.FC<CurriculumsTabProps> = ({
  curriculumsQuery,
  selectedSubjectFilter,
  setSelectedSubjectFilter,
  openCurriculumModal,
  handleCurriculumDelete,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            إدارة المناهج التعليمية
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            رفع وتنظيم دروس المناهج والمواد كمعارض صور
          </p>
        </div>
        <button
          onClick={() => openCurriculumModal("add")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> إضافة درس جديد
        </button>
      </div>

      {/* Subject Filters */}
      {curriculumsQuery.data && curriculumsQuery.data.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
              selectedSubjectFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30 font-bold"
                : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
            }`}
          >
            الكل ({curriculumsQuery.data.length})
          </button>
          {Array.from(
            new Set(curriculumsQuery.data.map((c) => c.subject)),
          ).map((subj) => {
            const count = curriculumsQuery.data!.filter(
              (c) => c.subject === subj,
            ).length;
            return (
              <button
                key={subj}
                onClick={() => setSelectedSubjectFilter(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                  selectedSubjectFilter === subj
                    ? "bg-primary/15 text-primary border-primary/30 font-bold"
                    : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                }`}
              >
                {subj} ({count})
              </button>
            );
          })}
        </div>
      )}

      {curriculumsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 animate-pulse"
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                  <div className="h-6 bg-muted rounded w-64" />
                </div>
                <div className="flex gap-2.5">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="w-20 h-24 bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : curriculumsQuery.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <Library className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-foreground font-bold text-lg">
            لا توجد دروس أو مناهج مضافة
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            يمكنك إضافة الدروس والمناهج على شكل مجموعات صور وسيقوم النظام
            بعرضها للطلاب
          </p>
          <button
            onClick={() => openCurriculumModal("add")}
            className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
          >
            إضافة أول درس الآن
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {curriculumsQuery.data
            ?.filter(
              (c) =>
                selectedSubjectFilter === "all" ||
                c.subject === selectedSubjectFilter,
            )
            ?.map((curriculum) => (
              <div
                key={curriculum.id}
                className="bg-card border border-border shadow-lg shadow-sm hover:border-border rounded-2xl p-6 transition-all flex flex-col gap-4"
              >
                {/* Upper Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {curriculum.subject}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        الترتيب: {curriculum.order}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-lg mt-1">
                      {curriculum.title}
                    </h3>
                    {curriculum.description && (
                      <p className="text-xs text-muted-foreground">
                        {curriculum.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end">
                    <button
                      onClick={() => openCurriculumModal("edit", curriculum)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-border"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button
                      onClick={() => handleCurriculumDelete(curriculum.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors border border-red-500/20"
                      title="حذف الدرس"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Images Preview Section */}
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground mb-2">
                    معاينة صفحات/صور الدرس ({curriculum.images.length})
                  </span>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                    {curriculum.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-24 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0 group"
                      >
                        <img
                          src={img}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] px-1 rounded text-white font-mono">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
