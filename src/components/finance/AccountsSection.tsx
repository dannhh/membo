"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Wallet, ChevronDown, ChevronUp, X, CalendarDays, TrendingUp, ArrowRight, Sparkles, Trophy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmt, currentMonth, ACCOUNT_TYPES, EXPENSE_CATEGORIES, type Account, type Installment } from "@/lib/finance";

const ACCOUNT_COLORS = ["#6366f1","#22c55e","#f97316","#a855f7","#ef4444","#3b82f6","#f59e0b","#14b8a6"];
const CREDIT_TYPES = ["credit", "debt"];
const SAVINGS_TERM_OPTIONS = [1, 2, 3, 6, 9, 12, 18, 24, 36];

// ── helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function savingsInterest(principalCents: number, ratePercent: number, termMonths: number): number {
  return Math.round(principalCents * (ratePercent / 100) * (termMonths / 12));
}

function paidMonths(startMonth: string, totalMonths: number): number {
  const [sy, sm] = startMonth.split("-").map(Number);
  const now = new Date();
  const diff = (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm) + 1;
  return Math.min(Math.max(diff, 0), totalMonths);
}

// ── AccountForm ───────────────────────────────────────────────────────────────

function AccountForm({ initial, lockType, onSave, onCancel }: {
  initial?: Partial<Account>;
  lockType?: boolean;
  onSave: (data: {
    name: string; type: string; balanceCents: number; color: string; dueDay: number | null;
    savingsStartDate: string | null; savingsTermMonths: number | null; savingsRate: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "bank");
  const [rawBalance, setRawBalance] = useState(initial ? String((initial.balanceCents ?? 0) / 100) : "");
  const [balanceFocused, setBalanceFocused] = useState(false);
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [dueDay, setDueDay] = useState<string>(initial?.dueDay ? String(initial.dueDay) : "");
  const [savingsStartDate, setSavingsStartDate] = useState(initial?.savingsStartDate ?? "");
  const [savingsTermMonths, setSavingsTermMonths] = useState<string>(initial?.savingsTermMonths ? String(initial.savingsTermMonths) : "12");
  const [savingsRate, setSavingsRate] = useState<string>(initial?.savingsRate ? String(initial.savingsRate) : "");
  const [saving, setSaving] = useState(false);

  function handleBalanceChange(val: string) {
    const cleaned = val.replace(/[^0-9.]/g, "").replace(/(\.\d*)\.+/, "$1");
    setRawBalance(cleaned);
  }

  function formatDisplay(val: string): string {
    if (!val) return "";
    const [intPart, decPart] = val.split(".");
    const formatted = Number(intPart || "0").toLocaleString("en-US");
    return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const parsedDue = parseInt(dueDay);
      const parsedTerm = parseInt(savingsTermMonths);
      const parsedRate = parseFloat(savingsRate);
      await onSave({
        name: name.trim(), type,
        balanceCents: Math.round(parseFloat(rawBalance || "0") * 100),
        color,
        dueDay: CREDIT_TYPES.includes(type) && parsedDue >= 1 && parsedDue <= 31 ? parsedDue : null,
        savingsStartDate: type === "savings" && savingsStartDate ? savingsStartDate : null,
        savingsTermMonths: type === "savings" && parsedTerm > 0 ? parsedTerm : null,
        savingsRate: type === "savings" && parsedRate > 0 ? parsedRate : null,
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" autoFocus />
      <div className={lockType ? "" : "grid grid-cols-2 gap-2"}>
        {!lockType && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        <Input
          inputMode="decimal"
          placeholder="Balance"
          value={balanceFocused ? rawBalance : formatDisplay(rawBalance)}
          onChange={(e) => handleBalanceChange(e.target.value)}
          onFocus={(e) => { setBalanceFocused(true); e.target.select(); }}
          onBlur={() => setBalanceFocused(false)}
          className="h-9"
        />
      </div>

      {CREDIT_TYPES.includes(type) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Due day:</span>
          <Input type="number" min={1} max={31} placeholder="e.g. 15" value={dueDay}
            onChange={(e) => setDueDay(e.target.value)} className="h-8 w-24 text-sm" />
          <span className="text-xs text-gray-400">of each month</span>
        </div>
      )}

      {type === "savings" && (
        <div className="space-y-2 rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-xs font-semibold text-green-700">Savings Details</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Start date</label>
              <Input type="date" value={savingsStartDate}
                onChange={(e) => setSavingsStartDate(e.target.value)} className="h-8 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Term</label>
              <select value={savingsTermMonths} onChange={(e) => setSavingsTermMonths(e.target.value)}
                className="mt-0.5 h-8 w-full rounded-lg border border-gray-200 bg-white text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {SAVINGS_TERM_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m < 12 ? `${m} month${m > 1 ? "s" : ""}` : `${m / 12} year${m > 12 ? "s" : ""}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Interest rate:</span>
            <Input type="number" step="0.01" min={0} placeholder="e.g. 5.5" value={savingsRate}
              onChange={(e) => setSavingsRate(e.target.value)} className="h-8 w-28 text-sm" />
            <span className="text-xs text-gray-400">%/year</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Color:</span>
        {ACCOUNT_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={cn("w-5 h-5 rounded-full transition-transform", color === c && "ring-2 ring-offset-1 ring-gray-400 scale-110")}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── BankNameForm ─────────────────────────────────────────────────────────────

function BankNameForm({ initialName, initialColor, onSave, onCancel }: {
  initialName?: string;
  initialColor?: string;
  onSave: (data: { name: string; type: string; balanceCents: number; color: string; dueDay: null; savingsStartDate: null; savingsTermMonths: null; savingsRate: null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [color, setColor] = useState(initialColor ?? "#3b82f6");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type: "savings", balanceCents: 0, color, dueDay: null, savingsStartDate: null, savingsTermMonths: null, savingsRate: null });
    } catch { setSaving(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <Input placeholder="Bank name (e.g. Techcombank)" value={name} onChange={(e) => setName(e.target.value)} className="h-9" autoFocus />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Color:</span>
        {ACCOUNT_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={cn("w-5 h-5 rounded-full transition-transform", color === c && "ring-2 ring-offset-1 ring-gray-400 scale-110")}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}

// ── SavingsPlanForm ───────────────────────────────────────────────────────────

function SavingsPlanForm({ bankName, color, initial, onSave, onCancel }: {
  bankName: string;
  color: string;
  initial?: Account;
  onSave: (data: { name: string; type: string; balanceCents: number; color: string; dueDay: null; savingsStartDate: string | null; savingsTermMonths: number | null; savingsRate: number | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [rawBalance, setRawBalance] = useState(initial ? String((initial.balanceCents ?? 0) / 100) : "");
  const [balanceFocused, setBalanceFocused] = useState(false);
  const [savingsStartDate, setSavingsStartDate] = useState(initial?.savingsStartDate ?? "");
  const [savingsTermMonths, setSavingsTermMonths] = useState(initial?.savingsTermMonths ? String(initial.savingsTermMonths) : "12");
  const [savingsRate, setSavingsRate] = useState(initial?.savingsRate ? String(initial.savingsRate) : "");
  const [saving, setSaving] = useState(false);

  function handleBalanceChange(val: string) {
    setRawBalance(val.replace(/[^0-9.]/g, "").replace(/(\.\d*)\.+/, "$1"));
  }
  function formatDisplay(val: string) {
    if (!val) return "";
    const [intPart, decPart] = val.split(".");
    return decPart !== undefined ? `${Number(intPart||"0").toLocaleString("en-US")}.${decPart}` : Number(intPart||"0").toLocaleString("en-US");
  }

  const balanceCents = Math.round(parseFloat(rawBalance || "0") * 100);
  const parsedTerm = parseInt(savingsTermMonths) || 0;
  const parsedRate = parseFloat(savingsRate) || 0;
  const interestCents = parsedRate > 0 && parsedTerm > 0 ? Math.round(balanceCents * (parsedRate / 100) * (parsedTerm / 12)) : 0;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name: bankName, type: "savings", balanceCents, color, dueDay: null,
        savingsStartDate: savingsStartDate || null,
        savingsTermMonths: parsedTerm > 0 ? parsedTerm : null,
        savingsRate: parsedRate > 0 ? parsedRate : null,
      });
    } catch { setSaving(false); }
  }

  return (
    <div className="mx-4 my-2 rounded-lg bg-green-50 border border-green-200 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-green-700">{initial ? "Edit" : "Add"} Savings Plan — {bankName}</p>
      <Input
        inputMode="decimal" placeholder="Principal amount ($)"
        value={balanceFocused ? rawBalance : formatDisplay(rawBalance)}
        onChange={(e) => handleBalanceChange(e.target.value)}
        onFocus={(e) => { setBalanceFocused(true); e.target.select(); }}
        onBlur={() => setBalanceFocused(false)}
        className="h-8 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Start date</label>
          <Input type="date" value={savingsStartDate} onChange={(e) => setSavingsStartDate(e.target.value)} className="h-8 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Term</label>
          <select value={savingsTermMonths} onChange={(e) => setSavingsTermMonths(e.target.value)}
            className="mt-0.5 h-8 w-full rounded-lg border border-gray-200 bg-white text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {SAVINGS_TERM_OPTIONS.map((m) => (
              <option key={m} value={m}>{m < 12 ? `${m} month${m > 1 ? "s" : ""}` : `${m / 12} year${m > 12 ? "s" : ""}`}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">Interest rate:</span>
        <Input type="number" step="0.01" min={0} placeholder="e.g. 5.5" value={savingsRate}
          onChange={(e) => setSavingsRate(e.target.value)} className="h-8 w-28 text-sm" />
        <span className="text-xs text-gray-400">%/year</span>
      </div>
      {interestCents > 0 && (
        <p className="text-xs text-green-600 font-medium">
          Est. interest: +{fmt(interestCents)} → {fmt(balanceCents + interestCents)} at maturity
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={balanceCents <= 0 || saving}>{saving ? "Saving…" : "Add"}</Button>
      </div>
    </div>
  );
}

// ── InstallmentForm ───────────────────────────────────────────────────────────

function InstallmentForm({ accountId, initial, onSave, onCancel }: {
  accountId: string;
  initial?: Installment;
  onSave: (data: {
    accountId: string; description: string;
    totalAmountCents: number; monthlyAmountCents: number;
    totalMonths: number; startMonth: string; category: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [total, setTotal] = useState(initial ? String(initial.totalAmountCents / 100) : "");
  const [months, setMonths] = useState(initial ? String(initial.totalMonths) : "");
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? currentMonth());
  const [category, setCategory] = useState(initial?.category ?? "Shopping");
  const [saving, setSaving] = useState(false);

  const totalCents = Math.round(parseFloat(total || "0") * 100);
  const totalMonths = parseInt(months) || 0;
  const monthlyCents = totalMonths > 0 ? Math.round(totalCents / totalMonths) : 0;

  async function handleSave() {
    if (!description.trim() || totalCents <= 0 || totalMonths <= 0) return;
    setSaving(true);
    try {
      await onSave({ accountId, description: description.trim(), totalAmountCents: totalCents, monthlyAmountCents: monthlyCents, totalMonths, startMonth, category });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-orange-700">{initial ? "Edit Installment" : "Add Installment"}</p>
      <Input placeholder="Description (e.g. iPhone 16 Pro)" value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-sm" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Total amount ($)" value={total} onChange={(e) => setTotal(e.target.value)} className="h-8 text-sm" min={0} />
        <Input type="number" placeholder="Months" value={months} onChange={(e) => setMonths(e.target.value)} className="h-8 text-sm" min={1} max={120} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Start month</label>
          <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="h-8 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Category</label>
          <select
            value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-0.5 h-8 w-full rounded-lg border border-gray-200 bg-white text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {monthlyCents > 0 && (
        <p className="text-xs text-orange-600 font-medium">{fmt(monthlyCents)} / month × {totalMonths} months = {fmt(totalCents)}</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={!description.trim() || totalCents <= 0 || totalMonths <= 0 || saving}>
          {saving ? "Saving…" : initial ? "Save" : "Add"}
        </Button>
      </div>
    </div>
  );
}

// ── SavingsPlanItem ───────────────────────────────────────────────────────────

const TIERS = [
  { min: 100, label: "Matured",  emoji: "🎉", color: "#22c55e", gradient: "from-green-400 to-emerald-500" },
  { min: 75,  label: "Platinum", emoji: "💎", color: "#a855f7", gradient: "from-purple-400 to-violet-500" },
  { min: 50,  label: "Gold",     emoji: "🏆", color: "#f59e0b", gradient: "from-yellow-400 to-amber-500" },
  { min: 25,  label: "Silver",   emoji: "⭐", color: "#6366f1", gradient: "from-indigo-400 to-blue-500"  },
  { min: 0,   label: "Bronze",   emoji: "🎯", color: "#f97316", gradient: "from-orange-400 to-red-400"   },
];

function getSavingsTier(pct: number) {
  return TIERS.find((t) => pct >= t.min)!;
}

function SavingsPlanItem({ acc, isEditing, deleting, onEdit, onEditSave, onEditCancel, onDelete }: {
  acc: Account;
  isEditing: boolean;
  deleting: boolean;
  onEdit: () => void;
  onEditSave: (data: { name: string; type: string; balanceCents: number; color: string; dueDay: null; savingsStartDate: string | null; savingsTermMonths: number | null; savingsRate: number | null }) => Promise<void>;
  onEditCancel: () => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div className="border-t border-gray-100 p-3">
        <SavingsPlanForm bankName={acc.name} color={acc.color} initial={acc} onSave={onEditSave} onCancel={onEditCancel} />
      </div>
    );
  }

  const { balanceCents, savingsStartDate, savingsTermMonths: term, savingsRate: rate } = acc;
  const start = savingsStartDate ? new Date(savingsStartDate) : null;
  const maturity = savingsStartDate && term ? addMonths(savingsStartDate, term) : null;
  const now = new Date();
  const totalDays = start && maturity ? Math.max((maturity.getTime() - start.getTime()) / 86400000, 1) : 1;
  const elapsed = start ? Math.min(Math.max((now.getTime() - start.getTime()) / 86400000, 0), totalDays) : 0;
  const pct = Math.round((elapsed / totalDays) * 100);
  const daysLeft = maturity ? Math.max(Math.ceil((maturity.getTime() - now.getTime()) / 86400000), 0) : 0;
  const done = maturity !== null && daysLeft === 0;
  const interestCents = rate && term ? savingsInterest(balanceCents, rate, term) : 0;
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  const termLabel = term ? (term < 12 ? `${term}mo` : `${term / 12}yr`) : "";
  const tier = getSavingsTier(done ? 100 : pct);

  return (
    <div className="border-t border-gray-100 px-3 py-2.5">
      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white">
        {/* Top progress bar — full track + fill */}
        <div className="relative h-1.5 bg-gray-100">
          <div
            className={cn("absolute inset-y-0 left-0 bg-gradient-to-r transition-all", tier.gradient)}
            style={{ width: `${pct}%` }}
          />
          {[25, 50, 75].map((m) => (
            <div key={m} className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${m}%` }} />
          ))}
        </div>

        <div className="px-4 py-3">
          {/* Row 1: amount + tier badge + actions */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{fmt(balanceCents)}</p>
              {start && maturity && (
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <CalendarDays size={11} className="text-gray-400" />
                    {fmtDate(start)}
                    <ArrowRight size={10} className="text-gray-300" />
                    {fmtDate(maturity)}
                  </span>
                  {termLabel && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays size={11} className="text-gray-400" />
                      {termLabel}
                    </span>
                  )}
                  {rate && (
                    <span className="flex items-center gap-1 text-xs text-gray-600 font-semibold">
                      <TrendingUp size={11} className="text-indigo-400" />
                      {rate}%/yr
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: tier.color + "18", color: tier.color }}
              >
                {tier.emoji} {tier.label}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={onEdit} className="text-gray-300 hover:text-indigo-400 transition-colors"><Pencil size={11} /></button>
                <button onClick={onDelete} disabled={deleting} className="text-gray-300 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            </div>
          </div>

          {/* Row 2: interest gain */}
          {interestCents > 0 && (
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <Sparkles size={11} className="text-green-400" />
                +{fmt(interestCents)}
                <span className="font-normal text-gray-400">est. interest</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                <Trophy size={11} className="text-amber-400" />
                {fmt(balanceCents + interestCents)}
                <span className="font-normal text-gray-400">at maturity</span>
              </span>
            </div>
          )}

          {/* Row 3: progress footer */}
          {start && (
            <div className="mt-2.5 flex items-center justify-between">
              <span
                className="text-xs font-semibold"
                style={{ color: tier.color }}
              >
                {done ? (
                  "🎉 Matured — ready to collect!"
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock size={10} />
                    {daysLeft.toLocaleString()} day{daysLeft !== 1 ? "s" : ""} to unlock
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-gray-500">{pct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── InstallmentsPanel ─────────────────────────────────────────────────────────

type InstallmentPayload = {
  accountId: string; description: string;
  totalAmountCents: number; monthlyAmountCents: number;
  totalMonths: number; startMonth: string; category: string;
};

function InstallmentsPanel({ account }: { account: Account }) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/installments?accountId=${account.id}`);
    const data = await res.json();
    setInstallments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [account.id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(data: InstallmentPayload) {
    const res = await fetch("/api/finance/installments", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    setShowAdd(false);
    load();
  }

  async function handleEdit(id: string, data: InstallmentPayload) {
    const res = await fetch("/api/finance/installments", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error("Failed");
    setEditId(null);
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/finance/installments", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    load();
  }

  const totalMonthly = (installments ?? []).reduce((s, i) => {
    const paid = paidMonths(i.startMonth, i.totalMonths);
    return paid < i.totalMonths ? s + i.monthlyAmountCents : s;
  }, 0);

  return (
    <div className="mt-2 space-y-2 pl-12 pr-2">
      {/* header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-orange-600">
          Installments{totalMonthly > 0 ? ` · ${fmt(totalMonthly)}/mo active` : ""}
        </span>
        <button
          onClick={() => setShowAdd(true)}
          disabled={showAdd}
          className="flex items-center gap-0.5 text-xs text-orange-500 hover:text-orange-700 disabled:opacity-40"
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {showAdd && (
        <InstallmentForm
          accountId={account.id}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading && <p className="text-xs text-gray-400">Loading…</p>}

      {!loading && installments?.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400 italic">No installments yet.</p>
      )}

      {installments?.map((inst) => {
        const paid = paidMonths(inst.startMonth, inst.totalMonths);
        const remaining = inst.totalMonths - paid;
        const pct = Math.round((paid / inst.totalMonths) * 100);
        const done = remaining <= 0;
        return (
          <div key={inst.id}>
            {editId === inst.id ? (
              <InstallmentForm
                accountId={account.id}
                initial={inst}
                onSave={(data) => handleEdit(inst.id, data)}
                onCancel={() => setEditId(null)}
              />
            ) : (
            <div className={cn("rounded-lg border px-3 py-2 text-xs", done ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-orange-200")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{inst.description}</p>
                <p className="text-gray-500 mt-0.5">
                  {fmt(inst.monthlyAmountCents)}/mo · {done ? "Done" : `${remaining} month${remaining !== 1 ? "s" : ""} left`} · {inst.category}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-gray-400">{fmt(inst.totalAmountCents)}</span>
                <button onClick={() => setEditId(inst.id)} className="text-gray-300 hover:text-indigo-400 transition-colors">
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => handleDelete(inst.id)}
                  disabled={deletingId === inst.id}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            {/* progress bar */}
            <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", done ? "bg-gray-400" : "bg-orange-400")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-gray-400">{paid}/{inst.totalMonths} months paid</p>
          </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SavingsInfoPanel ──────────────────────────────────────────────────────────

function SavingsInfoPanel({ account }: { account: Account }) {
  const { balanceCents, savingsStartDate, savingsTermMonths, savingsRate } = account;
  if (!savingsStartDate || !savingsTermMonths) return null;

  const maturity = addMonths(savingsStartDate, savingsTermMonths);
  const now = new Date();
  const start = new Date(savingsStartDate);
  const totalDays = Math.max((maturity.getTime() - start.getTime()) / 86400000, 1);
  const elapsedDays = Math.min(Math.max((now.getTime() - start.getTime()) / 86400000, 0), totalDays);
  const pct = Math.round((elapsedDays / totalDays) * 100);
  const daysLeft = Math.max(Math.ceil((maturity.getTime() - now.getTime()) / 86400000), 0);
  const done = daysLeft === 0;

  const interestCents = savingsRate ? savingsInterest(balanceCents, savingsRate, savingsTermMonths) : 0;
  const totalCents = balanceCents + interestCents;

  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mt-2 mx-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
        <div><span className="text-gray-400">Start: </span>{fmtDate(new Date(savingsStartDate))}</div>
        <div><span className="text-gray-400">Maturity: </span>{fmtDate(maturity)}</div>
        <div><span className="text-gray-400">Term: </span>{savingsTermMonths < 12 ? `${savingsTermMonths} month${savingsTermMonths > 1 ? "s" : ""}` : `${savingsTermMonths / 12} year${savingsTermMonths > 12 ? "s" : ""}`}</div>
        {savingsRate && <div><span className="text-gray-400">Rate: </span><span className="font-semibold text-green-700">{savingsRate}%/yr</span></div>}
        {interestCents > 0 && <>
          <div><span className="text-gray-400">Est. interest: </span><span className="font-semibold text-green-600">+{fmt(interestCents)}</span></div>
          <div><span className="text-gray-400">At maturity: </span><span className="font-semibold text-green-700">{fmt(totalCents)}</span></div>
        </>}
      </div>
      <div>
        <div className="flex justify-between text-gray-400 mb-1">
          <span>{done ? "Matured" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", done ? "bg-green-400" : "bg-green-500")} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── AccountsSection ───────────────────────────────────────────────────────────

export function AccountsSection({ accounts, onRefresh }: { accounts: Account[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [showAddPlan, setShowAddPlan] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleAdd(data: { name: string; type: string; balanceCents: number; color: string; dueDay: number | null; savingsStartDate: string | null; savingsTermMonths: number | null; savingsRate: number | null }) {
    const res = await fetch("/api/finance/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save");
    setShowAdd(null);
    onRefresh();
  }

  async function handleEdit(id: string, data: { name: string; type: string; balanceCents: number; color: string; dueDay: number | null; savingsStartDate: string | null; savingsTermMonths: number | null; savingsRate: number | null }) {
    const res = await fetch("/api/finance/accounts", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error("Failed to save");
    setEditId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/finance/accounts", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    onRefresh();
  }

  const grouped = ACCOUNT_TYPES.map((at) => ({
    ...at,
    accounts: accounts.filter((a) => a.type === at.value),
  }));

  const totalNet = accounts.filter((a) => ["cash","bank","savings","investment"].includes(a.type)).reduce((s,a) => s + a.balanceCents, 0)
    - accounts.filter((a) => ["debt","credit"].includes(a.type)).reduce((s,a) => s + a.balanceCents, 0);

  function renderCard(acc: Account, nested = false) {
    if (editId === acc.id) {
      return (
        <div key={acc.id}>
          <AccountForm
            initial={acc}
            onSave={(data) => handleEdit(acc.id, data)}
            onCancel={() => setEditId(null)}
          />
        </div>
      );
    }
    return (
      <div key={acc.id} className={nested ? "" : "bg-white rounded-xl border border-gray-200"}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: acc.color + "22" }}>
              <Wallet size={16} style={{ color: acc.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
                {CREDIT_TYPES.includes(acc.type) && acc.dueDay && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                    Due {ordinal(acc.dueDay)}
                  </span>
                )}
              </div>
            </div>
            <p className={cn("text-base font-bold shrink-0",
              CREDIT_TYPES.includes(acc.type) ? "text-red-500" : "text-gray-900")}>
              {CREDIT_TYPES.includes(acc.type) ? "−" : ""}{fmt(acc.balanceCents)}
            </p>
            <div className="flex gap-1 items-center">
              {CREDIT_TYPES.includes(acc.type) && (
                <button
                  onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}
                  className="text-gray-300 hover:text-orange-400 transition-colors"
                  title="Manage installments"
                >
                  {expandedId === acc.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
              <button onClick={() => setEditId(acc.id)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDelete(acc.id)}
                disabled={deletingId === acc.id}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {acc.type === "savings" && acc.savingsStartDate && acc.savingsTermMonths && (
            <SavingsInfoPanel account={acc} />
          )}

          {CREDIT_TYPES.includes(acc.type) && expandedId === acc.id && (
            <InstallmentsPanel account={acc} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs text-gray-500">Total Net Worth</p>
        <p className={cn("text-2xl font-bold", totalNet >= 0 ? "text-green-600" : "text-red-500")}>{fmt(totalNet)}</p>
      </div>

      {grouped.map((group) => (
        <div key={group.value}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</h3>
            <button
              onClick={() => setShowAdd(showAdd === group.value ? null : group.value)}
              className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700"
            >
              <Plus size={11} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {showAdd === group.value && (
              group.value === "savings" ? (
                <BankNameForm onSave={handleAdd} onCancel={() => setShowAdd(null)} />
              ) : (
                <AccountForm initial={{ type: group.value }} lockType onSave={handleAdd} onCancel={() => setShowAdd(null)} />
              )
            )}
            {group.value === "savings" ? (() => {
              const isContainerAcc = (a: Account) => a.balanceCents === 0 && a.savingsTermMonths === null && a.savingsStartDate === null;
              const byName: Record<string, Account[]> = {};
              for (const a of group.accounts) (byName[a.name] ??= []).push(a);
              return Object.entries(byName).map(([bankName, accs]) => {
                const container = accs.find(isContainerAcc);
                const plans = accs.filter(a => !isContainerAcc(a));
                // Old-style single plan (no container) — render as regular card
                if (!container && plans.length === 1) return renderCard(plans[0]);
                const headerAcc = container ?? plans[0];
                const groupTotal = plans.reduce((s, a) => s + a.balanceCents, 0);
                const isExpanded = showAddPlan === bankName;
                return (
                  <div key={bankName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {editId === (container?.id) ? (
                      <div className="p-3">
                        <BankNameForm
                          initialName={container?.name}
                          initialColor={container?.color}
                          onSave={(data) => handleEdit(container!.id, data)}
                          onCancel={() => setEditId(null)}
                        />
                      </div>
                    ) : (
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: headerAcc.color + "22" }}>
                          <Wallet size={16} style={{ color: headerAcc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{bankName}</p>
                          <p className="text-xs text-gray-400">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
                        </div>
                        <p className="text-base font-bold text-gray-900">{fmt(groupTotal)}</p>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => setShowAddPlan(isExpanded ? null : bankName)}
                            className="text-gray-300 hover:text-green-500 transition-colors"
                            title="Add savings plan"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          {container && (
                            <>
                              <button onClick={() => setEditId(container.id)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(container.id)}
                                disabled={deletingId === container.id}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        <SavingsPlanForm
                          bankName={bankName}
                          color={headerAcc.color}
                          onSave={async (data) => {
                            const res = await fetch("/api/finance/accounts", {
                              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
                            });
                            if (!res.ok) throw new Error("Failed");
                            setShowAddPlan(null);
                            onRefresh();
                          }}
                          onCancel={() => setShowAddPlan(null)}
                        />
                      </div>
                    )}
                    {plans.length > 0 && (
                      <div className="border-t border-gray-100">
                        {plans.map((acc) => (
                          <SavingsPlanItem
                            key={acc.id}
                            acc={acc}
                            isEditing={editId === acc.id}
                            deleting={deletingId === acc.id}
                            onEdit={() => setEditId(acc.id)}
                            onEditSave={async (data) => { await handleEdit(acc.id, data); }}
                            onEditCancel={() => setEditId(null)}
                            onDelete={() => handleDelete(acc.id)}
                          />
                        ))}
                      </div>
                    )}
                    {plans.length === 0 && !isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <p className="text-xs text-gray-400 italic">No savings plans yet.</p>
                      </div>
                    )}
                  </div>
                );
              });
            })() : group.accounts.map((acc) => renderCard(acc))}
            {group.accounts.length === 0 && showAdd !== group.value && (
              <p className="text-xs text-gray-400 italic">No {group.label.toLowerCase()} accounts.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
