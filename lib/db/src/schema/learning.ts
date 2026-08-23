import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { coursesTable } from "./courses";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  accessCode: text("access_code"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  governorate: text("governorate"),
  city: text("city"),
  grade: text("grade"),
  educationSystem: text("education_system"),
  educationGrade: text("education_grade"),
  schoolType: text("school_type"),
  academicTrack: text("academic_track"),
  otherGradeDetail: text("other_grade_detail"),
  schoolName: text("school_name"),
  parentPhone: text("parent_phone"),
  languageTrack: text("language_track"),
  centerName: text("center_name"),
  appointmentSlot: text("appointment_slot"),
  learningMode: text("learning_mode").notNull().default("online"),
  enrolledCourseIds: jsonb("enrolled_course_ids").$type<number[]>().notNull().default([]),
  enrolledCategories: jsonb("enrolled_categories").$type<string[]>().notNull().default([]),
  paymentStatus: text("payment_status").notNull().default("unpaid"),  // unpaid | pending_review | paid
  subscriptionEndDate: timestamp("subscription_end_date"),  // null = no expiry set
  subscriptionNotifiedAt: timestamp("subscription_notified_at"),  // last time we notified about expiry
  currentSubscriptionId: integer("current_subscription_id").references((): AnyPgColumn => monthlySubscriptionsTable.id, { onDelete: "set null" }),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionStatus: text("subscription_status").default("active"),  // active | suspended | expired
  deviceId: text("device_id"), // Primary bound device token
  maxDevices: integer("max_devices").notNull().default(2), // Max allowed bound devices (default 2 devices per student)
  boundDevices: jsonb("bound_devices").$type<string[]>().notNull().default([]), // List of all approved bound device IDs
  approvedAt: timestamp("approved_at"),
  lastLoginAt: timestamp("last_login_at"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  phoneUnique: uniqueIndex("students_phone_unique").on(table.phone),
  emailUnique: uniqueIndex("students_email_unique").on(table.email),
  accessCodeUnique: uniqueIndex("students_access_code_unique").on(table.accessCode),
  statusIndex: index("students_status_idx").on(table.status),
  subscriptionStatusIndex: index("students_subscription_status_idx").on(table.subscriptionStatus),
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
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("عام"),
  stage: text("stage"),
  stages: jsonb("stages").$type<string[]>().notNull().default([]),
  targetType: text("target_type").notNull().default("stages"),
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
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;       // Explanation/Feedback for why the correct answer is right
  imageUrl?: string;          // Optional image attachment for the question (e.g. code snippet, diagram)
  points?: number;            // Custom points for this question (default 1)
};

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  videoId: integer("video_id"),
  scope: text("scope").notNull().default("course"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("عام"),
  stage: text("stage"),
  stages: jsonb("stages").$type<string[]>().notNull().default([]),
  durationMinutes: integer("duration_minutes"), // null = no time limit, e.g. 30 = 30-minute exam timer
  passingScore: integer("passing_score").notNull().default(60),
  maxAttempts: integer("max_attempts").notNull().default(3),
  requiredProgress: integer("required_progress").notNull().default(80),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  questionsToShow: integer("questions_to_show"),
  showExplanations: boolean("show_explanations").notNull().default(true),
  questions: jsonb("questions").$type<QuizQuestion[]>().notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questionBankTable = pgTable("question_bank", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "cascade" }),
  subject: text("subject"),
  stage: text("stage"),
  stages: jsonb("stages").$type<string[]>().notNull().default([]),
  category: text("category").notNull().default("عام"),
  difficulty: text("difficulty").notNull().default("medium"), // easy, medium, hard
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  question: jsonb("question").$type<QuizQuestion>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  courseIdx: index("question_bank_course_idx").on(table.courseId),
  categoryIdx: index("question_bank_category_idx").on(table.category),
}));

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<number[]>().notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  details: jsonb("details").$type<Array<{
    questionIndex: number;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
  }>>(),
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
  viewCount: integer("view_count").notNull().default(0),
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

export const studentNotesTable = pgTable("student_notes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull(),
  content: text("content").notNull(),
  timestampSeconds: integer("timestamp_seconds"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  studentVideoIndex: index("student_notes_student_video_idx").on(table.studentId, table.videoId),
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

export const paymentReceiptsTable = pgTable("payment_receipts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  snapshotStudentName: text("snapshot_student_name"),
  snapshotStudentPhone: text("snapshot_student_phone"),
  imageStorageName: text("image_storage_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: text("status").notNull().default("pending"),  // pending | approved | rejected
  adminNotes: text("admin_notes"),
  reviewedByRole: text("reviewed_by_role"), // superadmin | subadmin
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  studentIndex: index("payment_receipts_student_idx").on(table.studentId),
  statusIndex: index("payment_receipts_status_idx").on(table.status),
}));

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorRole: text("actor_role").notNull(), // 'superadmin' | 'subadmin'
  action: text("action").notNull(), // e.g. 'APPROVE_STUDENT', 'UPDATE_PAYMENT_STATUS', 'BROADCAST_NOTIFICATION', etc.
  targetType: text("target_type").notNull(), // e.g. 'student', 'receipt', 'notification', 'password'
  targetId: text("target_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  actorRoleIndex: index("audit_logs_actor_role_idx").on(table.actorRole),
  actionIndex: index("audit_logs_action_idx").on(table.action),
  createdAtIndex: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export const subadminAccountsTable = pgTable("subadmin_accounts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  usernameIndex: index("subadmin_accounts_username_idx").on(table.username),
}));

export const parentsTable = pgTable("parents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  parentCode: text("parent_code").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  phoneIndex: index("parents_phone_idx").on(table.phone),
  parentCodeUnique: uniqueIndex("parents_code_unique").on(table.parentCode),
  studentIndex: index("parents_student_idx").on(table.studentId),
}));

export const parentSessionsTable = pgTable("parent_sessions", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").notNull().references(() => parentsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenUnique: uniqueIndex("parent_sessions_token_unique").on(table.tokenHash),
  parentIndex: index("parent_sessions_parent_idx").on(table.parentId),
}));

export const monthlySubscriptionsTable = pgTable("monthly_subscriptions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  monthStartDate: timestamp("month_start_date").notNull(),
  monthEndDate: timestamp("month_end_date").notNull(),
  amountDue: integer("amount_due").notNull().default(500),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentDate: timestamp("payment_date"),
  receiptId: integer("receipt_id").references(() => paymentReceiptsTable.id, { onDelete: "set null" }),
  adminNotes: text("admin_notes"),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  studentIndex: index("monthly_subscriptions_student_idx").on(table.studentId),
  paymentStatusIndex: index("monthly_subscriptions_payment_status_idx").on(table.paymentStatus),
  monthEndDateIndex: index("monthly_subscriptions_month_end_date_idx").on(table.monthEndDate),
  studentMonthUnique: uniqueIndex("monthly_subscriptions_student_month_unique").on(table.studentId, table.monthStartDate),
}));

export type InsertMonthlySubscription = typeof monthlySubscriptionsTable.$inferInsert;
export type MonthlySubscription = typeof monthlySubscriptionsTable.$inferSelect;

