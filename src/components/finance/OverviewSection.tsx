"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
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

function buildNetWorthHistory(transactions: Transaction[], accounts: Account[], currentMonth: string): { month: string; value: number }[] {
  // Walk back 6 months from current
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

  // Reconstruct past net worth by reversing transactions
  let runningBalance = currentNetWorth;
  const points: { month: string; value: number }[] = [];

  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    if (i === months.length - 1) {
      points.unshift({ month: m, value: runningBalance });
    } else {
      const nextMonth = months[i + 1];
      const monthTxs = transactions.filter((t) => t.date.startsWith(nextMonth));
      const income = monthTxs.filter((t)=>t.type==="income").reduce((s,t)=>s+t.amountCents,0);
      const expenses = monthTxs.filter((t)=>t.type==="expense").reduce((s,t)=>s+t.amountCents,0);
      runningBalance -= (income - expenses);
      points.unshift({ month: m, value: runningBalance });
    }
  }

  return points.map((p) => ({ ...p, month: monthLabel(p.month) }));
}

export function OverviewSection({ accounts, transactions, budgets, month, netWorth, onAddTransaction }: Props) {
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const incomeTxs  = transactions.filter((t) => t.type === "income");
  const totalExpenses = expenseTxs.reduce((s,t)=>s+t.amountCents,0);
  const totalIncome   = incomeTxs.reduce((s,t)=>s+t.amountCents,0);

  // Category breakdown for donut
  const expenseByCategory = Object.entries(
    expenseTxs.reduce<Record<string,number>>((acc,t)=>{
      acc[t.category]=(acc[t.category]??0)+t.amountCents;
      return acc;
    }, {})
  ).map(([name,value])=>({ name, value })).sort((a,b)=>b.value-a.value);

  const incomeByCategory = Object.entries(
    incomeTxs.reduce<Record<string,number>>((acc,t)=>{
      acc[t.category]=(acc[t.category]??0)+t.amountCents;
      return acc;
    }, {})
  ).map(([name,value])=>({ name, value })).sort((a,b)=>b.value-a.value);

  // All-time transactions for net worth chart
  const nwData = buildNetWorthHistory(transactions, accounts, month);

  const recentTxs = [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  return (
    <div className="space-y-6">
      {/* Net Worth Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Net Worth Trend</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={nwData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v)=>fmt(v,true)} />
            <Tooltip formatter={(v) => [fmt(Number(v)), "Net Worth"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#nwGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Expense + Income donuts */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: `Expenses — ${monthLabel(month)}`, data: expenseByCategory, total: totalExpenses, color: "#ef4444" },
          { label: `Income — ${monthLabel(month)}`,   data: incomeByCategory,  total: totalIncome,   color: "#22c55e" },
        ].map(({ label, data, total, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
              <span className="text-base font-bold text-gray-900">{fmt(total)}</span>
            </div>
            {data.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={data} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {data.slice(0, 5).map((d) => (
                    <div key={d.name} className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[d.name] ?? color }} />
                      <span className="text-xs text-gray-600 truncate flex-1">{d.name}</span>
                      <span className="text-xs font-medium text-gray-800 shrink-0">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Budget progress + recent txs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Budget overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Budget Progress</h2>
          {budgets.length === 0 ? (
            <p className="text-xs text-gray-400">No budgets set for this month.</p>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const spent = expenseTxs.filter((t)=>t.category===b.category).reduce((s,t)=>s+t.amountCents,0);
                const pct = Math.min(100, Math.round(spent/b.limitCents*100));
                const over = spent > b.limitCents;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{b.category}</span>
                      <span className={cn("font-medium", over ? "text-red-500" : "text-gray-700")}>
                        {fmt(spent)} / {fmt(b.limitCents)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", over ? "bg-red-500" : "bg-indigo-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onAddTransaction}>
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </div>
          {recentTxs.length === 0 ? (
            <p className="text-xs text-gray-400">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTxs.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    t.type === "income" ? "bg-green-50" : "bg-red-50")}>
                    {t.type === "income"
                      ? <TrendingUp size={12} className="text-green-600" />
                      : <TrendingDown size={12} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{t.description || t.category}</p>
                    <p className="text-[10px] text-gray-400">{t.date} · {t.category}</p>
                  </div>
                  <span className={cn("text-xs font-semibold shrink-0",
                    t.type === "income" ? "text-green-600" : "text-red-500")}>
                    {t.type === "income" ? "+" : "−"}{fmt(t.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
