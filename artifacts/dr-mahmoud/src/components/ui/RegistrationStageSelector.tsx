import {
  EDUCATION_SYSTEMS,
  SCHOOL_TYPES,
  SYSTEM_GRADES,
  TRACKS,
  formatStageLabel,
  type EducationSystem,
  type Grade,
  type SchoolType,
  type Track,
} from "@/data/stage-model";

export type RegistrationStageSelection = {
  educationSystem: EducationSystem;
  educationGrade: Grade;
  schoolType: SchoolType | "none";
  academicTrack: "general" | "computer_science" | "engineering";
  grade: string;
};

type Props = {
  value: RegistrationStageSelection;
  onChange: (value: RegistrationStageSelection) => void;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/15";

export function createDefaultRegistrationStage(): RegistrationStageSelection {
  return buildSelection(
    "baccalaureate",
    "first_secondary",
    "arabic",
    "general",
  );
}

function buildSelection(
  educationSystem: EducationSystem,
  educationGrade: Grade,
  schoolType: SchoolType | "none",
  academicTrack: "general" | "computer_science" | "engineering",
): RegistrationStageSelection {
  const isUniversity = educationSystem === "university";
  const normalizedSchoolType = isUniversity ? "none" : schoolType === "none" ? "arabic" : schoolType;
  const normalizedTrack = isUniversity
    ? academicTrack === "general" ? "computer_science" : academicTrack
    : "general";
  return {
    educationSystem,
    educationGrade,
    schoolType: normalizedSchoolType,
    academicTrack: normalizedTrack,
    grade: formatStageLabel({
      system: educationSystem,
      grade: educationGrade,
      schoolType: isUniversity ? undefined : normalizedSchoolType as SchoolType,
      track: normalizedTrack as Track,
    }),
  };
}

export function RegistrationStageSelector({ value, onChange }: Props) {
  const update = (
    system = value.educationSystem,
    grade = value.educationGrade,
    schoolType = value.schoolType,
    track = value.academicTrack,
  ) => onChange(buildSelection(system, grade, schoolType, track));

  const handleSystem = (system: EducationSystem) => {
    const firstGrade = SYSTEM_GRADES[system][0].id;
    update(
      system,
      firstGrade,
      system === "university" ? "none" : "arabic",
      system === "university" ? "computer_science" : "general",
    );
  };

  const universityTracks = TRACKS.filter(
    (track) => track.id === "computer_science" || track.id === "engineering",
  );

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-bold">بيانات المرحلة الدراسية</legend>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
          <span>1. النظام التعليمي *</span>
          <select
            aria-label="النظام التعليمي"
            value={value.educationSystem}
            onChange={(event) => handleSystem(event.target.value as EducationSystem)}
            className={fieldClass}
          >
            {EDUCATION_SYSTEMS.map((system) => (
              <option key={system.id} value={system.id}>
                {system.label} ({system.eyebrow})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
          <span>2. الصف / السنة الدراسية *</span>
          <select
            aria-label="الصف أو السنة الدراسية"
            value={value.educationGrade}
            onChange={(event) => update(value.educationSystem, event.target.value as Grade)}
            className={fieldClass}
          >
            {SYSTEM_GRADES[value.educationSystem].map((grade) => (
              <option key={grade.id} value={grade.id}>{grade.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
          <span>3. نوع المدرسة / الدراسة *</span>
          {value.educationSystem === "university" ? (
            <select aria-label="نوع المدرسة أو الدراسة" value="none" disabled className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground`}>
              <option value="none">دراسة جامعية</option>
            </select>
          ) : (
            <select
              aria-label="نوع المدرسة أو الدراسة"
              value={value.schoolType}
              onChange={(event) => update(value.educationSystem, value.educationGrade, event.target.value as SchoolType)}
              className={fieldClass}
            >
              {SCHOOL_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
          <span>4. التخصص / المسار *</span>
          <select
            aria-label="التخصص أو المسار"
            value={value.academicTrack}
            disabled={value.educationSystem !== "university"}
            onChange={(event) => update(value.educationSystem, value.educationGrade, value.schoolType, event.target.value as "computer_science" | "engineering")}
            className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground`}
          >
            {value.educationSystem === "university" ? (
              universityTracks.map((track) => <option key={track.id} value={track.id}>{track.label}</option>)
            ) : (
              <option value="general">عام</option>
            )}
          </select>
        </label>
      </div>
      <p className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
        المسار المحدد: {value.grade}
      </p>
    </fieldset>
  );
}
