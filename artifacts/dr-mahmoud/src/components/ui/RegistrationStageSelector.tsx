import { X } from "lucide-react";
import {
  EDUCATION_SYSTEMS,
  SCHOOL_TYPES,
  SYSTEM_GRADES,
  TRACKS,
  formatStageLabel,
  type EducationSystem,
  type Grade,
  type SchoolType,
} from "@/data/stage-model";

type RegistrationTrack = "general" | "computer_science" | "engineering";

export type RegistrationStageSelection = {
  educationSystem: EducationSystem | "";
  educationGrade: Grade | "";
  schoolType: SchoolType | "none" | "";
  academicTrack: RegistrationTrack | "";
  grade: string;
};

type Props = {
  value: RegistrationStageSelection;
  onChange: (value: RegistrationStageSelection) => void;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs";

export function createDefaultRegistrationStage(): RegistrationStageSelection {
  return {
    educationSystem: "",
    educationGrade: "",
    schoolType: "",
    academicTrack: "",
    grade: "",
  };
}

function completeSelection(
  educationSystem: EducationSystem | "",
  educationGrade: Grade | "",
  schoolType: SchoolType | "none" | "",
  academicTrack: RegistrationTrack | "",
): RegistrationStageSelection {
  const complete = Boolean(
    educationSystem &&
      educationGrade &&
      academicTrack &&
      (educationSystem === "university" || schoolType),
  );
  return {
    educationSystem,
    educationGrade,
    schoolType,
    academicTrack,
    grade: complete
      ? formatStageLabel({
          system: educationSystem as EducationSystem,
          grade: educationGrade as Grade,
          schoolType:
            educationSystem === "university"
              ? undefined
              : (schoolType as SchoolType),
          track: academicTrack as RegistrationTrack,
        })
      : "",
  };
}

export function RegistrationStageSelector({ value, onChange }: Props) {
  const system = value.educationSystem;
  const isUniversity = system === "university";
  const systemLabel = EDUCATION_SYSTEMS.find((item) => item.id === system)?.label;
  const gradeLabel = system
    ? SYSTEM_GRADES[system].find((item) => item.id === value.educationGrade)?.label
    : undefined;
  const schoolLabel = SCHOOL_TYPES.find((item) => item.id === value.schoolType)?.label;
  const trackLabel = TRACKS.find((item) => item.id === value.academicTrack)?.label;

  const chips = [
    systemLabel && { key: "system", label: systemLabel },
    gradeLabel && { key: "grade", label: gradeLabel },
    schoolLabel && { key: "school", label: schoolLabel },
    trackLabel && { key: "track", label: trackLabel },
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const removeChip = (key: string) => {
    if (key === "system") return onChange(createDefaultRegistrationStage());
    if (key === "grade")
      return onChange(completeSelection(system, "", isUniversity ? "none" : "", ""));
    if (key === "school")
      return onChange(completeSelection(system, value.educationGrade, "", value.academicTrack));
    onChange(completeSelection(system, value.educationGrade, value.schoolType, ""));
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:p-4">
      <legend className="px-1 text-xs font-extrabold uppercase text-primary tracking-wide">
        1. النظام والمرحلة الدراسية
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-bold text-foreground/80">
          <span>النظام التعليمي <span className="text-red-500">*</span></span>
          <select
            id="education-system"
            aria-label="النظام التعليمي"
            value={system}
            onChange={(event) =>
              onChange(
                completeSelection(
                  event.target.value as EducationSystem,
                  "",
                  event.target.value === "university" ? "none" : "",
                  "",
                ),
              )
            }
            required
            className={fieldClass}
          >
            <option value="">اختر النظام</option>
            {EDUCATION_SYSTEMS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        {system && (
          <label className="space-y-1 text-xs font-bold text-foreground/80">
            <span>السنة الدراسية <span className="text-red-500">*</span></span>
            <select
              id="education-grade"
              aria-label="السنة الدراسية"
              value={value.educationGrade}
              onChange={(event) =>
                onChange(
                  completeSelection(
                    system,
                    event.target.value as Grade,
                    isUniversity ? "none" : "",
                    "",
                  ),
                )
              }
              required
              className={fieldClass}
            >
              <option value="">اختر السنة</option>
              {SYSTEM_GRADES[system].map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        )}

        {system && value.educationGrade && !isUniversity && (
          <label className="space-y-1 text-xs font-bold text-foreground/80">
            <span>نوع المدرسة <span className="text-red-500">*</span></span>
            <select
              id="school-type"
              aria-label="نوع المدرسة"
              value={value.schoolType}
              onChange={(event) =>
                onChange(
                  completeSelection(
                    system,
                    value.educationGrade,
                    event.target.value as SchoolType,
                    "",
                  ),
                )
              }
              required
              className={fieldClass}
            >
              <option value="">اختر النوع</option>
              {SCHOOL_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        )}

        {system && value.educationGrade && (isUniversity || value.schoolType) && (
          <label className="space-y-1 text-xs font-bold text-foreground/80">
            <span>التخصص / المسار <span className="text-red-500">*</span></span>
            <select
              id="academic-track"
              aria-label="التخصص أو المسار"
              value={value.academicTrack}
              onChange={(event) =>
                onChange(
                  completeSelection(
                    system,
                    value.educationGrade,
                    isUniversity ? "none" : value.schoolType,
                    event.target.value as RegistrationTrack,
                  ),
                )
              }
              required
              className={fieldClass}
            >
              <option value="">اختر المسار</option>
              {isUniversity ? (
                TRACKS.filter((item) => item.id === "computer_science" || item.id === "engineering")
                  .map((item) => <option key={item.id} value={item.id}>{item.label}</option>)
              ) : (
                <option value="general">عام</option>
              )}
            </select>
          </label>
        )}
      </div>

      {chips.length > 0 && (
        <div aria-label="ملخص المرحلة المختارة" className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
          <span className="text-[11px] font-bold text-muted-foreground ml-1">المحدد:</span>
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 text-xs font-bold text-primary">
              {chip.label}
              <button type="button" onClick={() => removeChip(chip.key)} aria-label={`إزالة ${chip.label}`} className="grid h-4 w-4 place-items-center rounded-sm hover:bg-primary/20">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </fieldset>
  );
}
