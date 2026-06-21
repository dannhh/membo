"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TripDetails {
  destination: string;
  dates: string;
  duration: string;
  purpose: string;
  accommodation: string;
  bookingRef: string;
}

export interface Activity {
  name: string;
  day: number;
  time: string;
  location: string;
  type: string;
  status: string;
  estCost: number;
  booked: boolean;
  notes: string;
}

export interface PackingItem {
  name: string;
}

export interface PackingCategory {
  name: string;
  icon: string;
  items: PackingItem[];
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  payment: string;
  status: string;
  category: string;
  receipt: boolean;
  notes: string;
}

export interface TripPlanData {
  tripDetails: TripDetails;
  activities: Activity[];
  packingChecklist?: PackingCategory[];
  checkedItems?: string[];
  expenses?: Expense[];
}

const PAYMENT_OPTIONS = ["Cash", "Credit Card", "Debit Card", "Mobile Pay", "Other"];
const STATUS_OPTIONS = ["Paid", "Pending", "Refunded"];
const CATEGORY_OPTIONS = ["Food & Drink", "Transport", "Accommodation", "Activities", "Shopping", "Other"];
const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-blue-100 text-blue-700",
};
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Drink": "bg-amber-50 border-amber-200 text-amber-700",
  "Transport": "bg-blue-50 border-blue-200 text-blue-700",
  "Accommodation": "bg-pink-50 border-pink-200 text-pink-700",
  "Activities": "bg-green-50 border-green-200 text-green-700",
  "Shopping": "bg-purple-50 border-purple-200 text-purple-700",
  "Other": "bg-gray-50 border-gray-200 text-gray-600",
};
const CATEGORY_ICONS: Record<string, string> = {
  "Food & Drink": "🍽️",
  "Transport": "🚌",
  "Accommodation": "🏨",
  "Activities": "🎭",
  "Shopping": "🛍️",
  "Other": "📌",
};

const DEFAULT_PACKING_CATEGORIES: PackingCategory[] = [
  {
    name: "Essentials",
    icon: "🧳",
    items: [
      { name: "Passport / ID" },
      { name: "Tickets / boarding pass" },
      { name: "Wallet / cards" },
      { name: "Phone + charger" },
      { name: "Adapter / power bank" },
      { name: "Keys" },
    ],
  },
  {
    name: "Clothing & Personal",
    icon: "👕",
    items: [
      { name: "Tops" },
      { name: "Bottoms" },
      { name: "Underwear / socks" },
      { name: "Jacket / layers" },
      { name: "Shoes" },
      { name: "Toiletries" },
      { name: "Medications" },
    ],
  },
  {
    name: "Work & Tech",
    icon: "💻",
    items: [
      { name: "Laptop + charger" },
      { name: "Headphones" },
      { name: "Notebook / pen" },
      { name: "Camera" },
      { name: "SIM card / eSIM" },
      { name: "VPN setup" },
      { name: "Backup files" },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  Travel: "bg-blue-100 text-blue-700",
  Sightseeing: "bg-green-100 text-green-700",
  Food: "bg-amber-100 text-amber-700",
  "Check-in": "bg-purple-100 text-purple-700",
  Accommodation: "bg-pink-100 text-pink-700",
  Other: "bg-gray-100 text-gray-600",
};

const TYPE_ICONS: Record<string, string> = {
  Travel: "✈️",
  Sightseeing: "🏛️",
  Food: "🍽️",
  "Check-in": "🏨",
  Accommodation: "🛏️",
  Other: "📌",
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? TYPE_COLORS.Other;
  const icon = TYPE_ICONS[type] ?? "📌";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", color)}>
      <span>{icon}</span>
      {type}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "Confirmed" ? "bg-green-400" :
    status === "Done" ? "bg-violet-400" :
    status === "Cancelled" ? "bg-red-400" :
    "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={cn("w-2 h-2 rounded-full inline-block", color)} />
      {status}
    </span>
  );
}

function TripDetailsCard({ details }: { details: TripDetails }) {
  const rows = [
    { label: "Destination", value: details.destination },
    { label: "Dates", value: details.dates },
    { label: "Duration", value: details.duration },
    { label: "Purpose", value: details.purpose },
    { label: "Accommodation", value: details.accommodation },
    ...(details.bookingRef ? [{ label: "Booking ref", value: details.bookingRef }] : []),
  ].filter((r) => r.value);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 min-w-[220px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📍</span>
        <h3 className="font-semibold text-gray-800 text-sm">Trip Details</h3>
      </div>
      <div className="border-t border-gray-100 pt-3 flex flex-col gap-2.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex gap-2 text-sm">
            <span className="font-semibold text-gray-700 shrink-0">{label}:</span>
            <span className="text-gray-600">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullItineraryTable({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No activities yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Day", "Activity", "Time", "Location", "Type", "Status", "Est. Cost", "Booked", "Notes"].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((act, i) => {
            const isFirstOfDay = i === 0 || activities[i - 1].day !== act.day;
            return (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2.5 whitespace-nowrap">
                {isFirstOfDay && (
                  <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium">
                    Day {act.day}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap max-w-[180px] truncate">
                {act.name}
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{act.time || "—"}</td>
              <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">{act.location || "—"}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <TypeBadge type={act.type} />
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <StatusDot status={act.status} />
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                {act.estCost > 0 ? `$${act.estCost.toFixed(2)}` : "$0.00"}
              </td>
              <td className="px-3 py-2.5">
                <input type="checkbox" checked={act.booked} readOnly className="accent-violet-600" />
              </td>
              <td className="px-3 py-2.5 text-gray-500 max-w-[180px] truncate">{act.notes || "—"}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ByDayBoard({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No activities yet.</p>;
  }

  const days = [...new Set(activities.map((a) => a.day))].sort((a, b) => a - b);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {days.map((day) => {
        const dayActs = activities.filter((a) => a.day === day).sort((a, b) => a.time.localeCompare(b.time));
        return (
          <div key={day} className="shrink-0 w-56 flex flex-col gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700 text-center">
              Day {day}
            </div>
            {dayActs.map((act, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-800 text-sm leading-tight">{act.name}</span>
                  <TypeBadge type={act.type} />
                </div>
                {act.time && <span className="text-xs text-gray-400">{act.time}</span>}
                {act.location && <span className="text-xs text-gray-500 truncate">{act.location}</span>}
                {act.estCost > 0 && (
                  <span className="text-xs text-gray-500">${act.estCost.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PackingChecklist({ categories, initialChecked, onChange, onCheckedChange }: {
  categories: PackingCategory[];
  initialChecked?: string[];
  onChange?: (cats: PackingCategory[]) => void;
  onCheckedChange?: (keys: string[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialChecked ?? []));
  const [localCats, setLocalCats] = useState<PackingCategory[]>(categories);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const isMounted = useRef(false);
  const suppressCatSave = useRef(false);

  // Sync when AI updates categories from outside
  useEffect(() => {
    suppressCatSave.current = true;
    setLocalCats(categories);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(categories)]);

  // Save to DB on user change only
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (suppressCatSave.current) { suppressCatSave.current = false; return; }
    onChange?.(localCats);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCats]);
  const [editValue, setEditValue] = useState("");
  const [addingCat, setAddingCat] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");

  const toggle = (catName: string, itemName: string) => {
    const key = `${catName}::${itemName}`;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    onCheckedChange?.((checked.has(key) ? [...checked].filter((k) => k !== key) : [...checked, key]));
  };

  const deleteItem = (catName: string, itemName: string) => {
    setLocalCats((prev) =>
      prev.map((cat) =>
        cat.name === catName ? { ...cat, items: cat.items.filter((i) => i.name !== itemName) } : cat
      )
    );
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(`${catName}::${itemName}`);
      return next;
    });
  };

  const startEdit = (catName: string, itemName: string) => {
    setEditingKey(`${catName}::${itemName}`);
    setEditValue(itemName);
  };

  const commitEdit = (catName: string, oldName: string) => {
    const newName = editValue.trim();
    if (newName && newName !== oldName) {
      setLocalCats((prev) =>
        prev.map((cat) =>
          cat.name === catName
            ? { ...cat, items: cat.items.map((i) => (i.name === oldName ? { name: newName } : i)) }
            : cat
        )
      );
      const oldKey = `${catName}::${oldName}`;
      setChecked((prev) => {
        if (!prev.has(oldKey)) return prev;
        const next = new Set(prev);
        next.delete(oldKey);
        next.add(`${catName}::${newName}`);
        return next;
      });
    }
    setEditingKey(null);
  };

  const commitAdd = (catName: string) => {
    const name = addValue.trim();
    if (name) {
      setLocalCats((prev) =>
        prev.map((cat) =>
          cat.name === catName ? { ...cat, items: [...cat.items, { name }] } : cat
        )
      );
    }
    setAddValue("");
    setAddingCat(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {localCats.map((cat) => (
        <div key={cat.name} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <span className="text-base">{cat.icon}</span>
            <h4 className="font-semibold text-gray-800 text-sm">{cat.name}</h4>
          </div>
          <div className="flex flex-col gap-1">
            {cat.items.map((item) => {
              const key = `${cat.name}::${item.name}`;
              const isChecked = checked.has(key);
              const isEditing = editingKey === key;
              return (
                <div key={item.name} className="flex items-center gap-2 group min-h-[28px]">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(cat.name, item.name)}
                    className="accent-violet-600 w-3.5 h-3.5 shrink-0"
                  />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(cat.name, item.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(cat.name, item.name);
                        if (e.key === "Escape") setEditingKey(null);
                      }}
                      className="flex-1 text-sm border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  ) : (
                    <span className={cn("flex-1 text-sm", isChecked ? "line-through text-gray-400" : "text-gray-700")}>
                      {item.name}
                    </span>
                  )}
                  {!isEditing && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(cat.name, item.name)}
                        title="Edit"
                        className="p-1 rounded text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteItem(cat.name, item.name)}
                        title="Delete"
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {addingCat === cat.name ? (
              <input
                autoFocus
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onBlur={() => commitAdd(cat.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAdd(cat.name);
                  if (e.key === "Escape") { setAddingCat(null); setAddValue(""); }
                }}
                placeholder="New item..."
                className="mt-1 text-sm border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400 w-full"
              />
            ) : (
              <button
                onClick={() => setAddingCat(cat.name)}
                className="mt-1 text-xs text-gray-400 hover:text-violet-600 transition-colors text-left"
              >
                + Add item
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type DraftSetter = (fn: (prev: Partial<Expense>) => Partial<Expense>) => void;

function ExpenseEditRow({
  draft, setDraft, onSave, onCancel,
}: {
  draft: Partial<Expense>;
  setDraft: DraftSetter;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputCls = "w-full text-sm border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400 bg-white";
  const selectCls = "text-sm border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400 bg-white";
  return (
    <>
      <td className="px-2 py-1.5 min-w-[130px]">
        <input autoFocus value={draft.name ?? ""} placeholder="Expense name"
          onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          className={inputCls} />
      </td>
      <td className="px-2 py-1.5">
        <input type="number" min={0} step={0.01} value={draft.amount ?? ""} placeholder="0.00"
          onChange={e => setDraft(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          className={cn(inputCls, "w-24")} />
      </td>
      <td className="px-2 py-1.5">
        <input type="date" value={draft.date ?? ""}
          onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}
          className={selectCls} />
      </td>
      <td className="px-2 py-1.5">
        <select value={draft.category ?? "Other"} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))} className={selectCls}>
          {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5 min-w-[120px]">
        <input value={draft.notes ?? ""} placeholder="Notes..."
          onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
          className={inputCls} />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex gap-1 whitespace-nowrap">
          <button onClick={onSave} className="text-xs px-2 py-0.5 bg-violet-600 text-white rounded hover:bg-violet-700">Save</button>
          <button onClick={onCancel} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
        </div>
      </td>
    </>
  );
}

function TravelBudget({ expenses, onExpensesChange }: {
  expenses: Expense[];
  onExpensesChange?: (expenses: Expense[]) => void;
}) {
  const [rows, setRows] = useState<Expense[]>(expenses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Expense>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState<Partial<Expense>>({});
  const [expView, setExpView] = useState<"all" | "category">("all");
  const isMounted = useRef(false);
  const suppressSave = useRef(false);

  // Sync when AI updates the prop from outside
  useEffect(() => {
    suppressSave.current = true;
    setRows(expenses.map((e, i) => ({ ...e, id: e.id || String(Date.now() + i) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(expenses)]);

  // Save to DB on user change only
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (suppressSave.current) { suppressSave.current = false; return; }
    onExpensesChange?.(rows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const startEdit = (e: Expense) => { setEditingId(e.id); setEditDraft({ ...e }); };

  const commitEdit = () => {
    if (!editingId) return;
    if (editDraft.name?.trim()) {
      setRows(prev => prev.map(e => e.id === editingId ? { ...e, ...editDraft } as Expense : e));
    }
    setEditingId(null);
  };

  const commitAdd = () => {
    const name = newDraft.name?.trim();
    if (name) {
      setRows(prev => [...prev, {
        id: `${Date.now()}`,
        name,
        amount: newDraft.amount ?? 0,
        date: newDraft.date ?? "",
        payment: newDraft.payment ?? "Cash",
        status: newDraft.status ?? "Paid",
        category: newDraft.category ?? "Other",
        receipt: newDraft.receipt ?? false,
        notes: newDraft.notes ?? "",
      }]);
    }
    setAddingNew(false);
    setNewDraft({});
  };

  const totalPaid = rows.filter(e => e.status === "Paid").reduce((s, e) => s + (e.amount ?? 0), 0);

  const HEADERS = [
    { icon: "Aa", label: "Expense" },
    { icon: "#", label: "Amount" },
    { icon: "📅", label: "Date" },
    { icon: "🗂", label: "Budget Category" },
    { icon: "☰", label: "Notes" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">💸</span>
          <h3 className="font-semibold text-gray-800 text-sm">Expenses Log</h3>
        </div>
        <p className="text-xs text-gray-400">Log every expense here. Link each one to a budget category.</p>
      </div>

        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setExpView("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              expView === "all"
                ? "bg-violet-50 text-violet-700 border border-violet-200"
                : "text-gray-500 hover:text-gray-700 border border-transparent"
            )}
          >
            ☰ All Expenses
          </button>
          <button
            onClick={() => setExpView("category")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              expView === "category"
                ? "bg-violet-50 text-violet-700 border border-violet-200"
                : "text-gray-500 hover:text-gray-700 border border-transparent"
            )}
          >
            ⊞ By Category
          </button>
        </div>

        {expView === "category" ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {rows.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No expenses yet.</p>
            ) : (
              CATEGORY_OPTIONS.filter(cat => rows.some(e => e.category === cat)).map(cat => {
                const catExpenses = rows.filter(e => e.category === cat);
                const catTotal = catExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
                const colColor = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other;
                const colIcon = CATEGORY_ICONS[cat] ?? "📌";
                return (
                  <div key={cat} className="shrink-0 w-56 flex flex-col gap-2">
                    <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-semibold text-center", colColor)}>
                      {colIcon} {cat}
                    </div>
                    {catExpenses.map(expense => (
                      <div key={expense.id} className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-1 shadow-sm">
                        <span className="font-medium text-gray-800 text-sm leading-tight">{expense.name}</span>
                        <span className="text-sm font-semibold text-gray-700">${expense.amount.toFixed(2)}</span>
                        {expense.status && (
                          <span className={cn("self-start px-2 py-0.5 rounded-md text-xs font-medium", STATUS_COLORS[expense.status] ?? "bg-gray-100 text-gray-600")}>
                            {expense.status}
                          </span>
                        )}
                        {expense.date && <span className="text-xs text-gray-400">{expense.date}</span>}
                        {expense.payment && <span className="text-xs text-gray-400">{expense.payment}</span>}
                      </div>
                    ))}
                    <div className="text-xs text-gray-400 text-right pr-1">
                      Total: <span className="font-semibold text-gray-600">${catTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
        <>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {HEADERS.map(({ icon, label }) => (
                  <th key={label} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
                    <span className="text-gray-400 mr-1 text-[10px]">{icon}</span>{label}
                  </th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !addingNew && (
                <tr key="__empty__">
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-400">No results 🔍</td>
                </tr>
              )}
              {rows.map((expense, i) =>
                editingId === expense.id ? (
                  <tr key={expense.id ?? i} className="border-b border-gray-100 bg-violet-50/30">
                    <ExpenseEditRow draft={editDraft} setDraft={setEditDraft} onSave={commitEdit} onCancel={() => setEditingId(null)} />
                  </tr>
                ) : (
                  <tr key={expense.id ?? i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{expense.name}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">${expense.amount.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{expense.date || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{expense.category || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 max-w-[140px] truncate">{expense.notes || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(expense)} title="Edit" className="p-1 rounded text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        </button>
                        <button onClick={() => setRows(prev => prev.filter(e => e.id !== expense.id))} title="Delete" className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {addingNew && (
                <tr key="__new__" className="border-b border-gray-100 bg-violet-50/30">
                  <ExpenseEditRow draft={newDraft} setDraft={setNewDraft} onSave={commitAdd} onCancel={() => { setAddingNew(false); setNewDraft({}); }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button onClick={() => { setAddingNew(true); setNewDraft({}); setExpView("all"); }} className="text-xs text-gray-400 hover:text-violet-600 transition-colors">
            + New expense
          </button>
          {totalPaid > 0 && (
            <span className="text-xs text-gray-500">Total paid: <span className="font-semibold text-gray-700">${totalPaid.toFixed(2)}</span></span>
          )}
        </div>
        </>
        )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16">
      <div className="text-4xl">🗺️</div>
      <p className="font-semibold text-gray-700">Your trip plan will appear here</p>
      <p className="text-sm text-gray-400 max-w-xs">
        As you chat with the planner, trip details and your itinerary will be built up on this panel.
      </p>
    </div>
  );
}

export function TripPlannerPanel({ data, onChecklistChange, onCheckedChange, onExpensesChange }: {
  data: TripPlanData | null;
  onChecklistChange?: (cats: PackingCategory[]) => void;
  onCheckedChange?: (keys: string[]) => void;
  onExpensesChange?: (expenses: Expense[]) => void;
}) {
  const [view, setView] = useState<"full" | "byday">("full");

  if (!data) return <EmptyState />;

  const { tripDetails, activities } = data;
  const totalCost = activities.reduce((s, a) => s + (a.estCost ?? 0), 0);

  const packingCategories = data.packingChecklist ?? DEFAULT_PACKING_CATEGORIES;

  return (
    <div className="bg-gray-50 px-6 py-6 flex flex-col gap-6">
      {/* Snapshot */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Snapshot</h2>
        <div className="flex gap-4 flex-wrap">
          <TripDetailsCard details={tripDetails} />
          {totalCost > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-1 min-w-[160px] justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Total Est. Cost</span>
              <span className="text-2xl font-bold text-gray-800">${totalCost.toFixed(2)}</span>
              <span className="text-xs text-gray-400">{activities.length} activities</span>
            </div>
          )}
        </div>
      </div>

      {/* Travel Plan */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Travel Plan</h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span>📅</span>
              <h3 className="font-semibold text-gray-800 text-sm">Itinerary</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Plan your trip day by day. Use the &quot;By Day&quot; view to see your schedule as a board.
            </p>
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setView("full")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === "full"
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "text-gray-500 hover:text-gray-700 border border-transparent"
                )}
              >
                ☰ Full Itinerary
              </button>
              <button
                onClick={() => setView("byday")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === "byday"
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "text-gray-500 hover:text-gray-700 border border-transparent"
                )}
              >
                ⊞ By Day
              </button>
            </div>
          </div>

          {view === "full" ? (
            <FullItineraryTable activities={activities} />
          ) : (
            <ByDayBoard activities={activities} />
          )}
        </div>
      </div>

      {/* Travel Budget */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Travel Budget</h2>
        <TravelBudget expenses={data.expenses ?? []} onExpensesChange={onExpensesChange} />
      </div>

      {/* Packing Checklist */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Packing Checklist</h2>
        <PackingChecklist categories={packingCategories} initialChecked={data.checkedItems} onChange={onChecklistChange} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
