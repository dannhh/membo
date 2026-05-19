export const EXPENSE_CATEGORIES = [
  "Food & Dining", "Transport", "Housing", "Entertainment",
  "Healthcare", "Education", "Shopping", "Subscriptions",
  "Utilities", "Travel", "Personal Care", "Other",
];

export const INCOME_CATEGORIES = [
  "Salary", "Business", "Investment Returns", "Gift", "Freelance", "Other",
];

export const ACCOUNT_TYPES = [
  { value: "cash",       label: "Cash",         color: "#22c55e" },
  { value: "bank",       label: "Bank Account",         color: "#6366f1" },
  { value: "savings",    label: "Bank Savings Account", color: "#3b82f6" },
  { value: "credit",     label: "Credit Card",  color: "#f97316" },
  { value: "investment", label: "Investment",   color: "#a855f7" },
  { value: "debt",       label: "Debt / Loan",  color: "#ef4444" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining":    "#f97316",
  "Transport":        "#6366f1",
  "Housing":          "#3b82f6",
  "Entertainment":    "#ec4899",
  "Healthcare":       "#14b8a6",
  "Education":        "#8b5cf6",
  "Shopping":         "#f59e0b",
  "Subscriptions":    "#06b6d4",
  "Utilities":        "#64748b",
  "Travel":           "#10b981",
  "Personal Care":    "#e879f9",
  "Other":            "#9ca3af",
  "Salary":           "#22c55e",
  "Business":         "#16a34a",
  "Investment Returns":"#a855f7",
  "Gift":             "#f43f5e",
  "Freelance":        "#0ea5e9",
};

export function fmt(cents: number, compact = false): string {
  const abs = Math.abs(cents) / 100;
  if (compact) {
    if (abs >= 1_000_000) return `₫${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `₫${(abs / 1_000).toFixed(0)}K`;
  }
  return `₫${Math.round(abs).toLocaleString("en-US")}`;
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
}

export interface Account {
  id: string; userId: string; name: string; type: string;
  balanceCents: number; currency: string; color: string;
  dueDay: number | null;
  savingsStartDate: string | null;
  savingsTermMonths: number | null;
  savingsRate: number | null;
  createdAt: string; updatedAt: string;
}

export interface Installment {
  id: string; userId: string; accountId: string;
  description: string;
  totalAmountCents: number;
  monthlyAmountCents: number;
  totalMonths: number;
  startMonth: string; // YYYY-MM
  category: string;
  createdAt: string;
}

export interface Transaction {
  id: string; userId: string; accountId: string; type: string;
  amountCents: number; category: string; description: string;
  date: string; toAccountId: string | null; createdAt: string;
}

export interface Budget {
  id: string; userId: string; category: string;
  limitCents: number; month: string; createdAt: string; updatedAt: string;
}
