import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { learningFilesTable, quizzesTable } from "./learning";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),     // e.g. "سي بلس بلس C++", "برمجة ثانوية عامة"
  title: text("title").notNull(),           // title of video or playlist
  description: text("description"),         // optional description
  youtubeUrl: text("youtube_url").notNull(), // link to youtube video/playlist
  type: text("type").notNull(),             // "video" or "playlist"
  order: integer("order").notNull().default(0),
  isProtected: boolean("is_protected").notNull().default(false),
  accessKey: text("access_key"),
  durationText: text("duration_text"),        // e.g. "12 ساعة" — real value entered by admin
  lessonsCount: integer("lessons_count"),      // real number of lessons entered by admin
  level: text("level"),                        // e.g. "مبتدئ" / "متوسط" / "متقدم"
  pdfFileId: integer("pdf_file_id").references(() => learningFilesTable.id, { onDelete: "set null" }),
  quizId: integer("quiz_id").references(() => quizzesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertVideo = typeof videosTable.$inferInsert;
export type Video = typeof videosTable.$inferSelect;

