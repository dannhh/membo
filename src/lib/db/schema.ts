import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

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

export const chatHistory = pgTable("chat_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  noteTitle: text("note_title").notNull(),
  mode: text("mode").notNull(),
  subMode: text("sub_mode").notNull().default(""),
  messages: text("messages").notNull().default("[]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("chat_history_session_idx").on(t.userId, t.noteType, t.noteTitle, t.mode, t.subMode),
]);

export type Note = typeof notes.$inferSelect;
export type NoteMetadata = typeof noteMetadata.$inferSelect;

export type ChatHistory = typeof chatHistory.$inferSelect;
