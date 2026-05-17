"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Account } from "@/lib/finance";

type TxType = "expense" | "income" | "transfer";

export function AddTransactionModal({ accounts, onClose, onSaved }: {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [amountFocused, setAmountFocused] = useState(false);

  function handleAmountChange(val: string) {
    const cleaned = val.replace(/[^0-9.]/g, "").replace(/(\.\d*)\.+/, "$1");
    setRawAmount(cleaned);
  }

  function formatAmountDisplay(val: string): string {
    if (!val) return "";
    const [intPart, decPart] = val.split(".");
    const formatted = Number(intPart || "0").toLocaleString("en-US");
    return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
  }
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleSave() {
    if (!accountId || !rawAmount || (!category && type !== "transfer")) {
      setError("Please fill in all required fields.");
      return;
    }
    if (type === "transfer" && !toAccountId) {
      setError("Select a destination account.");
      return;
    }
    const amountCents = Math.round(parseFloat(rawAmount) * 100);
    if (!amountCents || amountCents <= 0) { setError("Enter a valid amount."); return; }

    setSaving(true);
    setError("");
    const res = await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId, type, amountCents,
        category: type === "transfer" ? "Transfer" : category,
        description, date,
        ...(type === "transfer" ? { toAccountId } : {}),
      }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); } else { setError("Failed to save. Try again."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Type tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["expense","income","transfer"] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                type === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* From account */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            {type === "transfer" ? "From Account" : "Account"}
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* To account (transfer only) */}
        {type === "transfer" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">To Account</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select account</option>
              {accounts.filter((a)=>a.id!==accountId).map((a)=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Amount + date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Amount ($)</label>
            <Input
              inputMode="decimal" placeholder="0"
              value={amountFocused ? rawAmount : formatAmountDisplay(rawAmount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={(e) => { setAmountFocused(true); e.target.select(); }}
              onBlur={() => setAmountFocused(false)}
              className="h-9" autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
        </div>

        {/* Category */}
        {type !== "transfer" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    category === c
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Description (optional)</label>
          <Input placeholder="e.g. Grab lunch, Monthly rent…" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save Transaction"}
          </Button>
        </div>
      </div>
    </div>
  );
}
