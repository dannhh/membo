import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  summary: text("summary"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const noteMetadata = pgTable("note_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  noteTitle: text("note_title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NoteMetadata = typeof noteMetadata.$inferSelect;
