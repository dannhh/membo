import { pgTable, text, timestamp, uuid, uniqueIndex, bigint, integer, doublePrecision } from "drizzle-orm/pg-core";

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

// ── Personal Finance ────────────────────────────────────────────────────────

export const financeAccounts = pgTable("finance_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // cash | bank | savings | credit | investment | debt
  balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  color: text("color").notNull().default("#6366f1"),
  dueDay: integer("due_day"),                        // credit cards only
  savingsStartDate: text("savings_start_date"),       // YYYY-MM-DD, savings only
  savingsTermMonths: integer("savings_term_months"),  // kỳ hạn (months)
  savingsRate: doublePrecision("savings_rate"),       // lãi suất %/năm
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
  toAccountId: uuid("to_account_id"), // only for transfer
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

export type Note = typeof notes.$inferSelect;
export type NoteMetadata = typeof noteMetadata.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;
export type FinanceAccount = typeof financeAccounts.$inferSelect;
export type FinanceInstallment = typeof financeInstallments.$inferSelect;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type FinanceBudget = typeof financeBudgets.$inferSelect;
