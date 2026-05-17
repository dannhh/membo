"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, BarChart3,
  Plus, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fmt, currentMonth, monthLabel,
  type Account, type Transaction, type Budget,
} from "@/lib/finance";
import { AccountsSection } from "./AccountsSection";
import { TransactionsSection } from "./TransactionsSection";
import { BudgetsSection } from "./BudgetsSection";
import { OverviewSection } from "./OverviewSection";
import { AddTransactionModal } from "./AddTransactionModal";
import { FinanceAIPanel } from "./FinanceAIPanel";

type Tab = "overview" | "accounts" | "transactions" | "budgets";

export function FinanceDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, txs, buds] = await Promise.all([
        fetch("/api/finance/accounts").then((r) => r.json()),
        fetch(`/api/finance/transactions?month=${month}`).then((r) => r.json()),
        fetch(`/api/finance/budgets?month=${month}`).then((r) => r.json()),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setTransactions(Array.isArray(txs) ? txs : []);
      setBudgets(Array.isArray(buds) ? buds : []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const totalAssets = accounts.filter((a) => ["cash","bank","savings","investment"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0);
  const totalDebts  = accounts.filter((a) => a.type === "debt").reduce((s,a)=>s+a.balanceCents,0);
  const totalCredit = accounts.filter((a) => a.type === "credit").reduce((s,a)=>s+a.balanceCents,0);
  const netWorth    = totalAssets - totalDebts - totalCredit;
  const monthIncome = transactions.filter((t)=>t.type==="income").reduce((s,t)=>s+t.amountCents,0);
  const monthExpenses = transactions.filter((t)=>t.type==="expense").reduce((s,t)=>s+t.amountCents,0);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",      label: "Overview",      icon: BarChart3 },
    { key: "accounts",      label: "Accounts",      icon: Wallet },
    { key: "transactions",  label: "Transactions",  icon: TrendingDown },
    { key: "budgets",       label: "Budgets",       icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Full-width header bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shrink-0">
        {/* Left: month navigator */}
        <div className="flex-1 flex items-center">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => shiftMonth(-1)} className="px-2 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700 min-w-20 text-center">
              {monthLabel(month)}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              disabled={month >= currentMonth()}
              className="px-2 py-1.5 hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Center: title */}
        <h1 className="text-xl font-bold text-gray-900">Personal Finance</h1>

        {/* Right: actions */}
        <div className="flex-1 flex justify-end">
          <Button size="sm" onClick={() => setShowAddTx(true)}>
            <Plus size={14} className="mr-1" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Body: AI panel left + main content right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — AI chat panel */}
        <div className="w-80 shrink-0 flex flex-col border-r border-gray-200 overflow-hidden bg-white">
          <FinanceAIPanel month={month} onRefresh={load} />
        </div>

        {/* Right — tabs + content */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 flex gap-1 shrink-0">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  tab === key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : (
              <>
                {tab === "overview" && (
                  <OverviewSection
                    accounts={accounts}
                    transactions={transactions}
                    budgets={budgets}
                    month={month}
                    netWorth={netWorth}
                    onAddTransaction={() => setShowAddTx(true)}
                  />
                )}
                {tab === "accounts" && (
                  <AccountsSection accounts={accounts} onRefresh={load} />
                )}
                {tab === "transactions" && (
                  <TransactionsSection
                    transactions={transactions}
                    accounts={accounts}
                    onRefresh={load}
                    onAdd={() => setShowAddTx(true)}
                  />
                )}
                {tab === "budgets" && (
                  <BudgetsSection
                    budgets={budgets}
                    transactions={transactions}
                    month={month}
                    onRefresh={load}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add transaction modal */}
      {showAddTx && (
        <AddTransactionModal
          accounts={accounts}
          onClose={() => setShowAddTx(false)}
          onSaved={() => { setShowAddTx(false); load(); }}
        />
      )}
    </div>
  );
}
