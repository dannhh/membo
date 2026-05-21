"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Check, Loader2, RefreshCw, Target, Sparkles, PanelRightOpen, PanelRightClose, Clock, AlignLeft } from "lucide-react";
import { CalendarAIPanel } from "./CalendarAIPanel";
import { cn } from "@/lib/utils";
import {
  buildMonthGrid, formatMonthLabel, formatDayLabel, formatTime,
  prevMonth, nextMonth, currentMonthStr, todayStr,
  EVENT_COLORS, EVENT_TYPE_META,
  type CalendarEvent, type EventType,
} from "@/lib/calendar";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Focus Time helpers ────────────────────────────────────────────────────────

function getWeekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return [fmt(mon), fmt(sun)];
}

function studyHoursInRange(events: CalendarEvent[], start: string, end: string): number {
  return events
    .filter((e) => e.type === "study" && e.date >= start && e.date <= end)
    .reduce((acc, e) => {
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(":").map(Number);
        const [eh, em] = e.endTime.split(":").map(Number);
        return acc + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      }
      return acc + 1;
    }, 0);
}

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function weekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

function shiftWeek(monday: string, dir: 1 | -1): string {
  const d = new Date(monday + "T12:00:00");
  d.setDate(d.getDate() + dir * 7);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(monday: string): string {
  const start = new Date(monday + "T12:00:00");
  const end = new Date(monday + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString("default", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

// ── Focus Goal Popup ──────────────────────────────────────────────────────────

function FocusGoalPopup({ goalHrs, onChangeGoal, onClose, actualHrs, allEvents, weekStart, weekEnd, onEventsChange }: {
  goalHrs: number;
  onChangeGoal: (h: number) => void;
  onClose: () => void;
  actualHrs: number;
  allEvents: CalendarEvent[];
  weekStart: string;
  weekEnd: string;
  onEventsChange: (updater: (prev: CalendarEvent[]) => CalendarEvent[]) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [fillMsg, setFillMsg] = useState<string | null>(null);

  async function handleSuggest() {
    setSuggesting(true);
    setAiReason(null);
    try {
      const res = await fetch("/api/calendar/focus-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: allEvents }),
      });
      const data = await res.json();
      if (data.suggestedHrs) {
        onChangeGoal(data.suggestedHrs);
        setAiReason(data.reason ?? null);
      }
    } catch {
      // ignore
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAutoFill() {
    setFilling(true);
    setFillMsg(null);
    try {
      const res = await fetch("/api/calendar/focus-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalHrs, weekStart, weekEnd }),
      });
      const { created, removed } = await res.json();
      const removedIds = new Set((removed as CalendarEvent[]).map((e) => e.id));
      onEventsChange((prev) => [
        ...prev.filter((e) => !removedIds.has(e.id)),
        ...(created as CalendarEvent[]),
      ]);
      setFillMsg(
        created.length > 0
          ? `Added ${created.length} Focus Time block${created.length > 1 ? "s" : ""}`
          : "Already at goal — no blocks needed"
      );
    } catch {
      setFillMsg("Auto-fill failed");
    } finally {
      setFilling(false);
      setTimeout(() => setFillMsg(null), 4000);
    }
  }

  const pct = goalHrs > 0 ? Math.min(100, Math.round((actualHrs / goalHrs) * 100)) : 0;
  const remaining = Math.max(0, goalHrs - actualHrs);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-20 bg-black/5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold">
            <span className="text-emerald-500">Focus Time</span>{" "}
            <span className="text-gray-800">Weekly Goal</span>
          </h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          This week:{" "}
          <span className="text-emerald-600 font-medium">{actualHrs.toFixed(1)} hrs</span>{" "}
          scheduled
          {remaining > 0 && (
            <span className="text-gray-400"> · {remaining.toFixed(1)} hrs remaining</span>
          )}
        </p>

        <input
          type="range"
          min={1}
          max={40}
          step={1}
          value={goalHrs}
          onChange={(e) => onChangeGoal(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />

        <div className="flex items-center justify-between mt-2 mb-3">
          <span className="text-sm font-semibold text-gray-700">{goalHrs} hrs</span>
          <button
            onClick={handleSuggest}
            disabled={suggesting || filling}
            className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
          >
            {suggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            AI suggest
          </button>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct >= 100 ? "bg-emerald-500" : "bg-indigo-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mb-4">{pct}% of weekly goal</p>

        <button
          onClick={handleAutoFill}
          disabled={filling || suggesting}
          className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
        >
          {filling ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {filling ? "AI scheduling…" : "AI schedule week"}
        </button>

        {fillMsg && (
          <p className="mt-2 text-[11px] text-center text-emerald-600 font-medium">{fillMsg}</p>
        )}

        {aiReason && (
          <p className="mt-3 text-[11px] text-gray-500 bg-indigo-50 rounded-lg px-3 py-2 leading-relaxed">
            {aiReason}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Add Event Form ────────────────────────────────────────────────────────────

function AddEventForm({ date, onSave, onCancel, initialStartTime = "", initialEndTime = "", compact = false }: {
  date: string;
  onSave: (e: CalendarEvent) => void;
  onCancel: () => void;
  initialStartTime?: string;
  initialEndTime?: string;
  compact?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("event");
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [color, setColor] = useState<string>(EVENT_TYPE_META.event.color);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        type,
        color,
      }),
    });
    const created = await res.json();
    setSaving(false);
    onSave(created);
  }

  return (
    <div className={cn("space-y-3", !compact && "pt-3 border-t border-gray-100")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">New entry</span>
          <button onClick={onCancel} className="text-gray-300 hover:text-gray-500"><X size={13} /></button>
        </div>
      )}

      <input
        autoFocus
        type="text"
        placeholder="Title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-300"
      />

      {/* Type selector */}
      <div className="flex gap-1.5">
        {(Object.keys(EVENT_TYPE_META) as EventType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setColor(EVENT_TYPE_META[t].color); }}
            className={cn(
              "flex-1 py-1 rounded-lg text-xs font-medium transition-all",
              type === t
                ? `${EVENT_TYPE_META[t].bg} ${EVENT_TYPE_META[t].text} ring-1 ring-current`
                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            )}
          >
            {EVENT_TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* Time */}
      <div className="flex gap-2">
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-300 text-gray-600" />
        <span className="text-gray-300 self-center text-xs">→</span>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-300 text-gray-600" />
      </div>

      {/* Color */}
      <div className="flex gap-1.5 flex-wrap">
        {EVENT_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={cn("w-5 h-5 rounded-full transition-all", color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "")}
            style={{ background: c }} />
        ))}
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-300 resize-none"
      />

      <button
        onClick={handleSave}
        disabled={!title.trim() || saving}
        className="w-full py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 transition-all"
      >
        {saving ? "Saving…" : "Add"}
      </button>
    </div>
  );
}

// ── Day Panel ─────────────────────────────────────────────────────────────────

function DayPanel({ date, events, onAdd, onToggle, onDelete }: {
  date: string;
  events: CalendarEvent[];
  onAdd: (e: CalendarEvent) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const sorted = [...events].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  function handleAdd(e: CalendarEvent) {
    setShowForm(false);
    onAdd(e);
  }

  return (
    <div className="w-72 shrink-0 border-l border-gray-100 flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 leading-tight">{formatDayLabel(date)}</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 text-gray-400 transition-colors"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-2">
        {sorted.length === 0 && !showForm && (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-400">Nothing planned</p>
            <button onClick={() => setShowForm(true)} className="mt-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
              + Add something
            </button>
          </div>
        )}

        {sorted.map((ev) => {
          const meta = EVENT_TYPE_META[ev.type as EventType] ?? EVENT_TYPE_META.event;
          return (
            <div key={ev.id} className={cn("rounded-xl p-3 group relative", meta.bg)}>
              <div className="flex items-start gap-2">
                {ev.type === "task" && (
                  <button
                    onClick={() => onToggle(ev.id, !ev.completed)}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      ev.completed ? "bg-amber-400 border-amber-400 text-white" : "border-amber-300 hover:border-amber-500"
                    )}
                  >
                    {ev.completed && <Check size={9} />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium leading-tight", meta.text, ev.completed && "line-through opacity-50")}>
                    {ev.title}
                  </p>
                  {(ev.startTime || ev.endTime) && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {ev.startTime && formatTime(ev.startTime)}
                      {ev.startTime && ev.endTime && " → "}
                      {ev.endTime && formatTime(ev.endTime)}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{ev.description}</p>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: ev.color }} />
              </div>
              <button
                onClick={() => onDelete(ev.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}

        {showForm && (
          <AddEventForm date={date} onSave={handleAdd} onCancel={() => setShowForm(false)} />
        )}
      </div>
    </div>
  );
}

// ── Event Detail Popover ──────────────────────────────────────────────────────

function EventDetailPopover({ event, anchor, onClose, onDelete, onToggle }: {
  event: CalendarEvent;
  anchor: DOMRect;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const meta = EVENT_TYPE_META[event.type as EventType] ?? EVENT_TYPE_META.event;
  const POPOVER_W = 260;
  const POPOVER_H = 220;

  const spaceRight = window.innerWidth - anchor.right;
  const left = spaceRight >= POPOVER_W + 12 ? anchor.right + 8 : anchor.left - POPOVER_W - 8;
  const top = Math.max(8, Math.min(anchor.top, window.innerHeight - POPOVER_H - 8));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const durationMins = event.startTime && event.endTime
    ? (() => {
        const [sh, sm] = event.startTime.split(":").map(Number);
        const [eh, em] = event.endTime.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })()
    : null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ background: event.color }} />

        <div className="p-4">
          {/* Top row: type badge + actions */}
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.bg, meta.text)}>
              {meta.label}
            </span>
            <div className="flex items-center gap-0.5">
              {event.type === "task" && (
                <button
                  onClick={() => { onToggle(event.id, !event.completed); onClose(); }}
                  title={event.completed ? "Mark incomplete" : "Mark complete"}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    event.completed
                      ? "border-amber-400 bg-amber-400 text-white"
                      : "border-gray-300 hover:border-amber-400 text-transparent hover:text-amber-400"
                  )}
                >
                  <Check size={10} />
                </button>
              )}
              <button
                onClick={() => { onDelete(event.id); onClose(); }}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
              >
                <Trash2 size={12} />
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3
            className={cn("text-sm font-bold leading-snug mb-3", event.completed && "line-through opacity-50")}
            style={{ color: event.color }}
          >
            {event.title}
          </h3>

          {/* Date + time */}
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <Clock size={12} className="mt-0.5 shrink-0 text-gray-300" />
              <div>
                <p className="font-medium text-gray-700">{formatDayLabel(event.date)}</p>
                {event.startTime && (
                  <p className="text-gray-500">
                    {formatTime(event.startTime)}
                    {event.endTime && ` – ${formatTime(event.endTime)}`}
                    {durationMins && durationMins >= 60 && (
                      <span className="text-gray-400 ml-1">
                        ({durationMins >= 60
                          ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ""}`
                          : `${durationMins}m`})
                      </span>
                    )}
                    {durationMins && durationMins < 60 && (
                      <span className="text-gray-400 ml-1">({durationMins}m)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {event.description && (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <AlignLeft size={12} className="mt-0.5 shrink-0 text-gray-300" />
                <p className="text-gray-500 leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

const HOUR_H = 28;

function pxToMins(px: number): number {
  return Math.round((px / HOUR_H) * 60 / 15) * 15;
}

function minsToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, mins));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

interface LayoutEvent {
  ev: CalendarEvent;
  top: number;
  height: number;
  col: number;
  totalCols: number;
}

function layoutTimedEvents(events: CalendarEvent[]): LayoutEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) =>
      toMins(a.startTime!) - toMins(b.startTime!) ||
      toMins(b.endTime!) - toMins(a.endTime!)
  );

  // Greedy column assignment: put each event in the leftmost column that's free
  const cols: number[] = [];
  const colEnd: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const start = toMins(sorted[i].startTime!);
    const end = toMins(sorted[i].endTime!);
    let c = colEnd.findIndex((e) => e <= start);
    if (c === -1) { c = colEnd.length; colEnd.push(end); }
    else colEnd[c] = end;
    cols[i] = c;
  }

  // For each event, totalCols = max column index among all events it overlaps + 1
  return sorted.map((ev, i) => {
    const start = toMins(ev.startTime!);
    const end = toMins(ev.endTime!);
    let maxCol = 0;
    for (let j = 0; j < sorted.length; j++) {
      if (toMins(sorted[j].startTime!) < end && toMins(sorted[j].endTime!) > start) {
        maxCol = Math.max(maxCol, cols[j]);
      }
    }
    return {
      ev,
      col: cols[i],
      totalCols: maxCol + 1,
      top: (start / 60) * HOUR_H,
      height: Math.max(14, ((end - start) / 60) * HOUR_H),
    };
  });
}

function WeekView({ weekStart, events, onAdd, onToggle, onDelete }: {
  weekStart: string;
  events: CalendarEvent[];
  onAdd: (e: CalendarEvent) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
  const [drag, setDrag] = useState<{ date: string; startPx: number; endPx: number } | null>(null);
  const dragRef = useRef<{ date: string; startPx: number; endPx: number } | null>(null);
  const [detailEvent, setDetailEvent] = useState<{ ev: CalendarEvent; rect: DOMRect } | null>(null);
  const today = todayStr();

  function handleColumnMouseDown(date: string, e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    setDetailEvent(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - rect.top);
    const initial = { date, startPx: y, endPx: y };
    dragRef.current = initial;
    setDrag(initial);

    function onMove(me: MouseEvent) {
      if (!dragRef.current) return;
      const endY = Math.max(0, Math.min(me.clientY - rect.top, 24 * HOUR_H));
      const updated = { ...dragRef.current, endPx: endY };
      dragRef.current = updated;
      setDrag(updated);
    }

    function onUp() {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d) {
        const minPx = Math.min(d.startPx, d.endPx);
        const maxPx = Math.max(d.startPx, d.endPx);
        const startMins = pxToMins(minPx);
        const rawEnd = pxToMins(maxPx);
        const endMins = rawEnd <= startMins ? startMins + 60 : rawEnd;
        setQuickAdd({
          date: d.date,
          startTime: minsToTime(startMins),
          endTime: minsToTime(Math.min(23 * 60 + 59, endMins)),
        });
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }


  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_H;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="flex shrink-0 border-b border-gray-100">
        <div className="w-12 shrink-0" />
        {days.map((date) => {
          const d = new Date(date + "T12:00:00");
          const dow = d.toLocaleDateString("default", { weekday: "short" });
          const dayNum = parseInt(date.slice(-2));
          const isToday = date === today;
          return (
            <div key={date} className="flex-1 flex flex-col items-center py-2 border-l border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{dow}</span>
              <span className={cn(
                "mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold",
                isToday ? "bg-indigo-500 text-white" : "text-gray-700"
              )}>{dayNum}</span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-hidden">
        <div className="flex" style={{ height: 24 * HOUR_H }}>
          {/* Hour labels — every 3 h */}
          <div className="w-12 shrink-0 relative select-none">
            {Array.from({ length: 24 }, (_, h) => h % 3 === 0 && h > 0 && (
              <div key={h} className="absolute w-full flex justify-end pr-2"
                style={{ top: h * HOUR_H - 7 }}>
                <span className="text-[9px] text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((date) => {
            const timedEvs = events.filter((e) => e.date === date && e.startTime && e.endTime);
            const isToday = date === today;
            const activeDrag = drag?.date === date ? drag : null;
            const dragTop = activeDrag ? Math.min(activeDrag.startPx, activeDrag.endPx) : 0;
            const dragHeight = activeDrag ? Math.abs(activeDrag.endPx - activeDrag.startPx) : 0;
            const dragStartMins = activeDrag ? pxToMins(Math.min(activeDrag.startPx, activeDrag.endPx)) : 0;
            const dragEndMins = activeDrag ? pxToMins(Math.max(activeDrag.startPx, activeDrag.endPx)) : 0;
            return (
              <div
                key={date}
                className={cn(
                  "flex-1 relative border-l border-gray-100 select-none",
                  isToday && "bg-indigo-50/20"
                )}
                onMouseDown={(e) => handleColumnMouseDown(date, e)}
                style={{ cursor: "crosshair" }}
              >
                {/* Hour lines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h}
                    className="absolute w-full border-b border-gray-100 pointer-events-none"
                    style={{ top: h * HOUR_H, height: HOUR_H }}
                  />
                ))}

                {/* Drag selection overlay */}
                {activeDrag && dragHeight > 2 && (
                  <div
                    className="absolute left-0.5 right-0.5 bg-indigo-400/20 border border-indigo-400/50 rounded pointer-events-none z-[15]"
                    style={{ top: dragTop, height: Math.max(dragHeight, 14) }}
                  >
                    <span className="text-[9px] font-semibold text-indigo-600 px-1 pt-0.5 block truncate leading-tight">
                      {minsToTime(dragStartMins)} – {minsToTime(Math.min(23 * 60 + 59, dragEndMins <= dragStartMins ? dragStartMins + 60 : dragEndMins))}
                    </span>
                  </div>
                )}

                {/* Current time indicator */}
                {isToday && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                    style={{ top: nowTop }}>
                    <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 shrink-0" />
                    <div className="flex-1 h-px bg-red-400" />
                  </div>
                )}

                {/* Timed events — side-by-side layout for overlapping events */}
                {layoutTimedEvents(timedEvs).map(({ ev, top, height, col, totalCols }) => {
                  const leftPct = (col / totalCols) * 100;
                  const widthPct = (1 / totalCols) * 100;
                  const isOverlapping = totalCols > 1;
                  const isSelected = detailEvent?.ev.id === ev.id;
                  return (
                    <div key={ev.id}
                      className={cn(
                        "absolute rounded-md py-0.5 z-20 overflow-hidden border-l-2 transition-all duration-100",
                        isSelected ? "shadow-lg outline outline-2 outline-offset-1" : "hover:shadow-md hover:brightness-95"
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        background: ev.color + (isOverlapping ? "28" : "18"),
                        borderLeftColor: ev.color,
                        outlineColor: isSelected ? ev.color : undefined,
                        cursor: "pointer",
                        paddingLeft: isOverlapping ? "4px" : "8px",
                        paddingRight: "2px",
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDetailEvent(detailEvent?.ev.id === ev.id ? null : { ev, rect });
                      }}
                    >
                      <div className="flex items-start gap-1 pointer-events-none">
                        {ev.type === "task" && (
                          <div
                            className="mt-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{ borderColor: ev.color, backgroundColor: ev.completed ? ev.color : "transparent" }}
                          >
                            {ev.completed && <Check size={7} className="text-white" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[11px] font-semibold leading-tight truncate", ev.completed && "line-through opacity-50")}
                            style={{ color: ev.color }}>
                            {ev.title}
                          </p>
                          {height > 42 && !isOverlapping && (
                            <p className="text-[9px] text-gray-400">{formatTime(ev.startTime!)} – {formatTime(ev.endTime!)}</p>
                          )}
                          {height > 28 && isOverlapping && (
                            <p className="text-[9px] text-gray-400 truncate">{formatTime(ev.startTime!)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick-add popup */}
      {quickAdd && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/10"
          onClick={() => setQuickAdd(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-72 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-600">{formatDayLabel(quickAdd.date)}</span>
              <button onClick={() => setQuickAdd(null)} className="text-gray-300 hover:text-gray-500"><X size={13} /></button>
            </div>
            <AddEventForm
              compact
              date={quickAdd.date}
              initialStartTime={quickAdd.startTime}
              initialEndTime={quickAdd.endTime}
              onSave={(e) => { setQuickAdd(null); onAdd(e); }}
              onCancel={() => setQuickAdd(null)}
            />
          </div>
        </div>
      )}

      {/* Event detail popover */}
      {detailEvent && (
        <EventDetailPopover
          event={detailEvent.ev}
          anchor={detailEvent.rect}
          onClose={() => setDetailEvent(null)}
          onDelete={(id) => { onDelete(id); setDetailEvent(null); }}
          onToggle={(id, completed) => { onToggle(id, completed); setDetailEvent(null); }}
        />
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function CalendarDashboard() {
  const [view, setView] = useState<"month" | "week">("week");
  const [month, setMonth] = useState(currentMonthStr);
  const [weekOf, setWeekOf] = useState(() => weekMonday(todayStr()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [focusGoalHrs, setFocusGoalHrs] = useState<number>(20);
  const [showFocusGoal, setShowFocusGoal] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [rescheduleMsg, setRescheduleMsg] = useState<{ text: string; type: "ok" | "warn" } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("focusGoalHrs");
    if (saved) setFocusGoalHrs(Number(saved));
  }, []);

  function handleFocusGoalChange(h: number) {
    setFocusGoalHrs(h);
    localStorage.setItem("focusGoalHrs", String(h));
  }

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?month=${m}`).then((r) => r.json());
      setEvents(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadWeek(monday: string) {
    const m1 = monday.slice(0, 7);
    const sundayStr = (() => { const d = new Date(monday + "T12:00:00"); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })();
    const m2 = sundayStr.slice(0, 7);
    setLoading(true);
    try {
      if (m1 === m2) {
        const res = await fetch(`/api/calendar/events?month=${m1}`).then((r) => r.json());
        setEvents(Array.isArray(res) ? res : []);
      } else {
        const [r1, r2] = await Promise.all([
          fetch(`/api/calendar/events?month=${m1}`).then((r) => r.json()),
          fetch(`/api/calendar/events?month=${m2}`).then((r) => r.json()),
        ]);
        const merged = [...(Array.isArray(r1) ? r1 : []), ...(Array.isArray(r2) ? r2 : [])];
        const seen = new Set<string>();
        setEvents(merged.filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(month); }, [load, month]);

  function handlePrev() {
    if (view === "week") {
      const w = shiftWeek(weekOf, -1); setWeekOf(w); loadWeek(w);
    } else {
      const m = prevMonth(month); setMonth(m); load(m);
    }
  }
  function handleNext() {
    if (view === "week") {
      const w = shiftWeek(weekOf, 1); setWeekOf(w); loadWeek(w);
    } else {
      const m = nextMonth(month); setMonth(m); load(m);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(data.error ?? "Sync failed");
      } else {
        setSyncMsg(`Synced: ${data.imported} new, ${data.updated} updated`);
        await load(month);
      }
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  async function handleAdd(e: CalendarEvent) {
    // Capture overlapping Focus Time blocks before updating state
    const focusOverlap = e.startTime && e.endTime
      ? events.filter(
          (ev) =>
            ev.noteTitle === "__autofill__" &&
            ev.date === e.date &&
            ev.startTime &&
            ev.endTime &&
            toMins(ev.startTime) < toMins(e.endTime!) &&
            toMins(ev.endTime) > toMins(e.startTime!)
        )
      : [];

    setEvents((prev) => [...prev, e]);

    if (focusOverlap.length === 0) return;

    try {
      const res = await fetch("/api/calendar/reschedule-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEvent: { date: e.date, startTime: e.startTime, endTime: e.endTime } }),
      });
      const { rescheduled, deleted }: { rescheduled: CalendarEvent[]; deleted: number } = await res.json();

      const rescheduledIds = new Set(rescheduled.map((r) => r.id));
      const deletedIds = new Set(
        focusOverlap.filter((f) => !rescheduledIds.has(f.id)).map((f) => f.id)
      );

      setEvents((prev) =>
        prev
          .filter((ev) => !deletedIds.has(ev.id))
          .map((ev) => rescheduled.find((r) => r.id === ev.id) ?? ev)
      );

      const msg = deleted > 0
        ? `${rescheduled.length} Focus block${rescheduled.length !== 1 ? "s" : ""} rescheduled · ${deleted} removed (no room)`
        : `${rescheduled.length} Focus block${rescheduled.length !== 1 ? "s" : ""} rescheduled`;

      setRescheduleMsg({ text: msg, type: deleted > 0 ? "warn" : "ok" });
      setTimeout(() => setRescheduleMsg(null), 4000);
    } catch {
      // Reschedule failed silently — new event already saved
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    const res = await fetch("/api/calendar/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed }),
    });
    const updated = await res.json();
    setEvents((prev) => prev.map((e) => e.id === id ? updated : e));
  }

  async function handleDelete(id: string) {
    await fetch("/api/calendar/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const grid = buildMonthGrid(month);
  const today = todayStr();
  const eventsOnDay = (date: string) => events.filter((e) => e.date === date);
  const selectedEvents = eventsOnDay(selectedDate);

  const [weekStart, weekEnd] = getWeekRange(today);
  const thisWeekStudyHrs = studyHoursInRange(events, weekStart, weekEnd);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top nav bar (full width) ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">

        {/* Left: view toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px] font-semibold">
          <button
            onClick={() => { setView("month"); load(month); }}
            className={cn("px-2.5 py-1 transition-colors", view === "month" ? "bg-indigo-500 text-white" : "text-gray-400 hover:bg-gray-50")}
          >Month</button>
          <button
            onClick={() => { setView("week"); loadWeek(weekOf); }}
            className={cn("px-2.5 py-1 transition-colors", view === "week" ? "bg-indigo-500 text-white" : "text-gray-400 hover:bg-gray-50")}
          >Week</button>
        </div>

        {/* Center: prev · date · next */}
        <div className="flex items-center gap-1">
          <button onClick={handlePrev} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <h2 className="text-sm font-semibold text-gray-800 min-w-[160px] text-center select-none">
            {view === "week" ? formatWeekLabel(weekOf) : formatMonthLabel(month)}
          </h2>
          <button onClick={handleNext} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Right: focus · sync · AI toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFocusGoal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-semibold transition-colors"
          >
            <Target size={10} />
            Focus
          </button>
          {loading && <Loader2 size={12} className="animate-spin text-gray-300" />}
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync Google Calendar"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
          </button>
          {syncMsg && <span className="text-[10px] text-gray-400">{syncMsg}</span>}
          {rescheduleMsg && (
            <span className={cn(
              "text-[10px] font-medium",
              rescheduleMsg.type === "ok" ? "text-emerald-600" : "text-amber-500"
            )}>
              {rescheduleMsg.text}
            </span>
          )}
          <button
            onClick={() => setAiOpen((o) => !o)}
            title={aiOpen ? "Hide AI" : "Show AI"}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-full transition-colors",
              aiOpen ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
          >
            {aiOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>
      </div>

      {/* ── Body (calendar + panels) ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Calendar content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-4">
          {view === "week" ? (
            <WeekView
              weekStart={weekOf}
              events={events}
              onAdd={handleAdd}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ) : (
            <>
              <div className="grid grid-cols-7 mb-1 shrink-0">
                {DOW.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 gap-px">
                {grid.map(({ date, current }) => {
                  const dayEvents = eventsOnDay(date);
                  const isToday = date === today;
                  const isSelected = date === selectedDate;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex flex-col p-1 rounded-lg transition-all text-left min-h-0 overflow-hidden",
                        !current && "opacity-30",
                        isSelected && "bg-indigo-50 ring-1 ring-indigo-200",
                        !isSelected && "hover:bg-gray-50"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 shrink-0",
                        isToday ? "bg-indigo-500 text-white" : "text-gray-600"
                      )}>
                        {parseInt(date.slice(-2))}
                      </span>
                      <div className="space-y-0.5 w-full">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.id} className="w-full rounded text-[9px] px-1 truncate leading-4"
                            style={{ background: ev.color + "22", color: ev.color }}>
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 shrink-0">
                {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", meta.dot)} />
                    <span className="text-[10px] text-gray-400">{meta.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Day panel — month view, no AI */}
        {view === "month" && !aiOpen && (
          <DayPanel
            date={selectedDate}
            events={selectedEvents}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}

        {/* AI panel */}
        <div className={cn(
          "shrink-0 border-l border-gray-100 overflow-hidden transition-all duration-200",
          aiOpen ? "w-72" : "w-0"
        )}>
          {aiOpen && (
            <CalendarAIPanel
              weekStart={weekStart}
              weekEnd={weekEnd}
              focusGoalHrs={focusGoalHrs}
              onEventsChange={setEvents}
            />
          )}
        </div>
      </div>

      {showFocusGoal && (
        <FocusGoalPopup
          goalHrs={focusGoalHrs}
          onChangeGoal={handleFocusGoalChange}
          onClose={() => setShowFocusGoal(false)}
          actualHrs={thisWeekStudyHrs}
          allEvents={events}
          weekStart={weekStart}
          weekEnd={weekEnd}
          onEventsChange={setEvents}
        />
      )}
    </div>
  );
}
