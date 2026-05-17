"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmt, ACCOUNT_TYPES, type Account } from "@/lib/finance";

const ACCOUNT_COLORS = ["#6366f1","#22c55e","#f97316","#a855f7","#ef4444","#3b82f6","#f59e0b","#14b8a6"];

function AccountForm({ initial, onSave, onCancel }: {
  initial?: Partial<Account>;
  onSave: (data: { name: string; type: string; balanceCents: number; color: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "bank");
  const [rawBalance, setRawBalance] = useState(initial ? String(initial.balanceCents! / 100) : "");
  const [balanceFocused, setBalanceFocused] = useState(false);
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
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
      await onSave({ name: name.trim(), type, balanceCents: Math.round(parseFloat(rawBalance || "0") * 100), color });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Input
          inputMode="decimal"
          placeholder="Balance (e.g. 1,000)"
          value={balanceFocused ? rawBalance : formatDisplay(rawBalance)}
          onChange={(e) => handleBalanceChange(e.target.value)}
          onFocus={(e) => { setBalanceFocused(true); e.target.select(); }}
          onBlur={() => setBalanceFocused(false)}
          className="h-9"
        />
      </div>
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

export function AccountsSection({ accounts, onRefresh }: { accounts: Account[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(data: { name: string; type: string; balanceCents: number; color: string }) {
    const res = await fetch("/api/finance/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save");
    setShowAdd(false);
    onRefresh();
  }

  async function handleEdit(id: string, data: { name: string; type: string; balanceCents: number; color: string }) {
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
  })).filter((g) => g.accounts.length > 0);

  const totalNet = accounts.filter((a)=>["cash","bank","savings","investment"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0)
    - accounts.filter((a)=>["debt","credit"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Total Net Worth</p>
          <p className={cn("text-2xl font-bold", totalNet >= 0 ? "text-green-600" : "text-red-500")}>{fmt(totalNet)}</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus size={14} className="mr-1" /> Add Account
        </Button>
      </div>

      {showAdd && (
        <AccountForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {accounts.length === 0 && !showAdd && (
        <div className="text-center py-16 text-gray-400">
          <Wallet size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="text-xs mt-1">Add your first account to get started</p>
        </div>
      )}

      {grouped.filter((g) => g.accounts.length > 0).map((group) => (
        <div key={group.value}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{group.label}</h3>
          <div className="space-y-2">
            {group.accounts.map((acc) => (
              editId === acc.id ? (
                <AccountForm
                  key={acc.id}
                  initial={acc}
                  onSave={(data) => handleEdit(acc.id, data)}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div key={acc.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: acc.color + "22" }}>
                    <Wallet size={16} style={{ color: acc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
                  </div>
                  <p className={cn("text-base font-bold shrink-0",
                    ["debt","credit"].includes(acc.type) ? "text-red-500" : "text-gray-900")}>
                    {["debt","credit"].includes(acc.type) ? "−" : ""}{fmt(acc.balanceCents)}
                  </p>
                  <div className="flex gap-1">
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
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
