"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [deletingId, setDeletingId] = useState<string|null>(null);

  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const budgetedCategories = new Set(budgets.map((b) => b.category));

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
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    onRefresh();
  }

  const totalBudgeted = budgets.reduce((s,b)=>s+b.limitCents,0);
  const totalSpent = expenseTxs.reduce((s,t)=>s+t.amountCents,0);

  return (
    <div className="space-y-6 max-w-xl">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Budgeted", value: totalBudgeted, color: "text-gray-900" },
          { label: "Total Spent", value: totalSpent, color: totalSpent > totalBudgeted ? "text-red-500" : "text-gray-900" },
          { label: "Remaining", value: totalBudgeted - totalSpent, color: totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn("text-xl font-bold mt-1", s.color)}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Category Budgets</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus size={14} className="mr-1" /> Add Budget
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.filter((c) => !budgetedCategories.has(c)).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    category === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Monthly Limit ($)</label>
            <Input type="number" placeholder="e.g. 500" value={limit} onChange={(e)=>setLimit(e.target.value)} className="h-9 max-w-xs" autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setCategory(""); setLimit(""); }}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!category || !limit || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No budgets set for this month.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const spent = expenseTxs.filter((t)=>t.category===b.category).reduce((s,t)=>s+t.amountCents,0);
            const pct = Math.min(100, b.limitCents > 0 ? Math.round(spent/b.limitCents*100) : 0);
            const over = spent > b.limitCents;
            const dotColor = CATEGORY_COLORS[b.category] ?? "#9ca3af";
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                  <span className="text-sm font-medium text-gray-800 flex-1">{b.category}</span>
                  <span className={cn("text-sm font-bold", over ? "text-red-500" : "text-gray-700")}>
                    {fmt(spent)} <span className="text-xs font-normal text-gray-400">/ {fmt(b.limitCents)}</span>
                  </span>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId===b.id}
                    className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", over ? "bg-red-500" : "bg-indigo-500")}
                    style={{ width: `${pct}%`, background: over ? "#ef4444" : dotColor }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{pct}% used</span>
                  <span className={cn("text-[10px] font-medium", over ? "text-red-500" : "text-green-600")}>
                    {over ? `${fmt(spent - b.limitCents)} over` : `${fmt(b.limitCents - spent)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
