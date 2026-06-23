import { pgTable, text, timestamp, uuid, uniqueIndex, bigint, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  summary: text("summary"),
  folderId: uuid("folder_id"),
  isPublic: boolean("is_public").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("folders_user_parent_name_idx").on(t.userId, t.parentId, t.name),
]);

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

// ── Writing (generic essay submission + AI grading) ─────────────────────────

export const writingRubrics = pgTable("writing_rubrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull().default("concept"),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const writingSubmissions = pgTable("writing_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  noteTitle: text("note_title").notNull(),
  rubricId: text("rubric_id").notNull(), // builtin slug or writingRubrics.id
  rubricName: text("rubric_name").notNull(),
  essayText: text("essay_text").notNull(),
  feedback: text("feedback").notNull(),
  score: text("score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Imported document source (shared across a note's modes) ─────────────────
// Extracted text of a document a user imported for a note. Saved once on import
// so it's available in Study, Quiz, and Materials without re-importing.

export const noteDocuments = pgTable("note_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  noteTitle: text("note_title").notNull(),
  sourceName: text("source_name"), // file name or URL, for display
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("note_documents_user_note_idx").on(t.userId, t.noteType, t.noteTitle),
]);

// ── Flashcards (spaced repetition / SM-2) ───────────────────────────────────

export const flashcards = pgTable("flashcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  noteType: text("note_type").notNull(),
  noteTitle: text("note_title").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  source: text("source").notNull().default("concept"), // concept | vocab
  // SM-2 schedule state
  dueAt: timestamp("due_at").defaultNow().notNull(),
  intervalDays: integer("interval_days").notNull().default(0),
  easeFactor: doublePrecision("ease_factor").notNull().default(2.5),
  repetitions: integer("repetitions").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("flashcards_user_note_front_idx").on(t.userId, t.noteType, t.noteTitle, t.front),
]);

// ── Personal Finance ────────────────────────────────────────────────────────

export const financeAccounts = pgTable("finance_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // cash | bank | savings | credit | investment | debt
  balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  color: text("color").notNull().default("#6366f1"),
  dueDay: integer("due_day"),
  savingsStartDate: text("savings_start_date"),
  savingsTermMonths: integer("savings_term_months"),
  savingsRate: doublePrecision("savings_rate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const financeInstallments = pgTable("finance_installments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  accountId: uuid("account_id").notNull(),
  description: text("description").notNull(),
  totalAmountCents: bigint("total_amount_cents", { mode: "number" }).notNull(),
  monthlyAmountCents: bigint("monthly_amount_cents", { mode: "number" }).notNull(),
  totalMonths: integer("total_months").notNull(),
  startMonth: text("start_month").notNull(), // YYYY-MM
  category: text("category").notNull().default("Shopping"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financeTransactions = pgTable("finance_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  accountId: uuid("account_id").notNull(),
  type: text("type").notNull(), // income | expense | transfer
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  toAccountId: uuid("to_account_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financeBudgets = pgTable("finance_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  limitCents: bigint("limit_cents", { mode: "number" }).notNull(),
  month: text("month").notNull(), // YYYY-MM
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("finance_budgets_user_cat_month_idx").on(t.userId, t.category, t.month),
]);

// ── Calendar ─────────────────────────────────────────────────────────────────

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  date: text("date").notNull(),       // YYYY-MM-DD
  startTime: text("start_time"),      // HH:MM, null = all-day
  endTime: text("end_time"),          // HH:MM
  type: text("type").notNull().default("event"), // event | task | study
  color: text("color").notNull().default("#6366f1"),
  completed: boolean("completed").notNull().default(false),
  noteTitle: text("note_title"),      // study type: linked note
  googleEventId: text("google_event_id"), // null = local-only event
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Habits ───────────────────────────────────────────────────────────────────
// Pre-existing table with no app code wired up yet — declared here so schema
// pushes don't treat it as deleted.

export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#f59e0b"),
  targetPerWeek: integer("target_per_week").notNull().default(3),
  durationMins: integer("duration_mins").notNull().default(30),
  preferredTime: text("preferred_time").notNull().default("morning"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type NoteMetadata = typeof noteMetadata.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;
export type FinanceAccount = typeof financeAccounts.$inferSelect;
export type FinanceInstallment = typeof financeInstallments.$inferSelect;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type FinanceBudget = typeof financeBudgets.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type WritingRubricRow = typeof writingRubrics.$inferSelect;
export type WritingSubmission = typeof writingSubmissions.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type NoteDocument = typeof noteDocuments.$inferSelect;
