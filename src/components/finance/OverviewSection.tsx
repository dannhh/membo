"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmt, monthLabel, CATEGORY_COLORS,
  type Account, type Transaction, type Budget,
} from "@/lib/finance";

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  month: string;
  netWorth: number;
  onAddTransaction: () => void;
}

function buildNetWorthHistory(transactions: Transaction[], accounts: Account[], currentMonth: string) {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 1 - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const currentNetWorth = accounts
    .filter((a) => ["cash","bank","investment"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0)
    - accounts.filter((a)=>a.type==="debt").reduce((s,a)=>s+a.balanceCents,0)
    - accounts.filter((a)=>a.type==="credit").reduce((s,a)=>s+a.balanceCents,0);

  let runningBalance = currentNetWorth;
  const points: { month: string; value: number }[] = [];

  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    if (i === months.length - 1) {
      points.unshift({ month: m, value: runningBalance });
    } else {
      const nextMonth = months[i + 1];
      const monthTxs = transactions.filter((t) => t.date.startsWith(nextMonth));
      const income   = monthTxs.filter((t)=>t.type==="income").reduce((s,t)=>s+t.amountCents,0);
      const expenses = monthTxs.filter((t)=>t.type==="expense").reduce((s,t)=>s+t.amountCents,0);
      runningBalance -= (income - expenses);
      points.unshift({ month: m, value: runningBalance });
    }
  }

  return points.map((p) => ({ ...p, month: monthLabel(p.month) }));
}

// ── Widget wrapper ─────────────────────────────────────────────────────────────
function Widget({ title, action, className, children }: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-white/90 rounded-2xl border border-white/70 shadow-[0_2px_16px_rgba(109,99,180,0.08)] overflow-hidden flex flex-col", className)}>
      <div className="px-4 sm:px-5 pt-4 flex items-center justify-between shrink-0">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
        {action}
      </div>
      <div className="p-4 sm:p-5 pt-3 flex-1">{children}</div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, sentiment, accentClass }: {
  label: string;
  value: string;
  sub?: string;
  sentiment?: "up" | "down" | "neutral";
  accentClass: string;
}) {
  const subColor =
    sentiment === "up"   ? "text-green-600" :
    sentiment === "down" ? "text-red-500"   : "text-gray-400";

  return (
    <div className="bg-white/90 rounded-2xl border border-white/70 shadow-[0_2px_16px_rgba(109,99,180,0.08)] p-4 sm:p-5 relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", accentClass)} />
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
      {sub && (
        <p className={cn("text-[10px] sm:text-[11px] mt-1.5 font-medium flex items-center gap-0.5", subColor)}>
          {sentiment === "up"      && <ArrowUpRight size={10} />}
          {sentiment === "down"    && <ArrowDownRight size={10} />}
          {sentiment === "neutral" && <Minus size={10} />}
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Donut widget ───────────────────────────────────────────────────────────────
function DonutWidget({ title, data, total, fallbackColor }: {
  title: string;
  data: { name: string; value: number }[];
  total: number;
  fallbackColor: string;
}) {
  const colored = data.map((d) => ({ ...d, fill: CATEGORY_COLORS[d.name] ?? fallbackColor }));

  return (
    <Widget title={title}>
      <p className="text-xl font-bold text-gray-900 tabular-nums mb-3">{fmt(total)}</p>
      {colored.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
      ) : (
        <div className="flex items-center gap-4">
          <PieChart width={90} height={90} className="shrink-0">
            <Pie data={colored} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="value" paddingAngle={2} />
          </PieChart>
          <div className="flex-1 space-y-1.5 min-w-0">
            {colored.slice(0, 5).map((d) => (
              <div key={d.name} className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                <span className="text-xs text-gray-600 truncate flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Widget>
  );
}

export function OverviewSection({ accounts, transactions, budgets, month, netWorth, onAddTransaction }: Props) {
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const incomeTxs  = transactions.filter((t) => t.type === "income");
  const totalExpenses = expenseTxs.reduce((s,t)=>s+t.amountCents,0);
  const totalIncome   = incomeTxs.reduce((s,t)=>s+t.amountCents,0);
  const netFlow       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? Math.round((netFlow / totalIncome) * 100) : 0;

  const expenseByCategory = Object.entries(
    expenseTxs.reduce<Record<string,number>>((acc,t)=>{
      acc[t.category]=(acc[t.category]??0)+t.amountCents; return acc;
    }, {})
  ).map(([name,value])=>({ name, value })).sort((a,b)=>b.value-a.value);

  const incomeByCategory = Object.entries(
    incomeTxs.reduce<Record<string,number>>((acc,t)=>{
      acc[t.category]=(acc[t.category]??0)+t.amountCents; return acc;
    }, {})
  ).map(([name,value])=>({ name, value })).sort((a,b)=>b.value-a.value);

  const nwData = buildNetWorthHistory(transactions, accounts, month);

  const recentTxs = [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  const totalCash        = accounts.filter((a) => ["cash","bank"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0);
  const totalSavings     = accounts.filter((a) => a.type==="savings").reduce((s,a)=>s+a.balanceCents,0);
  const totalInvestments = accounts.filter((a) => a.type==="investment").reduce((s,a)=>s+a.balanceCents,0);
  const totalCredit      = accounts.filter((a) => a.type==="credit").reduce((s,a)=>s+a.balanceCents,0);
  const totalDebt        = accounts.filter((a) => a.type==="debt").reduce((s,a)=>s+a.balanceCents,0);

  const accountGroups = [
    { label: "Bank & Cash",  value: totalCash,        positive: true  },
    { label: "Savings",      value: totalSavings,      positive: true  },
    { label: "Investments",  value: totalInvestments,  positive: true  },
    { label: "Credit Cards", value: totalCredit,       positive: false },
    { label: "Debt / Loans", value: totalDebt,         positive: false },
  ].filter((g) => g.value > 0);

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* ── Row 1: KPI Metrics — 2 cols on mobile, 4 on desktop ─────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Net Worth"
          value={fmt(netWorth)}
          accentClass="bg-violet-500"
          sentiment={netWorth > 0 ? "up" : netWorth < 0 ? "down" : "neutral"}
          sub={netWorth >= 0 ? "Total wealth" : "Negative balance"}
        />
        <KpiCard
          label={`${monthLabel(month)} Income`}
          value={fmt(totalIncome)}
          accentClass="bg-green-500"
          sentiment={totalIncome > 0 ? "up" : "neutral"}
          sub={`${incomeTxs.length} tx${incomeTxs.length !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label={`${monthLabel(month)} Expenses`}
          value={fmt(totalExpenses)}
          accentClass="bg-red-400"
          sentiment={totalExpenses > 0 ? "down" : "neutral"}
          sub={`${expenseTxs.length} tx${expenseTxs.length !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          accentClass={savingsRate >= 20 ? "bg-amber-400" : savingsRate > 0 ? "bg-orange-400" : "bg-gray-300"}
          sentiment={savingsRate >= 20 ? "up" : savingsRate > 0 ? "neutral" : "down"}
          sub={savingsRate >= 20 ? "Great job!" : savingsRate > 0 ? "Could be higher" : totalIncome === 0 ? "No income" : "Over budget"}
        />
      </div>

      {/* ── Row 2: Net Worth Trend + Account Snapshot
              Stacked on mobile, side-by-side on lg ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_248px] gap-3 sm:gap-4">

        {/* Net Worth Trend */}
        <Widget title="Net Worth Trend — 6 Months">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={nwData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v, true)} width={56} />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), "Net Worth"]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
              />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#nwGrad)" dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
            </AreaChart>
          </ResponsiveContainer>
        </Widget>

        {/* Account Snapshot + Cash Flow stacked */}
        <Widget title="Accounts">
          {accountGroups.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No accounts yet.</p>
          ) : (
            <div className="space-y-2.5">
              {accountGroups.map(({ label, value, positive }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", positive ? "bg-indigo-400" : "bg-red-400")} />
                    <span className="text-xs text-gray-500 truncate">{label}</span>
                  </div>
                  <span className={cn("text-xs font-semibold tabular-nums shrink-0 ml-2", positive ? "text-gray-800" : "text-red-500")}>
                    {positive ? "" : "−"}{fmt(value)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Net Worth</span>
                <span className={cn("text-sm font-bold tabular-nums", netWorth >= 0 ? "text-green-600" : "text-red-500")}>
                  {fmt(netWorth)}
                </span>
              </div>
            </div>
          )}

          {/* Cash flow mini-summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{monthLabel(month)} Flow</p>
            {[
              { label: "Income",   value: totalIncome,              color: "text-green-600", prefix: "+" },
              { label: "Expenses", value: totalExpenses,             color: "text-red-500",   prefix: "−" },
              { label: "Net",      value: Math.abs(netFlow),
                color: netFlow >= 0 ? "text-green-600" : "text-red-500",
                prefix: netFlow >= 0 ? "+" : "−" },
            ].map(({ label, value, color, prefix }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{label}</span>
                <span className={cn("font-semibold tabular-nums", color)}>{prefix}{fmt(value)}</span>
              </div>
            ))}
            {totalIncome > 0 && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Savings rate</span>
                  <span className={cn("font-semibold", savingsRate >= 0 ? "text-green-600" : "text-red-500")}>{savingsRate}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", savingsRate >= 0 ? "bg-green-500" : "bg-red-500")}
                    style={{ width: `${Math.min(Math.abs(savingsRate), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Widget>
      </div>

      {/* ── Row 3: Expense + Income Donuts
              Stacked on mobile, side-by-side on sm ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <DonutWidget
          title={`Expenses — ${monthLabel(month)}`}
          data={expenseByCategory}
          total={totalExpenses}
          fallbackColor="#ef4444"
        />
        <DonutWidget
          title={`Income — ${monthLabel(month)}`}
          data={incomeByCategory}
          total={totalIncome}
          fallbackColor="#22c55e"
        />
      </div>

      {/* ── Row 4: Budget Progress + Recent Transactions
              Stacked on mobile, side-by-side on sm ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

        {/* Budget Progress */}
        <Widget title="Budget Progress">
          {budgets.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No budgets set for this month.</p>
          ) : (
            <div className="space-y-3.5">
              {budgets.map((b) => {
                const spent = expenseTxs.filter((t)=>t.category===b.category).reduce((s,t)=>s+t.amountCents,0);
                const pct   = Math.min(100, b.limitCents > 0 ? Math.round(spent/b.limitCents*100) : 0);
                const over  = spent > b.limitCents;
                const dotColor = CATEGORY_COLORS[b.category] ?? "#9ca3af";
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                        <span className="text-xs text-gray-700 font-medium">{b.category}</span>
                      </div>
                      <span className={cn("text-xs font-semibold tabular-nums", over ? "text-red-500" : "text-gray-600")}>
                        {fmt(spent)}<span className="font-normal text-gray-400"> / {fmt(b.limitCents)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: over ? "#ef4444" : (dotColor === "#9ca3af" ? "#8b5cf6" : dotColor) }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
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
        </Widget>

        {/* Recent Transactions */}
        <Widget
          title="Recent Transactions"
          action={
            <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-violet-500 hover:text-violet-700" onClick={onAddTransaction}>
              <Plus size={11} className="mr-0.5" /> Add
            </Button>
          }
        >
          {recentTxs.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No transactions yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentTxs.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    t.type==="income" ? "bg-green-50" : "bg-red-50")}>
                    {t.type==="income"
                      ? <TrendingUp size={12} className="text-green-600" />
                      : <TrendingDown size={12} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{t.description || t.category}</p>
                    <p className="text-[10px] text-gray-400">{t.date} · {t.category}</p>
                  </div>
                  <span className={cn("text-xs font-bold tabular-nums shrink-0",
                    t.type==="income" ? "text-green-600" : "text-red-500")}>
                    {t.type==="income" ? "+" : "−"}{fmt(t.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Widget>
      </div>
    </div>
  );
}
