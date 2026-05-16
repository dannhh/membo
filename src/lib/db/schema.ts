import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const concepts = pgTable("concepts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const progress = pgTable("progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  conceptName: text("concept_name").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Concept = typeof concepts.$inferSelect;
export type Progress = typeof progress.$inferSelect;
