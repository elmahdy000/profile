import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { coursesTable } from "./courses";

export const curriculumsTable = pgTable("curriculums", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  stage: text("stage"),
  subject: text("subject").notNull(), // e.g. "Python", "C++", "Web"
  title: text("title").notNull(),     // e.g. "الدرس الأول: متغيرات"
  description: text("description"),   // optional desc
  images: jsonb("images").$type<string[]>().notNull(), // array of image URLs
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCurriculum = typeof curriculumsTable.$inferInsert;
export type Curriculum = typeof curriculumsTable.$inferSelect;
