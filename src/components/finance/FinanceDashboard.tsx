"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, BarChart3, MessageSquare,
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
  const [showAI, setShowAI] = useState(false);

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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Main content */}
      <div className={cn("flex flex-col flex-1 overflow-hidden transition-all", showAI ? "mr-80" : "")}>
        {/* Header bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Personal Finance</h1>
          </div>

          {/* Month navigator */}
          <div className="flex items-center gap-1 ml-4 border border-gray-200 rounded-lg overflow-hidden">
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

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAI((v)=>!v)} className={cn(showAI && "bg-indigo-50 border-indigo-300 text-indigo-700")}>
              <MessageSquare size={14} className="mr-1" /> AI Advisor
            </Button>
            <Button size="sm" onClick={() => setShowAddTx(true)}>
              <Plus size={14} className="mr-1" /> Add Transaction
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-px bg-gray-200 shrink-0">
          {[
            { label: "Net Worth", value: netWorth, icon: TrendingUp, positive: netWorth >= 0, always: true },
            { label: "Assets",    value: totalAssets, icon: TrendingUp, positive: true, always: false },
            { label: `${monthLabel(month)} Income`,   value: monthIncome,   icon: TrendingUp,  positive: true,  always: false },
            { label: `${monthLabel(month)} Expenses`, value: monthExpenses, icon: TrendingDown, positive: false, always: false },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white px-6 py-4">
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className={cn("text-2xl font-bold mt-1", kpi.always ? (netWorth >= 0 ? "text-green-600" : "text-red-500") : kpi.positive ? "text-gray-900" : "text-red-500")}>
                {loading ? <span className="animate-pulse text-gray-300">—</span> : fmt(kpi.value)}
              </p>
            </div>
          ))}
        </div>

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

      {/* AI panel */}
      {showAI && (
        <div className="fixed right-0 top-14 bottom-0 w-80 border-l border-gray-200 bg-white z-20">
          <FinanceAIPanel month={month} onClose={() => setShowAI(false)} />
        </div>
      )}

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
