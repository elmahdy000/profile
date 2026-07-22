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
  "h-[52px] w-full rounded-xl border border-border bg-background px-4 text-[15px] font-medium text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/15";

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
    <fieldset className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5">
      <legend className="px-1 text-lg font-bold text-foreground">
        المرحلة الدراسية
      </legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-foreground">
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
            <option value="">اختر النظام التعليمي</option>
            {EDUCATION_SYSTEMS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        {system && (
          <label className="space-y-2 text-sm font-semibold text-foreground">
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
              <option value="">اختر السنة الدراسية</option>
              {SYSTEM_GRADES[system].map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        )}

        {system && value.educationGrade && !isUniversity && (
          <label className="space-y-2 text-sm font-semibold text-foreground">
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
              <option value="">اختر نوع المدرسة</option>
              {SCHOOL_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        )}

        {system && value.educationGrade && (isUniversity || value.schoolType) && (
          <label className="space-y-2 text-sm font-semibold text-foreground">
            <span>التخصص أو المسار <span className="text-red-500">*</span></span>
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
              <option value="">اختر التخصص أو المسار</option>
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
        <div aria-label="ملخص المرحلة المختارة" className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800">
              {chip.label}
              <button type="button" onClick={() => removeChip(chip.key)} aria-label={`إزالة ${chip.label}`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </fieldset>
  );
}
