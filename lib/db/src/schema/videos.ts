import { pgTable, text, serial, timestamp, integer, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { learningFilesTable, quizzesTable } from "./learning";
import { coursesTable } from "./courses";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  category: text("category").notNull(),     // e.g. "سي بلس بلس C++", "برمجة ثانوية عامة"
  stage: text("stage"),
  stages: jsonb("stages").$type<string[]>().notNull().default([]),
  subject: text("subject"),
  learningMode: text("learning_mode").notNull().default("online"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  title: text("title").notNull(),           // title of video or playlist
  description: text("description"),         // optional description
  youtubeUrl: text("youtube_url").notNull(), // link to youtube video/playlist
  thumbnailUrl: text("thumbnail_url"),        // optional custom cover image/thumbnail URL
  type: text("type").notNull(),             // "video" or "playlist"
  order: integer("order").notNull().default(0),
  isProtected: boolean("is_protected").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  accessKey: text("access_key"),
  durationText: text("duration_text"),        // e.g. "12 ساعة" — real value entered by admin
  lessonsCount: integer("lessons_count"),      // real number of lessons entered by admin
  level: text("level"),                        // e.g. "مبتدئ" / "متوسط" / "متقدم"
  pdfFileId: integer("pdf_file_id").references(() => learningFilesTable.id, { onDelete: "set null" }),
  quizId: integer("quiz_id").references(() => quizzesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoFileAttachmentsTable = pgTable("video_file_attachments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videosTable.id, { onDelete: "cascade" }),
  fileId: integer("file_id").notNull().references(() => learningFilesTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  videoFileUnique: uniqueIndex("video_file_attachments_video_file_unique").on(table.videoId, table.fileId),
  videoIndex: index("video_file_attachments_video_idx").on(table.videoId),
}));

export type InsertVideo = typeof videosTable.$inferInsert;
export type Video = typeof videosTable.$inferSelect;
