import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  age: text("age").notNull(),
  duration: text("duration").notNull(),
  sessions: text("sessions").notNull(),
  level: text("level").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  img: text("img").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCourse = typeof coursesTable.$inferInsert;
export type Course = typeof coursesTable.$inferSelect;
