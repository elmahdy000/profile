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
  const stageMatches = contentStages.some(
    (value) =>
      normalizeCategory(value) === normalizeCategory(studentStage) ||
      normalizeCategory(value) === normalizeCategory("عام"),
  );
  const assignedCourse = (student.enrolledCategories ?? []).some(
    (value) => normalizeCategory(value) === normalizeCategory(category),
  );
  const assignedCourseId =
    Boolean(courseId) &&
    (student.enrolledCourseIds ?? []).includes(Number(courseId));
  if (courseId)
    return (
      (assignedCourseId || assignedCourse) &&
      (contentStages.length === 0 || stageMatches)
    );
  const categoryMatches =
    assignedCourse || canStudentAccessCategory(student, category);
  if (contentStages.length > 0) {
    return categoryMatches && stageMatches;
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
