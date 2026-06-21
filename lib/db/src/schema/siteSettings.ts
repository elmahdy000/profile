import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  type: varchar("type", { length: 50 }).notNull().default("text"), // 'text', 'image', 'json'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
