import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, studentSessionsTable, studentsTable } from "@workspace/db";

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
  if (cNorm === "عام") return true;

  // Grade 1 matching
  const s1 = sNorm.includes("أولى") || sNorm.includes("الأول") || sNorm.includes("first_secondary") || sNorm.includes("year_1");
  const c1 = cNorm.includes("أولى") || cNorm.includes("الأول") || cNorm.includes("first_secondary") || cNorm.includes("year_1");
  if (s1 || c1) return s1 && c1;

  // Grade 2 matching
  const s2 = sNorm.includes("تانية") || sNorm.includes("الثاني") || sNorm.includes("second_secondary") || sNorm.includes("year_2");
  const c2 = cNorm.includes("تانية") || cNorm.includes("الثاني") || cNorm.includes("second_secondary") || cNorm.includes("year_2");
  if (s2 || c2) return s2 && c2;

  // Grade 3 matching
  const s3 = sNorm.includes("ثالثة") || sNorm.includes("الثالث") || sNorm.includes("third_secondary") || sNorm.includes("year_3");
  const c3 = cNorm.includes("ثالثة") || cNorm.includes("الثالث") || cNorm.includes("third_secondary") || cNorm.includes("year_3");
  if (s3 || c3) return s3 && c3;

  return false;
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
  
  const isGeneralContent =
    contentStages.length === 0 ||
    contentStages.some((s) => normalizeCategory(s) === "عام");

  const stageMatches =
    isGeneralContent ||
    contentStages.some((value) => isGradeMatch(studentStage, value));

  const assignedCourse = (student.enrolledCategories ?? []).some(
    (value) => normalizeCategory(value) === normalizeCategory(category),
  );
  const assignedCourseId =
    Boolean(courseId) &&
    (student.enrolledCourseIds ?? []).includes(Number(courseId));

  if (courseId) {
    // If the student is explicitly enrolled in this course or category, allow access
    // (regardless of stage), so admins can grant cross-grade access.
    if (assignedCourseId || assignedCourse) return true;
    // Otherwise, fall through to stage-based access below.
  }

  const categoryMatches =
    assignedCourse || canStudentAccessCategory(student, category);
  if (contentStages.length > 0) {
    // Stage match is the primary gate. If stages are set and match the student's
    // grade, grant access. Category match is a fallback for "general" content.
    return stageMatches || (isGeneralContent && categoryMatches);
  }
  return categoryMatches;
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
