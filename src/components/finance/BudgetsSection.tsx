"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmt, EXPENSE_CATEGORIES, CATEGORY_COLORS, type Transaction, type Budget } from "@/lib/finance";

export function BudgetsSection({ budgets, transactions, month, onRefresh }: {
  budgets: Budget[];
  transactions: Transaction[];
  month: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const totalBudgeted = budgets.reduce((s, b) => s + b.limitCents, 0);
  const totalSpent = expenseTxs.reduce((s, t) => s + t.amountCents, 0);
  const remaining = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? Math.min(100, Math.round(totalSpent / totalBudgeted * 100)) : 0;
  const overBudget = totalSpent > totalBudgeted && totalBudgeted > 0;

  async function handleAdd() {
    if (!category || !limit) return;
    setSaving(true);
    await fetch("/api/finance/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, limitCents: Math.round(parseFloat(limit) * 100), month }),
    });
    setSaving(false);
    setShowAdd(false);
    setCategory("");
    setLimit("");
    onRefresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/finance/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Budget</h2>
          {totalBudgeted > 0 && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {fmt(totalSpent)} of {fmt(totalBudgeted)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={showAdd}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-violet-100 hover:text-violet-600 text-gray-400 transition-colors disabled:opacity-40"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Overall progress */}
      {totalBudgeted > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${overallPct}%`, background: overBudget ? "#ef4444" : "#6366f1" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]">
            <span className={cn("font-medium", overBudget ? "text-red-400" : "text-gray-400")}>
              {overallPct}% used
            </span>
            <span className={cn("font-medium", remaining >= 0 ? "text-emerald-500" : "text-red-400")}>
              {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(-remaining)} over`}
            </span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mx-3 mb-3 rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">New budget</span>
            <button onClick={() => { setShowAdd(false); setCategory(""); setLimit(""); }} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.filter((c) => !budgetedCategories.has(c)).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                  category === c
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Monthly limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="h-8 text-xs flex-1"
              autoFocus
            />
            <Button size="sm" onClick={handleAdd} disabled={!category || !limit || saving} className="h-8 text-xs px-3">
              {saving ? "…" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Category list */}
      {budgets.length === 0 && !showAdd ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-gray-400">No budgets set for this month</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 text-xs text-violet-500 hover:text-violet-700 font-medium"
          >
            + Add one
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {budgets.map((b) => {
            const spent = expenseTxs.filter((t) => t.category === b.category).reduce((s, t) => s + t.amountCents, 0);
            const pct = Math.min(100, b.limitCents > 0 ? Math.round(spent / b.limitCents * 100) : 0);
            const over = spent > b.limitCents;
            const dotColor = CATEGORY_COLORS[b.category] ?? "#9ca3af";
            return (
              <div key={b.id} className="px-4 py-3 group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                    <span className="text-xs font-medium text-gray-700 truncate">{b.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={cn("text-xs font-semibold", over ? "text-red-500" : "text-gray-700")}>
                      {fmt(spent)}
                      <span className="text-[10px] font-normal text-gray-300 ml-0.5">/{fmt(b.limitCents)}</span>
                    </span>
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: over ? "#ef4444" : dotColor }}
                  />
                </div>
                {over && (
                  <p className="text-[10px] text-red-400 mt-1">{fmt(spent - b.limitCents)} over</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
