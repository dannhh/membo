"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ArrowLeftRight, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmt, CATEGORY_COLORS, type Account, type Transaction } from "@/lib/finance";

export function TransactionsSection({ transactions, accounts, onRefresh, onAdd }: {
  transactions: Transaction[];
  accounts: Account[];
  onRefresh: () => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all"|"income"|"expense"|"transfer">("all");
  const [deletingId, setDeletingId] = useState<string|null>(null);

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/finance/transactions", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    onRefresh();
  }

  const typeIcon = (type: string) => {
    if (type === "income") return <TrendingUp size={13} className="text-green-600" />;
    if (type === "expense") return <TrendingDown size={13} className="text-red-500" />;
    return <ArrowLeftRight size={13} className="text-indigo-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["all","income","expense","transfer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn("px-3 py-1.5 capitalize font-medium transition-colors",
                filterType===t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50")}
            >
              {t}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onAdd} className="ml-auto">
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filtered.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: (CATEGORY_COLORS[tx.category] ?? "#9ca3af") + "22" }}
              >
                {typeIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{tx.description || tx.category}</p>
                <p className="text-xs text-gray-400">{tx.date} · {tx.category} · {accountMap[tx.accountId] ?? "—"}</p>
              </div>
              <span className={cn("text-sm font-semibold shrink-0",
                tx.type === "income" ? "text-green-600" : tx.type === "expense" ? "text-red-500" : "text-indigo-500")}>
                {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}{fmt(tx.amountCents)}
              </span>
              <button
                onClick={() => handleDelete(tx.id)}
                disabled={deletingId === tx.id}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
