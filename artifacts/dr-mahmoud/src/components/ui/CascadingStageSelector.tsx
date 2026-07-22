import React, { useState } from "react";
import {
  EducationSystem,
  Grade,
  SchoolType,
  Track,
  EDUCATION_SYSTEMS,
  SYSTEM_GRADES,
  SCHOOL_TYPES,
  TRACKS,
  createStageId,
  formatStageLabel,
  normalizeLegacyStage,
} from "@/data/stage-model";
import { Plus, X, Check, Layers, AlertCircle } from "lucide-react";

export interface CascadingStageSelectorProps {
  selectedStages: string[];
  onChange: (stages: string[]) => void;
  allowMultiple?: boolean;
}

export const CascadingStageSelector: React.FC<CascadingStageSelectorProps> = ({
  selectedStages,
  onChange,
  allowMultiple = true,
}) => {
  // Cascading form state
  const [system, setSystem] = useState<EducationSystem>("baccalaureate");
  const [grade, setGrade] = useState<Grade>("first_secondary");
  const [schoolType, setSchoolType] = useState<SchoolType>("arabic");
  const [track, setTrack] = useState<Track>("general");
  const [isGeneralForEveryone, setIsGeneralForEveryone] = useState<boolean>(
    selectedStages.includes("عام") || selectedStages.length === 0,
  );

  // Available grades for currently selected system
  const availableGrades = SYSTEM_GRADES[system] || [];

  // Currently generated label for preview
  const currentPreviewLabel = formatStageLabel({
    system,
    grade,
    schoolType: system === "university" ? undefined : schoolType,
    track,
  });

  const currentStageId = createStageId({
    system,
    grade,
    schoolType: system === "university" ? undefined : schoolType,
    track,
  });

  // Handle system selection change & set smart default grade
  const handleSystemChange = (newSystem: EducationSystem) => {
    setSystem(newSystem);
    const newGrades = SYSTEM_GRADES[newSystem];
    if (newGrades && newGrades.length > 0) {
      setGrade(newGrades[0].id);
    }
    if (newSystem === "university") {
      setTrack("computer_science");
    } else {
      setTrack("general");
    }
  };

  // Add current stage selection to list
  const handleAddCurrentStage = () => {
    setIsGeneralForEveryone(false);
    // Remove "عام" if adding specific stage
    const cleanExisting = selectedStages.filter((s) => s !== "عام");

    if (cleanExisting.includes(currentPreviewLabel)) {
      return; // prevent duplicate
    }

    if (!allowMultiple) {
      onChange([currentPreviewLabel]);
    } else {
      onChange([...cleanExisting, currentPreviewLabel]);
    }
  };

  // Toggle "عام لجميع الطلاب"
  const handleToggleGeneral = () => {
    if (isGeneralForEveryone) {
      setIsGeneralForEveryone(false);
      onChange([]);
    } else {
      setIsGeneralForEveryone(true);
      onChange(["عام"]);
    }
  };

  // Remove individual stage chip
  const handleRemoveStage = (stageLabelToRemove: string) => {
    const updated = selectedStages.filter((s) => s !== stageLabelToRemove);
    if (updated.length === 0) {
      setIsGeneralForEveryone(true);
      onChange(["عام"]);
    } else {
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4 bg-muted/20 border border-border/80 rounded-2xl p-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Layers className="w-4 h-4 text-[#0B63CE]" strokeWidth={1.75} />
          <span>مُحدِد المراحل الدراسية المنظم (Cascading Stage Selector)</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          اختر بالنظام والصف لمنع التكرار
        </span>
      </div>

      {/* General Stage Checkbox Banner */}
      <div className="bg-[#EAF3FF] border border-[#0B63CE]/20 rounded-xl p-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-[#0B63CE]">
          <input
            type="checkbox"
            checked={selectedStages.includes("عام") || isGeneralForEveryone}
            onChange={handleToggleGeneral}
            className="w-4 h-4 rounded text-[#0B63CE] focus:ring-[#0B63CE]"
          />
          <span>🌐 متاح لكل الطلاب (عام لجميع المراحل والتخصصات تلقائياً)</span>
        </label>
      </div>

      {/* Cascading Controls Grid */}
      {(!isGeneralForEveryone || selectedStages.filter((s) => s !== "عام").length > 0) && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1: Education System */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                1. النظام التعليمي *
              </label>
              <select
                value={system}
                onChange={(e) => handleSystemChange(e.target.value as EducationSystem)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#0B63CE] focus:border-[#0B63CE]"
              >
                {EDUCATION_SYSTEMS.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.label} ({sys.eyebrow})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Grade */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                2. الصف / السنة الدراسية *
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#0B63CE] focus:border-[#0B63CE]"
              >
                {availableGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: School Type (Hidden for University) */}
            {system !== "university" ? (
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  3. نوع المدرسة / الدراسة *
                </label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#0B63CE] focus:border-[#0B63CE]"
                >
                  {SCHOOL_TYPES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="opacity-50">
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  3. نوع المدرسة
                </label>
                <div className="bg-muted px-3 py-2 rounded-xl text-xs text-muted-foreground font-medium border border-border">
                  غير منطبق على الجامعة
                </div>
              </div>
            )}

            {/* Step 4: Track */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                4. التخصص / المسار *
              </label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as Track)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#0B63CE] focus:border-[#0B63CE]"
              >
                {TRACKS.filter((t) => !t.systemScope || t.systemScope === system || t.id === "general").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generated Stage Review Banner & Add Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-background border border-border rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">المرحلة المحددة للمراجعة:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E9F8F1] text-[#16A36A] border border-[#B7E7D0]">
                <Check className="w-3.5 h-3.5" />
                {currentPreviewLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddCurrentStage}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0B63CE] hover:bg-[#0956B4] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#0B63CE]/15"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة هذه المرحلة للمحتوى</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Stages Compact Chips List */}
      <div className="pt-2 border-t border-border/40 space-y-2">
        <span className="block text-[11px] font-bold text-muted-foreground">
          المراحل المحددة فعلياً لهذا الدرس ({selectedStages.length}):
        </span>

        <div className="flex flex-wrap gap-2">
          {selectedStages.map((stageItem) => {
            const isGeneral = stageItem === "عام";
            const normalized = normalizeLegacyStage(stageItem);
            const displayLabel = isGeneral ? "🌐 كل المراحل (عام للجميع)" : normalized.label;

            return (
              <div
                key={stageItem}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isGeneral
                    ? "bg-[#EAF3FF] text-[#0B63CE] border-[#B8D7FF]"
                    : "bg-[#F8FAFC] text-[#14213D] border-[#D0D5DD]"
                }`}
              >
                <span>{displayLabel}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStage(stageItem)}
                  className="p-0.5 rounded-full hover:bg-black/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="إزالة هذه المرحلة"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
