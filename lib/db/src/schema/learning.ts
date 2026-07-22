import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  accessCode: text("access_code"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  governorate: text("governorate"),
  city: text("city"),
  grade: text("grade"),
  otherGradeDetail: text("other_grade_detail"),
  learningMode: text("learning_mode").notNull().default("online"),
  enrolledCourseIds: jsonb("enrolled_course_ids").$type<number[]>().notNull().default([]),
  enrolledCategories: jsonb("enrolled_categories").$type<string[]>().notNull().default([]),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  phoneUnique: uniqueIndex("students_phone_unique").on(table.phone),
  accessCodeUnique: uniqueIndex("students_access_code_unique").on(table.accessCode),
  statusIndex: index("students_status_idx").on(table.status),
}));

export const studentSessionsTable = pgTable("student_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenUnique: uniqueIndex("student_sessions_token_unique").on(table.tokenHash),
  studentIndex: index("student_sessions_student_idx").on(table.studentId),
}));

export const learningFilesTable = pgTable("learning_files", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("عام"),
  stage: text("stage"),
  subject: text("subject"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  order: integer("order").notNull().default(0),
  originalName: text("original_name").notNull(),
  storageName: text("storage_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("عام"),
  stage: text("stage"),
  passingScore: integer("passing_score").notNull().default(60),
  questions: jsonb("questions").$type<QuizQuestion[]>().notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<number[]>().notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  quizIndex: index("quiz_attempts_quiz_idx").on(table.quizId),
  studentIndex: index("quiz_attempts_student_idx").on(table.studentId),
}));

export const videoProgressTable = pgTable("video_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull(),
  progress: integer("progress").notNull().default(0),
  currentTimeSeconds: integer("current_time_seconds").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  studentVideoUnique: uniqueIndex("video_progress_student_video_unique").on(table.studentId, table.videoId),
  studentIndex: index("video_progress_student_idx").on(table.studentId),
}));

export const studentNotificationsTable = pgTable("student_notifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  studentIndex: index("student_notifications_student_idx").on(table.studentId),
  createdAtIndex: index("student_notifications_created_at_idx").on(table.createdAt),
}));

export const codeRecoveryRequestsTable = pgTable("code_recovery_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  studentIndex: index("code_recovery_requests_student_idx").on(table.studentId),
  statusIndex: index("code_recovery_requests_status_idx").on(table.status),
}));
