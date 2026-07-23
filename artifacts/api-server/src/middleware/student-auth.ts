import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, studentSessionsTable, studentsTable } from "@workspace/db";
import { getAcademicStageDimensions } from "../lib/academic-stages";

export const STUDENT_COOKIE = "student_session";

export type ApprovedStudent = typeof studentsTable.$inferSelect;

function normalizeCategory(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("ar");
}

export function getStudentAllowedCategories(
  student: ApprovedStudent,
): string[] {
  const stage =
    student.grade === "أخرى" ? student.otherGradeDetail : student.grade;
  const seen = new Set<string>();
  return [stage, ...(student.enrolledCategories ?? [])]
    .map((value) => String(value ?? "").trim())
    .filter((value) => {
      const normalized = normalizeCategory(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function canStudentAccessCategory(
  student: ApprovedStudent,
  category: string,
): boolean {
  const normalized = normalizeCategory(category);
  return getStudentAllowedCategories(student).some(
    (value) => normalizeCategory(value) === normalized,
  );
}

function isGradeMatch(
  studentStage: string | null | undefined,
  contentStage: string | null | undefined,
): boolean {
  const sNorm = normalizeCategory(studentStage);
  const cNorm = normalizeCategory(contentStage);

  if (!sNorm || !cNorm) return false;
  if (sNorm === cNorm) return true;

  const getSystem = (value: string) => {
    if (value.includes("بكالوريا") || value.includes("baccalaureate")) return "baccalaureate";
    if (value.includes("جامع") || value.includes("كلية") || value.includes("حاسبات") || value.includes("هندسة") || value.includes("university")) return "university";
    if (value.includes("ثانوي") || value.includes("secondary")) return "secondary";
    return null;
  };
  const getUniversityTrack = (value: string) => {
    if (value.includes("حاسبات") || value.includes("computer") || value.includes("cs")) return "computer-science";
    if (value.includes("هندسة") || value.includes("engineering")) return "engineering";
    return null;
  };
  const getSchoolType = (value: string) => {
    if (value.includes("لغات") || value.includes("languages")) return "languages";
    if (value.includes("عربي") || value.includes("arabic")) return "arabic";
    return null;
  };

  const studentSystem = getSystem(sNorm);
  const contentSystem = getSystem(cNorm);
  if (studentSystem && contentSystem && studentSystem !== contentSystem) return false;

  const studentTrack = getUniversityTrack(sNorm);
  const contentTrack = getUniversityTrack(cNorm);
  if (studentTrack && contentTrack && studentTrack !== contentTrack) return false;

  const studentSchoolType = getSchoolType(sNorm);
  const contentSchoolType = getSchoolType(cNorm);
  if (studentSchoolType && contentSchoolType && studentSchoolType !== contentSchoolType) return false;

  if (sNorm.includes(cNorm) || cNorm.includes(sNorm)) return true;

  // Grade 1 matching
  const g1s = sNorm.includes("أولى") || sNorm.includes("الأول") || sNorm.includes("first") || sNorm.includes("year_1");
  const g1c = cNorm.includes("أولى") || cNorm.includes("الأول") || cNorm.includes("first") || cNorm.includes("year_1");
  if (g1s && g1c) return true;

  // Grade 2 matching
  const g2s = sNorm.includes("تانية") || sNorm.includes("الثاني") || sNorm.includes("second") || sNorm.includes("year_2");
  const g2c = cNorm.includes("تانية") || cNorm.includes("الثاني") || cNorm.includes("second") || cNorm.includes("year_2");
  if (g2s && g2c) return true;

  // Grade 3 matching
  const g3s = sNorm.includes("ثالثة") || sNorm.includes("الثالث") || sNorm.includes("third") || sNorm.includes("year_3");
  const g3c = cNorm.includes("ثالثة") || cNorm.includes("الثالث") || cNorm.includes("third") || cNorm.includes("year_3");
  if (g3s && g3c) return true;

  // Grade 4 matching
  const g4s = sNorm.includes("رابعة") || sNorm.includes("الرابع") || sNorm.includes("fourth") || sNorm.includes("year_4");
  const g4c = cNorm.includes("رابعة") || cNorm.includes("الرابع") || cNorm.includes("fourth") || cNorm.includes("year_4");
  if (g4s && g4c) return true;

  return false;
}

function isStructuredStageMatch(
  student: ApprovedStudent,
  contentStage: string,
): boolean | null {
  const content = getAcademicStageDimensions(contentStage);
  if (!content || !student.educationSystem || !student.educationGrade) return null;
  if (content.system !== student.educationSystem) return false;
  if (content.grade !== student.educationGrade) return false;
  if (content.system === "university") {
    return Boolean(student.academicTrack) && content.track === student.academicTrack;
  }
  return Boolean(student.schoolType) && content.schoolType === student.schoolType;
}

export function canStudentAccessContent(
  student: ApprovedStudent,
  category: string,
  stage?: string | null,
  stages?: string[] | null,
  courseId?: number | null,
): boolean {
  const studentStage =
    student.grade === "أخرى" ? student.otherGradeDetail : student.grade;
  const contentStages = stages?.length ? stages : stage ? [stage] : [];
  
  const isGeneralContent = contentStages.length === 0;
  const hasCategoryGeneralStage = contentStages.some(
    (value) => normalizeCategory(value) === "عام",
  );

  const stageMatches =
    isGeneralContent ||
    contentStages.some((value) => {
      const structuredMatch = isStructuredStageMatch(student, value);
      return structuredMatch ?? isGradeMatch(studentStage, value);
    });

  const assignedCourse = (student.enrolledCategories ?? []).some(
    (value) => normalizeCategory(value) === normalizeCategory(category),
  );
  const assignedCourseId =
    Boolean(courseId) &&
    (student.enrolledCourseIds ?? []).includes(Number(courseId));
  const hasExplicitCourseAssignments =
    (student.enrolledCourseIds ?? []).length > 0 ||
    (student.enrolledCategories ?? []).length > 0;

  const categoryMatches =
    assignedCourse || canStudentAccessCategory(student, category);
  const courseMatches = courseId
    ? assignedCourseId || categoryMatches
    : categoryMatches;

  // Files published directly to educational stages are independent from a
  // course enrollment. Their audience is the student's registered stage.
  if (!courseId && !isGeneralContent && !hasCategoryGeneralStage) {
    return stageMatches;
  }

  // New accounts with explicit course assignments must match the course.
  // Legacy approved accounts predate course IDs, so their existing stage is
  // the entitlement for stage-targeted content until an admin assigns courses.
  if (hasExplicitCourseAssignments && !courseMatches) return false;
  if (isGeneralContent || hasCategoryGeneralStage) {
    return hasExplicitCourseAssignments ? courseMatches : categoryMatches;
  }
  return stageMatches;
}

export function canStudentAccessLearningMode(
  student: ApprovedStudent,
  contentMode?: string | null,
): boolean {
  const studentMode = student.learningMode === "offline" ? "offline" : "online";
  const normalizedContentMode =
    contentMode === "offline"
      ? "offline"
      : contentMode === "both"
        ? "both"
        : "online";
  return (
    normalizedContentMode === "both" || normalizedContentMode === studentMode
  );
}

export async function getApprovedStudent(
  req: Request,
): Promise<ApprovedStudent | null> {
  const token = req.cookies?.[STUDENT_COOKIE];
  if (!token || typeof token !== "string") return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select({ student: studentsTable })
    .from(studentSessionsTable)
    .innerJoin(
      studentsTable,
      eq(studentSessionsTable.studentId, studentsTable.id),
    )
    .where(
      and(
        eq(studentSessionsTable.tokenHash, tokenHash),
        gt(studentSessionsTable.expiresAt, new Date()),
        eq(studentsTable.status, "approved"),
      ),
    )
    .limit(1);
  return row?.student ?? null;
}

export async function requireStudent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const student = await getApprovedStudent(req);
    if (!student) {
      res
        .status(401)
        .json({ error: "Student approval and login are required" });
      return;
    }
    res.locals.student = student;
    next();
  } catch (error) {
    next(error);
  }
}
