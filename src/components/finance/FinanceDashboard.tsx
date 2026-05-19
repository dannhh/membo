"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, ChevronLeft, ChevronRight, Loader2, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  currentMonth, monthLabel,
  type Account, type Transaction, type Budget,
} from "@/lib/finance";
import { AccountsSection } from "./AccountsSection";
import { TransactionsSection } from "./TransactionsSection";
import { BudgetsSection } from "./BudgetsSection";
import { OverviewSection } from "./OverviewSection";
import { AddTransactionModal } from "./AddTransactionModal";
import { FinanceAIPanel } from "./FinanceAIPanel";

type Tab = "overview" | "accounts" | "transactions";

export function FinanceDashboard() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: Tab = (rawTab === "budgets" ? "transactions" : rawTab as Tab) || "overview";

  const [month, setMonth] = useState(currentMonth());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModal, setTxModal] = useState<Transaction | null | false>(false);
  const [aiOpen, setAiOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const raf = requestAnimationFrame(() => { el.scrollTop = 0; });
    const t = setTimeout(() => { el.scrollTop = 0; }, 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [tab]);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="bg-white/75 backdrop-blur-md border-b border-white/50 px-4 sm:px-6 flex items-center gap-2 py-2 shrink-0">
        {/* AI toggle */}
        <button
          onClick={() => setAiOpen((v) => !v)}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200/70 text-gray-400 hover:text-violet-500 hover:border-violet-300 transition-colors"
          title={aiOpen ? "Hide AI" : "Show AI"}
        >
          {aiOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>

        <div className="flex-1" />

        {/* Month navigator */}
        <div className="shrink-0 flex items-center border border-gray-200/70 rounded-lg overflow-hidden">
          <button onClick={() => shiftMonth(-1)} className="px-2 py-1.5 hover:bg-white/60 text-gray-500 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-700 min-w-[4rem] text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            disabled={month >= currentMonth()}
            className="px-2 py-1.5 hover:bg-white/60 text-gray-500 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Add Transaction */}
        <Button size="sm" onClick={() => setTxModal(null)} className="shrink-0 bg-violet-600 hover:bg-violet-700">
          <Plus size={14} className="mr-1" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Backdrop + AI panel wrapper (mobile: full-area overlay; desktop: in-flow sidebar) */}
        <div className={cn(
          // Mobile: full-area absolute overlay, flex-centers the panel
          "absolute inset-0 z-20 flex justify-center items-end pb-3 pointer-events-none",
          // Desktop: in-flow sidebar — reset ALL mobile overrides
          "lg:static lg:inset-auto lg:z-auto lg:block lg:pb-0 lg:shrink-0 lg:overflow-hidden lg:transition-all lg:duration-200 lg:pointer-events-auto",
          aiOpen
            ? "lg:w-72 lg:border-r lg:border-gray-200/50"
            : "lg:w-0 lg:border-r-0"
        )}>
          {/* Backdrop click area (mobile only) */}
          {aiOpen && (
            <div
              className="lg:hidden absolute inset-0 -z-10"
              onClick={() => setAiOpen(false)}
            />
          )}
          {/* Panel */}
          <div className={cn(
            "flex flex-col overflow-hidden bg-white shadow-2xl border border-gray-100 transition-all duration-200 pointer-events-auto",
            "w-[70%] sm:w-72 h-[62%] rounded-2xl",
            aiOpen ? "translate-y-0 opacity-100" : "translate-y-[calc(100%+12px)] opacity-0",
            "lg:translate-y-0 lg:opacity-100 lg:h-full lg:w-72 lg:rounded-none lg:shadow-none lg:border-0"
          )}>
            <FinanceAIPanel month={month} onRefresh={load} />
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={22} className="animate-spin text-gray-300" />
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
                  onAddTransaction={() => setTxModal(null)}
                />
              )}
              {tab === "accounts" && (
                <AccountsSection accounts={accounts} onRefresh={load} />
              )}
              {tab === "transactions" && (
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
                  <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-0">
                    <BudgetsSection
                      budgets={budgets}
                      transactions={transactions}
                      month={month}
                      onRefresh={load}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <TransactionsSection
                      transactions={transactions}
                      accounts={accounts}
                      onRefresh={load}
                      onAdd={() => setTxModal(null)}
                      onEdit={(tx) => setTxModal(tx)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {txModal !== false && (
        <AddTransactionModal
          accounts={accounts}
          initialTx={txModal ?? undefined}
          onClose={() => setTxModal(false)}
          onSaved={() => { setTxModal(false); load(); }}
        />
      )}
    </div>
  );
}
