import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const curriculumsTable = pgTable("curriculums", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(), // e.g. "Python", "C++", "Web"
  title: text("title").notNull(),     // e.g. "الدرس الأول: متغيرات"
  description: text("description"),   // optional desc
  images: jsonb("images").$type<string[]>().notNull(), // array of image URLs
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCurriculum = typeof curriculumsTable.$inferInsert;
export type Curriculum = typeof curriculumsTable.$inferSelect;
