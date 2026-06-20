import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const podcastsTable = pgTable("podcasts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  desc: text("desc").notNull(),
  duration: text("duration").notNull(),
  youtubeUrl: text("youtube_url"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertPodcast = typeof podcastsTable.$inferInsert;
export type Podcast = typeof podcastsTable.$inferSelect;
